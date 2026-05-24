"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { useFertilizerData } from "@/hooks/use-fertilizer-data"

export function FertilizerChart() {
  const { data, isLoading } = useFertilizerData()

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  const chartData = data.dates.map((date, i) => ({
    date,
    dateLabel: new Date(date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
    nitrogen: data.nitrogen[i],
    phosphorus: data.phosphorus[i],
    potassium: data.potassium[i],
  }))

  return (
    <div className="h-full min-h-0 px-2 pt-4">
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
              value: "Nivel de Nutrientes (ppm)",
              angle: -90,
              position: "insideLeft",
              fill: "#c9c9c9",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid #272832", color: "#c9c9c9" }}
            labelStyle={{ color: "#c9c9c9" }}
          />
          <Legend wrapperStyle={{ color: "#c9c9c9" }} />
          <Line type="monotone" dataKey="nitrogen" stroke="#0071FF" strokeWidth={3} dot={false} name="Nitrógeno (N)" />
          <Line type="monotone" dataKey="phosphorus" stroke="#00E396" strokeWidth={3} dot={false} name="Fósforo (P)" />
          <Line type="monotone" dataKey="potassium" stroke="#FEB019" strokeWidth={3} dot={false} name="Potasio (K)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
