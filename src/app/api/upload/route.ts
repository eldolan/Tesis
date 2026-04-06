import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"
import { parseCSV, parseCSVRow, EXPECTED_HEADER } from "@/lib/csv-parser"
import { detectarEventoRiego } from "@/lib/irrigation-detection"
import { timingSafeEqual } from "crypto"

const SENSOR_API_KEY = process.env.SENSOR_API_KEY || "default-sensor-key-change-me"
const MAX_FILE_SIZE = 1024 * 1024 // 1MB

function validateApiKey(provided: string | null): boolean {
  if (!provided || !SENSOR_API_KEY) return false
  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(SENSOR_API_KEY)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  // Auth
  const apiKey = request.headers.get("X-API-Key")
  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: "API key requerida o inválida" }, { status: 401 })
  }

  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for")
  const clientIp = forwarded?.split(",")[0]?.trim() || "127.0.0.1"

  const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
    p_ip_address: clientIp,
  })

  if (allowed === false) {
    return NextResponse.json({ error: "Demasiadas peticiones. Inténtalo más tarde." }, { status: 429 })
  }

  // Parse form data
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No se encontró archivo en la petición" }, { status: 400 })
  }

  if (file.name === "") {
    return NextResponse.json({ error: "No se seleccionó ningún archivo" }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "El archivo debe ser de tipo CSV" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Archivo demasiado grande. Máximo permitido: ${MAX_FILE_SIZE / 1024}KB` },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 })
  }

  try {
    const text = await file.text()
    const { header, rows } = parseCSV(text)

    if (!header || header.length !== 16) {
      return NextResponse.json(
        { error: "Formato CSV inválido. Se esperan 16 columnas (timestamp + 15 datos)." },
        { status: 400 }
      )
    }

    if (JSON.stringify(header) !== JSON.stringify(EXPECTED_HEADER)) {
      return NextResponse.json(
        { error: `Encabezado CSV inválido. Se esperaba: ${EXPECTED_HEADER}` },
        { status: 400 }
      )
    }

    // Get last humidity readings for irrigation detection
    const [last20, last40, last60] = await Promise.all([
      supabaseAdmin.from("sensor_riego_20").select("humedad").order("timestamp", { ascending: false }).limit(1).single(),
      supabaseAdmin.from("sensor_riego_40").select("humedad").order("timestamp", { ascending: false }).limit(1).single(),
      supabaseAdmin.from("sensor_riego_60").select("humedad").order("timestamp", { ascending: false }).limit(1).single(),
    ])

    const lastHumidity = {
      "20cm": last20.data?.humedad ?? null,
      "40cm": last40.data?.humedad ?? null,
      "60cm": last60.data?.humedad ?? null,
    }

    let rowsProcessed = 0
    const errors: string[] = []

    const batch20: Record<string, unknown>[] = []
    const batch40: Record<string, unknown>[] = []
    const batch60: Record<string, unknown>[] = []
    const batchFert: Record<string, unknown>[] = []

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const row = rows[i]

      try {
        if (row.length !== 16) {
          errors.push(`Fila ${rowNum}: número incorrecto de columnas`)
          continue
        }

        const parsed = parseCSVRow(row)

        // Detect irrigation events
        const esEventoRiego20 = detectarEventoRiego(parsed.hum_20, lastHumidity["20cm"])
        const esEventoRiego40 = detectarEventoRiego(parsed.hum_40, lastHumidity["40cm"])
        const esEventoRiego60 = detectarEventoRiego(parsed.hum_60, lastHumidity["60cm"])

        // Sensor 20cm
        if ([parsed.temp_20, parsed.hum_20, parsed.cond_20, parsed.ph_20].every((v) => v !== null)) {
          batch20.push({
            timestamp: parsed.timestamp,
            temperatura_c: Math.round(parsed.temp_20! * 100) / 100,
            humedad: Math.round(Math.max(parsed.hum_20!, 0) * 100) / 100,
            conductividad_us_cm: Math.round(parsed.cond_20! * 100) / 100,
            ph: Math.round(parsed.ph_20! * 100) / 100,
            temperatura_onboard: parsed.onboard_temp !== null ? Math.round(parsed.onboard_temp * 100) / 100 : null,
            humedad_onboard: parsed.onboard_hum !== null ? Math.round(parsed.onboard_hum * 100) / 100 : null,
            es_evento_riego: esEventoRiego20,
          })
          lastHumidity["20cm"] = parsed.hum_20
        }

        // Sensor 40cm (uses pH from 20cm)
        if ([parsed.temp_40, parsed.hum_40, parsed.cond_40].every((v) => v !== null)) {
          batch40.push({
            timestamp: parsed.timestamp,
            temperatura_c: Math.round(parsed.temp_40! * 100) / 100,
            humedad: Math.round(Math.max(parsed.hum_40!, 0) * 100) / 100,
            conductividad_us_cm: Math.round(parsed.cond_40! * 100) / 100,
            ph: Math.round((parsed.ph_20 ?? 0) * 100) / 100,
            temperatura_onboard: parsed.onboard_temp !== null ? Math.round(parsed.onboard_temp * 100) / 100 : null,
            humedad_onboard: parsed.onboard_hum !== null ? Math.round(parsed.onboard_hum * 100) / 100 : null,
            es_evento_riego: esEventoRiego40,
          })
          lastHumidity["40cm"] = parsed.hum_40
        }

        // Sensor 60cm (uses conductivity from 20cm)
        if ([parsed.temp_60, parsed.hum_60, parsed.ph_60].every((v) => v !== null)) {
          batch60.push({
            timestamp: parsed.timestamp,
            temperatura_c: Math.round(parsed.temp_60! * 100) / 100,
            humedad: Math.round(Math.max(parsed.hum_60!, 0) * 100) / 100,
            conductividad_us_cm: Math.round((parsed.cond_20 ?? 0) * 100) / 100,
            ph: Math.round(parsed.ph_60! * 100) / 100,
            temperatura_onboard: parsed.onboard_temp !== null ? Math.round(parsed.onboard_temp * 100) / 100 : null,
            humedad_onboard: parsed.onboard_hum !== null ? Math.round(parsed.onboard_hum * 100) / 100 : null,
            es_evento_riego: esEventoRiego60,
          })
          lastHumidity["60cm"] = parsed.hum_60
        }

        // Fertilizer (NPK from 20cm sensor)
        batchFert.push({
          timestamp: parsed.timestamp,
          nitrogen: Math.round(parsed.n_20 * 100) / 100,
          phosphorus: Math.round(parsed.p_20 * 100) / 100,
          potassium: Math.round(parsed.k_20 * 100) / 100,
        })

        rowsProcessed++
      } catch (e) {
        errors.push(`Fila ${rowNum}: error - ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Batch insert with ON CONFLICT DO NOTHING (upsert with ignoreDuplicates)
    const insertPromises = []
    if (batch20.length > 0) {
      insertPromises.push(
        supabaseAdmin.from("sensor_riego_20").upsert(batch20, { onConflict: "timestamp", ignoreDuplicates: true })
      )
    }
    if (batch40.length > 0) {
      insertPromises.push(
        supabaseAdmin.from("sensor_riego_40").upsert(batch40, { onConflict: "timestamp", ignoreDuplicates: true })
      )
    }
    if (batch60.length > 0) {
      insertPromises.push(
        supabaseAdmin.from("sensor_riego_60").upsert(batch60, { onConflict: "timestamp", ignoreDuplicates: true })
      )
    }
    if (batchFert.length > 0) {
      insertPromises.push(
        supabaseAdmin.from("sensor_fertilizante").upsert(batchFert, { onConflict: "timestamp", ignoreDuplicates: true })
      )
    }

    await Promise.all(insertPromises)

    const responseData: Record<string, unknown> = {
      message: `Archivo procesado exitosamente. ${rowsProcessed} filas agregadas.`,
      rows_processed: rowsProcessed,
    }

    if (errors.length > 0) {
      responseData.warnings = errors.slice(0, 10)
      responseData.total_errors = errors.length
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (e) {
    return NextResponse.json(
      { error: `Error al procesar archivo CSV: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }
}
