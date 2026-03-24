import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import AntiGravityLayout from '../components/AntiGravityLayout';
import '../styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

export default function App({ Component, pageProps }) {
  const initialize = useAuthStore((s) => s.initialize);
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const getLayout = Component.getLayout || ((page) => page);

  return (
    <QueryClientProvider client={queryClient}>
      <AntiGravityLayout>
        {getLayout(<Component {...pageProps} />)}
      </AntiGravityLayout>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(13,18,36,0.95)',
            color: '#e8e9f0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontSize: '14px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#00c6ff', secondary: '#000' },
          },
          error: {
            iconTheme: { primary: '#FF6B6B', secondary: '#000' },
          },
        }}
      />
    </QueryClientProvider>
  );
}
