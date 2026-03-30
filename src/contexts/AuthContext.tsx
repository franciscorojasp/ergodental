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
        console.warn('⚠️ Auth Initial Timeout (6s): Forzando carga básica...');
        setLoading(false);
      }
    }, 6000);

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

      // 2. Obtener sesión inicial con timeout de 5 segundos
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 5000)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        if (result.data?.session) {
          await handleSession(result.data.session);
        }
      } catch (err) {
        console.warn('Conexión lenta o fallida en inicio, procediendo a interfaz...');
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

    // 3. Supabase Auth Listener (solo si existe el cliente)
    let subscription: any = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        console.debug('🚀 Auth Event detected:', event);

        if (event === 'PASSWORD_RECOVERY') {
          window.location.hash = '#/reset-password';
          setLoading(false);
          return;
        }

        await handleSession(session);
        setLoading(false);
      });
      subscription = data.subscription;
    } else {
      setLoading(false);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
      clearTimeout(failsafe);
    };
  }, []); // Solo al montar

  const login = async (email: string, password: string): Promise<Usuario> => {
    try {
      const u = await loginUser(email, password);
      // Guardado permanente para refrescos rápidos
      setUser(u);
      localStorage.setItem('ergo_user', JSON.stringify(u));
      return u;
    } catch (err: any) {
      // EMERGENCIA: Si hay un error de red pero el usuario ya estaba en este dispositivo, permitimos entrar
      const saved = localStorage.getItem('ergo_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.email.toLowerCase() === email.toLowerCase()) {
          console.warn("🔐 MODO EMERGENCIA: Accediendo con perfil local por falla de red.");
          setUser(u);
          return u;
        }
      }
      throw err;
    }
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
