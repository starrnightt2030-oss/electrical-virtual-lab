import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/electrical-virtual-lab/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/pwa-192.png', 'icons/pwa-512.png'],
      manifest: {
        id: '/electrical-virtual-lab/',
        name: 'Electrical Virtual Lab',
        short_name: 'Electrical Lab',
        description: 'معمل كهرباء افتراضي تفاعلي للتدريب على أساسيات الكهرباء والتمديدات السكنية',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#071827',
        background_color: '#06111d',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        start_url: '/electrical-virtual-lab/',
        scope: '/electrical-virtual-lab/',
        categories: ['education', 'utilities'],
        icons: [
          { src: '/electrical-virtual-lab/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/electrical-virtual-lab/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/electrical-virtual-lab/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/electrical-virtual-lab/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
