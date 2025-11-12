import { authLogger } from '@/lib/auth-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      component,
      message,
      level,
      data,
      timestamp,
    } = body;

    // Registrar el evento en el servidor
    if (level === 'SUCCESS') {
      authLogger.success(component, message, data);
    } else if (level === 'ERROR') {
      authLogger.error(component, message, data);
    } else if (level === 'WARN') {
      authLogger.warn(component, message, data);
    } else if (level === 'DEBUG') {
      authLogger.debug(component, message, data);
    } else {
      authLogger.info(component, message, data);
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (err) {
    console.error('Error en /api/log:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
