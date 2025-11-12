/**
 * Cliente de logging para autenticación
 * Se conecta con el servidor para registrar eventos
 */

interface LogEvent {
  component: string;
  message: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'SUCCESS';
  data?: any;
}

class ClientAuthLogger {
  private sessionId: string;
  private sessionStartTime: number;

  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();

    // Registrar en el servidor
    this.sendToServer({
      component: 'CLIENT_INIT',
      message: `🚀 Sesión de cliente iniciada`,
      level: 'INFO',
      data: { sessionId: this.sessionId },
    });
  }

  private sendToServer(event: LogEvent): void {
    // Enviar a API del servidor para logging
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      }),
    }).catch(err => {
      // Ignorar errores de logging
      console.error('Error sending log to server:', err);
    });
  }

  info(component: string, message: string, data?: any): void {
    console.log(`ℹ️ [${component}] ${message}`, data);
    this.sendToServer({ component, message, level: 'INFO', data });
  }

  debug(component: string, message: string, data?: any): void {
    console.debug(`🔍 [${component}] ${message}`, data);
    this.sendToServer({ component, message, level: 'DEBUG', data });
  }

  warn(component: string, message: string, data?: any): void {
    console.warn(`⚠️ [${component}] ${message}`, data);
    this.sendToServer({ component, message, level: 'WARN', data });
  }

  error(component: string, message: string, data?: any): void {
    console.error(`❌ [${component}] ${message}`, data);
    this.sendToServer({ component, message, level: 'ERROR', data });
  }

  success(component: string, message: string, data?: any): void {
    console.log(`✅ [${component}] ${message}`, data);
    this.sendToServer({ component, message, level: 'SUCCESS', data });
  }

  startTimer(label: string): () => number {
    const startTime = Date.now();
    this.debug('TIMER', `⏱️ Iniciando: ${label}`);

    return () => {
      const duration = Date.now() - startTime;
      this.debug('TIMER', `⏱️ Completado: ${label}`, { duration: `${duration}ms` });
      return duration;
    };
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export const clientAuthLogger = new ClientAuthLogger();
