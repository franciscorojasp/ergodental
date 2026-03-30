// src/lib/supabase.ts
// Cliente Supabase centralizado. Si las variables de entorno no están configuradas,
// la app corre en MODO DEMO con datos locales (sin conexión a BD real).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qekotlqwollxcvcawvns.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla290bHF3b2xseGN2Y2F3dm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjk5MTEsImV4cCI6MjA5MDAwNTkxMX0.ah2W38jGubpOGh4pwi-5lO74dF-LT9KqZB2CFuRKBFs';

// Detectar si la clave actual es incorrecta (Stripe) y forzar la correcta
const IS_STRIPE_KEY = supabaseAnonKey.startsWith('sb_publishable');
const finalAnonKey = IS_STRIPE_KEY ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla290bHF3b2xseGN2Y2F3dm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjk5MTEsImV4cCI6MjA5MDAwNTkxMX0.ah2W38jGubpOGh4pwi-5lO74dF-LT9KqZB2CFuRKBFs' : supabaseAnonKey;

console.debug('Supabase URL:', supabaseUrl ? 'detectada' : 'VACÍA');
console.debug('Supabase Key:', finalAnonKey ? (IS_STRIPE_KEY ? 'STRIKE_FIX_APPLIED' : 'detectada') : 'VACÍA');

export const IS_SUPABASE_CONNECTED = !!(
  supabaseUrl && 
  finalAnonKey && 
  supabaseUrl.startsWith('http')
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

export const supabase = (supabaseUrl && finalAnonKey)
  ? createClient(supabaseUrl, finalAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ergodental-session', // Llave unificada definitiva
      },
    })
  : (null as any);

// Ejecutar el procesador manual si estamos en el navegador y hay tokens en la URL (HashRouter fix)
if (typeof window !== 'undefined' && supabase) {
  processHashTokens();
}
