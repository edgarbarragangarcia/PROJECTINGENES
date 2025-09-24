import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Validar que el request tenga contenido
    if (!request.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('[API Chat] Request body:', JSON.stringify(body, null, 2));

    const webhookUrl = 'https://n8nqa.ingenes.com:5689/webhook-test/projectBot';
    console.log(`[API Chat] Forwarding request to: ${webhookUrl}`);

    // Agregar timeout y mejor manejo de errores
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NextJS-API-Route',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API Chat] Webhook response error: ${response.status} ${response.statusText}`, {
        errorBody,
        url: webhookUrl,
      });
      
      return NextResponse.json(
        { 
          error: 'Error en la respuesta del webhook', 
          status: response.status,
          statusText: response.statusText,
          details: errorBody 
        },
        { status: response.status }
      );
    }

    // Validar que la respuesta sea JSON válido
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textData = await response.text();
      console.warn('[API Chat] Webhook returned non-JSON response:', textData);
      data = { message: textData };
    }

    console.log('[API Chat] Webhook response success:', data);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API Chat] Error processing request:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Diferentes tipos de errores
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - el webhook tardó demasiado en responder' },
        { status: 408 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error.cause?.code === 'ENOTFOUND' || error.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'No se pudo conectar con el webhook - verifica la URL' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error.message,
        type: error.name 
      },
      { status: 500 }
    );
  }
}