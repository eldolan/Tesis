export interface SensorRiego {
  id: number
  timestamp: string
  temperatura_c: number
  humedad: number
  conductividad_us_cm: number
  ph: number
  temperatura_onboard: number | null
  humedad_onboard: number | null
  es_evento_riego: boolean
}

export interface SensorFertilizante {
  id: number
  timestamp: string
  nitrogen: number
  phosphorus: number
  potassium: number
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
