const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer variables directamente de .env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function discover() {
  console.log('--- AUDITORÍA DE DATOS (MÉTODO JS) ---');
  // Intentar leer cualquier registro de odontogramas
  const { data, error } = await supabase.from('odontogramas').select('*').limit(1);
  
  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Columnas encontradas:', Object.keys(data[0]).join(', '));
  } else {
    console.log('⚠️ Tabla vacía. Probando inserción para ver nombres de columna requeridos...');
    // Intentar insertar algo para ver qué columnas existen en realidad
    const { error: insError } = await supabase.from('odontogramas').insert({ test: true });
    console.log('Pista del Error de BD:', insError?.message || 'Ninguna');
  }
}

discover();
