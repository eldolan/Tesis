const SENTINEL_VALUES = ["", "-999", "-999.0", "-999.00"]

export const EXPECTED_HEADER = [
  "timestamp", "Temp_20cm", "Hum_20cm", "Cond_20cm", "PH_20cm",
  "N_20cm", "P_20cm", "K_20cm", "Temp_40cm", "Hum_40cm",
  "Cond_40cm", "Temp_60cm", "Hum_60cm", "PH_60cm", "Onboard_Temp", "Onboard_Hum",
]

export function parseFloat_safe(value: string): number | null {
  if (SENTINEL_VALUES.includes(value.trim())) return null
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

export function parseFloat_default(value: string, defaultVal: number = 0): number {
  if (SENTINEL_VALUES.includes(value.trim())) return defaultVal
  const num = parseFloat(value)
  return isNaN(num) ? defaultVal : num
}

export interface ParsedRow {
  timestamp: string
  temp_20: number | null
  hum_20: number | null
  cond_20: number | null
  ph_20: number | null
  n_20: number
  p_20: number
  k_20: number
  temp_40: number | null
  hum_40: number | null
  cond_40: number | null
  temp_60: number | null
  hum_60: number | null
  ph_60: number | null
  onboard_temp: number | null
  onboard_hum: number | null
}

export function parseCSVRow(columns: string[]): ParsedRow {
  const [
    timestamp_str, temp_20_s, hum_20_s, cond_20_s, ph_20_s,
    n_20_s, p_20_s, k_20_s, temp_40_s, hum_40_s,
    cond_40_s, temp_60_s, hum_60_s, ph_60_s, onboard_temp_s, onboard_hum_s,
  ] = columns

  return {
    timestamp: timestamp_str.trim(),
    temp_20: parseFloat_safe(temp_20_s),
    hum_20: parseFloat_safe(hum_20_s),
    cond_20: parseFloat_safe(cond_20_s),
    ph_20: parseFloat_safe(ph_20_s),
    n_20: parseFloat_default(n_20_s),
    p_20: parseFloat_default(p_20_s),
    k_20: parseFloat_default(k_20_s),
    temp_40: parseFloat_safe(temp_40_s),
    hum_40: parseFloat_safe(hum_40_s),
    cond_40: parseFloat_safe(cond_40_s),
    temp_60: parseFloat_safe(temp_60_s),
    hum_60: parseFloat_safe(hum_60_s),
    ph_60: parseFloat_safe(ph_60_s),
    onboard_temp: parseFloat_safe(onboard_temp_s),
    onboard_hum: parseFloat_safe(onboard_hum_s),
  }
}

export function parseCSV(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
  if (lines.length === 0) return { header: [], rows: [] }

  const header = lines[0].split(",").map((h) => h.trim())
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()))

  return { header, rows }
}
