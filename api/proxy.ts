// app/api/proxy.ts
// Proxy para ocultar la URL de Google Apps Script y manejar CORS/Seguridad

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const key = url.searchParams.get('key');
  const payload = url.searchParams.get('payload');

  // URL del script guardada en secreto de Vercel (VITE_APPS_SCRIPT_URL)
  // @ts-ignore
  const scriptUrl = process.env.VITE_APPS_SCRIPT_URL;
  // @ts-ignore
  const secretKey = process.env.VITE_API_KEY;

  if (!scriptUrl) {
    return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta (URL de Script)' }), { status: 500 });
  }

  // Validar API Key básica antes de reenviar
  if (key !== secretKey) {
    return new Response(JSON.stringify({ error: 'No autorizado (Proxy)' }), { status: 401 });
  }

  try {
    const targetUrl = new URL(scriptUrl);
    targetUrl.searchParams.set('action', action || '');
    if (payload) targetUrl.searchParams.set('payload', payload);
    // Agregamos la clave para el script final
    targetUrl.searchParams.set('key', secretKey || '');

    const options: RequestInit = {
      method: req.method,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (req.method === 'POST') {
      options.body = await req.text();
    }

    const response = await fetch(targetUrl.toString(), options);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Error en el Proxy: ' + error.message }), { status: 500 });
  }
}
