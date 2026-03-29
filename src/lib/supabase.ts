// src/lib/supabase.ts
// Cliente Supabase centralizado. Si las variables de entorno no están configuradas,
// la app corre en MODO DEMO con datos locales (sin conexión a BD real).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.debug('Supabase URL:', supabaseUrl ? 'detectada' : 'VACÍA');
console.debug('Supabase Key:', supabaseAnonKey ? (supabaseAnonKey.startsWith('sb_publishable') ? 'ERR_STRIPE_KEY' : 'detectada') : 'VACÍA');

export const IS_SUPABASE_CONNECTED = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseAnonKey.startsWith('sb_publishable') // Evitar confusión con llaves de Stripe
);

// Helper para procesar tokens en la URL si el detectSessionInUrl falla por el HashRouter
const processHashTokens = () => {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (!hash.includes('access_token=')) return;

  // Extraer los parámetros del fragmento, ignorando la ruta del router si fuera necesario
  const params = new URLSearchParams(hash.split('#').pop() || '');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    console.debug('🔑 Tokens detectados manualmente en el fragmento:', accessToken.substring(0, 10) + '...');
    setTimeout(async () => {
      await (supabase as any).auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }, 500);
  }
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as any);

// Ejecutar el procesador manual si estamos en el navegador
if (supabase) {
  processHashTokens();
}
