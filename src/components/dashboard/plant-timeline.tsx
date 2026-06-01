"use client"

import { Sprout, Leaf, TreeDeciduous, Apple, CheckCircle } from "lucide-react"

interface Phase {
  icon: React.ReactNode
  label: string
  description: string
  active: boolean
  completed: boolean
}

const phases: Phase[] = [
  {
    icon: <Sprout size={22} />,
    label: "Siembra",
    description: "Semilla plantada",
    active: false,
    completed: true,
  },
  {
    icon: <Sprout size={22} className="rotate-12" />,
    label: "Germinacion",
    description: "Brote emergente",
    active: false,
    completed: true,
  },
  {
    icon: <Leaf size={22} />,
    label: "Crecimiento",
    description: "Desarrollo vegetativo",
    active: true,
    completed: false,
  },
  {
    icon: <TreeDeciduous size={22} />,
    label: "Maduracion",
    description: "Planta adulta",
    active: false,
    completed: false,
  },
  {
    icon: <Apple size={22} />,
    label: "Cosecha",
    description: "Listo para recolectar",
    active: false,
    completed: false,
  },
]

export function PlantTimeline() {
  return (
    <div className="flex flex-col h-full justify-center px-4 py-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
        Fase del Cultivo
      </h3>
      <div className="flex items-start justify-between gap-1 relative">
        {/* Connection line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-border z-0" />
        <div
          className="absolute top-5 left-[10%] h-0.5 bg-primary z-0 transition-all"
          style={{ width: `${(phases.filter(p => p.completed).length / (phases.length - 1)) * 80}%` }}
        />

        {phases.map((phase, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 z-10 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                phase.completed
                  ? "bg-primary text-primary-foreground"
                  : phase.active
                    ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {phase.completed ? <CheckCircle size={20} /> : phase.icon}
            </div>
            <span className={`text-[11px] font-medium text-center leading-tight ${
              phase.active ? "text-primary" : phase.completed ? "text-foreground" : "text-muted-foreground"
            }`}>
              {phase.label}
            </span>
            <span className="text-[9px] text-muted-foreground text-center leading-tight hidden lg:block">
              {phase.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
