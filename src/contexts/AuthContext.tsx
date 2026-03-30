import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Usuario, loginUser, resetPasswordForEmail, updatePassword } from '../api';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Mapeo de perfiles (snake_case a camelCase)
  const mapProfileToUser = (profile: any, sessionUser: any, isSuperAdmin: boolean): Usuario => {
    const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
    
    if (profile) {
      const mapped: any = {};
      Object.keys(profile).forEach(k => mapped[toCamel(k)] = profile[k]);
      const u = mapped as Usuario;
      if (isSuperAdmin) u.rol = 'ADMIN';
      return u;
    }

    // Fallback si no hay perfil en la tabla 'profiles'
    return {
      id: sessionUser.id,
      nombre: sessionUser.email?.split('@')[0] || 'Usuario',
      email: sessionUser.email || '',
      rol: isSuperAdmin ? 'ADMIN' : 'RECEPCION', // Rol base por defecto
      activo: true
    };
  };

  const handleSession = async (session: any) => {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const SUPER_ADMINS = [
        'francisco.rojasp@gmail.com', 
        'blascojennifer47@gmail.com', 
        'vera.hugo712@gmail.com', 
        'carlosalejandroverablasco183@gmail.com'
      ];
      const email = session.user.email?.toLowerCase();
      const isSuperAdmin = email && SUPER_ADMINS.includes(email);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      const finalUser = mapProfileToUser(profile, session.user, !!isSuperAdmin);
      
      setUser(finalUser);
      localStorage.setItem('ergo_user', JSON.stringify(finalUser));
    } catch (e) {
      console.error('Error sincronizando perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. CARGA OPTIMISTA: Recuperar inmediatamente de localStorage para evitar blank screen
    const saved = localStorage.getItem('ergo_user');
    if (saved) {
      try {
        const cachedUser = JSON.parse(saved);
        setUser(cachedUser);
        setLoading(false);
        console.debug('⚡ Resiliencia: Sesión recuperada de caché local.');
      } catch (e) {
        localStorage.removeItem('ergo_user');
      }
    }

    // 2. ESCUCHA DE SESIÓN: Supabase como única fuente de verdad en red
    let subscription: any = null;

    if (supabase) {
      // Intentar obtener sesión inicial de forma asíncrona pero sin bloquear el render
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session) handleSession(session);
        else if (!saved) setLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        console.debug(`🔑 Evento Auth: ${event}`);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('ergo_user');
          setLoading(false);
        } else if (event === 'PASSWORD_RECOVERY') {
          window.location.hash = '#/reset-password';
          setLoading(false);
        } else if (session) {
          handleSession(session);
        }
      });
      subscription = data.subscription;
    } else {
      setLoading(false);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<Usuario> => {
    try {
      const u = await loginUser(email, password);
      setUser(u);
      localStorage.setItem('ergo_user', JSON.stringify(u));
      return u;
    } catch (err: any) {
      // MODO EMERGENCIA: Si falla la red pero el usuario coincide con el caché, permitimos entrar
      const saved = localStorage.getItem('ergo_user');
      if (saved) {
        const cached = JSON.parse(saved);
        if (cached.email.toLowerCase() === email.toLowerCase()) {
          console.warn("🔐 Accediendo vía caché por falla de red.");
          setUser(cached);
          return cached;
        }
      }
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('ergo_user');
    if (supabase) await supabase.auth.signOut();
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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      resetPassword, 
      updatePassword: updatePasswordNew 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
