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
      localStorage.setItem("ciudad_usuario_id", String(cityId))
    } catch (error) {
      console.error(error)
      alert("La ciudad no fue encontrada o hubo un error.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedCityId = localStorage.getItem("ciudad_usuario_id")
    if (savedCityId) {
      fetchWeather(Number(savedCityId))
    }
  }, [fetchWeather])

  const handleReset = () => {
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
      <CityCombobox onSelect={fetchWeather} />
    </div>
  )
}
