import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // API base URL is only used in Vite (server/proxy), so it doesn't need VITE_ prefix
  const cloudApiUrl = env.API_BASE_URL || 'http://localhost:8000';
  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/shared': path.resolve(__dirname, './src/shared'),
        '@/lib': path.resolve(__dirname, './src/shared/lib'),
        '@/hooks': path.resolve(__dirname, './src/shared/hooks'),
        '@/features': path.resolve(__dirname, './src/features'),
        '@/app': path.resolve(__dirname, './src/app'),
        '@/config': path.resolve(__dirname, './src/config'),
        '@/pages': path.resolve(__dirname, './src/pages'),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      // Allow access via LocalTunnel (*.loca.lt)
      allowedHosts: ['.loca.lt'],
      proxy: {
        // Hardcoded proxies for real API services
        '/api/auth': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api/cfs': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api/container': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api/forwarder': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api/carrier': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api/document': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api/billing': {
          target: cloudApiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
