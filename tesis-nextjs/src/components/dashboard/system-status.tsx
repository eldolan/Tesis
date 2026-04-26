"use client"

import { useEffect, useState } from "react"
import {
  Wifi,
  WifiOff,
  Radio,
  Droplets,
  Activity,
  CircleDot,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface SensorStatus {
  name: string
  depth: string
  online: boolean
  lastReading: string | null
}

export function SystemStatus() {
  const [sensors, setSensors] = useState<SensorStatus[]>([
    { name: "Sensor 20cm", depth: "20cm", online: false, lastReading: null },
    { name: "Sensor 40cm", depth: "40cm", online: false, lastReading: null },
    { name: "Sensor 60cm", depth: "60cm", online: false, lastReading: null },
  ])
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [irrigating, setIrrigating] = useState(false)

  useEffect(() => {
    async function checkSensors() {
      const tables = ["sensor_riego_20", "sensor_riego_40", "sensor_riego_60"] as const
      const now = new Date()
      const updated: SensorStatus[] = []

      for (let i = 0; i < tables.length; i++) {
        const { data } = await supabase
          .from(tables[i])
          .select("timestamp, es_evento_riego")
          .order("timestamp", { ascending: false })
          .limit(1)
          .single()

        const lastTime = data?.timestamp ? new Date(data.timestamp) : null
        const diffMinutes = lastTime ? (now.getTime() - lastTime.getTime()) / 60000 : Infinity
        // Consider sensor "online" if last reading < 30 min ago
        const online = diffMinutes < 30

        if (i === 0 && data?.es_evento_riego) {
          setIrrigating(true)
        }

        updated.push({
          name: `Sensor ${["20", "40", "60"][i]}cm`,
          depth: `${["20", "40", "60"][i]}cm`,
          online,
          lastReading: lastTime
            ? lastTime.toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
            : null,
        })
      }

      setSensors(updated)
    }

    checkSensors()

    // Check realtime connection
    const channel = supabase.channel("status-check")
    channel.subscribe((status) => {
      setRealtimeConnected(status === "SUBSCRIBED")
    })

    return () => { supabase.removeChannel(channel) }
  }, [])

  const onlineCount = sensors.filter((s) => s.online).length

  return (
    <div className="flex flex-col h-full px-4 py-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
        Estado del Sistema
      </h3>

      <div className="space-y-2.5 flex-1 flex flex-col justify-center">
        {/* Realtime connection */}
        <div className="flex items-center gap-2.5 text-sm">
          {realtimeConnected ? (
            <Wifi size={16} className="text-green-400 shrink-0" />
          ) : (
            <WifiOff size={16} className="text-red-400 shrink-0" />
          )}
          <span className="text-foreground">Conexion Realtime</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            realtimeConnected ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
          }`}>
            {realtimeConnected ? "Conectado" : "Desconectado"}
          </span>
        </div>

        {/* Signal / sensors online */}
        <div className="flex items-center gap-2.5 text-sm">
          <Radio size={16} className={`shrink-0 ${onlineCount > 0 ? "text-green-400" : "text-red-400"}`} />
          <span className="text-foreground">Sensores Activos</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            onlineCount === 3 ? "bg-green-400/10 text-green-400" : onlineCount > 0 ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"
          }`}>
            {onlineCount}/3
          </span>
        </div>

        {/* Individual sensors */}
        {sensors.map((sensor) => (
          <div key={sensor.depth} className="flex items-center gap-2.5 text-sm pl-2">
            <CircleDot size={12} className={`shrink-0 ${sensor.online ? "text-green-400" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground">{sensor.name}</span>
            <span className={`ml-auto text-[10px] ${sensor.online ? "text-green-400" : "text-muted-foreground"}`}>
              {sensor.lastReading ?? "Sin datos"}
            </span>
          </div>
        ))}

        {/* Irrigation status */}
        <div className="flex items-center gap-2.5 text-sm">
          <Droplets size={16} className={`shrink-0 ${irrigating ? "text-blue-400" : "text-muted-foreground"}`} />
          <span className="text-foreground">Riego</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            irrigating ? "bg-blue-400/10 text-blue-400" : "bg-muted text-muted-foreground"
          }`}>
            {irrigating ? "Regando" : "Inactivo"}
          </span>
        </div>

        {/* General health */}
        <div className="flex items-center gap-2.5 text-sm">
          <Activity size={16} className={`shrink-0 ${onlineCount === 3 && realtimeConnected ? "text-green-400" : "text-yellow-400"}`} />
          <span className="text-foreground">Salud General</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            onlineCount === 3 && realtimeConnected
              ? "bg-green-400/10 text-green-400"
              : "bg-yellow-400/10 text-yellow-400"
          }`}>
            {onlineCount === 3 && realtimeConnected ? "Optimo" : "Parcial"}
          </span>
        </div>
      </div>
    </div>
  )
}
