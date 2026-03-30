import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: No se encontraron las variables de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverSchema() {
  console.log('--- AUDITORÍA DE ESQUEMA: ODONTOGRAMAS ---');
  
  // 1. Intentar leer un registro para ver sus llaves
  const { data, error } = await supabase.from('odontogramas').select('*').limit(1);
  
  if (error) {
    console.error('Error al leer tabla:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Registro encontrado. Columnas detectadas:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('Contenido del primer registro:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️ No hay registros en la tabla odontogramas para auditar.');
    
    // 2. Intentar una inserción dummy en una columna probable para ver el error de PostgreSQL
    const { error: insertError } = await supabase.from('odontogramas').insert({
      paciente_id: 'fake-id',
      column_discovery_test: {} 
    });
    
    if (insertError) {
      console.log('Mensaje de error de Supabase (revelador):', insertError.message);
      console.log('Detalle Técnico:', insertError.details);
    }
  }
}

discoverSchema();
