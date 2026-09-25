import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MiHome Billetera',
    short_name: 'Mihome',
    description: 'Billetera digital MiHome',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#681984',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
