-- ============================================================
-- Migración 002: Aislamiento multi-tenant por usuario
-- ============================================================
-- Limpia datos existentes antes de agregar restricciones NOT NULL
TRUNCATE sensor_riego_20, sensor_riego_40, sensor_riego_60, sensor_fertilizante, api_rate_limits CASCADE;

-- ============================================================
-- Nuevas tablas
-- ============================================================

-- Mapeo de API keys de dispositivos a usuarios
CREATE TABLE device_api_keys (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,   -- SHA-256 hex del API key en texto plano
    device_id TEXT,                   -- identificador amigable del dispositivo
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones por usuario
CREATE TABLE notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisiones de riego por usuario
CREATE TABLE decisiones_riego (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decision TEXT NOT NULL,
    razon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sesiones de chat por usuario
CREATE TABLE chat_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos por usuario
CREATE TABLE documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lecturas onboard del dispositivo (temperatura y humedad del sensor físico)
CREATE TABLE sensor_onboard (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    temperatura_onboard DOUBLE PRECISION,
    humedad_onboard DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, timestamp)
);

-- ============================================================
-- Modificar tablas existentes: agregar user_id
-- ============================================================

ALTER TABLE sensor_riego_20
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sensor_riego_40
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sensor_riego_60
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sensor_fertilizante
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- Eliminar columnas onboard de tablas de riego
-- (los datos onboard se guardan en sensor_onboard)
-- ============================================================

ALTER TABLE sensor_riego_20
    DROP COLUMN temperatura_onboard,
    DROP COLUMN humedad_onboard;

ALTER TABLE sensor_riego_40
    DROP COLUMN temperatura_onboard,
    DROP COLUMN humedad_onboard;

ALTER TABLE sensor_riego_60
    DROP COLUMN temperatura_onboard,
    DROP COLUMN humedad_onboard;

-- ============================================================
-- Reemplazar UNIQUE(timestamp) por UNIQUE(user_id, timestamp)
-- ============================================================

ALTER TABLE sensor_riego_20
    DROP CONSTRAINT sensor_riego_20_timestamp_key,
    ADD CONSTRAINT sensor_riego_20_user_id_timestamp_key UNIQUE(user_id, timestamp);

ALTER TABLE sensor_riego_40
    DROP CONSTRAINT sensor_riego_40_timestamp_key,
    ADD CONSTRAINT sensor_riego_40_user_id_timestamp_key UNIQUE(user_id, timestamp);

ALTER TABLE sensor_riego_60
    DROP CONSTRAINT sensor_riego_60_timestamp_key,
    ADD CONSTRAINT sensor_riego_60_user_id_timestamp_key UNIQUE(user_id, timestamp);

ALTER TABLE sensor_fertilizante
    DROP CONSTRAINT sensor_fertilizante_timestamp_key,
    ADD CONSTRAINT sensor_fertilizante_user_id_timestamp_key UNIQUE(user_id, timestamp);

-- ============================================================
-- Eliminar políticas antiguas (acceso público)
-- ============================================================

DROP POLICY IF EXISTS "Allow public read" ON sensor_riego_20;
DROP POLICY IF EXISTS "Allow public read" ON sensor_riego_40;
DROP POLICY IF EXISTS "Allow public read" ON sensor_riego_60;
DROP POLICY IF EXISTS "Allow public read" ON sensor_fertilizante;

DROP POLICY IF EXISTS "Service role insert" ON sensor_riego_20;
DROP POLICY IF EXISTS "Service role insert" ON sensor_riego_40;
DROP POLICY IF EXISTS "Service role insert" ON sensor_riego_60;
DROP POLICY IF EXISTS "Service role insert" ON sensor_fertilizante;

-- ============================================================
-- Habilitar RLS en tablas nuevas
-- ============================================================

ALTER TABLE device_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisiones_riego ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_onboard ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Nuevas políticas RLS: aislamiento por user_id
-- ============================================================

-- sensor_riego_20
CREATE POLICY select_own_sensor_riego_20
    ON sensor_riego_20 FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_sensor_riego_20
    ON sensor_riego_20 FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_sensor_riego_20
    ON sensor_riego_20 FOR INSERT
    TO service_role
    WITH CHECK (true);

-- sensor_riego_40
CREATE POLICY select_own_sensor_riego_40
    ON sensor_riego_40 FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_sensor_riego_40
    ON sensor_riego_40 FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_sensor_riego_40
    ON sensor_riego_40 FOR INSERT
    TO service_role
    WITH CHECK (true);

-- sensor_riego_60
CREATE POLICY select_own_sensor_riego_60
    ON sensor_riego_60 FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_sensor_riego_60
    ON sensor_riego_60 FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_sensor_riego_60
    ON sensor_riego_60 FOR INSERT
    TO service_role
    WITH CHECK (true);

-- sensor_fertilizante
CREATE POLICY select_own_sensor_fertilizante
    ON sensor_fertilizante FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_sensor_fertilizante
    ON sensor_fertilizante FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_sensor_fertilizante
    ON sensor_fertilizante FOR INSERT
    TO service_role
    WITH CHECK (true);

-- sensor_onboard
CREATE POLICY select_own_sensor_onboard
    ON sensor_onboard FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_sensor_onboard
    ON sensor_onboard FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_sensor_onboard
    ON sensor_onboard FOR INSERT
    TO service_role
    WITH CHECK (true);

-- notifications
CREATE POLICY select_own_notifications
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_notifications
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_notifications
    ON notifications FOR INSERT
    TO service_role
    WITH CHECK (true);

-- decisiones_riego
CREATE POLICY select_own_decisiones_riego
    ON decisiones_riego FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_decisiones_riego
    ON decisiones_riego FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_decisiones_riego
    ON decisiones_riego FOR INSERT
    TO service_role
    WITH CHECK (true);

-- chat_sessions
CREATE POLICY select_own_chat_sessions
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_chat_sessions
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_chat_sessions
    ON chat_sessions FOR INSERT
    TO service_role
    WITH CHECK (true);

-- documents
CREATE POLICY select_own_documents
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_documents
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_insert_documents
    ON documents FOR INSERT
    TO service_role
    WITH CHECK (true);

-- device_api_keys: sólo service_role gestiona las keys
CREATE POLICY service_role_all_device_api_keys
    ON device_api_keys FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Índices sobre user_id para todas las tablas
-- ============================================================

CREATE INDEX idx_riego_20_user_id ON sensor_riego_20(user_id);
CREATE INDEX idx_riego_40_user_id ON sensor_riego_40(user_id);
CREATE INDEX idx_riego_60_user_id ON sensor_riego_60(user_id);
CREATE INDEX idx_fertilizante_user_id ON sensor_fertilizante(user_id);
CREATE INDEX idx_onboard_user_id ON sensor_onboard(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_decisiones_riego_user_id ON decisiones_riego(user_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_device_api_keys_user_id ON device_api_keys(user_id);

-- ============================================================
-- Agregar sensor_onboard a Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_onboard;
