import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env variables manually
const envPath = path.join(process.cwd(), '.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Error reading .env file:', e.message);
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    env[key] = val;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://qekotlqwollxcvcawvns.supabase.co';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be in .env');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'clinicas',
  'profiles',
  'personal',
  'pacientes',
  'citas',
  'evoluciones_clinicas',
  'odontogramas',
  'inventario',
  'proveedores',
  'pagos',
  'egresos',
  'presupuestos',
  'recibos',
  'laboratorios',
  'tasa_bcv',
  'auditoria_logs',
  'correlativo_global'
];

async function runAudit() {
  console.log('\n=========================================');
  console.log('   ERGODENTAL - SUPABASE DATABASE AUDIT  ');
  console.log('=========================================');
  
  const results = [];
  
  for (const table of TABLES) {
    process.stdout.write(`Checking table "${table}"... `);
    try {
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log('❌ DOES NOT EXIST (Relation does not exist)');
          results.push({ table, exists: false, error: 'Table does not exist (42P01)' });
        } else {
          console.log(`⚠️ ERROR [${error.code}]: ${error.message}`);
          results.push({ table, exists: true, error: `${error.code}: ${error.message}`, status });
        }
      } else {
        const rowFound = data && data.length > 0;
        console.log(`✅ EXISTS (status ${status}, rows returned: ${data.length})`);
        let cols = [];
        if (rowFound) {
          cols = Object.keys(data[0]);
          console.log(`   - Sample columns: ${cols.join(', ')}`);
        }
        results.push({ table, exists: true, rowsReturned: data.length, columns: cols, success: true });
      }
    } catch (e) {
      console.log(`❌ EXCEPTION: ${e.message}`);
      results.push({ table, exists: null, error: `Exception: ${e.message}` });
    }
  }

  console.log('\n=========================================');
  console.log('               AUDIT SUMMARY             ');
  console.log('=========================================');
  console.table(results.map(r => ({
    Table: r.table,
    Exists: r.exists === true ? 'Yes' : r.exists === false ? 'No' : 'Unknown',
    Status: r.success ? 'OK' : 'Error',
    Details: r.error || (r.rowsReturned > 0 ? `Columns: ${r.columns.slice(0, 3).join(', ')}...` : 'Empty table')
  })));

  // Try authenticating with a demo credential if needed or just listing profiles
  console.log('\nAttempting a mock auth check to see if auth system works...');
  try {
    const { data: authTest, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@ergodentalve.com',
      password: 'Ergodentalve2024!'
    });
    if (authError) {
      console.log('❌ Auth test failed:', authError.message);
    } else {
      console.log('✅ Auth test successful! Authenticated as:', authTest.user.email);
      
      // Let's check a table as authenticated user to see if RLS works!
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false
        }
      });
      await authSupabase.auth.setSession({
        access_token: authTest.session.access_token,
        refresh_token: authTest.session.refresh_token
      });

      console.log('\nChecking "clinicas" table as authenticated user...');
      const { data: clinicas, error: clinicasErr } = await authSupabase.from('clinicas').select('*');
      if (clinicasErr) {
        console.log('❌ Error querying "clinicas" as authenticated:', clinicasErr.message);
      } else {
        console.log(`✅ Successfully queried "clinicas". Rows found: ${clinicas.length}`);
        console.log(JSON.stringify(clinicas, null, 2));
      }

      console.log('\nChecking "personal" table as authenticated user...');
      const { data: personal, error: personalErr } = await authSupabase.from('personal').select('*');
      if (personalErr) {
        console.log('❌ Error querying "personal" as authenticated:', personalErr.message);
      } else {
        console.log(`✅ Successfully queried "personal". Rows found: ${personal.length}`);
      }
    }
  } catch (e) {
    console.log('❌ Exception in auth check:', e.message);
  }
}

runAudit();
