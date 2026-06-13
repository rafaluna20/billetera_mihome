"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff } from "lucide-react"

interface QRScannerProps {
  onScan: (result: string) => void
  onError?: (err: string) => void
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [started, setStarted] = useState(false)
  const [error, setError] = useState("")
  const scannerRef = useRef<any>(null)
  const containerId = "qr-reader-container"

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        try {
          scannerRef.current.stop()
          scannerRef.current.clear()
        } catch (_) {}
      }
    }
  }, [])

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          onScan(decodedText)
          scanner.stop()
          setStarted(false)
        },
        (_: any) => {} // ignore frame errors silently
      )
      setStarted(true)
      setError("")
    } catch (err: any) {
      const msg = err?.message || "No se pudo acceder a la cámara"
      setError(msg)
      onError?.(msg)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (_) {}
      scannerRef.current = null
    }
    setStarted(false)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Camera viewfinder */}
      <div className="relative w-full aspect-square max-w-[280px] bg-black rounded-3xl overflow-hidden border-2 border-[#681984]/30">
        {/* QR reader mounts here */}
        <div id={containerId} className="w-full h-full" />

        {/* Overlay frame when not started */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-3xl">
            <Camera size={48} className="text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm text-center px-6">
              Toca el botón para activar la cámara
            </p>
          </div>
        )}

        {/* Corner frames */}
        {started && (
          <>
            <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-[#00b5ad] rounded-tl-lg z-10" />
            <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-[#00b5ad] rounded-tr-lg z-10" />
            <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-[#00b5ad] rounded-bl-lg z-10" />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-[#00b5ad] rounded-br-lg z-10" />
            {/* Scan line animation */}
            <div className="absolute left-8 right-8 h-0.5 bg-[#00b5ad] opacity-80 z-10 animate-bounce" style={{ top: "50%" }} />
          </>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center px-4">{error}</p>
      )}

      {/* Toggle button */}
      {!started ? (
        <button
          onClick={startScanner}
          className="flex items-center gap-2 bg-[#681984] hover:bg-[#5a1570] text-white font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-[0_4px_20px_rgba(104,25,132,0.35)] active:scale-95"
        >
          <Camera size={18} />
          Activar cámara
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-8 py-3.5 rounded-2xl transition-all active:scale-95"
        >
          <CameraOff size={18} />
          Detener cámara
        </button>
      )}

      <p className="text-gray-400 text-xs text-center px-4">
        Apunta la cámara al código QR del destinatario
      </p>
    </div>
  )
}
