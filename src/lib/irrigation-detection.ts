import type { IrrigationBand, IrrigationPeriod, SensorRiego } from "@/types"

/**
 * Detecta si hay un evento de riego basado en aumento de humedad.
 * Replica exactamente la lógica de detectar_evento_riego de routes.py
 */
export function detectarEventoRiego(
  humActual: number | null,
  humAnterior: number | null,
  umbralPorcentaje: number = 10
): boolean {
  if (humActual === null || humAnterior === null) return false
  if (humAnterior <= 0) return false

  const aumentoPorcentual = ((humActual - humAnterior) / humAnterior) * 100
  return aumentoPorcentual >= umbralPorcentaje
}

/**
 * Agrupa timestamps de eventos de riego en bandas contiguas separadas por un gap máximo.
 * Filtra filas que tengan es_valido === false antes de procesar.
 *
 * @param rows - Filas crudas de cualquier sensor (pueden mezclarse 20/40/60)
 * @param gapMs - Gap máximo en ms entre eventos para considerarlos la misma banda (default: 5 min)
 * @returns Array de bandas con start y end en epoch ms
 */
export function computeIrrigationPeriods(
  rows: SensorRiego[],
  gapMs: number = 5 * 60_000
): IrrigationBand[] {
  // Recolectar timestamps únicos de eventos de riego válidos
  const timestamps: number[] = []
  for (const row of rows) {
    if (row.es_evento_riego === true && row.es_valido !== false) {
      timestamps.push(new Date(row.timestamp).getTime())
    }
  }

  if (timestamps.length === 0) return []

  // Ordenar y deduplicar
  const sorted = Array.from(new Set(timestamps)).sort((a, b) => a - b)

  const bands: IrrigationBand[] = []
  let bandStart = sorted[0]
  let bandEnd = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    if (current - bandEnd <= gapMs) {
      // Extender la banda actual
      bandEnd = current
    } else {
      // Cerrar banda actual y abrir una nueva
      bands.push(normalizeBand(bandStart, bandEnd, gapMs))
      bandStart = current
      bandEnd = current
    }
  }
  // Cerrar la última banda
  bands.push(normalizeBand(bandStart, bandEnd, gapMs))

  return bands
}

/** Asegura ancho mínimo visible cuando la banda tiene un único punto */
function normalizeBand(start: number, end: number, gapMs: number): IrrigationBand {
  if (start === end) {
    return { start, end: start + Math.floor(gapMs / 2) }
  }
  return { start, end }
}

/**
 * Devuelve el tamaño del bucket de agrupación (downsample) en ms según el período.
 *
 * | period | bucket       |
 * |--------|-------------|
 * | day    | 15 min      |
 * | week   | 1 hora      |
 * | month  | 1 día       |
 * | year   | 1 día       |
 */
export function bucketMsForPeriod(period: IrrigationPeriod): number {
  switch (period) {
    case "day":   return 15 * 60_000       // 15 minutos
    case "week":  return 60 * 60_000       // 1 hora
    case "month": return 24 * 60 * 60_000  // 1 día
    case "year":  return 24 * 60 * 60_000  // 1 día
  }
}

/**
 * Densidad de inserción asumida: ~5 min/fila → 288 filas/día.
 * Aplica a las vistas day, week y month (year usa RPC de agregación diaria).
 */
const ROWS_PER_DAY = 288

/**
 * Margen de seguridad para absorber ráfagas de datos (p.ej. legado 1 min,
 * reinyecciones) y crecimiento futuro de densidad.
 */
const FETCH_MARGIN = 1.5

/**
 * Calcula el tope de filas por request a PostgREST derivándolo del rango temporal
 * del período, no con un valor fijo. Así si `rangeStartForPeriod` cambia, el límite
 * se ajusta automáticamente.
 *
 * Fórmula: Math.ceil(días × ROWS_PER_DAY × FETCH_MARGIN)
 *
 * | period | días | límite   |
 * |--------|------|----------|
 * | day    |    1 |      432 |
 * | week   |    7 |    3 024 |
 * | month  |   30 |   12 960 |
 * | year   |  365 | (no usado — el hook llama a la RPC get_irrigation_daily) |
 *
 * NOTA: Para year el hook ramifica a la RPC antes de consultar por filas, por lo
 * que este valor no se usa en producción; se devuelve de todas formas para coherencia.
 */
export function fetchLimitForPeriod(period: IrrigationPeriod): number {
  const days =
    period === "day"   ? 1   :
    period === "week"  ? 7   :
    period === "month" ? 30  :
    /* year */           365
  return Math.ceil(days * ROWS_PER_DAY * FETCH_MARGIN)
}

/**
 * Devuelve el epoch ms del inicio del rango de fetch según el período.
 *
 * | period | rango desde ahora |
 * |--------|------------------|
 * | day    | últimas 24 h     |
 * | week   | últimos 7 días   |
 * | month  | últimos 30 días  |
 * | year   | últimos 365 días |
 */
export function rangeStartForPeriod(period: IrrigationPeriod): number {
  const now = Date.now()
  switch (period) {
    case "day":   return now - 24 * 60 * 60_000
    case "week":  return now - 7 * 24 * 60 * 60_000
    case "month": return now - 30 * 24 * 60 * 60_000
    case "year":  return now - 365 * 24 * 60 * 60_000
  }
}
