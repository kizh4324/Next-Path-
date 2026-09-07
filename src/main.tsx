import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/context/LanguageContext';
import { ApiError } from '@/services/api_client';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // FR-19: on a flaky connection, showing yesterday's cached roadmap beats showing
      // a spinner the student cannot get past.
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // Auth, permission, and not-found failures will not resolve by retrying.
          if (error.status === 401 || error.status === 403 || error.status === 404) return false;
          // An offline request is worth one more attempt in case connectivity blipped.
          if (error.isOffline) return failureCount < 1;
        }
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
