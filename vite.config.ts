import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access via tunnels
    allowedHosts: ['.loca.lt', '.trycloudflare.com'],
  },
  preview: {
    // Vite preview has its own host allowlist
    allowedHosts: ['.loca.lt', '.trycloudflare.com'],
  },
});
