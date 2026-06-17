"use client"

import React, { useState } from "react"
import type { CSSProperties } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIrrigationData } from "@/hooks/use-irrigation-data"
import type { IrrigationPeriod } from "@/types"

type ViewMode = "stacked" | "sum"

// Bandas agronómicas (solo en vista Sumatoria)
const ZONAS_AGRONOMICAS = [
  { y1: 90, y2: 100, color: "#0071FF", label: "Nivel de Lleno" },
  { y1: 70, y2: 90,  color: "#00E396", label: "Punto de Recarga" },
  { y1: 55, y2: 70,  color: "#FEB019", label: "Inicio de Estrés" },
  { y1: 40, y2: 55,  color: "#fe2819", label: "Peligro Estrés Extremo" },
] as const

const PERIOD_LABELS: Record<IrrigationPeriod, string> = {
  day:   "Día",
  week:  "Semana",
  month: "Mes",
  year:  "Año",
}

const PERIODS: IrrigationPeriod[] = ["day", "week", "month", "year"]

export function IrrigationChart() {
  const {
    points,
    irrigationPeriods,
    visibleSeries,
    yDomain,
    validationPending,
    isLoading,
    period,
    setPeriod,
  } = useIrrigationData()

  const [viewMode, setViewMode] = useState<ViewMode>("stacked")

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  // ChartConfig condicional según series con datos
  const chartConfig: ChartConfig = {
    ...(visibleSeries.sensor20 && {
      sensor20: { label: "Sensor 20cm", color: "#0071FF" },
    }),
    ...(visibleSeries.sensor40 && {
      sensor40: { label: "Sensor 40cm", color: "#00E396" },
    }),
    ...(visibleSeries.sensor60 && {
      sensor60: { label: "Sensor 60cm", color: "#FEB019" },
    }),
    average: { label: "Promedio", color: "#0071FF" },
  }

  // Formateador del eje X adaptativo según el período activo
  function tickFormatter(value: number): string {
    const date = new Date(value)
    if (period === "day") {
      return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    }
    if (period === "year") {
      return date.toLocaleDateString("es-CL", { month: "short", year: "2-digit" })
    }
    return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
  }

  const labelYAxis = viewMode === "sum" ? "Humedad promedio (%)" : "Humedad (%)"

  // Dominio Y efectivo: en modo "sum" se expande para cubrir siempre las bandas agronómicas (40-100)
  const effectiveDomain: [number, number] = viewMode === "sum"
    ? [Math.min(yDomain[0], 40), Math.max(yDomain[1], 100)]
    : yDomain

  return (
    <div
      className="flex flex-col h-full"
      style={
        {
          "--color-sensor20": "#0071FF",
          "--color-sensor40": "#00E396",
          "--color-sensor60": "#FEB019",
          "--color-average":  "#0071FF",
        } as CSSProperties
      }
    >
      {/* Controles: selector de período + toggle de vista */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2 pb-1">
        {/* Selector de período */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              className="h-9 px-3 text-xs @xl:h-7 @xl:px-2"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>

        {/* Toggle Apilado / Sumatoria */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === "stacked" ? "default" : "outline"}
            size="sm"
            className="h-9 px-3 text-xs @xl:h-7 @xl:px-2"
            onClick={() => setViewMode("stacked")}
          >
            Apilado
          </Button>
          <Button
            variant={viewMode === "sum" ? "default" : "outline"}
            size="sm"
            className="h-9 px-3 text-xs @xl:h-7 @xl:px-2"
            onClick={() => setViewMode("sum")}
          >
            Sumatoria
          </Button>
        </div>
      </div>

      {/* Aviso de validación */}
      {validationPending && (
        <div className="px-4 pb-1">
          <Alert variant="default" className="py-2">
            <AlertDescription className="text-xs">
              Datos en validación
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Empty state */}
      {points.length === 0 && !isLoading && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Sin datos para el período seleccionado
        </div>
      )}

      {/* Gráfico */}
      {points.length > 0 && (
        <div className="flex-1 min-h-0 px-2 pb-2">
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <LineChart
              data={points}
              margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                interval="preserveStartEnd"
                minTickGap={40}
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11 }}
              />

              <YAxis
                domain={effectiveDomain}
                label={{
                  value: labelYAxis,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 10, fill: "var(--muted-foreground)" },
                }}
                tick={{ fontSize: 11 }}
                width={50}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, payload) => {
                      const ts = payload?.[0]?.payload?.ts as number | undefined
                      return typeof ts === "number" ? tickFormatter(ts) : ""
                    }}
                    formatter={(value) => [`${Math.round(value as number)}%`]}
                  />
                }
              />

              <ChartLegend content={<ChartLegendContent />} />

              {/* Bandas de períodos de riego (ambas vistas) */}
              {irrigationPeriods.map((band, idx) => (
                <ReferenceArea
                  key={`riego-${idx}`}
                  x1={band.start}
                  x2={band.end}
                  fill="#0071FF"
                  fillOpacity={0.15}
                />
              ))}

              {/* Vista Apilado: una línea por sensor visible */}
              {viewMode === "stacked" && (
                <>
                  {visibleSeries.sensor20 && (
                    <Line
                      type="monotone"
                      dataKey="sensor20"
                      name="sensor20"
                      stroke="var(--color-sensor20)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {visibleSeries.sensor40 && (
                    <Line
                      type="monotone"
                      dataKey="sensor40"
                      name="sensor40"
                      stroke="var(--color-sensor40)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {visibleSeries.sensor60 && (
                    <Line
                      type="monotone"
                      dataKey="sensor60"
                      name="sensor60"
                      stroke="var(--color-sensor60)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </>
              )}

              {/* Vista Sumatoria: línea promedio + zonas agronómicas */}
              {viewMode === "sum" && (
                <>
                  {/* Zonas agronómicas como ReferenceArea horizontal */}
                  {ZONAS_AGRONOMICAS.map((zona) => {
                    // Solo renderizar si la zona intersecta con el dominio Y visible
                    if (zona.y1 > effectiveDomain[1] || zona.y2 < effectiveDomain[0]) return null
                    return (
                      <ReferenceArea
                        key={zona.label}
                        y1={zona.y1}
                        y2={zona.y2}
                        fill={zona.color}
                        fillOpacity={0.12}
                        label={{
                          value: zona.label,
                          position: "insideTopRight",
                          style: { fontSize: 9, fill: "#c9c9c9" },
                        }}
                      />
                    )
                  })}

                  <Line
                    type="monotone"
                    dataKey="average"
                    name="average"
                    stroke="var(--color-average)"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                </>
              )}
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </div>
  )
}
