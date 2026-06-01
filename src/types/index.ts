export interface SensorRiego {
  id: number
  user_id: string
  timestamp: string
  temperatura_c: number
  humedad: number
  conductividad_us_cm: number
  ph: number
  es_evento_riego: boolean
  es_valido: boolean
}

export interface SensorOnboard {
  id: number
  user_id: string
  device_id: string | null
  timestamp: string
  temperatura: number | null
  humedad: number | null
  created_at: string
}

export interface Notification {
  id: number
  user_id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export interface DecisionRiego {
  id: number
  user_id: string
  timestamp: string
  decision: string
  razon: string | null
  created_at: string
}

export interface ChatSession {
  id: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface UserDocument {
  id: number
  user_id: string
  name: string
  content: string | null
  created_at: string
}

export interface ChileanCity {
  id: number
  name: string
}

export interface WeatherData {
  city: string
  temperature: number
  description: string
  humidity: number
  wind_speed: number
  icon: string
}

/**
 * @deprecated Solo se usaba en use-irrigation-data.ts (hook reescrito en dashboard-chart-realtime-riego).
 * Usar UseIrrigationDataResult en su lugar.
 */
export interface IrrigationData {
  dates: string[]
  sensor1: (number | null)[]
  sensor2: (number | null)[]
  sensor3: (number | null)[]
  irrigation_events: string[]
}

// --- Tipos del gráfico de riego ---

/** Período de visualización del gráfico de riego */
export type IrrigationPeriod = "day" | "week" | "month" | "year"

/** Punto del gráfico ya downsampleado y con promedio calculado */
export interface IrrigationSeriesPoint {
  /** Epoch ms (eje X numérico para ReferenceArea y ticks) */
  ts: number
  sensor20: number | null
  sensor40: number | null
  sensor60: number | null
  average: number | null
}

/** Banda de tiempo con evento de riego activo (epoch ms) */
export interface IrrigationBand {
  start: number
  end: number
}

/** Contrato completo del hook useIrrigationData */
export interface UseIrrigationDataResult {
  /** Puntos ya downsampleados y filtrados por validez */
  points: IrrigationSeriesPoint[]
  /** Bandas de tiempo con eventos de riego */
  irrigationPeriods: IrrigationBand[]
  /** Qué sensores tienen datos disponibles */
  visibleSeries: { sensor20: boolean; sensor40: boolean; sensor60: boolean }
  /** Dominio Y dinámico acotado a [0, 100] */
  yDomain: [number, number]
  /** true cuando >50% del bucket reciente tiene es_valido === false */
  validationPending: boolean
  isLoading: boolean
  period: IrrigationPeriod
  setPeriod: (p: IrrigationPeriod) => void
}

