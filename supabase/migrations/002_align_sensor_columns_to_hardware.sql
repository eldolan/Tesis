-- Migración 002: Alinear schema de sensores con hardware real
-- Hardware: Arduino Nano 33 BLE Sense (2 capacitivos + HTS221)
-- No existen sensores de conductividad, pH ni temperatura suelo (DS18B20)

-- sensor_riego_20: hacer nullable las columnas sin sensor real
ALTER TABLE sensor_riego_20
  ALTER COLUMN temperatura_c DROP NOT NULL,
  ALTER COLUMN conductividad_us_cm DROP NOT NULL,
  ALTER COLUMN ph DROP NOT NULL;

-- sensor_riego_20: hacer NOT NULL las columnas con datos reales del HTS221
-- (primero llenar valores existentes NULL con 0 si existen)
UPDATE sensor_riego_20
  SET temperatura_onboard = 0 WHERE temperatura_onboard IS NULL;
UPDATE sensor_riego_20
  SET humedad_onboard = 0 WHERE humedad_onboard IS NULL;

ALTER TABLE sensor_riego_20
  ALTER COLUMN temperatura_onboard SET NOT NULL,
  ALTER COLUMN humedad_onboard SET NOT NULL;

-- sensor_riego_40: hacer nullable las columnas sin sensor real
ALTER TABLE sensor_riego_40
  ALTER COLUMN temperatura_c DROP NOT NULL,
  ALTER COLUMN conductividad_us_cm DROP NOT NULL,
  ALTER COLUMN ph DROP NOT NULL;

-- sensor_riego_40: hacer NOT NULL las columnas con datos reales del HTS221
UPDATE sensor_riego_40
  SET temperatura_onboard = 0 WHERE temperatura_onboard IS NULL;
UPDATE sensor_riego_40
  SET humedad_onboard = 0 WHERE humedad_onboard IS NULL;

ALTER TABLE sensor_riego_40
  ALTER COLUMN temperatura_onboard SET NOT NULL,
  ALTER COLUMN humedad_onboard SET NOT NULL;
