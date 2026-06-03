"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CityCombobox } from "@/components/city-combobox"
import { MapPin, Thermometer, Droplets, Wind } from "lucide-react"
import type { WeatherData } from "@/types"

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(true)

  // Persiste la ciudad del usuario en su cuenta (best-effort: no rompe el render si falla).
  const persistCity = useCallback(async (cityId: number | null) => {
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciudad_usuario_id: cityId }),
      })
    } catch (error) {
      console.error("No se pudo guardar la preferencia de ciudad:", error)
    }
  }, [])

  // Obtiene el clima de una ciudad y actualiza la UI. No persiste la preferencia.
  const fetchWeather = useCallback(async (cityId: number) => {
    setLoading(true)
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city_id: cityId }),
      })
      if (!res.ok) throw new Error("Error al obtener el clima")
      const data: WeatherData = await res.json()
      setWeather(data)
      setShowForm(false)
    } catch (error) {
      console.error(error)
      alert("La ciudad no fue encontrada o hubo un error.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Selección del usuario: guarda la preferencia por-usuario y muestra el clima.
  const handleSelect = useCallback(
    (cityId: number) => {
      persistCity(cityId)
      fetchWeather(cityId)
    },
    [persistCity, fetchWeather],
  )

  // Al montar: cargar la ciudad guardada en la cuenta. Si no hay y existe una
  // elección previa en localStorage (esquema anterior), migrarla una sola vez.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/preferences")
        if (!res.ok) return
        const { ciudad_usuario_id } = (await res.json()) as {
          ciudad_usuario_id: number | null
        }
        if (cancelled) return

        if (ciudad_usuario_id) {
          fetchWeather(ciudad_usuario_id)
          return
        }

        // Backfill one-time desde el esquema previo (localStorage por-navegador).
        const legacy = localStorage.getItem("ciudad_usuario_id")
        if (legacy) {
          const legacyId = Number(legacy)
          localStorage.removeItem("ciudad_usuario_id")
          if (Number.isInteger(legacyId) && legacyId > 0) {
            await persistCity(legacyId)
            if (!cancelled) fetchWeather(legacyId)
          }
        }
      } catch (error) {
        console.error("No se pudo cargar la preferencia de ciudad:", error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchWeather, persistCity])

  const handleReset = () => {
    persistCity(null)
    localStorage.removeItem("ciudad_usuario_id")
    setWeather(null)
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="bg-[#0505053f] rounded-xl h-full flex flex-col items-center justify-center gap-3 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!showForm && weather) {
    return (
      <div className="bg-[#0505053f] rounded-xl h-full flex flex-col items-center justify-center text-center p-4 gap-1.5">
        <div className="flex items-center gap-1.5 text-lg font-semibold">
          <MapPin size={18} className="text-primary" />
          {weather.city}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt="icono del clima"
          className="w-16 h-16"
        />
        <p className="capitalize text-muted-foreground text-sm">{weather.description}</p>
        <div className="flex items-center gap-1 text-3xl font-bold text-primary">
          <Thermometer size={24} />
          {weather.temperature}°C
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Droplets size={14} /> {weather.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind size={14} /> {weather.wind_speed} m/s
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="mt-1 text-xs text-muted-foreground">
          Cambiar Ubicacion
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-[#0505053f] rounded-xl h-full flex flex-col items-center justify-center p-6">
      <CityCombobox onSelect={handleSelect} />
    </div>
  )
}
