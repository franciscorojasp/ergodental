const url = 'https://qekotlqwollxcvcawvns.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla290bHF3b2xseGN2Y2F3dm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjk5MTEsImV4cCI6MjA5MDAwNTkxMX0.ah2W38jGubpOGh4pwi-5lO74dF-LT9KqZB2CFuRKBFs';

async function run() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      }
    });
    const data = await res.json();
    console.log("Full response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
