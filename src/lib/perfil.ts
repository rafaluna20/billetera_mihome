/**
 * Perfil y seguridad de la cuenta. Lógica pura y tipos: sin React ni red.
 */

export interface PerfilCuenta {
  name: string
  email: string
  phone: string
  cuenta: string
  estado: string
  correoVerificado: boolean
  tieneClave: boolean
  miembroDesde: string | null
  limiteDiario: number
  limitePorOperacion: number
}

export interface EventoSeguridad {
  kind: string
  label: string
  at: string | null
  device: string
  ip: string
}

export type ResultadoPerfil = { estado: "ok"; perfil: PerfilCuenta } | { estado: "sesion" } | { estado: "conexion" }

export interface ResultadoSeguridad {
  success: boolean
  code?: string
  error?: string
  intentosRestantes?: number
}

/** Reglas de la contraseña nueva (las mismas que aplica el banco; aquí solo se adelantan para avisar sin esperar). */
export function validarContrasenaNueva(actual: string, nueva: string, repetida: string, correo = ""): string | null {
  if (!actual) return "Escribe tu contraseña actual."
  if (nueva.length < 8) return "La contraseña nueva debe tener al menos 8 caracteres."
  if (nueva.length > 128) return "La contraseña nueva es demasiado larga."
  if (nueva === actual) return "La contraseña nueva debe ser distinta de la actual."
  const usuario = correo.trim().toLowerCase()
  if (usuario && (nueva.toLowerCase().includes(usuario) || usuario.includes(nueva.toLowerCase()))) return "La contraseña no puede contener tu correo."
  if (nueva !== repetida) return "Las contraseñas nuevas no coinciden."
  return null
}

/** Igual que el banco: todos los dígitos iguales, o una tira consecutiva ascendente o descendente (1234, 654321). */
const esClaveDebil = (clave: string) => new Set(clave).size === 1 || "0123456789".includes(clave) || "9876543210".includes(clave)

/** Clave de 4 a 6 dígitos que no sea evidente (el banco vuelve a validarla). */
export function validarClaveNueva(actual: string, nueva: string, repetida: string): string | null {
  if (!/^\d{4,6}$/.test(actual)) return "Escribe tu clave actual."
  if (!/^\d{4,6}$/.test(nueva)) return "La clave nueva debe tener de 4 a 6 dígitos."
  if (esClaveDebil(nueva)) return "Elige una clave menos evidente (no repetidos ni consecutivos)."
  if (nueva === actual) return "La clave nueva debe ser distinta de la actual."
  if (nueva !== repetida) return "Las claves nuevas no coinciden."
  return null
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** «septiembre de 2026» a partir de un instante ISO (hora de Lima). */
export function miembroDesdeTexto(iso: string | null): string {
  if (!iso) return ""
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ""
  const [anio, mes] = fecha.toLocaleDateString("en-CA", { timeZone: "America/Lima" }).split("-").map(Number)
  return `${MESES[mes - 1]} de ${anio}`
}

/** Celular como lo guardó la persona, agrupado de 3 en 3 si son 9 dígitos (con o sin +51). */
export function celularLegible(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "")
  if (digitos.length < 9) return telefono
  const ultimos = digitos.slice(-9)
  const prefijo = digitos.length > 9 ? `+${digitos.slice(0, digitos.length - 9)} ` : ""
  return `${prefijo}${ultimos.slice(0, 3)} ${ultimos.slice(3, 6)} ${ultimos.slice(6)}`
}

export function inicialesDe(nombre: string): string {
  return nombre.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}
