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
        base: basePath,
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
