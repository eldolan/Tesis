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

// ============================================================
// Catálogo de fases por especie (decisión B aprobada).
// Las 6 fases genéricas sirven como fallback para cualquier
// especie no registrada. Clave normalizada: lowercase sin tildes.
// ============================================================

const FASES_GENERICAS: readonly FaseDef[] = FASES

// Fases propias de Monstera (hemiepífita perennifolia de interior).
// Ids EXACTOS — coinciden con el RAG (embeddings/monsteras.md) y el
// espejo n8n (ADR-0002). NO cambiar sin actualizar ambos espejos.
const FASES_MONSTERA: readonly FaseDef[] = [
  { id: "crecimiento_activo", label: "Crecimiento activo", descripcion: "Primavera–verano; metabolismo alto", estresRecomendado: "ninguno" },
  { id: "latencia_invernal", label: "Latencia invernal", descripcion: "Reposo; transpiración mínima", estresRecomendado: "moderado" },
  { id: "recuperacion", label: "Recuperación", descripcion: "Post-trasplante / daño radicular", estresRecomendado: "leve" },
] as const

/** Catálogo de fases por especie. Clave = resultado de normalizaEspecie(). */
export const FASES_POR_ESPECIE: Record<string, readonly FaseDef[]> = {
  monstera: FASES_MONSTERA,
}

/** Normaliza el nombre de especie para indexar el catálogo (case/acentos-insensible). */
function normalizaEspecie(especie: string): string {
  return especie.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Devuelve las fases de la especie; fallback a las 6 genéricas si no hay catálogo propio. */
export function fasesParaEspecie(especie: string): readonly FaseDef[] {
  return FASES_POR_ESPECIE[normalizaEspecie(especie)] ?? FASES_GENERICAS
}

/** Conjunto de ids válidos para una especie (consumido por la API y la UI). */
export function fasesValidasParaEspecie(especie: string): Set<string> {
  return new Set(fasesParaEspecie(especie).map((f) => f.id))
}

/** Estrés recomendado de una fase dentro del catálogo de la especie. */
export function estresRecomendadoDeFase(especie: string, faseId: string): NivelEstres {
  return fasesParaEspecie(especie).find((f) => f.id === faseId)?.estresRecomendado ?? ESTRES_DEFAULT
}

/**
 * Nivel de estrés efectivo (semántica DEFAULT sobrescribible — ADR-0003):
 * si el usuario guardó un nivel ≠ "ninguno", manda ese; si no, el recomendado por la fase.
 */
export function nivelEstresEfectivo(
  especie: string,
  faseId: string,
  nivelGuardado: NivelEstres,
): NivelEstres {
  return nivelGuardado !== "ninguno"
    ? nivelGuardado
    : estresRecomendadoDeFase(especie, faseId)
}

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
