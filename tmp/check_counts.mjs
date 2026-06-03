import { createClient } from '@supabase/supabase-js';

const url = 'https://script.google.com/macros/s/AKfycbxMNPqieaiE02GiA0wwQSmWM7D2qA3h1k21BdJCGf78CeTK19G36lWtNz36e_gjqSVX/exec';
const key = 'ERGO_SECRET_2024';

const supUrl = 'https://qekotlqwollxcvcawvns.supabase.co';
const supKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla290bHF3b2xseGN2Y2F3dm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjk5MTEsImV4cCI6MjA5MDAwNTkxMX0.ah2W38jGubpOGh4pwi-5lO74dF-LT9KqZB2CFuRKBFs';

const supabase = createClient(supUrl, supKey);

const mapping = [
  { sb: 'profiles', gs: 'getUsuarios' },
  { sb: 'pacientes', gs: 'getPacientes' },
  { sb: 'personal', gs: 'getPersonal' },
  { sb: 'citas', gs: 'getCitas' },
  { sb: 'pagos', gs: 'getPagos' },
  { sb: 'egresos', gs: 'getEgresos' },
  { sb: 'inventario', gs: 'getInventario' },
  { sb: 'proveedores', gs: 'getProveedores' },
  { sb: 'odontogramas', gs: 'getOdontograma' },
  { sb: 'presupuestos', gs: 'getPresupuestos' },
  { sb: 'recibos', gs: 'getFacturas' }
];

async function run() {
  console.log('Comparing Counts: Supabase vs Google Sheets');
  for (const m of mapping) {
    const { count, error } = await supabase.from(m.sb).select('*', { count: 'exact', head: true });
    
    const res = await fetch(url + '?key=' + key + '&action=' + m.gs);
    const data = await res.json();
    let gsCount = 0;
    if (!data.error) {
      gsCount = Array.isArray(data) ? data.length : 0;
    } else {
      gsCount = data.error;
    }
    
    console.log(`${m.sb}: Supabase=${count} | Sheets(${m.gs})=${gsCount}`);
  }
}
run();
