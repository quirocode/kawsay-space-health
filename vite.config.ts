/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// Two pages: the public landing page (/) and the app (/app/).
const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: { landing: page('./index.html'), app: page('./app/index.html') },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'UPRIGHT — Land on your feet.',
        short_name: 'UPRIGHT',
        description: 'Health copilot for astronauts on long-duration missions. Prototype, not a medical device.',
        theme_color: '#0B3D91',
        background_color: '#0F1517',
        start_url: '/app/',
        scope: '/',
        display: 'standalone',
        orientation: 'landscape',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,glb,woff,woff2,json}'],
        navigateFallback: 'app/index.html',
        navigateFallbackAllowlist: [/^\/app\//],
        // The local AI library is large and optional: cache it the first time it is used, not on install.
        globIgnores: ['**/webllm-*.js'],
        runtimeCaching: [{
          urlPattern: /\/assets\/webllm-[^/]+\.js$/,
          handler: 'CacheFirst',
          options: { cacheName: 'kawsay-local-ai-lib', expiration: { maxEntries: 4 } },
        }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
