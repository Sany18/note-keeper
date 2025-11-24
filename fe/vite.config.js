import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(() => {
  const env = loadEnv(null, path.resolve(process.cwd(), '../'), '');

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      VitePWA({
        injectRegister: 'auto'
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
    publicDir: '../public',
    server: {
      port: env.PORT,
      host: true,
    },
    define: {
      'process.env': env
    },
    build: {
      outDir: '../build',
    },
  };
});
