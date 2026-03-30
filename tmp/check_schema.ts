// tmp/check_schema.ts
import { supabase } from '../src/lib/supabase';

async function checkSchema() {
  console.log("🔍 Iniciando auditoría de esquema en vivo...");
  
  // 1. Verificar Odontogramas
  const { data: odontograma, error: oError } = await supabase.from('odontogramas').select('*').limit(1).maybeSingle();
  if (oError) {
    console.error("❌ Error leyendo odontogramas:", oError.message);
  } else if (odontograma) {
    console.log("✅ Columnas encontradas en 'odontogramas':", Object.keys(odontograma));
  } else {
    console.log("⚠️ No hay registros en 'odontogramas' para auditar columnas.");
  }

  // 2. Verificar Pacientes (por si acaso)
  const { data: paciente, error: pError } = await supabase.from('pacientes').select('*').limit(1).maybeSingle();
  if (paciente) {
    console.log("✅ Columnas encontradas en 'pacientes':", Object.keys(paciente));
  }

  // 3. Verificar Financiero
  const { data: pago, error: paError } = await supabase.from('pagos').select('*').limit(1).maybeSingle();
  if (pago) {
    console.log("✅ Columnas encontradas en 'pagos':", Object.keys(pago));
  }
}

checkSchema();
