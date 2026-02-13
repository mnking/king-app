/* eslint-disable react-refresh/only-export-components */
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Agentation } from 'agentation';
import { Loader2 } from 'lucide-react';
import App from './App.tsx';
import { ToastProvider } from '@/shared/components';
import TetGreetingPage from '@/pages/TetGreetingPage';
import { LoginForm } from '@/pages';
import { AuthCallback } from '@/pages';
import NotFoundPage from '@/pages/NotFoundPage';
import { routesConfig } from '@/config/routes.config';
import { generateRoutes } from '@/config/routes.utils';

import './index.css';

// Lazy load dashboard for index route
const _Dashboard = lazy(() => import('@/pages/Dashboard'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>Loading...</span>
    </div>
  </div>
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Index route redirects to dashboard
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <TetGreetingPage />
          </Suspense>
        ),
      },
      // Generate all application routes from configuration
      ...generateRoutes(routesConfig),
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginForm onToggleMode={() => {}} isSignUp={false} />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
]);

async function enableMocking() {
  // MSW configuration - only enabled when explicitly set to true
  if (import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { startWorker } = await import('./mocks/browser');

    return startWorker().then(() => {
      console.log('🚀 MSW (Mock Service Worker) enabled - API mocking active');
      console.log(
        '📡 Real API passthrough configured for auth and inventory services',
      );
    });
  }
}

// // Print environment summary for debugging in dev/test
// if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
//   // eslint-disable-next-line no-console
//   console.log('[app] Env summary', {
//     mode: import.meta.env.MODE,
//     dev: import.meta.env.DEV,
//     VITE_ENABLE_MSW: import.meta.env.VITE_ENABLE_MSW,
//     VITE_ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING,
//     origin: typeof window !== 'undefined' ? window.location.origin : 'n/a',
//   });
// }

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ToastProvider>
      {import.meta.env.DEV && <Agentation />}
    </StrictMode>,
  );
});
