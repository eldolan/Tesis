"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { FertilizerData, SensorFertilizante } from "@/types"

export function useFertilizerData() {
  const [data, setData] = useState<FertilizerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function fetchInitial() {
      const { data: rows } = await supabase
        .from("sensor_fertilizante")
        .select("*")
        .order("timestamp", { ascending: true })

      const readings = (rows ?? []) as SensorFertilizante[]

      setData({
        dates: readings.map((r) => r.timestamp),
        nitrogen: readings.map((r) => r.nitrogen),
        phosphorus: readings.map((r) => r.phosphorus),
        potassium: readings.map((r) => r.potassium),
        fertilization_events: [],
      })
      setIsLoading(false)
    }

    fetchInitial()

    const channel = supabase
      .channel("fertilizer-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_fertilizante" }, () => {
        initialized.current = false
        fetchInitial()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { data, isLoading }
}
