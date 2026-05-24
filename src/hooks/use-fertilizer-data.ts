"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { FertilizerData, SensorFertilizante } from "@/types"

export function useFertilizerData() {
  const [data, setData] = useState<FertilizerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = createClient()
    // Referencia al canal para poder hacer cleanup en el return
    let cleanup: (() => void) | undefined

    async function fetchInitial() {
      // Verificar usuario autenticado antes de consultar
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setData({ dates: [], nitrogen: [], phosphorus: [], potassium: [], fertilization_events: [] })
        setIsLoading(false)
        return
      }

      const { data: rows } = await supabase
        .from("sensor_fertilizante")
        .select("*")
        .eq("user_id", user.id)
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

      // Suscribir canal Realtime filtrado por usuario, solo después de conocer el uid
      const channel = supabase
        .channel("fertilizer-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sensor_fertilizante",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            initialized.current = false
            fetchInitial()
          }
        )
        .subscribe()

      cleanup = () => { supabase.removeChannel(channel) }
    }

    fetchInitial()

    return () => { cleanup?.() }
  }, [])

  return { data, isLoading }
}
