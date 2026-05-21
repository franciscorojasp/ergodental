import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function getOpenApi() {
  let token = supabaseKey;
  let hasSession = false;
  
  // 1. Try to sign up a temporary user
  const email = `audit_${Date.now()}@example.com`;
  const password = `AuditPass_${Math.random().toString(36).substring(2, 10)}!`;
  
  console.log('Attempting to create a temporary user for authenticated OpenAPI schema access...');
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (signUpError) {
      console.log('signUp failed (which is normal if email confirmation is required or signup disabled):', signUpError.message);
    } else if (signUpData?.session) {
      console.log('✅ Temporary user signed up and logged in successfully!');
      token = signUpData.session.access_token;
      hasSession = true;
    } else {
      console.log('User signed up but requires email confirmation, checking if we can sign in...');
    }
  } catch (e) {
    console.log('Exception during signUp:', e.message);
  }

  // 2. Fetch OpenAPI schema with the appropriate token
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  console.log('Fetching OpenAPI schema from:', url);
  try {
    const headers = {
      'apikey': supabaseKey,
    };
    if (hasSession) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
    }
    const schema = await res.json();
    
    // Save to file for caching/reference
    fs.writeFileSync('scripts/openapi_schema.json', JSON.stringify(schema, null, 2));
    console.log('✅ Saved OpenAPI schema to scripts/openapi_schema.json');
    
    const definitions = schema.definitions || {};
    const tables = Object.keys(definitions);
    
    console.log('\n--- REMOTE DATABASE TABLES & COLUMNS ---');
    tables.forEach(tableName => {
      const properties = definitions[tableName].properties || {};
      const cols = Object.keys(properties);
      console.log(`Table: ${tableName}`);
      cols.forEach(colName => {
        const prop = properties[colName];
        const required = definitions[tableName].required?.includes(colName) ? ' (REQUIRED)' : '';
        console.log(`  - ${colName}: ${prop.type || prop.format}${required}`);
      });
      console.log('');
    });
    
  } catch (e) {
    console.error('❌ Error getting OpenAPI schema:', e.message);
  }
}

getOpenApi();
