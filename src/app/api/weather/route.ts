import { NextResponse } from "next/server"

const API_KEY = process.env.OPENWEATHER_API_KEY

export async function POST(request: Request) {
  const body = await request.json()

  if (!body?.city_id) {
    return NextResponse.json({ error: "La ciudad es requerida." }, { status: 400 })
  }

  const url = `http://api.openweathermap.org/data/2.5/weather?id=${body.city_id}&appid=${API_KEY}&units=metric&lang=es`

  const res = await fetch(url)
  const data = await res.json()

  if (data.cod !== 200) {
    const errorMessage = data.message || "Error encontrando la ciudad."
    return NextResponse.json({ error: errorMessage }, { status: data.cod || 404 })
  }

  return NextResponse.json({
    city: data.name,
    temperature: Math.round(data.main.temp),
    description: data.weather[0].description,
    humidity: data.main.humidity,
    wind_speed: data.wind.speed,
    icon: data.weather[0].icon,
  })
}
