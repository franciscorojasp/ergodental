import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTasaHoy, saveTasaHoy } from '../api';
import { useAuth } from './AuthContext';

export type Moneda = 'USD' | 'BS';

export interface TasaDia {
  fecha: string;   // 'YYYY-MM-DD'
  tasa: number;    // Bs por 1 USD
  fuente: 'Manual' | 'Caché';
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
      const hoy   = new Date().toISOString().split('T')[0];
      // Solo usar si es de hoy
      if (saved?.fecha === hoy && saved.tasa > 0) return saved.tasa;
    } catch { /* ignore */ }
    return TASA_DEFAULT;
  });

  const [historialTasas, setHistorial] = useState<TasaDia[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_HIST) || '[]'); } catch { return []; }
  });

  const hoy = new Date().toISOString().split('T')[0];

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
    try { await saveTasaHoy(tasa); } catch(err) { console.error("Error sincronizando tasa:", err); }

    setHistorial(prev => {
      const sinHoy = prev.filter(t => t.fecha !== hoy);
      const nuevo  = [entrada, ...sinHoy].slice(0, HIST_MAX_DIAS);
      localStorage.setItem(STORAGE_HIST, JSON.stringify(nuevo));
      return nuevo;
    });
  }, [hoy]);

  // Si al iniciar la sesión ya tenemos tasa de otro día, marcar como caché
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_TASA) || 'null');
      if (saved && saved.fecha !== hoy && saved.tasa > 0) {
        // Hay tasa de un día anterior — usar como fallback pero seguir pidiendo la de hoy
        setTasaBCV(TASA_DEFAULT); // fuerza el modal
      }
    } catch { /* ignore */ }
  }, [hoy]);

  // Sincronización Global con el servidor al iniciar sesión
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getTasaHoy().then(tasaGlobal => {
      if (tasaGlobal && tasaGlobal > 0) {
        setTasaBCV(tasaGlobal);
        localStorage.setItem(STORAGE_TASA, JSON.stringify({ tasa: tasaGlobal, fecha: hoy }));
      }
    }).catch(err => {
      console.error("Error al obtener tasa global:", err);
    }).finally(() => {
      setLoading(false);
    });
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
