"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CityCombobox } from "@/components/city-combobox"
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
      <div className="bg-[#0505053f] rounded-xl h-full flex flex-col items-center justify-center text-center p-6 gap-2">
        <h1 className="text-2xl font-semibold">Clima en {weather.city}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt="icono del clima"
          className="w-20 h-20"
        />
        <h3 className="capitalize text-muted-foreground">{weather.description}</h3>
        <h2 className="text-4xl font-bold text-[#0071FF]">
          {weather.temperature}°C
        </h2>
        <p>Humedad: {weather.humidity}%</p>
        <p>Velocidad del viento: {weather.wind_speed} m/s</p>
        <Button
          variant="outline"
          onClick={handleReset}
          className="mt-2 uppercase tracking-widest"
        >
          Cambiar Ubicación
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
