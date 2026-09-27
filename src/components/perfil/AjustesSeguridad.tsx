"use client"

import { CheckCircle2, KeyRound, Loader2, LockKeyhole, LogOut, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { cambiarContrasena, cerrarSesionEnTodos } from "@/lib/actions/perfil"
import { cambiarPin } from "@/lib/actions/pin"
import { validarClaveNueva } from "@/lib/perfil"

type Hoja = "clave" | "contrasena" | "todas" | null

const campo = "h-[48px] w-full rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 text-[15px] text-gray-900 focus:border-[#681984] focus:outline-none"
const soloDigitos = (v: string) => v.replace(/\D/g, "").slice(0, 6)

function Fila({ icono, titulo, detalle, onClick }: { icono: React.ReactNode; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left active:scale-[0.99]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#681984]/10 text-[#681984]">{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-gray-900">{titulo}</span>
        <span className="block text-[12px] text-gray-400">{detalle}</span>
      </span>
    </button>
  )
}

/** Cambiar la clave de 6 dígitos, cambiar la contraseña y cerrar sesión en todos los dispositivos, cada uno en su hoja. */
export function AjustesSeguridad({ correo }: { correo: string }) {
  const router = useRouter()
  const [hoja, setHoja] = useState<Hoja>(null)
  const [aviso, setAviso] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const enCurso = useRef(false)
  // Contraseña
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetida, setRepetida] = useState("")
  // Clave de 6 dígitos
  const [claveActual, setClaveActual] = useState("")
  const [claveNueva, setClaveNueva] = useState("")
  const [claveRepetida, setClaveRepetida] = useState("")

  const cerrar = () => {
    setHoja(null); setError(""); setActual(""); setNueva(""); setRepetida(""); setClaveActual(""); setClaveNueva(""); setClaveRepetida("")
  }

  // Un doble toque nunca debe lanzar dos cambios a la vez.
  async function ejecutar(accion: () => Promise<{ ok: boolean; error?: string; alTerminar?: () => void }>) {
    if (enCurso.current) return
    enCurso.current = true
    setCargando(true)
    setError("")
    try {
      const r = await accion()
      if (!r.ok) setError(r.error || "No se pudo completar la operación")
      else r.alTerminar?.()
    } finally {
      enCurso.current = false
      setCargando(false)
    }
  }

  const guardarContrasena = () => ejecutar(async () => {
    const r = await cambiarContrasena(actual, nueva, repetida, correo)
    if (!r.success) return { ok: false, error: r.error }
    return { ok: true, alTerminar: () => { cerrar(); setAviso("Contraseña actualizada. Cerramos tus otras sesiones.") } }
  })

  const guardarClave = () => ejecutar(async () => {
    const invalida = validarClaveNueva(claveActual, claveNueva, claveRepetida)
    if (invalida) return { ok: false, error: invalida }
    const r = await cambiarPin(claveActual, claveNueva)
    if (!r.success) {
      const conIntentos = r.code === "pin_invalido" && r.intentosRestantes !== undefined
      return { ok: false, error: conIntentos ? `Clave incorrecta. Te quedan ${r.intentosRestantes} intento(s).` : r.error }
    }
    return { ok: true, alTerminar: () => { cerrar(); setAviso("Tu clave de 6 dígitos fue actualizada.") } }
  })

  const cerrarTodas = () => ejecutar(async () => {
    const r = await cerrarSesionEnTodos(claveActual)
    if (!r.success) {
      const conIntentos = r.code === "pin_invalido" && r.intentosRestantes !== undefined
      return { ok: false, error: conIntentos ? `Clave incorrecta. Te quedan ${r.intentosRestantes} intento(s).` : r.error }
    }
    return { ok: true, alTerminar: () => router.replace("/") }
  })

  return (
    <section aria-labelledby="seguridad-titulo">
      <h2 id="seguridad-titulo" className="mb-2 mt-6 text-[15px] font-bold text-[#4a1862]">Seguridad</h2>
      {aviso && (
        <p role="status" className="mb-2 flex items-center gap-2 rounded-2xl bg-green-50 px-3 py-2 text-[13px] text-green-700">
          <CheckCircle2 size={16} aria-hidden /> {aviso}
        </p>
      )}
      <div className="space-y-2">
        <Fila icono={<KeyRound size={18} aria-hidden />} titulo="Cambiar clave de 6 dígitos" detalle="La que usas para confirmar pagos" onClick={() => { setAviso(""); setHoja("clave") }} />
        <Fila icono={<LockKeyhole size={18} aria-hidden />} titulo="Cambiar contraseña" detalle="La de tu correo; cerramos tus otras sesiones" onClick={() => { setAviso(""); setHoja("contrasena") }} />
        <Fila icono={<LogOut size={18} aria-hidden />} titulo="Cerrar sesión en todos los dispositivos" detalle="Si perdiste tu teléfono o prestaste tu cuenta" onClick={() => { setAviso(""); setHoja("todas") }} />
      </div>

      {hoja && (
        <div role="dialog" aria-modal="true" aria-label="Seguridad de la cuenta" className="absolute inset-0 z-50 flex items-end bg-black/50">
          <div className="max-h-[90%] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-10">
            <div className="mb-4 flex items-start justify-between">
              <p className="text-[17px] font-bold text-gray-900">
                {hoja === "clave" ? "Cambiar clave de 6 dígitos" : hoja === "contrasena" ? "Cambiar contraseña" : "Cerrar sesión en todos los dispositivos"}
              </p>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-full p-1 text-gray-400"><X size={20} /></button>
            </div>

            {hoja === "contrasena" && (
              <div className="space-y-3">
                <input type="password" autoComplete="current-password" placeholder="Contraseña actual" value={actual} onChange={(e) => { setActual(e.target.value); setError("") }} className={campo} />
                <input type="password" autoComplete="new-password" placeholder="Contraseña nueva (mínimo 8)" value={nueva} onChange={(e) => { setNueva(e.target.value); setError("") }} className={campo} />
                <input type="password" autoComplete="new-password" placeholder="Repite la contraseña nueva" value={repetida} onChange={(e) => { setRepetida(e.target.value); setError("") }} className={campo} />
                <p className="text-[12px] text-gray-400">Al cambiarla, cerramos tu sesión en los demás dispositivos. Esta se queda abierta.</p>
              </div>
            )}

            {hoja === "clave" && (
              <div className="space-y-3">
                {([["Clave actual", claveActual, setClaveActual], ["Clave nueva (4 a 6 dígitos)", claveNueva, setClaveNueva], ["Repite la clave nueva", claveRepetida, setClaveRepetida]] as const).map(([etiqueta, valor, poner]) => (
                  <input key={etiqueta} type="password" inputMode="numeric" autoComplete="off" placeholder={etiqueta} value={valor}
                    onChange={(e) => { poner(soloDigitos(e.target.value)); setError("") }} className={`${campo} text-center tracking-[0.4em]`} />
                ))}
              </div>
            )}

            {hoja === "todas" && (
              <div className="space-y-3">
                <p className="text-[13px] text-gray-500">Se cerrará tu sesión en este y en todos los demás dispositivos. Para volver a entrar necesitarás tu contraseña.</p>
                <input type="password" inputMode="numeric" autoComplete="off" placeholder="Tu clave de 6 dígitos" value={claveActual}
                  onChange={(e) => { setClaveActual(soloDigitos(e.target.value)); setError("") }} className={`${campo} text-center tracking-[0.4em]`} />
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-[13px] text-red-500">{error}</p>}
            <button
              type="button" disabled={cargando}
              onClick={hoja === "clave" ? guardarClave : hoja === "contrasena" ? guardarContrasena : cerrarTodas}
              className={`mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 ${hoja === "todas" ? "bg-red-500" : "bg-[#681984]"}`}
            >
              {cargando && <Loader2 size={18} className="animate-spin" aria-hidden />}
              {hoja === "todas" ? "Cerrar todas las sesiones" : "Guardar cambio"}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
