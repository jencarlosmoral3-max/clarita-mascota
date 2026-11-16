import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Mismo valor que `body` en src/estilos.css.
const FONDO = '#2b1a14';

// En Pages de proyecto la app vive en /<repo>/; en dev, preview y e2e sigue en /.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{html,js,css,png,svg,webmanifest,woff2}'],
      },
      manifest: {
        name: 'Clarita',
        short_name: 'Clarita',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        background_color: FONDO,
        theme_color: FONDO,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
