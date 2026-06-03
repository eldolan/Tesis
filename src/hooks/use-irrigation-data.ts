"use client"

import { useReducer, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  IrrigationPeriod,
  IrrigationSeriesPoint,
  UseIrrigationDataResult,
  SensorRiego,
} from "@/types"
import {
  bucketMsForPeriod,
  fetchLimitForPeriod,
  rangeStartForPeriod,
  computeIrrigationPeriods,
} from "@/lib/irrigation-detection"

// --- Reducer para evitar múltiples setState síncronos en efectos ---

interface IrrigationState {
  rows20: SensorRiego[]
  rows40: SensorRiego[]
  rows60: SensorRiego[]
  // Filas crudas (sin filtrar es_valido) — solo para calcular validationPending
  rawRows20: SensorRiego[]
  rawRows40: SensorRiego[]
  rawRows60: SensorRiego[]
  period: IrrigationPeriod
  isLoading: boolean
  userId: string | null
  // Contador de re-fetch manual (visibilitychange/focus) — incrementar dispara re-run del Efecto 1
  refetchCount: number
}

type IrrigationAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; rows20: SensorRiego[]; rows40: SensorRiego[]; rows60: SensorRiego[]; rawRows20: SensorRiego[]; rawRows40: SensorRiego[]; rawRows60: SensorRiego[]; userId: string }
  | { type: "APPEND_20"; row: SensorRiego }
  | { type: "APPEND_40"; row: SensorRiego }
  | { type: "APPEND_60"; row: SensorRiego }
  | { type: "APPEND_RAW_20"; row: SensorRiego }
  | { type: "APPEND_RAW_40"; row: SensorRiego }
  | { type: "APPEND_RAW_60"; row: SensorRiego }
  | { type: "SET_PERIOD"; period: IrrigationPeriod }
  | { type: "TRIGGER_REFETCH" }

function irrigationReducer(state: IrrigationState, action: IrrigationAction): IrrigationState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, rows20: [], rows40: [], rows60: [], rawRows20: [], rawRows40: [], rawRows60: [], isLoading: true }
    case "FETCH_SUCCESS":
      return {
        ...state,
        rows20: action.rows20,
        rows40: action.rows40,
        rows60: action.rows60,
        rawRows20: action.rawRows20,
        rawRows40: action.rawRows40,
        rawRows60: action.rawRows60,
        userId: action.userId,
        isLoading: false,
      }
    case "APPEND_20":
      return { ...state, rows20: [...state.rows20, action.row] }
    case "APPEND_40":
      return { ...state, rows40: [...state.rows40, action.row] }
    case "APPEND_60":
      return { ...state, rows60: [...state.rows60, action.row] }
    case "APPEND_RAW_20":
      return { ...state, rawRows20: [...state.rawRows20, action.row] }
    case "APPEND_RAW_40":
      return { ...state, rawRows40: [...state.rawRows40, action.row] }
    case "APPEND_RAW_60":
      return { ...state, rawRows60: [...state.rawRows60, action.row] }
    case "SET_PERIOD":
      return { ...state, period: action.period }
    case "TRIGGER_REFETCH":
      return { ...state, refetchCount: state.refetchCount + 1 }
    default:
      return state
  }
}

const initialState: IrrigationState = {
  rows20: [],
  rows40: [],
  rows60: [],
  rawRows20: [],
  rawRows40: [],
  rawRows60: [],
  period: "day",
  isLoading: true,
  userId: null,
  refetchCount: 0,
}

export function useIrrigationData(): UseIrrigationDataResult {
  const [state, dispatch] = useReducer(irrigationReducer, initialState)
  const { rows20, rows40, rows60, rawRows20, rawRows40, rawRows60, period, isLoading, userId, refetchCount } = state

  // Efecto 1: Fetch inicial (se re-ejecuta cuando cambia el período)
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    dispatch({ type: "FETCH_START" })

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const rangeStart = rangeStartForPeriod(period)
      const rangeStartISO = new Date(rangeStart).toISOString()

      // Pedimos las filas MÁS RECIENTES (desc + limit) para evitar el tope de 1000 de PostgREST
      // que, con orden ascendente, descarta el extremo reciente. Revertimos a ascendente después.
      const limit = fetchLimitForPeriod(period)
      const [res20, res40, res60] = await Promise.all([
        supabase
          .from("sensor_riego_20")
          .select("*")
          .eq("user_id", user.id)
          .gte("timestamp", rangeStartISO)
          .order("timestamp", { ascending: false })
          .limit(limit),
        supabase
          .from("sensor_riego_40")
          .select("*")
          .eq("user_id", user.id)
          .gte("timestamp", rangeStartISO)
          .order("timestamp", { ascending: false })
          .limit(limit),
        supabase
          .from("sensor_riego_60")
          .select("*")
          .eq("user_id", user.id)
          .gte("timestamp", rangeStartISO)
          .order("timestamp", { ascending: false })
          .limit(limit),
      ])

      if (cancelled) return

      // Filas crudas (sin filtrar) — revertir a ascendente para el resto del hook
      const raw20 = ((res20.data ?? []) as SensorRiego[]).reverse()
      const raw40 = ((res40.data ?? []) as SensorRiego[]).reverse()
      const raw60 = ((res60.data ?? []) as SensorRiego[]).reverse()

      // Filtrar filas inválidas para las series del gráfico (es_valido !== false incluye true y null/undefined)
      const valid20 = raw20.filter(r => r.es_valido !== false)
      const valid40 = raw40.filter(r => r.es_valido !== false)
      const valid60 = raw60.filter(r => r.es_valido !== false)

      dispatch({
        type: "FETCH_SUCCESS",
        rows20: valid20, rows40: valid40, rows60: valid60,
        rawRows20: raw20, rawRows40: raw40, rawRows60: raw60,
        userId: user.id,
      })
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [period, refetchCount])

  // Efecto 2: Red de seguridad — refetch al volver al foco/pestaña visible
  // Garantiza datos frescos si la suscripción realtime se cayó o quedó sin token.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        dispatch({ type: "TRIGGER_REFETCH" })
      }
    }
    function handleFocus() {
      if (document.visibilityState === "visible") {
        dispatch({ type: "TRIGGER_REFETCH" })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  // Efecto 3: Suscripción Realtime (append incremental, sin re-fetch completo)
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const rangeStart = rangeStartForPeriod(period)
    const channelName = `irrigation-realtime-${period}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_riego_20",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SensorRiego
          if (new Date(row.timestamp).getTime() < rangeStart) return
          // Acumular fila cruda para cálculo de validationPending
          dispatch({ type: "APPEND_RAW_20", row })
          // Solo agregar a las series del gráfico si la fila es válida
          if (row.es_valido === false) return
          dispatch({ type: "APPEND_20", row })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_riego_40",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SensorRiego
          if (new Date(row.timestamp).getTime() < rangeStart) return
          dispatch({ type: "APPEND_RAW_40", row })
          if (row.es_valido === false) return
          dispatch({ type: "APPEND_40", row })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_riego_60",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SensorRiego
          if (new Date(row.timestamp).getTime() < rangeStart) return
          dispatch({ type: "APPEND_RAW_60", row })
          if (row.es_valido === false) return
          dispatch({ type: "APPEND_60", row })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [period, userId])

  // useMemo: downsample por bucket → IrrigationSeriesPoint[]
  const points = useMemo<IrrigationSeriesPoint[]>(() => {
    const bucketMs = bucketMsForPeriod(period)

    // Acumular sumas y conteos por bucket por sensor
    const map20 = new Map<number, { sum: number; count: number }>()
    const map40 = new Map<number, { sum: number; count: number }>()
    const map60 = new Map<number, { sum: number; count: number }>()

    function accumulate(
      rows: SensorRiego[],
      map: Map<number, { sum: number; count: number }>
    ) {
      for (const row of rows) {
        const ts = new Date(row.timestamp).getTime()
        const bucket = Math.floor(ts / bucketMs) * bucketMs
        const existing = map.get(bucket)
        if (existing) {
          existing.sum += row.humedad
          existing.count++
        } else {
          map.set(bucket, { sum: row.humedad, count: 1 })
        }
      }
    }

    accumulate(rows20, map20)
    accumulate(rows40, map40)
    accumulate(rows60, map60)

    // Unificar todos los buckets
    const allBuckets = new Set<number>([
      ...map20.keys(),
      ...map40.keys(),
      ...map60.keys(),
    ])

    const result: IrrigationSeriesPoint[] = []
    for (const bucket of allBuckets) {
      const v20 = map20.get(bucket)
      const v40 = map40.get(bucket)
      const v60 = map60.get(bucket)

      const sensor20 = v20 ? v20.sum / v20.count : null
      const sensor40 = v40 ? v40.sum / v40.count : null
      const sensor60 = v60 ? v60.sum / v60.count : null

      const vals = [sensor20, sensor40, sensor60].filter((v): v is number => v !== null)
      const average = vals.length > 0
        ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
        : null

      result.push({ ts: bucket, sensor20, sensor40, sensor60, average })
    }

    return result.sort((a, b) => a.ts - b.ts)
  }, [rows20, rows40, rows60, period])

  // useMemo: bandas de períodos de riego
  const irrigationPeriods = useMemo(
    () => computeIrrigationPeriods([...rows20, ...rows40, ...rows60]),
    [rows20, rows40, rows60]
  )

  // useMemo: qué series tienen datos
  const visibleSeries = useMemo(
    () => ({
      sensor20: points.some(p => p.sensor20 != null),
      sensor40: points.some(p => p.sensor40 != null),
      sensor60: points.some(p => p.sensor60 != null),
    }),
    [points]
  )

  // useMemo: dominio Y dinámico acotado a [0, 100]
  const yDomain = useMemo<[number, number]>(() => {
    const values: number[] = []
    for (const p of points) {
      if (visibleSeries.sensor20 && p.sensor20 != null) values.push(p.sensor20)
      if (visibleSeries.sensor40 && p.sensor40 != null) values.push(p.sensor40)
      if (visibleSeries.sensor60 && p.sensor60 != null) values.push(p.sensor60)
    }
    if (values.length === 0) return [0, 100]

    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max(2, (max - min) * 0.1)

    return [
      Math.max(0, Math.floor(min - pad)),
      Math.min(100, Math.ceil(max + pad)),
    ]
  }, [points, visibleSeries])

  // useMemo: aviso de validación (>50% del bucket reciente es inválido)
  // Usa rawRows (sin filtrar) para que las filas con es_valido === false sean visibles al cómputo.
  // La "ventana reciente" se define relativa al último timestamp de las filas crudas
  // para evitar Date.now() (función impura en fase de render).
  const validationPending = useMemo(() => {
    const bucketMs = bucketMsForPeriod(period)
    const allRawRows = [...rawRows20, ...rawRows40, ...rawRows60]
    if (allRawRows.length === 0) return false

    // Último timestamp disponible en las filas crudas (evita Date.now() impuro)
    const latestTs = Math.max(...allRawRows.map(r => new Date(r.timestamp).getTime()))
    const windowStart = latestTs - bucketMs

    const ventana = allRawRows.filter(r => new Date(r.timestamp).getTime() >= windowStart)
    if (ventana.length === 0) return false

    const invalidos = ventana.filter(r => r.es_valido === false).length
    return invalidos / ventana.length > 0.5
  }, [rawRows20, rawRows40, rawRows60, period])

  const setPeriod = (p: IrrigationPeriod) => dispatch({ type: "SET_PERIOD", period: p })

  return {
    points,
    irrigationPeriods,
    visibleSeries,
    yDomain,
    validationPending,
    isLoading,
    period,
    setPeriod,
  }
}
