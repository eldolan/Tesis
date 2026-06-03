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
 * Tope de filas por request a PostgREST.
 * PostgREST corta en su max-rows (~1000); pedimos las MÁS RECIENTES (orden desc)
 * hasta este tope y luego revertimos el array a ascendente antes de usarlo.
 *
 * 1000 cubre de sobra 24h a 5 min (288) y la mayor parte del legado 1 min (1440 > 1000,
 * pero el extremo reciente siempre estará presente). Para week/month/year el extremo
 * reciente también será correcto; solo el extremo antiguo podría truncarse.
 */
export function fetchLimitForPeriod(_period: IrrigationPeriod): number {
  return 1000
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
