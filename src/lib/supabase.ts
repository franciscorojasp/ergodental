// src/lib/supabase.ts
// Cliente Supabase centralizado. Si las variables de entorno no están configuradas,
// la app corre en MODO DEMO con datos locales (sin conexión a BD real).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detectar si la clave actual es incorrecta (Stripe) y forzar la correcta
const IS_STRIPE_KEY = supabaseAnonKey.startsWith('sb_publishable');
const finalAnonKey = IS_STRIPE_KEY ? '' : supabaseAnonKey;

const isPlaceholderUrl = (url: string) => 
  !url || 
  url.includes('qekotlqwollxcvcawvns') || 
  url.includes('qpkptlowpjlxsycsvpns') || 
  url.includes('placeholder') ||
  url.includes('your-project');

export const IS_SUPABASE_CONNECTED = 
  import.meta.env.VITE_USE_GOOGLE_SHEETS !== 'true' && 
  !!(supabaseUrl && finalAnonKey && supabaseUrl.startsWith('http') && !isPlaceholderUrl(supabaseUrl));

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

export const supabase = IS_SUPABASE_CONNECTED
  ? createClient(supabaseUrl, finalAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ergodentalve-session', // Llave unificada definitiva
      },
    })
  : (null as any);

// Ejecutar el procesador manual si estamos en el navegador y hay tokens en la URL (HashRouter fix)
if (typeof window !== 'undefined' && supabase) {
  processHashTokens();
}
