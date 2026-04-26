"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIrrigationData } from "@/hooks/use-irrigation-data"

type ViewMode = "stacked" | "sum"

export function IrrigationChart() {
  const { data, isLoading } = useIrrigationData()
  const [viewMode, setViewMode] = useState<ViewMode>("stacked")

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  const chartData = data.dates.map((date, i) => {
    const s1 = data.sensor1[i]
    const s2 = data.sensor2[i]
    const s3 = data.sensor3[i]
    const validValues = [s1, s2, s3].filter((v): v is number => v !== null)
    const avg = validValues.length > 0
      ? parseFloat((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2))
      : null

    return {
      date,
      dateLabel: new Date(date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
      sensor20: s1,
      sensor40: s2,
      sensor60: s3,
      average: avg,
    }
  })

  const irrigationEventDates = new Set(
    data.irrigation_events.map((e) => new Date(e).toISOString().split("T")[0])
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end gap-2 px-6 pb-2">
        <Button
          variant={viewMode === "stacked" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("stacked")}
        >
          Apilado
        </Button>
        <Button
          variant={viewMode === "sum" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("sum")}
        >
          Sumatoria
        </Button>
      </div>

      <div className="flex-1 min-h-0 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#55555533" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#c9c9c9", fontSize: 12 }}
              stroke="#55555533"
            />
            <YAxis
              tick={{ fill: "#c9c9c9", fontSize: 12 }}
              stroke="#55555533"
              label={{
                value: viewMode === "sum" ? "Humedad Promedio Total" : "Humedad del Suelo",
                angle: -90,
                position: "insideLeft",
                fill: "#c9c9c9",
                fontSize: 12,
              }}
              domain={viewMode === "sum" ? [40, 100] : ["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid #272832", color: "#c9c9c9" }}
              labelStyle={{ color: "#c9c9c9" }}
            />

            {viewMode === "sum" && (
              <>
                <ReferenceArea y1={90} y2={100} fill="#0071FF" fillOpacity={0.15} label={{ value: "Nivel de Lleno", fill: "#fff", fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceArea y1={70} y2={90} fill="#00E396" fillOpacity={0.1} label={{ value: "Punto de Recarga", fill: "#fff", fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceArea y1={55} y2={70} fill="#FEB019" fillOpacity={0.1} label={{ value: "Inicio de Estrés", fill: "#fff", fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceArea y1={40} y2={55} fill="#fe2819" fillOpacity={0.1} label={{ value: "Peligro Estrés Extremo", fill: "#fff", fontSize: 10, position: "insideTopLeft" }} />
                <Line type="monotone" dataKey="average" stroke="#0071FF" strokeWidth={3} dot={false} name="Sumatoria" />
              </>
            )}

            {viewMode === "stacked" && (
              <>
                {chartData.map((point, i) => {
                  const dayStr = new Date(point.date).toISOString().split("T")[0]
                  if (irrigationEventDates.has(dayStr)) {
                    return (
                      <ReferenceArea
                        key={`irrigation-${i}`}
                        x1={point.dateLabel}
                        x2={point.dateLabel}
                        fill="#0071FF"
                        fillOpacity={0.15}
                        label={{ value: "Riego", fill: "#fff", fontSize: 10 }}
                      />
                    )
                  }
                  return null
                })}
                <Legend wrapperStyle={{ color: "#c9c9c9" }} />
                <Line type="monotone" dataKey="sensor20" stroke="#0071FF" strokeWidth={3} dot={false} name="Sensor 20cm" />
                <Line type="monotone" dataKey="sensor40" stroke="#00E396" strokeWidth={3} dot={false} name="Sensor 40cm" />
                <Line type="monotone" dataKey="sensor60" stroke="#FEB019" strokeWidth={3} dot={false} name="Sensor 60cm" />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
