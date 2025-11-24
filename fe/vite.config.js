import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '../'), '');
  const basePath = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/';

  console.log('env', env);
  console.log(1, process.env.VITE_BASE_PATH);
  console.log(env.VITE_BASE_PATH);
  console.log('base path', basePath);

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
    publicDir: '../public',
    server: {
      port: env.PORT || 3000,
      host: true,
    },
    build: {
      outDir: '../build',
    },
  };
});
