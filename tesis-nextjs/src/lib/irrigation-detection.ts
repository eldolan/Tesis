/**
 * Detecta si hay un evento de riego basado en aumento de humedad.
 * Replica exactamente la lógica de detectar_evento_riego de routes.py
 */
export function detectarEventoRiego(
  humActual: number | null,
  humAnterior: number | null,
  umbralPorcentaje: number = 10
): boolean {
  if (humActual === null || humAnterior === null) return false
  if (humAnterior <= 0) return false

  const aumentoPorcentual = ((humActual - humAnterior) / humAnterior) * 100
  return aumentoPorcentual >= umbralPorcentaje
}
