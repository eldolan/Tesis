"use client"

import { WeatherWidget } from "./weather-widget"
import { IrrigationChart } from "./irrigation-chart"
import { FertilizerChart } from "./fertilizer-chart"
import { SoilRecommendations } from "./soil-recommendations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 2xl:grid-cols-3 auto-rows-[minmax(400px,45vh)]">
      {/* Box 1: Weather + Info boxes — spans full width on desktop */}
      <Card className="2xl:col-span-3 rounded-[1.4em] shadow-lg">
        <CardContent className="flex flex-col lg:flex-row gap-4 p-4 h-full">
          <div className="flex-1 min-w-[280px]">
            <WeatherWidget />
          </div>
          <div className="flex-1 min-w-[280px] bg-[#0505053f] rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold">Contenedor 2</h2>
            <p className="text-muted-foreground mt-1">Fase de la planta</p>
          </div>
          <div className="flex-1 min-w-[280px] bg-[#0505053f] rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold">Contenedor 3</h2>
            <p className="text-muted-foreground mt-1">Estado del sistema</p>
          </div>
        </CardContent>
      </Card>

      {/* Box 2: Irrigation Chart */}
      <Card className="2xl:col-span-1 rounded-[1.4em] shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 px-6 pt-6 pb-0">
          <CardTitle>Gráfico de Riego</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 pb-6">
          <IrrigationChart />
        </CardContent>
      </Card>

      {/* Box 3: Fertilizer Chart */}
      <Card className="2xl:col-span-1 rounded-[1.4em] shadow-lg">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle>Gráfico Fertilizante (NPK)</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 pb-6">
          <FertilizerChart />
        </CardContent>
      </Card>

      {/* Box 4: Soil Recommendations */}
      <Card className="2xl:col-span-1 rounded-[1.4em] shadow-lg">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle>Recomendación y estado del suelo</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6">
          <SoilRecommendations />
        </CardContent>
      </Card>
    </div>
  )
}
