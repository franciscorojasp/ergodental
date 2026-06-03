// src/lib/googleSheets.ts
export const VITE_USE_GOOGLE_SHEETS = import.meta.env.VITE_USE_GOOGLE_SHEETS === 'true';
export const VITE_GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
const API_KEY = 'ERGO_SECRET_2024';

export interface GoogleSheetsResponse {
  error?: string;
  [key: string]: any;
}

export async function googleSheetsRequest(action: string, data: any = {}): Promise<any> {
  if (!VITE_GOOGLE_SCRIPT_URL) {
    throw new Error('URL de Google Apps Script no configurada en las variables de entorno.');
  }

  const url = new URL(VITE_GOOGLE_SCRIPT_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('key', API_KEY);

  // Preprocesar data para stringificar objetos/arrays anidados (ej. items, piezas)
  const processedData: any = {};
  for (const key in data) {
    if (data[key] !== null && typeof data[key] === 'object') {
      processedData[key] = JSON.stringify(data[key]);
    } else {
      processedData[key] = data[key];
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Recomendado para evitar problemas CORS preflight con Google Apps Script
      },
      body: JSON.stringify(processedData),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return { success: true };
    }
    
    const result = JSON.parse(text);
    if (result && result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`Error en googleSheetsRequest (${action}):`, error);
    throw error;
  }
}

// Simulador del comportamiento de la API de Supabase para poder usarlo en withOfflineSync
export const googleSheetsApi = {
  from: (tableName: string) => {
    let entityName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
    if (tableName === 'profiles') entityName = 'Usuarios';
    let singularEntity = entityName;
    if (tableName === 'pacientes') singularEntity = 'Paciente';
    if (tableName === 'personal') singularEntity = 'Personal';
    if (tableName === 'citas') singularEntity = 'Cita';
    if (tableName === 'pagos') singularEntity = 'Pago';
    if (tableName === 'egresos') singularEntity = 'Egreso';
    if (tableName === 'inventario') singularEntity = 'ItemInventario';
    if (tableName === 'proveedores') singularEntity = 'Proveedor';
    if (tableName === 'odontogramas') singularEntity = 'Odontograma';
    if (tableName === 'usuarios' || tableName === 'profiles') singularEntity = 'Usuario';
    if (tableName === 'presupuestos') singularEntity = 'Presupuesto';
    if (tableName === 'facturas' || tableName === 'recibos') singularEntity = 'Factura';
    if (tableName === 'evoluciones_clinicas') {
      entityName = 'EvolucionesClinicas';
      singularEntity = 'EvolucionClinica';
    }
    if (tableName === 'laboratorios') singularEntity = 'Laboratorio';
    if (tableName === 'clinicas') singularEntity = 'Clinica';

    if (tableName === 'auditoria_logs') {
      return {
        insert: (payload: any) => {
          const exec = async () => ({ data: payload, error: null });
          return { then: (onf: any, onr: any) => exec().then(onf, onr) };
        }
      } as any;
    }

    if (tableName === 'tasa_bcv') {
      const executeTasa = async () => {
        try {
          const res = await googleSheetsRequest('getTasaHoy');
          return { data: { monto: res?.tasa || 0 }, error: null };
        } catch (error) { return { data: null, error }; }
      };
      
      const executeHistorial = async () => {
        try {
          let localHist: any[] = [];
          try { localHist = JSON.parse(localStorage.getItem('ergo_tasa_historial') || '[]'); } catch(e){}
          
          const res = await googleSheetsRequest('getTasaHoy');
          const monto = res?.tasa || 0;
          
          if (monto > 0) {
            const hoy = new Date().toLocaleDateString('en-CA');
            if (localHist.length === 0 || (localHist[0] && localHist[0].fecha !== hoy)) {
              localHist.unshift({ monto, fecha: hoy, usuario: 'Sistema' });
              if (localHist.length > 30) localHist = localHist.slice(0, 30);
              localStorage.setItem('ergo_tasa_historial', JSON.stringify(localHist));
            }
          }
          
          return { data: localHist, error: null };
        } catch (error) { return { data: [], error }; }
      };

      return {
        select: () => ({
          order: () => ({
            limit: () => ({ 
              maybeSingle: executeTasa,
              then: (onf: any, onr: any) => executeHistorial().then(onf, onr)
            }),
            maybeSingle: executeTasa,
            then: (onf: any, onr: any) => executeHistorial().then(onf, onr)
          }),
          single: executeTasa,
          maybeSingle: executeTasa,
          then: (onf: any, onr: any) => executeHistorial().then(onf, onr)
        }),
        insert: (payload: any) => {
          const exec = async () => {
            try {
              let localHist: any[] = [];
              try { localHist = JSON.parse(localStorage.getItem('ergo_tasa_historial') || '[]'); } catch(e){}
              
              const hoy = new Date().toLocaleDateString('en-CA');
              const item = { monto: payload.monto, fecha: hoy, usuario: payload.usuario || 'Sistema' };
              
              localHist = localHist.filter((h:any) => h.fecha !== hoy);
              localHist.unshift(item);
              if (localHist.length > 30) localHist = localHist.slice(0, 30);
              
              localStorage.setItem('ergo_tasa_historial', JSON.stringify(localHist));
              
              await googleSheetsRequest('saveTasaHoy', payload);
              return { data: payload, error: null };
            } catch (error) {
              return { data: null, error };
            }
          };
          return { then: (onf: any, onr: any) => exec().then(onf, onr) };
        }
      } as any;
    }

    const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
    const mapKeys = (obj: any, fn: (k: string) => string): any => {
      if (Array.isArray(obj)) return obj.map(v => mapKeys(v, fn));
      if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
          result[fn(key)] = mapKeys(obj[key], fn);
          return result;
        }, {} as any);
      }
      return obj;
    };

    const createChain = (actionName: string, payload: any) => {
      const execute = async () => {
        try {
          const payloadCamel = payload ? mapKeys(payload, toCamel) : payload;
          const data = await googleSheetsRequest(actionName, payloadCamel);
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      };
      
      const chain = {
        select: () => ({
          single: execute,
          maybeSingle: execute
        }),
        then: (onfulfilled: any, onrejected: any) => execute().then(onfulfilled, onrejected)
      };
      return chain;
    };

    return {
      select: () => {
        const executeGet = async () => {
          try {
            let data = await googleSheetsRequest(`get${entityName}`);
            // Autoparsear arrays y objetos que vengan como string
            if (Array.isArray(data)) {
               data = data.map((row: any) => {
                  for (const k in row) {
                     if (typeof row[k] === 'string' && (row[k].startsWith('[') || row[k].startsWith('{'))) {
                        try { row[k] = JSON.parse(row[k]); } catch(e) {}
                     }
                  }
                  return row;
               });
            }
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        };
        return {
          order: () => ({
            limit: () => ({ maybeSingle: executeGet }),
            maybeSingle: executeGet,
            then: (onf: any, onr: any) => executeGet().then(onf, onr)
          }),
          single: executeGet,
          maybeSingle: executeGet,
          then: (onf: any, onr: any) => executeGet().then(onf, onr)
        };
      },
      insert: (payload: any) => createChain(`create${singularEntity}`, payload),
      update: (payload: any) => {
        return {
          eq: (field: string, value: any) => createChain(`update${singularEntity}`, { ...payload, [field]: value })
        };
      },
      upsert: (payload: any, _options?: any) => {
        const action = tableName === 'odontogramas' ? 'saveOdontograma' : `create${singularEntity}`;
        return createChain(action, payload);
      },
      delete: () => {
        return {
          eq: (_field: string, _value: any) => {
             const executeDel = async () => ({ data: null, error: null });
             return {
                then: (onf: any, onr: any) => executeDel().then(onf, onr)
             };
          }
        };
      }
    };
  }
};
