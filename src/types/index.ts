export interface SensorRiego {
  id: number
  user_id: string
  timestamp: string
  temperatura_c: number
  humedad: number
  conductividad_us_cm: number
  ph: number
  es_evento_riego: boolean
}

export interface SensorFertilizante {
  id: number
  user_id: string
  timestamp: string
  nitrogen: number
  phosphorus: number
  potassium: number
}

export interface SensorOnboard {
  id: number
  user_id: string
  timestamp: string
  temperatura_onboard: number | null
  humedad_onboard: number | null
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

export interface IrrigationData {
  dates: string[]
  sensor1: (number | null)[]
  sensor2: (number | null)[]
  sensor3: (number | null)[]
  irrigation_events: string[]
}

export interface FertilizerData {
  dates: string[]
  nitrogen: number[]
  phosphorus: number[]
  potassium: number[]
  fertilization_events: string[]
}
