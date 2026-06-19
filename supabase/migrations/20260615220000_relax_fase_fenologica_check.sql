-- supabase/migrations/20260615220000_relax_fase_fenologica_check.sql
--
-- Qué hace: relaja el CHECK de fase_fenologica en cultivo_config.
--   La columna tenía un CHECK enumerando las 6 fases genéricas; con fases
--   dinámicas por especie (FASES_POR_ESPECIE en src/lib/cultivo.ts) ese
--   CHECK rechazaría ids como 'crecimiento_activo'. La validación de integridad
--   pasa a la capa de aplicación (src/app/api/cultivo/route.ts → fasesValidasParaEspecie).
--
-- Por qué: ADR-0001 (FaseFenologica como string validada en runtime) y
--   Decisión 5 del diseño (fases-cultivo-funcionales). Los datos existentes
--   quedan intactos; la columna sigue siendo text.
--
-- Procedimiento de aplicación:
--   1. supabase migration new (ya hecho — este archivo es la migración)
--   2. supabase db push          (aplica en el proyecto remoto)
--   O bien: supabase db reset    (recrea local desde cero, incluye esta migración)
--   El bloque DO es idempotente: si el CHECK ya fue eliminado, no falla.

DO $$
DECLARE
  c text;
BEGIN
  -- Elimina cualquier CHECK definido sobre la columna fase_fenologica de cultivo_config,
  -- sea cual sea su nombre autogenerado (Supabase genera cultivo_config_fase_fenologica_check
  -- por defecto, pero puede diferir según el entorno).
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'cultivo_config'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%fase_fenologica%'
  LOOP
    EXECUTE format('ALTER TABLE public.cultivo_config DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- Garantías mínimas que reemplazan al CHECK enumerado:
-- 1. DEFAULT para filas sin valor explícito (coherente con FASE_DEFAULT en cultivo.ts).
ALTER TABLE public.cultivo_config
  ALTER COLUMN fase_fenologica SET DEFAULT 'vegetativo';

-- 2. NOT NULL + no vacío (integridad mínima; la validación de ids válidos es responsabilidad de la API).
ALTER TABLE public.cultivo_config
  ADD CONSTRAINT cultivo_config_fase_fenologica_no_vacia
  CHECK (fase_fenologica IS NOT NULL AND length(btrim(fase_fenologica)) > 0);
