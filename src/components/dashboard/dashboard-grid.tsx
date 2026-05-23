"use client"

import Image from "next/image"
import { WeatherWidget } from "./weather-widget"
import { IrrigationChart } from "./irrigation-chart"
import { PlantTimeline } from "./plant-timeline"
import { SystemStatus } from "./system-status"
import { SoilChat } from "./soil-chat"
import { FadeContent } from "@/components/ui/fade-content"
import { useAuth } from "@/contexts/auth-context"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

function BentoCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <FadeContent delay={delay} duration={600} blur className={className}>
      <div className="ring-1 ring-border bg-card text-card-foreground shadow shadow-black/5 rounded-2xl overflow-hidden h-full">
        {children}
      </div>
    </FadeContent>
  )
}

export function DashboardGrid() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <FadeContent delay={0} duration={400} blur={false} initialY={-8}>
        <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.svg"
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-sm font-semibold text-foreground hidden sm:block tracking-tight">
              Panel de Control
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            >
              <LogOut size={15} />
            </Button>
          </div>
        </header>
      </FadeContent>

      {/* Bento grid */}
      <main className="flex-1 p-4 md:p-5">
        <div className="@container mx-auto max-w-[1600px]">
          <div className="grid gap-3 grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-6">

            {/* Weather Widget — 2 / 6 cols */}
            <BentoCard delay={80} className="@5xl:col-span-2 min-h-[220px]">
              <div className="p-5 h-full">
                <WeatherWidget />
              </div>
            </BentoCard>

            {/* Plant Timeline — 2 / 6 cols */}
            <BentoCard delay={160} className="@5xl:col-span-2 min-h-[220px]">
              <div className="p-5 h-full">
                <PlantTimeline />
              </div>
            </BentoCard>

            {/* System Status — 2 / 6 cols */}
            <BentoCard delay={240} className="@5xl:col-span-2 min-h-[220px]">
              <div className="p-5 h-full">
                <SystemStatus />
              </div>
            </BentoCard>

            {/* Irrigation Chart — 4 / 6 cols */}
            <BentoCard delay={320} className="@xl:col-span-2 @5xl:col-span-4 h-[480px]">
              <div className="flex flex-col h-full">
                <div className="px-6 pt-5 pb-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sensores
                  </p>
                  <h3 className="text-base font-semibold mt-0.5">Gráfico de Riego</h3>
                </div>
                <div className="flex-1 min-h-0 pb-2">
                  <IrrigationChart />
                </div>
              </div>
            </BentoCard>

            {/* Soil Chat — 2 / 6 cols */}
            <BentoCard delay={400} className="@5xl:col-span-2 h-[480px]">
              <div className="flex flex-col h-full">
                <div className="px-6 pt-5 pb-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asistente
                  </p>
                  <h3 className="text-base font-semibold mt-0.5">Consulta de Suelo</h3>
                </div>
                <div className="flex-1 min-h-0 px-4 pb-4">
                  <SoilChat />
                </div>
              </div>
            </BentoCard>

          </div>
        </div>
      </main>
    </div>
  )
}
