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

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Recomendado para evitar problemas CORS preflight con Google Apps Script
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
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
    const entityName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
    let singularEntity = entityName;
    if (tableName === 'pacientes') singularEntity = 'Paciente';
    if (tableName === 'personal') singularEntity = 'Personal';
    if (tableName === 'citas') singularEntity = 'Cita';
    if (tableName === 'pagos') singularEntity = 'Pago';
    if (tableName === 'egresos') singularEntity = 'Egreso';
    if (tableName === 'inventario') singularEntity = 'ItemInventario';
    if (tableName === 'proveedores') singularEntity = 'Proveedor';
    if (tableName === 'odontogramas') singularEntity = 'Odontograma';
    if (tableName === 'usuarios') singularEntity = 'Usuario';
    if (tableName === 'presupuestos') singularEntity = 'Presupuesto';
    if (tableName === 'facturas') singularEntity = 'Factura';

    const createChain = (actionName: string, payload: any) => {
      const execute = async () => {
        try {
          const data = await googleSheetsRequest(actionName, payload);
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
            const data = await googleSheetsRequest(`get${entityName}`);
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
      upsert: (payload: any, options?: any) => {
        const action = tableName === 'odontogramas' ? 'saveOdontograma' : `create${singularEntity}`;
        return createChain(action, payload);
      },
      delete: () => {
        return {
          eq: (field: string, value: any) => {
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
