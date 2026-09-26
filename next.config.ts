import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === "production";

// Política de contenido: la billetera solo carga recursos propios (todas las llamadas al banco las hace el servidor,
// nunca el navegador). Next necesita scripts en línea; en desarrollo, además, 'unsafe-eval' para el recargado en caliente.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esProduccion ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // La cámara es necesaria para escanear el QR de cobro; el resto de sensores no.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          ...(esProduccion ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        ],
      },
      {
        // Nunca se guarda en caché de red lo que muestra saldos o datos de la persona.
        source: "/(home|yapear|depositar|salir)(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
