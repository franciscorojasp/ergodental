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
    // Failsafe: Si después de 6 segundos sigue cargando, forzar el fin del loading
    // para evitar la pantalla blanca permanente.
    const failsafe = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Auth Timeout (25s): Forzando fin de carga...');
        setLoading(false);
      }
    }, 25000);

    const initAuth = async () => {
      // 1. Carga desde localStorage (Demo o sesión previa)
      const saved = localStorage.getItem('ergo_user');
      if (saved) {
        try { 
          const u = JSON.parse(saved);
          setUser(u); 
        } catch { /* ignore */ }
        if (IS_DEMO_MODE) {
          setLoading(false);
          clearTimeout(failsafe);
          return;
        }
      }

      if (IS_DEMO_MODE || !supabase) {
        setLoading(false);
        clearTimeout(failsafe);
        return;
      }

      // 2. Obtener sesión inicial explícitamente (más confiable que solo el listener)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await handleSession(session);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
      } finally {
        setLoading(false);
        clearTimeout(failsafe);
      }
    };

    const handleSession = async (session: any) => {
      if (!session?.user) {
        const saved = localStorage.getItem('ergo_user');
        if (!saved) setUser(null);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // BYPASS: Si es Super Admin, garantizamos el acceso incluso si no hay perfil creado
        const SUPER_ADMINS = [
          'francisco.rojasp@gmail.com', 
          'blascojennifer47@gmail.com', 
          'vera.hugo712@gmail.com', 
          'carlosalejandroverablasco183@gmail.com'
        ];
        
        const isSuperAdmin = session.user.email && SUPER_ADMINS.includes(session.user.email.toLowerCase());

        if (!error && profile) {
          const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
          const mapKeys = (obj: any): any => {
            if (!obj) return obj;
            return Object.keys(obj).reduce((acc, k) => {
              acc[toCamel(k)] = obj[k];
              return acc;
            }, {} as any);
          };

          const u = mapKeys(profile) as Usuario;
          if (isSuperAdmin) u.rol = 'ADMIN';

          setUser(u);
          localStorage.removeItem('ergo_user');
        } else if (isSuperAdmin) {
          // Fallback seguro en recargas (F5) para admins sin perfil real en tabla
          setUser({
            id: session.user.id,
            nombre: session.user.email.split('@')[0],
            email: session.user.email,
            rol: 'ADMIN',
            activo: true
          });
        } else {
          console.error("No profile found or error fetching profile inside handleSession:", error || 'User lacks profile record');
          setUser(null); // Evitar quedarse pegado sin profile
        }
      } catch (e) {
        console.error("Critical error in handleSession:", e);
        setUser(null);
      } finally {
        setLoading(false); // Siempre garantizamos quitar loading tras el fetch
      }
    };

    initAuth();

    // 3. Supabase Auth Listener (para cambios posteriores)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.debug('🚀 Auth Event detected:', event);

      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#/reset-password';
        setLoading(false);
        return;
      }

      await handleSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(failsafe);
    };
  }, []); // Solo al montar

  const login = async (email: string, password: string): Promise<Usuario> => {
    const u = await loginUser(email, password);
    // Verificamos si es un correo de prueba o un bypass de desarrollador
    const isDemoAccount = ['admin@ergodental.com', 'doctor@ergodental.com', 'asistente@ergodental.com', 'recepcion@ergodental.com', 'pro@ergodental.com'].includes(u.email);
    const isBypass = u.id === 'user-temp-fix' || u.id === 'admin-offline-bypass';
    
    if (IS_DEMO_MODE || isDemoAccount || isBypass) {
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
