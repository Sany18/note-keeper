import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/';

  return {
    base: basePath,
    plugins: [
      react(),
      tsconfigPaths(),
      VitePWA({
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        base: basePath,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        manifest: {
          name: 'Note Keeper',
          short_name: 'NoteKeeper',
          start_url: basePath,
          scope: basePath,
          display: 'standalone',
          background_color: '#2b2b2b',
          theme_color: '#2b2b2b',
          description: 'A notes app integrated with Google Drive',
          dir: 'ltr',
          lang: 'en',
          orientation: 'any',
          display_override: [
            'standalone',
            'browser',
            'fullscreen',
            'minimal-ui',
            'window-controls-overlay',
          ],
          related_applications: [
            {
              platform: 'webapp',
              url: 'https://drive.google.com',
            },
          ],
          categories: [
            'productivity',
            'utilities',
          ],
          icons: [
            {
              src: 'icon-32.png',
              sizes: '32x32',
              type: 'image/png',
            },
            {
              src: 'icon-64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'icon-96.png',
              sizes: '96x96',
              type: 'image/png',
            },
            {
              src: 'icon-120.png',
              sizes: '120x120',
              type: 'image/png',
            },
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icon-256.png',
              sizes: '256x256',
              type: 'image/png',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
          screenshots: [
            {
              src: 'screenshot-1.png',
              sizes: '975x502',
              type: 'image/png',
              description: 'Example of a note',
            },
            {
              src: 'screenshot-2.png',
              sizes: '1920x1080',
              type: 'image/png',
              description: 'Example of a note in fullscreen mode',
            },
          ],
        },
      }),
      ViteImageOptimizer({
        png: {
          quality: 80,
        },
        webp: {
          quality: 80,
        },
      }),
    ],
    root: 'src',
    envDir: path.resolve(process.cwd()),
    publicDir: '../public',
    server: {
      port: env.PORT || 3000,
      host: true,
      headers: {
        // Allows GIS OAuth popup to communicate back via window.opener,
        // which Chrome blocks by default and shows the "legacy Sign-In" dialog.
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    build: {
      outDir: '../build',
    },
  };
});
