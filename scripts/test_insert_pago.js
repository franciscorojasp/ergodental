const url = 'https://qekotlqwollxcvcawvns.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla290bHF3b2xseGN2Y2F3dm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjk5MTEsImV4cCI6MjA5MDAwNTkxMX0.ah2W38jGubpOGh4pwi-5lO74dF-LT9KqZB2CFuRKBFs';

async function run() {
  console.log("Testing insert with doctor_id...");
  const payload = {
    clinica_id: 'la-vina',
    concepto: 'Test Pago Insertion Diagnostics',
    monto: 25.5,
    metodo_pago: 'Efectivo USD',
    tipo_pago: 'Contado',
    fecha: '2026-05-22',
    estado: 'Pagado',
    doctor_id: '0f1024a7-4cf0-46de-8636-e6b732c3ad26', // Fake UUID
    doctor_nombre: 'Dra. Test'
  };

  try {
    const res = await fetch(`${url}/rest/v1/pagos`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
