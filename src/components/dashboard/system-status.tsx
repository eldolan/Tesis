"use client"

import { useEffect, useState } from "react"
import {
  Wifi,
  WifiOff,
  Radio,
  Droplets,
  Activity,
  CircleDot,
  Loader2,
  Thermometer,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

type ConnectionState = "connecting" | "connected" | "disconnected"

// Lista configurable de tablas candidatas — agregar aquí al incorporar nuevo hardware
const SENSOR_TABLES = [
  { table: "sensor_riego_20", label: "Sensor 20cm", depth: 20 },
  { table: "sensor_riego_40", label: "Sensor 40cm", depth: 40 },
  { table: "sensor_riego_60", label: "Sensor 60cm", depth: 60 },
] as const

// Umbral de actividad: lecturas más antiguas que 24h se ignoran en el descubrimiento
const VENTANA_DESCUBRIMIENTO_H = 24
// Umbral de estado online: última lectura hace menos de 30 minutos
const UMBRAL_ONLINE_MIN = 30

interface SensorDescubierto {
  table: string
  label: string
  depth: number
  status: "online" | "offline"
  humedad: number | null
  lastReading: string
}

type AmbientReading = { temperatura: number | null; humedad: number | null } | null

// Helper de fecha compacto: distingue lecturas de hoy vs anteriores
function formatLecturaCompacta(date: Date): string {
  const esHoy = date.toDateString() === new Date().toDateString()
  if (esHoy) {
    return (
      "hoy " +
      date.toLocaleString("es-CL", { hour: "2-digit", minute: "2-digit" })
    )
  }
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SystemStatus() {
  const { user } = useAuth()
  const [sensores, setSensores] = useState<SensorDescubierto[]>([])
  const [cargando, setCargando] = useState(true)
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const [irrigating, setIrrigating] = useState(false)
  const [ambiental, setAmbiental] = useState<AmbientReading>(null)

  useEffect(() => {
    if (!user?.id) return

    async function descubrirSensores() {
      setCargando(true)
      const ahora = new Date()
      const hace24h = new Date(ahora.getTime() - VENTANA_DESCUBRIMIENTO_H * 60 * 60 * 1000)
      const descubiertos: SensorDescubierto[] = []
      let regandoAlguno = false

      const client = createClient()

      // Consultar cada tabla candidata — solo incluir las que tienen datos recientes
      for (const def of SENSOR_TABLES) {
        const { data, error } = await client
          .from(def.table)
          .select("timestamp, humedad, es_evento_riego")
          .gte("timestamp", hace24h.toISOString())
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle()

        // Sin datos en las últimas 24h o con error → sensor no descubierto, omitir
        if (error || !data) continue

        const ultimaLectura = new Date(data.timestamp)
        const diffMinutos = (ahora.getTime() - ultimaLectura.getTime()) / 60000
        const status: "online" | "offline" = diffMinutos < UMBRAL_ONLINE_MIN ? "online" : "offline"

        // Acumular flag de riego — evalúa TODOS los sensores (no solo el primero)
        if (data.es_evento_riego) regandoAlguno = true

        descubiertos.push({
          table: def.table,
          label: def.label,
          depth: def.depth,
          status,
          humedad: data.humedad ?? null,
          lastReading: formatLecturaCompacta(ultimaLectura),
        })
      }

      // Llamar setIrrigating una sola vez tras el loop (cubre todos los sensores)
      setIrrigating(regandoAlguno)

      // Query separada al sensor ambiental, ordenada por created_at (no timestamp)
      const { data: ambData, error: ambError } = await client
        .from("sensor_onboard")
        .select("temperatura, humedad, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!ambError && ambData) {
        setAmbiental({ temperatura: ambData.temperatura, humedad: ambData.humedad })
      } else {
        setAmbiental(null)
      }

      // Ordenar por profundidad ascendente
      descubiertos.sort((a, b) => a.depth - b.depth)
      setSensores(descubiertos)
      setCargando(false)
    }

    descubrirSensores()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Suscripción realtime — estado tri-valor (connecting / connected / disconnected)
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel("realtime-status")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_riego_20",
          filter: `user_id=eq.${user.id}`,
        },
        () => {}
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("connected")
        } else if (["TIMED_OUT", "CHANNEL_ERROR", "CLOSED"].includes(status)) {
          setConnectionState("disconnected")
        } else {
          setConnectionState("connecting")
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const totalDescubiertos = sensores.length
  const onlineCount = sensores.filter((s) => s.status === "online").length
  const todosOnline = totalDescubiertos > 0 && onlineCount === totalDescubiertos

  return (
    <div className="flex flex-col h-full px-4 py-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
        Estado del Sistema
      </h3>

      <div className="space-y-2.5 flex-1 flex flex-col justify-center">
        {/* Conexión realtime */}
        <div className="flex items-center gap-2.5 text-sm">
          {connectionState === "connected" ? (
            <Wifi size={16} className="text-green-400 shrink-0" />
          ) : connectionState === "connecting" ? (
            <Wifi size={16} className="text-yellow-500 shrink-0" />
          ) : (
            <WifiOff size={16} className="text-red-400 shrink-0" />
          )}
          <span className="text-foreground">Conexion Realtime</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            connectionState === "connected"
              ? "bg-green-400/10 text-green-400"
              : connectionState === "connecting"
              ? "bg-yellow-500/10 text-yellow-500"
              : "bg-red-400/10 text-red-400"
          }`}>
            {connectionState === "connected"
              ? "Conectado"
              : connectionState === "connecting"
              ? "Conectando…"
              : "Desconectado"}
          </span>
        </div>

        {/* Contador de sensores activos — total dinámico, no hardcodeado */}
        <div className="flex items-center gap-2.5 text-sm">
          <Radio size={16} className={`shrink-0 ${onlineCount > 0 ? "text-green-400" : "text-red-400"}`} />
          <span className="text-foreground">Sensores Activos</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            todosOnline
              ? "bg-green-400/10 text-green-400"
              : onlineCount > 0
              ? "bg-yellow-400/10 text-yellow-400"
              : "bg-red-400/10 text-red-400"
          }`}>
            {cargando ? "..." : `${onlineCount}/${totalDescubiertos}`}
          </span>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="flex items-center gap-2.5 text-sm pl-2 text-muted-foreground">
            <Loader2 size={12} className="shrink-0 animate-spin" />
            <span className="text-xs">Detectando sensores...</span>
          </div>
        )}

        {/* Estado vacío: ninguna tabla con datos en las últimas 24h */}
        {!cargando && totalDescubiertos === 0 && (
          <div className="flex items-center gap-2.5 text-sm pl-2">
            <CircleDot size={12} className="shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sin sensores activos</span>
          </div>
        )}

        {/* Sensores de riego descubiertos dinámicamente */}
        {sensores.map((sensor) => (
          <div key={sensor.table} className="flex items-center gap-2.5 text-sm pl-2">
            <CircleDot
              size={12}
              className={`shrink-0 ${sensor.status === "online" ? "text-green-400" : "text-muted-foreground"}`}
            />
            <span className="text-muted-foreground">{sensor.label}</span>
            <span className={`ml-auto text-[10px] ${
              sensor.status === "online" ? "text-green-400" : "text-muted-foreground"
            }`}>
              {sensor.humedad !== null
                ? `${Math.round(sensor.humedad)}% · ${sensor.lastReading}`
                : "Sin datos"}
            </span>
          </div>
        ))}

        {/* Sensor ambiental — temperatura y humedad de sensor_onboard */}
        <div className="flex items-center gap-2.5 text-sm pl-2">
          <Thermometer
            size={12}
            className={`shrink-0 ${ambiental !== null ? "text-green-400" : "text-muted-foreground"}`}
          />
          <span className="text-muted-foreground">Sensor Ambiental</span>
          <span className={`ml-auto text-[10px] ${ambiental !== null ? "text-green-400" : "text-muted-foreground"}`}>
            {ambiental !== null
              ? `${ambiental.temperatura}°C · ${ambiental.humedad}%`
              : "Sin datos"}
          </span>
        </div>

        {/* Estado del riego */}
        <div className="flex items-center gap-2.5 text-sm">
          <Droplets size={16} className={`shrink-0 ${irrigating ? "text-blue-400" : "text-muted-foreground"}`} />
          <span className="text-foreground">Riego</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            irrigating ? "bg-blue-400/10 text-blue-400" : "bg-muted text-muted-foreground"
          }`}>
            {irrigating ? "Regando" : "Inactivo"}
          </span>
        </div>

        {/* Salud general: Óptimo / Parcial / Sin datos según sensores + connectionState */}
        {(() => {
          const esOptimo = todosOnline && connectionState === "connected"
          const esSinDatos = totalDescubiertos === 0 && connectionState === "disconnected"
          const activityColor = esOptimo
            ? "text-green-400"
            : esSinDatos
            ? "text-red-400"
            : "text-yellow-400"
          const badgeClass = esOptimo
            ? "bg-green-400/10 text-green-400"
            : esSinDatos
            ? "bg-red-400/10 text-red-400"
            : "bg-yellow-400/10 text-yellow-400"
          const label = esOptimo ? "Óptimo" : esSinDatos ? "Sin datos" : "Parcial"
          return (
            <div className="flex items-center gap-2.5 text-sm">
              <Activity size={16} className={`shrink-0 ${activityColor}`} />
              <span className="text-foreground">Salud General</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
                {label}
              </span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
