import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { isSupabaseConfigured } from './lib/supabase.ts';
import './index.css';

function ConfigError() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-bold text-white">Configuration needed</h1>
        <p className="text-slate-400 text-sm">
          VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Copy{' '}
          <code className="text-slate-300">.env.example</code> to{' '}
          <code className="text-slate-300">.env</code>, fill in your Supabase project values,
          then rebuild.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{isSupabaseConfigured ? <App /> : <ConfigError />}</ErrorBoundary>
  </StrictMode>
);
