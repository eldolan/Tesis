"use client"

import { useEffect, useState } from "react"
import {
  Sprout,
  Leaf,
  Flower2,
  Apple,
  TreeDeciduous,
  Moon,
  CheckCircle,
  Settings2,
  Loader2,
} from "lucide-react"
import { FASES, NIVELES_ESTRES } from "@/lib/cultivo"
import type { CultivoConfig, FaseFenologica, NivelEstres } from "@/types"

// Icono por fase (mismo orden cronológico que FASES).
const ICONOS: Record<FaseFenologica, React.ReactNode> = {
  establecimiento: <Sprout size={22} />,
  vegetativo: <Leaf size={22} />,
  floracion: <Flower2 size={22} />,
  desarrollo_fruto: <Apple size={22} />,
  maduracion: <TreeDeciduous size={22} />,
  senescencia: <Moon size={22} />,
}

export function PlantTimeline() {
  const [config, setConfig] = useState<Pick<
    CultivoConfig,
    "especie" | "fase_fenologica" | "nivel_estres"
  > | null>(null)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/cultivo")
      .then((r) => r.json())
      .then((d) => {
        if (d?.fase_fenologica) {
          setConfig({
            especie: d.especie,
            fase_fenologica: d.fase_fenologica,
            nivel_estres: d.nivel_estres,
          })
        }
      })
      .catch(() => setError("No se pudo cargar la configuración"))
  }, [])

  async function guardar() {
    if (!config) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch("/api/cultivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? "Error al guardar")
      }
      const saved = await res.json()
      setConfig({
        especie: saved.especie,
        fase_fenologica: saved.fase_fenologica,
        nivel_estres: saved.nivel_estres,
      })
      setEditando(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  const idxActiva = FASES.findIndex((f) => f.id === config.fase_fenologica)

  return (
    <div className="flex flex-col h-full justify-center px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Fase del Cultivo
        </h3>
        <button
          onClick={() => setEditando((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Configurar cultivo"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {editando ? (
        <div className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Especie monitoreada</span>
            <input
              type="text"
              value={config.especie}
              onChange={(e) => setConfig({ ...config, especie: e.target.value })}
              placeholder="Ej: tomate, palto, monstera…"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Fase fenológica</span>
            <select
              value={config.fase_fenologica}
              onChange={(e) =>
                setConfig({ ...config, fase_fenologica: e.target.value as FaseFenologica })
              }
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {FASES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Nivel de estrés hídrico</span>
            <select
              value={config.nivel_estres}
              onChange={(e) =>
                setConfig({ ...config, nivel_estres: e.target.value as NivelEstres })
              }
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {NIVELES_ESTRES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {guardando && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex items-start justify-between gap-1 relative min-w-[300px]">
            {/* Línea de conexión */}
            <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-border z-0" />
            <div
              className="absolute top-5 left-[10%] h-0.5 bg-primary z-0 transition-all"
              style={{ width: `${(Math.max(idxActiva, 0) / (FASES.length - 1)) * 80}%` }}
            />

            {FASES.map((fase, i) => {
              const completed = i < idxActiva
              const active = i === idxActiva
              return (
                <div key={fase.id} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      completed
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completed ? <CheckCircle size={20} /> : ICONOS[fase.id]}
                  </div>
                  <span
                    className={`text-[11px] font-medium text-center leading-tight ${
                      active ? "text-primary" : completed ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {fase.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground text-center leading-tight hidden lg:block">
                    {fase.descripcion}
                  </span>
                </div>
              )
            })}
          </div>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            <span className="capitalize text-foreground">{config.especie}</span>
            {" · estrés "}
            <span className="text-foreground">
              {NIVELES_ESTRES.find((n) => n.id === config.nivel_estres)?.label.toLowerCase()}
            </span>
          </p>
        </>
      )}
    </div>
  )
}
