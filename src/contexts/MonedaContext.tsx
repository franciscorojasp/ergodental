import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveTasaHoy, getHistorialTasasDB, processSyncQueue } from '../api';
import { useAuth } from './AuthContext';

export type Moneda = 'USD' | 'BS';

export interface TasaDia {
  fecha: string;   // 'YYYY-MM-DD'
  tasa: number;    // Bs por 1 USD
  fuente: 'Manual' | 'Caché' | 'Servidor';
}


interface MonedaCtx {
  moneda: Moneda;
  setMoneda: (m: Moneda) => void;
  tasaBCV: number;              // Bs por 1 USD (hoy)
  historialTasas: TasaDia[];
  necesitaTasa: boolean;        // true si no se ha ingresado la tasa de hoy
  tasaSetHoy: boolean;          // true si la tasa ya fue establecida hoy (por cualquier usuario)
  guardarTasaManual: (tasa: number) => void;
  loading: boolean;             // true mientras se busca la tasa en el servidor
  /** Formatea un monto USD en la moneda activa */
  fmt: (usd: number, decimals?: number) => string;
}

const STORAGE_TASA  = 'ergo_tasa_bcv';
const STORAGE_HIST  = 'ergo_historial_tasas';
const TASA_DEFAULT  = 0;          // 0 = sin tasa ingresada
const HIST_MAX_DIAS = 90;

const MonedaContext = createContext<MonedaCtx | null>(null);

export function MonedaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [moneda, setMonedaState] = useState<Moneda>(() =>
    (localStorage.getItem('ergo_moneda') as Moneda) || 'USD'
  );
  const [loading, setLoading] = useState(true);

  const [tasaBCV, setTasaBCV] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_TASA) || 'null');
      const hoyV = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      // Solo usar si es de hoy
      if (saved?.fecha === hoyV && saved.tasa > 0) return saved.tasa;
      // Fallback: usar tasa en caché aunque sea de otro día para evitar bloqueos
      if (saved?.tasa > 0) return saved.tasa;
    } catch { /* ignore */ }
    return TASA_DEFAULT;
  });

  const [historialTasas, setHistorial] = useState<TasaDia[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_HIST) || '[]'); } catch { return []; }
  });

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  // true cuando la tasa del día aún no ha sido ingresada
  const necesitaTasa = tasaBCV === TASA_DEFAULT;

  // Detectar si ya fue ingresada hoy (para notificar al usuario)
  const tasaSetHoy = !necesitaTasa;

  const setMoneda = (m: Moneda) => {
    setMonedaState(m);
    localStorage.setItem('ergo_moneda', m);
  };

  // Guardar tasa ingresada manualmente
  const guardarTasaManual = useCallback(async (tasa: number) => {
    if (tasa <= 0) return;
    const entrada: TasaDia = { fecha: hoy, tasa, fuente: 'Manual' };
    setTasaBCV(tasa);
    localStorage.setItem(STORAGE_TASA, JSON.stringify({ tasa, fecha: hoy }));
    
    // Persistencia Global (Google Sheets)
    try { await saveTasaHoy(tasa, user?.nombre); } catch(err) { console.error("Error sincronizando tasa:", err); }

    setHistorial(prev => {
      const sinHoy = prev.filter(t => t.fecha !== hoy);
      const nuevo  = [entrada, ...sinHoy].slice(0, HIST_MAX_DIAS);
      localStorage.setItem(STORAGE_HIST, JSON.stringify(nuevo));
      return nuevo;
    });
  }, [hoy, user]);

  // Sincronización Global con el servidor al iniciar sesión
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const syncTasaData = async () => {
      // 1. Intentar subir cualquier tasa local pendiente al recuperar conexión
      if (navigator.onLine) {
         await processSyncQueue();
      }

      // 2. Traer el historial completo centralizado desde Supabase
      try {
        const historialDB = await getHistorialTasasDB();
        let parsedHistory: TasaDia[] = [];

        if (historialDB && historialDB.length > 0) {
          // Transformar formato DB al formato que espera la app de Frontend
          parsedHistory = historialDB.map((t: any) => ({
             fecha: String(t.fecha).split('T')[0],
             tasa: t.monto,
             fuente: 'Servidor' as const
          }));
          
          setHistorial(parsedHistory);
          localStorage.setItem(STORAGE_HIST, JSON.stringify(parsedHistory));

          // Si la primera tasa del historial es de HOY, la aplicamos directamente
          const histHoy = parsedHistory[0];
          if (histHoy && histHoy.fecha === hoy && histHoy.tasa > 0) {
            setTasaBCV(histHoy.tasa);
            localStorage.setItem(STORAGE_TASA, JSON.stringify({ tasa: histHoy.tasa, fecha: hoy }));
            setLoading(false);
            return;
          }
        }

        // ¡NO HAY TASA PARA HOY EN SUPABASE! Intentar obtener de API Pública de Dolar BCV
        let tasaEncontrada = 0;
        try {
          const bcvRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
          if (bcvRes.ok) {
            const bcvData = await bcvRes.json();
            if (bcvData && bcvData.promedio) {
              const tasaAuto = typeof bcvData.promedio === 'string' 
                ? parseFloat(bcvData.promedio.replace(',', '.')) 
                : Number(bcvData.promedio);
                
              if (tasaAuto > 0) {
                tasaEncontrada = tasaAuto;
                setTasaBCV(tasaAuto);
                localStorage.setItem(STORAGE_TASA, JSON.stringify({ tasa: tasaAuto, fecha: hoy }));
                // Sincronizar a Supabase para que los demás la tengan lista
                saveTasaHoy(tasaAuto, 'Bot Automático BCV').catch(e => console.warn('Error guardando tasa auto:', e));
              }
            }
          }
        } catch (err) {
          console.warn("No se pudo obtener la tasa automática del BCV", err);
        }

        // Fallback: Si no se pudo obtener automáticamente y hay historial
        if (tasaEncontrada === 0) {
          const ultimaTasa = parsedHistory.find(t => t.tasa > 0) || historialTasas.find(t => t.tasa > 0);
          if (ultimaTasa) {
            console.log("Usando tasa anterior como fallback:", ultimaTasa.tasa);
            setTasaBCV(ultimaTasa.tasa);
            localStorage.setItem(STORAGE_TASA, JSON.stringify({ tasa: ultimaTasa.tasa, fecha: hoy }));
          } else {
            // Fuerza modal manual si no hay ningún historial (caso muy raro)
            setTasaBCV(TASA_DEFAULT);
          }
        }
      } catch (err) {
        console.error("Error sincronizando tasas BCV:", err);
        // Fallback local en caso de error de conexión
        const ultimaTasa = historialTasas.find(t => t.tasa > 0);
        if (ultimaTasa) {
          setTasaBCV(ultimaTasa.tasa);
          localStorage.setItem(STORAGE_TASA, JSON.stringify({ tasa: ultimaTasa.tasa, fecha: hoy }));
        }
      } finally {
        setLoading(false);
      }
    };

    syncTasaData();
  }, [user, hoy]);

  /** Formatea un monto en USD → moneda activa */
  const fmt = useCallback((usd: number, decimals = 2): string => {
    if (moneda === 'USD') {
      return `$${usd.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    if (tasaBCV === 0) {
      // Sin tasa — mostrar en USD con indicador
      return `$${usd.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    const bs = usd * tasaBCV;
    return `Bs ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [moneda, tasaBCV]);

  return (
    <MonedaContext.Provider value={{ moneda, setMoneda, tasaBCV, historialTasas, necesitaTasa, tasaSetHoy, guardarTasaManual, loading, fmt }}>
      {children}
    </MonedaContext.Provider>
  );
}

export function useMoneda() {
  const ctx = useContext(MonedaContext);
  if (!ctx) throw new Error('useMoneda must be inside MonedaProvider');
  return ctx;
}
