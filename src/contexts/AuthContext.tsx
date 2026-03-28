// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Usuario, loginUser, IS_DEMO_MODE, resetPasswordForEmail, updatePassword } from '../api';
import { supabase } from '../lib/supabase';

interface AuthCtx {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Usuario>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Intentar cargar usuario desde localStorage primero (si es modo Demo o si forzamos sesión Demo)
    const saved = localStorage.getItem('ergo_user');
    if (saved) {
      try { 
        const u = JSON.parse(saved);
        setUser(u); 
      } catch { /* ignore */ }
      if (IS_DEMO_MODE) {
        setLoading(false);
        return;
      }
    }

    if (IS_DEMO_MODE) {
      setLoading(false);
      return;
    }

    // Supabase Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.debug('🚀 Auth Event detected:', event);

      if (event === 'PASSWORD_RECOVERY') {
        console.debug('🔑 Recuperación de contraseña activada, redirigiendo...');
        window.location.hash = '#/reset-password';
        setLoading(false);
        return;
      }

      if (session?.user) {
        try {
          // Si ya tenemos el usuario en estado y el ID coincide, no hace falta re-consultar
          if (user?.id === session.user.id) return;

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && profile) {
            // Helper local para camelCase (mismo que en api.ts)
            const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
            const mapKeys = (obj: any): any => {
              return Object.keys(obj).reduce((acc, k) => {
                acc[toCamel(k)] = obj[k];
                return acc;
              }, {} as any);
            };

            const u = mapKeys(profile) as Usuario;
            
            // SUPER ADMIN BYPASS: Francisco y equipo siempre son ADMIN tras refrescar la página
            const SUPER_ADMINS = [
              'francisco.rojasp@gmail.com', 
              'blascojennifer47@gmail.com', 
              'vera.hugo712@gmail.com', 
              'carlosalejandroverablasco183@gmail.com'
            ];

            if (session.user.email && SUPER_ADMINS.includes(session.user.email.toLowerCase())) {
              u.rol = 'ADMIN';
            }

            setUser(u);
            localStorage.removeItem('ergo_user');
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
        }
      } else {
        // IMPORTANTE: Si NO hay sesión de Supabase pero hay un usuario Demo guardado, 
        // NO lo borramos.
        const saved = localStorage.getItem('ergo_user');
        if (!saved) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<Usuario> => {
    const u = await loginUser(email, password);
    // Verificamos si es un correo de prueba (admin@, doctor@, etc)
    const isDemoAccount = ['admin@ergodental.com', 'doctor@ergodental.com', 'asistente@ergodental.com', 'recepcion@ergodental.com', 'pro@ergodental.com'].includes(u.email);
    
    if (IS_DEMO_MODE || isDemoAccount) {
      setUser(u);
      localStorage.setItem('ergo_user', JSON.stringify(u));
    }
    // Si es Supabase real, onAuthStateChange se encargará más tarde
    return u;
  };

  const logout = async () => {
    localStorage.removeItem('ergo_user');
    if (!IS_DEMO_MODE) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await resetPasswordForEmail(email);
    if (error) throw error;
  };

  const updatePasswordNew = async (password: string) => {
    const { error } = await updatePassword(password);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, resetPassword, updatePassword: updatePasswordNew }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
