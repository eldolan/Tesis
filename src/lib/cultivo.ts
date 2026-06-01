import type { FaseFenologica, NivelEstres } from "@/types"

// ============================================================
// Dominio del cultivo: catálogo genérico de fases y niveles de
// estrés hídrico (RDC generalizado a partir de Callejas, MundoAgro).
//
// Fuente de verdad ÚNICA del lado app. La misma lógica de modulación
// (prEfectivo) está replicada en los nodos de código de n8n, porque
// n8n no puede importar este módulo. Si cambian los factores aquí,
// hay que reflejarlos en los snippets de los agentes.
// ============================================================

export interface FaseDef {
  id: FaseFenologica
  label: string
  descripcion: string
  /** Estrés sugerido por defecto para la fase (el usuario puede sobrescribir). */
  estresRecomendado: NivelEstres
}

// Orden cronológico del ciclo (lo usa la línea de tiempo del dashboard).
export const FASES: readonly FaseDef[] = [
  { id: "establecimiento", label: "Establecimiento", descripcion: "Arraigo inicial", estresRecomendado: "ninguno" },
  { id: "vegetativo", label: "Vegetativo", descripcion: "Desarrollo de follaje", estresRecomendado: "ninguno" },
  { id: "floracion", label: "Floración", descripcion: "Flor y cuaja", estresRecomendado: "ninguno" },
  { id: "desarrollo_fruto", label: "Desarrollo de fruto", descripcion: "Llenado", estresRecomendado: "leve" },
  { id: "maduracion", label: "Maduración", descripcion: "Maduración / cosecha", estresRecomendado: "moderado" },
  { id: "senescencia", label: "Senescencia", descripcion: "Reposo / postcosecha", estresRecomendado: "leve" },
] as const

export interface NivelEstresDef {
  id: NivelEstres
  label: string
  /** Fracción del rango (NLL−PR) que se le resta al PR base. */
  reduccionPR: number
}

// RDC: a mayor estrés, baja el PR efectivo y se deja agotar más el
// suelo antes de regar. El NLL (anti-saturación) NO se toca.
export const NIVELES_ESTRES: readonly NivelEstresDef[] = [
  { id: "ninguno", label: "Ninguno", reduccionPR: 0.0 },
  { id: "leve", label: "Leve", reduccionPR: 0.1 },
  { id: "moderado", label: "Moderado", reduccionPR: 0.2 },
  { id: "severo", label: "Severo", reduccionPR: 0.3 },
] as const

export const FASE_DEFAULT: FaseFenologica = "vegetativo"
export const ESTRES_DEFAULT: NivelEstres = "ninguno"

export function faseLabel(id: FaseFenologica): string {
  return FASES.find((f) => f.id === id)?.label ?? id
}

export function estresReduccion(id: NivelEstres): number {
  return NIVELES_ESTRES.find((n) => n.id === id)?.reduccionPR ?? 0
}

/**
 * PR efectivo según el nivel de estrés: PR_base − reduccion·(NLL − PR_base).
 * Devuelve el umbral de recarga ajustado para la banda de riego.
 */
export function prEfectivo(prBase: number, nll: number, nivel: NivelEstres): number {
  return prBase - estresReduccion(nivel) * (nll - prBase)
}
