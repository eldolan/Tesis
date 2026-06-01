"use client"

import React, { useContext } from "react"
import {
  XYChart,
  AnimatedLineSeries,
  AnimatedAxis,
  AnimatedGrid,
  Tooltip,
  buildChartTheme,
  DataContext,
} from "@visx/xychart"
import { ParentSize } from "@visx/responsive"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIrrigationData } from "@/hooks/use-irrigation-data"

type ViewMode = "stacked" | "sum"

// Colores de la página
const accentColors = ["#0071FF", "#00E396", "#FEB019"] as const

// Bandas agronómicas (solo en vista Sumatoria)
const ZONAS_AGRONOMICAS = [
  { y1: 90, y2: 100, color: "#0071FF", label: "Nivel de Lleno" },
  { y1: 70, y2: 90,  color: "#00E396", label: "Punto de Recarga" },
  { y1: 55, y2: 70,  color: "#FEB019", label: "Inicio de Estrés" },
  { y1: 40, y2: 55,  color: "#fe2819", label: "Peligro Estrés Extremo" },
] as const

// Tema personalizado del chart
const chartTheme = buildChartTheme({
  colors: [...accentColors],
  backgroundColor: "transparent",
  gridColor: "#55555533",
  tickLength: 4,
  gridColorDark: "#55555533",
})

// Punto del dataset normalizado
interface ChartPoint {
  date: Date
  sensor20: number | null
  sensor40: number | null
  sensor60: number | null
  average: number | null
}

// Componente interno que accede al DataContext de XYChart para dibujar bandas
function BandasAgronomicas() {
  const ctx = useContext(DataContext)
  if (!ctx) return null

  const { yScale, xScale, innerWidth } = ctx

  // Verificar que las escalas están disponibles y son funciones
  if (!yScale || !xScale || typeof yScale !== "function" || innerWidth === undefined) {
    return null
  }

  const width = innerWidth ?? 0

  return (
    <g>
      {ZONAS_AGRONOMICAS.map((zona) => {
        const y1px = yScale(zona.y2) as number
        const y2px = yScale(zona.y1) as number
        const height = Math.abs(y2px - y1px)
        const yTop = Math.min(y1px, y2px)
        return (
          <g key={zona.label}>
            <rect
              x={0}
              y={yTop}
              width={width}
              height={height}
              fill={zona.color}
              fillOpacity={0.12}
            />
            <text
              x={width - 4}
              y={yTop + 12}
              textAnchor="end"
              fill="#c9c9c9"
              fontSize={10}
            >
              {zona.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export function IrrigationChart() {
  const { data, isLoading } = useIrrigationData()
  const [viewMode, setViewMode] = React.useState<ViewMode>("stacked")

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  // Normalizar el dataset: arrays paralelos → array de ChartPoint con date: Date
  const chartData: ChartPoint[] = data.dates.map((rawDate, i) => {
    const s1 = data.sensor1[i]
    const s2 = data.sensor2[i]
    const s3 = data.sensor3[i]
    const validValues = [s1, s2, s3].filter((v): v is number => v !== null)
    const avg = validValues.length > 0
      ? parseFloat((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2))
      : null

    return {
      date: new Date(rawDate),
      sensor20: s1,
      sensor40: s2,
      sensor60: s3,
      average: avg,
    }
  })

  // Filtrar nulls por serie para manejo de gaps (D5: filtrado, no segmentación)
  const s20 = chartData.filter(d => d.sensor20 != null)
  const s40 = chartData.filter(d => d.sensor40 != null)
  const s60 = chartData.filter(d => d.sensor60 != null)
  const sAvg = chartData.filter(d => d.average != null)

  // Formato de eje X: DD mmm
  const formatTickX = (d: unknown): string => {
    const date = d instanceof Date ? d : new Date(d as string)
    return date.toLocaleString("es-CL", { day: "2-digit", month: "short" })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controles de vista */}
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

      {/* Leyenda de colores (solo en vista Apilado) */}
      {viewMode === "stacked" && (
        <div className="flex gap-4 px-6 pb-1">
          {[
            { color: accentColors[0], label: "20cm" },
            { color: accentColors[1], label: "40cm" },
            { color: accentColors[2], label: "60cm" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico */}
      <div className="flex-1 min-h-0 px-2">
        <ParentSize>
          {({ width, height }) => {
            if (width < 10 || height < 10) return null
            return (
              <XYChart
                width={width}
                height={height}
                theme={chartTheme}
                xScale={{ type: "time" }}
                yScale={{ type: "linear", domain: [0, 100], zero: true }}
              >
                <AnimatedGrid columns={false} numTicks={4} />
                <AnimatedAxis
                  orientation="bottom"
                  tickFormat={formatTickX}
                  tickLabelProps={{ fill: "#c9c9c9", fontSize: 11 }}
                />
                <AnimatedAxis
                  orientation="left"
                  numTicks={5}
                  tickLabelProps={{ fill: "#c9c9c9", fontSize: 11 }}
                />

                {viewMode === "sum" && (
                  <>
                    {/* Bandas agronómicas renderizadas antes de la serie (z-order fondo)
                        Método: DataContext para usar la misma yScale que XYChart (D5) */}
                    <BandasAgronomicas />
                    <AnimatedLineSeries
                      dataKey="average"
                      data={sAvg}
                      xAccessor={(d) => d.date}
                      yAccessor={(d) => d.average!}
                      stroke={accentColors[0]}
                      strokeWidth={3}
                    />
                  </>
                )}

                {viewMode === "stacked" && (
                  <>
                    <AnimatedLineSeries
                      dataKey="sensor20"
                      data={s20}
                      xAccessor={(d) => d.date}
                      yAccessor={(d) => d.sensor20!}
                      stroke={accentColors[0]}
                      strokeWidth={3}
                    />
                    <AnimatedLineSeries
                      dataKey="sensor40"
                      data={s40}
                      xAccessor={(d) => d.date}
                      yAccessor={(d) => d.sensor40!}
                      stroke={accentColors[1]}
                      strokeWidth={3}
                    />
                    <AnimatedLineSeries
                      dataKey="sensor60"
                      data={s60}
                      xAccessor={(d) => d.date}
                      yAccessor={(d) => d.sensor60!}
                      stroke={accentColors[2]}
                      strokeWidth={3}
                    />
                  </>
                )}

                <Tooltip
                  snapTooltipToDatumX
                  showVerticalCrosshair
                  showSeriesGlyphs
                  renderTooltip={({ tooltipData }) => {
                    if (!tooltipData?.nearestDatum) return null
                    const nearestDate = (tooltipData.nearestDatum.datum as ChartPoint).date
                    const dateStr = nearestDate.toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    return (
                      <div
                        style={{
                          background: "#2a2a2a",
                          color: "#c9c9c9",
                          border: "1px solid #272832",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ marginBottom: 4, fontWeight: 600 }}>{dateStr}</div>
                        {Object.entries(tooltipData.datumByKey).map(([key, entry]) => {
                          const point = entry.datum as ChartPoint
                          const val = key === "average"
                            ? point.average
                            : key === "sensor20"
                            ? point.sensor20
                            : key === "sensor40"
                            ? point.sensor40
                            : point.sensor60
                          const colorMap: Record<string, string> = {
                            sensor20: accentColors[0],
                            sensor40: accentColors[1],
                            sensor60: accentColors[2],
                            average: accentColors[0],
                          }
                          const labelMap: Record<string, string> = {
                            sensor20: "20cm",
                            sensor40: "40cm",
                            sensor60: "60cm",
                            average: "Promedio",
                          }
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: colorMap[key] ?? "#c9c9c9",
                                }}
                              />
                              <span>{labelMap[key] ?? key}:</span>
                              <span style={{ fontWeight: 600 }}>
                                {val != null ? `${Math.round(val)}%` : "—"}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }}
                />
              </XYChart>
            )
          }}
        </ParentSize>
      </div>
    </div>
  )
}
