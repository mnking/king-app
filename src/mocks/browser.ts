import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { env } from '@/config/api';

export const worker = setupWorker(...handlers);

// Simplified MSW configuration for real API passthrough
export const startWorker = () => {
  return worker.start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);

      // Hardcoded passthrough for real API services

      if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/container') 
        || url.pathname.startsWith('/api/cfs') || url.pathname.startsWith('/api/carrier') || url.pathname.startsWith('/api/forwarder')) {
        console.log('🔀 MSW Passthrough:', request.url);
        return; // Pass through to Vite proxy
      }

      // Log other unhandled requests for debugging
      if (env.enableLogging) {
        print.warning();
      }
    },
  });
};
