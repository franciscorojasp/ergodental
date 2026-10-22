import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveTasaHoy, getHistorialTasasDB, processSyncQueue } from '../api';
import { useAuth } from './AuthContext';

export type Moneda = 'USD' | 'BS';

export interface TasaDia {
  fecha: string;      // 'YYYY-MM-DD'
  tasa: number;       // Bs por 1 USD
  tasaEuro?: number;  // Bs por 1 EUR
  fuente: 'Manual' | 'Caché' | 'Servidor' | 'BCV Oficial';
}

export interface MonedaCtx {
  moneda: Moneda;
  setMoneda: (m: Moneda) => void;
  tasaBCV: number;              // Bs por 1 USD (hoy)
  tasaEuroBCV: number;          // Bs por 1 EUR (hoy)
  fechaTasaBCV: string;         // Fecha de publicación oficial del BCV
  ultimaActualizacion: string;  // Hora de última consulta exitosa
  actualizandoTasas: boolean;   // true mientras se consulta la API
  historialTasas: TasaDia[];
  necesitaTasa: boolean;        // true si no se ha obtenido tasa
  tasaSetHoy: boolean;          // true si la tasa ya fue establecida hoy
  guardarTasaManual: (tasaDolar: number, tasaEuro?: number) => Promise<void>;
  actualizarTasasAuto: (forzar?: boolean) => Promise<{ dolar: number; euro: number; fechaOficial?: string } | null>;
  loading: boolean;             // true mientras se inicializa
  fmt: (usd: number, decimals?: number) => string;
  fmtEuro: (eur: number, decimals?: number) => string;
}

const STORAGE_TASA  = 'ergo_tasa_bcv';
const STORAGE_HIST  = 'ergo_historial_tasas';
const TASA_DEFAULT  = 0;
const HIST_MAX_DIAS = 90;

const MonedaContext = createContext<MonedaCtx | null>(null);

export function MonedaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [moneda, setMonedaState] = useState<Moneda>(() =>
    (localStorage.getItem('ergo_moneda') as Moneda) || 'USD'
  );
  const [loading, setLoading] = useState(true);
  const [actualizandoTasas, setActualizandoTasas] = useState(false);

  const [tasaBCV, setTasaBCV] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_TASA) || 'null');
      if (saved?.tasa > 0) return saved.tasa;
    } catch { /* ignore */ }
    return TASA_DEFAULT;
  });

  const [tasaEuroBCV, setTasaEuroBCV] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_TASA) || 'null');
      if (saved?.tasaEuro > 0) return saved.tasaEuro;
    } catch { /* ignore */ }
    return 0;
  });

  const [fechaTasaBCV, setFechaTasaBCV] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_TASA) || 'null');
      return saved?.fechaOficial || saved?.fecha || '';
    } catch { /* ignore */ }
    return '';
  });

  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_TASA) || 'null');
      return saved?.hora || '';
    } catch { /* ignore */ }
    return '';
  });

  const [historialTasas, setHistorial] = useState<TasaDia[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_HIST) || '[]'); } catch { return []; }
  });

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  const necesitaTasa = tasaBCV === TASA_DEFAULT;
  const tasaSetHoy = !necesitaTasa;

  const setMoneda = (m: Moneda) => {
    setMonedaState(m);
    localStorage.setItem('ergo_moneda', m);
  };

  // Función maestra de consulta automática a las APIs del BCV
  const actualizarTasasAuto = useCallback(async (_forzar = false): Promise<{ dolar: number; euro: number; fechaOficial?: string } | null> => {
    setActualizandoTasas(true);
    try {
      // Consultar APIs oficiales de Venezuela en paralelo (Dólar Oficial y Euro Oficial)
      const [resDolar, resEuro] = await Promise.all([
        fetch('https://ve.dolarapi.com/v1/dolares/oficial').catch(() => null),
        fetch('https://ve.dolarapi.com/v1/euros/oficial').catch(() => null)
      ]);

      let nuevoDolar = 0;
      let nuevoEuro = 0;
      let fechaOficial = '';

      if (resDolar && resDolar.ok) {
        const dataD = await resDolar.json();
        if (dataD && dataD.promedio) {
          nuevoDolar = typeof dataD.promedio === 'string'
            ? parseFloat(dataD.promedio.replace(',', '.'))
            : Number(dataD.promedio);
          if (dataD.fechaActualizacion) {
            fechaOficial = dataD.fechaActualizacion;
          }
        }
      }

      if (resEuro && resEuro.ok) {
        const dataE = await resEuro.json();
        if (dataE && dataE.promedio) {
          nuevoEuro = typeof dataE.promedio === 'string'
            ? parseFloat(dataE.promedio.replace(',', '.'))
            : Number(dataE.promedio);
          if (!fechaOficial && dataE.fechaActualizacion) {
            fechaOficial = dataE.fechaActualizacion;
          }
        }
      }

      // Si por alguna razón la API de Euro no responde pero Dólar sí, calcular paridad de mercado (~1.12)
      if (nuevoDolar > 0 && nuevoEuro === 0) {
        nuevoEuro = Number((nuevoDolar * 1.1226).toFixed(4));
      }

      if (nuevoDolar > 0) {
        setTasaBCV(nuevoDolar);
        if (nuevoEuro > 0) setTasaEuroBCV(nuevoEuro);
        if (fechaOficial) setFechaTasaBCV(fechaOficial);
        const horaStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        setUltimaActualizacion(horaStr);

        // Guardar en caché local
        localStorage.setItem(STORAGE_TASA, JSON.stringify({
          tasa: nuevoDolar,
          tasaEuro: nuevoEuro,
          fecha: hoy,
          fechaOficial,
          hora: horaStr
        }));

        // Guardar en historial
        const entrada: TasaDia = {
          fecha: hoy,
          tasa: nuevoDolar,
          tasaEuro: nuevoEuro > 0 ? nuevoEuro : undefined,
          fuente: 'BCV Oficial'
        };
        setHistorial(prev => {
          const sinHoy = prev.filter(t => t.fecha !== hoy);
          const nuevo = [entrada, ...sinHoy].slice(0, HIST_MAX_DIAS);
          localStorage.setItem(STORAGE_HIST, JSON.stringify(nuevo));
          return nuevo;
        });

        // Sincronizar en base de datos global (Google Sheets / Supabase)
        saveTasaHoy(nuevoDolar, 'Bot Automático BCV', nuevoEuro, fechaOficial).catch(e =>
          console.warn('Error guardando tasa auto en DB:', e)
        );

        return { dolar: nuevoDolar, euro: nuevoEuro, fechaOficial };
      }
    } catch (err) {
      console.warn('No se pudo obtener tasa automática del BCV:', err);
    } finally {
      setActualizandoTasas(false);
      setLoading(false);
    }
    return null;
  }, [hoy]);

  // Guardar tasa ingresada manualmente
  const guardarTasaManual = useCallback(async (tasaDolar: number, tasaEuro?: number) => {
    if (tasaDolar <= 0) return;
    const finalEuro = tasaEuro && tasaEuro > 0 ? tasaEuro : (tasaEuroBCV > 0 ? tasaEuroBCV : Number((tasaDolar * 1.1226).toFixed(4)));
    const entrada: TasaDia = { fecha: hoy, tasa: tasaDolar, tasaEuro: finalEuro, fuente: 'Manual' };
    
    setTasaBCV(tasaDolar);
    setTasaEuroBCV(finalEuro);
    const horaStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    setUltimaActualizacion(horaStr);

    localStorage.setItem(STORAGE_TASA, JSON.stringify({
      tasa: tasaDolar,
      tasaEuro: finalEuro,
      fecha: hoy,
      hora: horaStr
    }));

    try {
      await saveTasaHoy(tasaDolar, user?.nombre || 'Administrador', finalEuro);
    } catch(err) {
      console.error("Error sincronizando tasa manual:", err);
    }

    setHistorial(prev => {
      const sinHoy = prev.filter(t => t.fecha !== hoy);
      const nuevo  = [entrada, ...sinHoy].slice(0, HIST_MAX_DIAS);
      localStorage.setItem(STORAGE_HIST, JSON.stringify(nuevo));
      return nuevo;
    });
  }, [hoy, user, tasaEuroBCV]);

  // Sincronización automática al inicio de la aplicación
  useEffect(() => {
    const syncTasaData = async () => {
      if (navigator.onLine) {
        await processSyncQueue();
        
        // 1. Intentar actualizar en vivo de forma prioritaria
        const tasasEnVivo = await actualizarTasasAuto();
        if (tasasEnVivo && tasasEnVivo.dolar > 0) {
          setLoading(false);
          return;
        }
      }

      // 2. Si no hubo internet o falló la API pública, consultar la base de datos centralizada
      try {
        const historialDB = await getHistorialTasasDB();
        if (historialDB && historialDB.length > 0) {
          const parsedHistory: TasaDia[] = historialDB.map((t: any) => ({
            fecha: String(t.fecha).split('T')[0],
            tasa: t.monto,
            tasaEuro: t.montoEuro,
            fuente: 'Servidor' as const
          }));
          setHistorial(parsedHistory);
          localStorage.setItem(STORAGE_HIST, JSON.stringify(parsedHistory));

          const ultima = parsedHistory.find(t => t.tasa > 0);
          if (ultima) {
            setTasaBCV(ultima.tasa);
            if (ultima.tasaEuro) setTasaEuroBCV(ultima.tasaEuro);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error consultando tasas desde DB:", err);
      } finally {
        setLoading(false);
      }
    };

    syncTasaData();
  }, [actualizarTasasAuto]);

  /** Formatea un monto en USD → moneda activa */
  const fmt = useCallback((usd: number, decimals = 2): string => {
    if (moneda === 'USD') {
      return `$${usd.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    if (tasaBCV === 0) {
      return `$${usd.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    const bs = usd * tasaBCV;
    return `Bs ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [moneda, tasaBCV]);

  /** Formatea un monto en EUR */
  const fmtEuro = useCallback((eur: number, decimals = 2): string => {
    return `€${eur.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }, []);

  return (
    <MonedaContext.Provider value={{
      moneda,
      setMoneda,
      tasaBCV,
      tasaEuroBCV,
      fechaTasaBCV,
      ultimaActualizacion,
      actualizandoTasas,
      historialTasas,
      necesitaTasa,
      tasaSetHoy,
      guardarTasaManual,
      actualizarTasasAuto,
      loading,
      fmt,
      fmtEuro
    }}>
      {children}
    </MonedaContext.Provider>
  );
}

export function useMoneda() {
  const ctx = useContext(MonedaContext);
  if (!ctx) throw new Error('useMoneda must be inside MonedaProvider');
  return ctx;
}
