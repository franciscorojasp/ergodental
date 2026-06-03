import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuramos las variables (Asegúrate de que VITE_GOOGLE_SCRIPT_URL tenga el valor real en tu .env)
const supabaseUrl = 'https://qekotlqwollxcvcawvns.supabase.co';
// Usa tu ANON_KEY real aquí o leela del .env
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla290bHF3b2xseGN2Y2F3dm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjk5MTEsImV4cCI6MjA5MDAwNTkxMX0.ah2W38jGubpOGh4pwi-5lO74dF-LT9KqZB2CFuRKBFs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Debemos pasar la URL del script por linea de comandos o leerla del env
const GOOGLE_SCRIPT_URL = process.env.VITE_GOOGLE_SCRIPT_URL;
const API_KEY = 'ERGO_SECRET_2024';

if (!GOOGLE_SCRIPT_URL) {
  console.error("ERROR: No se encontró VITE_GOOGLE_SCRIPT_URL. Asegurate de correr el script exportando las variables o agregala aquí.");
  process.exit(1);
}

const TABLAS = [
  { supabase: 'profiles', sheetsAction: 'createUsuario', isUser: true },
  { supabase: 'pacientes', sheetsAction: 'createPaciente' },
  { supabase: 'personal', sheetsAction: 'createPersonal' },
  { supabase: 'citas', sheetsAction: 'createCita' },
  { supabase: 'pagos', sheetsAction: 'createPago' },
  { supabase: 'egresos', sheetsAction: 'createEgreso' },
  { supabase: 'inventario', sheetsAction: 'createItemInventario' },
  { supabase: 'proveedores', sheetsAction: 'createProveedor' },
  { supabase: 'odontogramas', sheetsAction: 'saveOdontograma' },
  { supabase: 'presupuestos', sheetsAction: 'createPresupuesto' },
  { supabase: 'recibos', sheetsAction: 'createFactura' }
];

// Helper snake_case to camelCase
const toCamel = (s) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
function mapKeys(obj) {
  if (Array.isArray(obj)) return obj.map(v => mapKeys(v));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, k) => {
      acc[toCamel(k)] = mapKeys(obj[k]);
      return acc;
    }, {});
  }
  return obj;
}

async function migrarTabla(tablaInfo) {
  console.log(`\n📦 Migrando tabla: ${tablaInfo.supabase}...`);
  
  const { data, error } = await supabase.from(tablaInfo.supabase).select('*');
  
  if (error) {
    console.error(`❌ Error al obtener ${tablaInfo.supabase}:`, error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️ La tabla ${tablaInfo.supabase} está vacía. Saltando...`);
    return;
  }

  console.log(`Encontrados ${data.length} registros. Enviando a Google Sheets...`);
  
  let successCount = 0;
  for (const item of data) {
    let payload = mapKeys(item);
    
    // Transformaciones especiales
    if (tablaInfo.isUser) {
      payload.nombre = payload.firstName + ' ' + (payload.lastName || '');
      payload.password = payload.id; // Fallback provisional
    }
    if (tablaInfo.supabase === 'odontogramas') {
      payload.piezas = payload.datos || payload.piezas;
    }

    try {
      const url = new URL(GOOGLE_SCRIPT_URL);
      url.searchParams.append('action', tablaInfo.sheetsAction);
      url.searchParams.append('key', API_KEY);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      successCount++;
    } catch (err) {
      console.error(`❌ Error insertando registro ${item.id} de ${tablaInfo.supabase}:`, err.message);
    }
  }
  console.log(`✅ Migración completada para ${tablaInfo.supabase}: ${successCount}/${data.length} registros insertados.`);
}

async function ejecutarMigracion() {
  console.log("🚀 Iniciando migración automatizada de Supabase a Google Sheets...");
  for (const t of TABLAS) {
    await migrarTabla(t);
  }
  console.log("\n🎉 ¡MIGRACIÓN TOTAL FINALIZADA!");
}

ejecutarMigracion();
