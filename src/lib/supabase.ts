// src/lib/supabase.ts
// Cliente Supabase centralizado. Si las variables de entorno no están configuradas,
// la app corre en MODO DEMO con datos locales (sin conexión a BD real).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const IS_SUPABASE_CONNECTED = !!(supabaseUrl && supabaseAnonKey);

export const supabase = IS_SUPABASE_CONNECTED
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : (null as any);
