import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // For GitHub Pages: use repo name as base path in production
    // Set VITE_BASE_PATH env var to customize, or it defaults to '/'
    const base = mode === 'production'
      ? (env.VITE_BASE_PATH || '/JusDNCE-core2/')
      : '/';

    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Generate sourcemaps for debugging
        sourcemap: true,
        // Optimize chunk splitting
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'ai-vendor': ['@google/genai'],
            }
          }
        }
      }
    };
});
