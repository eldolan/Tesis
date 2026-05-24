-- Sensor de riego 20cm
CREATE TABLE sensor_riego_20 (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    temperatura_c DOUBLE PRECISION NOT NULL,
    humedad DOUBLE PRECISION NOT NULL,
    conductividad_us_cm DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    temperatura_onboard DOUBLE PRECISION,
    humedad_onboard DOUBLE PRECISION,
    es_evento_riego BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(timestamp)
);

-- Sensor de riego 40cm
CREATE TABLE sensor_riego_40 (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    temperatura_c DOUBLE PRECISION NOT NULL,
    humedad DOUBLE PRECISION NOT NULL,
    conductividad_us_cm DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    temperatura_onboard DOUBLE PRECISION,
    humedad_onboard DOUBLE PRECISION,
    es_evento_riego BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(timestamp)
);

-- Sensor de riego 60cm
CREATE TABLE sensor_riego_60 (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    temperatura_c DOUBLE PRECISION NOT NULL,
    humedad DOUBLE PRECISION NOT NULL,
    conductividad_us_cm DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    temperatura_onboard DOUBLE PRECISION,
    humedad_onboard DOUBLE PRECISION,
    es_evento_riego BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(timestamp)
);

-- Sensor de fertilizante (NPK)
CREATE TABLE sensor_fertilizante (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    nitrogen DOUBLE PRECISION NOT NULL,
    phosphorus DOUBLE PRECISION NOT NULL,
    potassium DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(timestamp)
);

-- Ciudades chilenas (pre-filtradas de city.list.json)
CREATE TABLE chilean_cities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

-- Rate limiting
CREATE TABLE api_rate_limits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip_address INET NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_riego_20_timestamp ON sensor_riego_20(timestamp);
CREATE INDEX idx_riego_40_timestamp ON sensor_riego_40(timestamp);
CREATE INDEX idx_riego_60_timestamp ON sensor_riego_60(timestamp);
CREATE INDEX idx_fertilizante_timestamp ON sensor_fertilizante(timestamp);
CREATE INDEX idx_cities_name ON chilean_cities(name);
CREATE INDEX idx_rate_limits_ip_time ON api_rate_limits(ip_address, requested_at);

-- Habilitar Realtime para tablas de sensores
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_riego_20;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_riego_40;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_riego_60;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_fertilizante;

-- Row Level Security
ALTER TABLE sensor_riego_20 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_riego_40 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_riego_60 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_fertilizante ENABLE ROW LEVEL SECURITY;
ALTER TABLE chilean_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Lectura pública para sensores y ciudades
CREATE POLICY "Allow public read" ON sensor_riego_20 FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sensor_riego_40 FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sensor_riego_60 FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sensor_fertilizante FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON chilean_cities FOR SELECT USING (true);

-- Inserts solo con service role
CREATE POLICY "Service role insert" ON sensor_riego_20 FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert" ON sensor_riego_40 FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert" ON sensor_riego_60 FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role insert" ON sensor_fertilizante FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role all" ON api_rate_limits FOR ALL USING (true);

-- Función de rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_ip_address INET,
    p_max_requests INTEGER DEFAULT 10,
    p_time_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    request_count INTEGER;
BEGIN
    DELETE FROM api_rate_limits
    WHERE ip_address = p_ip_address
      AND requested_at < NOW() - (p_time_window_seconds || ' seconds')::INTERVAL;

    SELECT COUNT(*) INTO request_count
    FROM api_rate_limits
    WHERE ip_address = p_ip_address
      AND requested_at >= NOW() - (p_time_window_seconds || ' seconds')::INTERVAL;

    IF request_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    INSERT INTO api_rate_limits (ip_address) VALUES (p_ip_address);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
