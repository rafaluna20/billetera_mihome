/**
 * Resumen de inversiones que la billetera muestra (solo lectura). Los datos los calcula la plataforma de inversiones
 * y llegan por el banco; aquí solo se presentan. Lógica pura, sin React ni red, para poder probarla.
 */

export interface PuntoEvolucion {
  fecha: string
  /** Saldo libre + capital en proyectos (a costo). */
  patrimonio: number
  /** Lo que la persona puso de su bolsillo (depósitos − retiros). */
  puesto: number
}

export interface ResumenContrato {
  proyecto_id: number
  nombre: string
  estado: string
  en_curso: boolean
  capital: number
  aportado: number
  utilidad_recibida: number
  /** Liquidado: lo que volvió menos lo aportado (puede ser negativo). En curso: solo la utilidad ya recibida. */
  resultado: number
  avance_pct: number
}

export interface ResumenInversiones {
  moneda: string
  patrimonio: number
  saldo_libre: number
  capital_en_curso: number
  utilidad_mes: number
  utilidad_recibida: number
  resultado_realizado: number
  proyectos_activos: number
  proyectos_historicos: number
  evolucion: PuntoEvolucion[]
  contratos: ResumenContrato[]
}

export type PlataformaInversion = {
  code: string
  name: string
  app_url: string | null
} & (
  | { estado: "ok"; resumen: ResumenInversiones }
  | { estado: "no_vinculado" }
  | { estado: "no_disponible" }
)

export const ETIQUETA_ESTADO: Record<string, string> = {
  captando: "Captando",
  en_ejecucion: "En ejecución",
  liquidando: "En liquidación",
  liquidado: "Finalizado",
}

/** "S/ 1,234.50" (soles) o "US$ 1,234.50"; otra moneda, su código. */
export function formatearDinero(monto: number, moneda: string): string {
  const valor = Number.isFinite(monto) ? monto : 0
  const simbolo = moneda === "PEN" ? "S/" : moneda === "USD" ? "US$" : moneda
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type Tono = "positivo" | "negativo" | "neutro"

export function tonoDe(valor: number): Tono {
  if (valor > 0.004) return "positivo"
  if (valor < -0.004) return "negativo"
  return "neutro"
}

/** "+S/ 45.00" / "−S/ 5.00" / "S/ 0.00": el signo se ve siempre, para no confundir una pérdida con una ganancia. */
export function conSigno(valor: number, moneda: string): string {
  const tono = tonoDe(valor)
  if (tono === "neutro") return formatearDinero(0, moneda)
  return `${tono === "positivo" ? "+" : "−"}${formatearDinero(Math.abs(valor), moneda)}`
}

export type FiltroContratos = "en_curso" | "finalizados" | "todos"

export const FILTROS: { id: FiltroContratos; etiqueta: string }[] = [
  { id: "en_curso", etiqueta: "En Curso" },
  { id: "finalizados", etiqueta: "Finalizados" },
  { id: "todos", etiqueta: "Todos" },
]

export function filtrarContratos(contratos: ResumenContrato[], filtro: FiltroContratos): ResumenContrato[] {
  if (filtro === "todos") return contratos
  return contratos.filter((c) => (filtro === "en_curso" ? c.en_curso : !c.en_curso))
}

export interface GeometriaGrafico {
  ancho: number
  alto: number
  patrimonio: string
  puesto: string
  area: string
  ultimo: { x: number; y: number }
}

const MARGEN = 10

/**
 * Puntos del gráfico de evolución (SVG). `null` con menos de 2 meses: una sola cifra no es una evolución.
 * La escala va del valor más bajo al más alto; si todo es igual queda una línea recta a media altura.
 */
export function geometriaGrafico(puntos: PuntoEvolucion[], ancho = 320, alto = 120): GeometriaGrafico | null {
  if (puntos.length < 2) return null
  const valores = puntos.flatMap((p) => [p.patrimonio, p.puesto])
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const rango = maximo - minimo
  const n = puntos.length
  const x = (i: number) => MARGEN + (i * (ancho - 2 * MARGEN)) / (n - 1)
  const y = (v: number) => (rango === 0 ? alto / 2 : MARGEN + (1 - (v - minimo) / rango) * (alto - 2 * MARGEN))
  const linea = (f: (p: PuntoEvolucion) => number) => puntos.map((p, i) => `${x(i).toFixed(1)},${y(f(p)).toFixed(1)}`).join(" ")
  const pat = linea((p) => p.patrimonio)
  return {
    ancho,
    alto,
    patrimonio: pat,
    puesto: linea((p) => p.puesto),
    area: `${x(0).toFixed(1)},${alto} ${pat} ${x(n - 1).toFixed(1)},${alto}`,
    ultimo: { x: x(n - 1), y: y(puntos[n - 1].patrimonio) },
  }
}

/** Porcentaje 0–100 acotado, para barras de avance. */
export function acotar(valor: number): number {
  return Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : 0
}
