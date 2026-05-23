"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase/client"
import type { IrrigationData, SensorRiego } from "@/types"

export function useIrrigationData() {
  const [data, setData] = useState<IrrigationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function fetchInitial() {
      const [res20, res40, res60] = await Promise.all([
        getSupabase().from("sensor_riego_20").select("*").order("timestamp", { ascending: true }),
        getSupabase().from("sensor_riego_40").select("*").order("timestamp", { ascending: true }),
        getSupabase().from("sensor_riego_60").select("*").order("timestamp", { ascending: true }),
      ])

      const rows20 = (res20.data ?? []) as SensorRiego[]
      const rows40 = (res40.data ?? []) as SensorRiego[]
      const rows60 = (res60.data ?? []) as SensorRiego[]

      const allTimestamps = new Set<string>()
      for (const r of [...rows20, ...rows40, ...rows60]) {
        allTimestamps.add(r.timestamp)
      }
      const sortedDates = Array.from(allTimestamps).sort()

      const map20 = new Map(rows20.map((r) => [r.timestamp, r]))
      const map40 = new Map(rows40.map((r) => [r.timestamp, r]))
      const map60 = new Map(rows60.map((r) => [r.timestamp, r]))

      const irrigationEvents: string[] = []
      const sensor1: (number | null)[] = []
      const sensor2: (number | null)[] = []
      const sensor3: (number | null)[] = []

      for (const ts of sortedDates) {
        const r20 = map20.get(ts)
        const r40 = map40.get(ts)
        const r60 = map60.get(ts)

        sensor1.push(r20?.humedad ?? null)
        sensor2.push(r40?.humedad ?? null)
        sensor3.push(r60?.humedad ?? null)

        if (r20?.es_evento_riego || r40?.es_evento_riego || r60?.es_evento_riego) {
          irrigationEvents.push(ts)
        }
      }

      setData({ dates: sortedDates, sensor1, sensor2, sensor3, irrigation_events: irrigationEvents })
      setIsLoading(false)
    }

    fetchInitial()

    // Suscribirse a inserts en tiempo real
    const channel = getSupabase()
      .channel("irrigation-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_riego_20" }, () => {
        // Re-fetch on new data for simplicity
        initialized.current = false
        fetchInitial()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_riego_40" }, () => {
        initialized.current = false
        fetchInitial()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_riego_60" }, () => {
        initialized.current = false
        fetchInitial()
      })
      .subscribe()

    return () => {
      getSupabase().removeChannel(channel)
    }
  }, [])

  return { data, isLoading }
}
