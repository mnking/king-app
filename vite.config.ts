import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access via LocalTunnel (*.loca.lt)
    allowedHosts: ['.loca.lt'],
  },
});
