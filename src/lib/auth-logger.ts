/**
 * Sistema de logging detallado para autenticación
 * Muestra paso a paso todo lo que ocurre durante el login
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'auth.log');
const SESSION_LOG = path.join(LOG_DIR, 'session.log');

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'SUCCESS';
  component: string;
  message: string;
  data?: any;
  duration?: number;
}

const colors = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
};

class AuthLogger {
  private sessionId: string;
  private startTime: Map<string, number> = new Map();

  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatConsoleOutput(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    let levelColor = '';
    let levelSymbol = '';

    switch (entry.level) {
      case 'INFO':
        levelColor = colors.BLUE;
        levelSymbol = 'ℹ️ ';
        break;
      case 'DEBUG':
        levelColor = colors.CYAN;
        levelSymbol = '🔍';
        break;
      case 'WARN':
        levelColor = colors.YELLOW;
        levelSymbol = '⚠️ ';
        break;
      case 'ERROR':
        levelColor = colors.RED;
        levelSymbol = '❌';
        break;
      case 'SUCCESS':
        levelColor = colors.GREEN;
        levelSymbol = '✅';
        break;
    }

    let output = `${colors.DIM}[${time}]${colors.RESET} `;
    output += `${levelSymbol} ${levelColor}${colors.BRIGHT}${entry.level}${colors.RESET} `;
    output += `${colors.MAGENTA}[${entry.component}]${colors.RESET} `;
    output += `${entry.message}`;

    if (entry.duration !== undefined) {
      output += ` ${colors.DIM}(${entry.duration}ms)${colors.RESET}`;
    }

    if (entry.data) {
      output += `\n${colors.DIM}${JSON.stringify(entry.data, null, 2)}${colors.RESET}`;
    }

    return output;
  }

  private writeToFile(entry: LogEntry): void {
    const logEntry = {
      sessionId: this.sessionId,
      ...entry,
    };

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('Error writing to log file:', err);
    }
  }

  info(component: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: 'INFO',
      component,
      message,
      data,
    };

    console.log(this.formatConsoleOutput(entry));
    this.writeToFile(entry);
  }

  debug(component: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: 'DEBUG',
      component,
      message,
      data,
    };

    console.log(this.formatConsoleOutput(entry));
    this.writeToFile(entry);
  }

  warn(component: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: 'WARN',
      component,
      message,
      data,
    };

    console.log(this.formatConsoleOutput(entry));
    this.writeToFile(entry);
  }

  error(component: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: 'ERROR',
      component,
      message,
      data,
    };

    console.log(this.formatConsoleOutput(entry));
    this.writeToFile(entry);
  }

  success(component: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: 'SUCCESS',
      component,
      message,
      data,
    };

    console.log(this.formatConsoleOutput(entry));
    this.writeToFile(entry);
  }

  startTimer(label: string): void {
    this.startTime.set(label, Date.now());
    this.debug('TIMER', `⏱️  Iniciando temporizador: ${label}`);
  }

  endTimer(label: string, component: string, message: string): number | null {
    const start = this.startTime.get(label);
    if (!start) {
      this.warn('TIMER', `⏱️  No hay temporizador para: ${label}`);
      return null;
    }

    const duration = Date.now() - start;
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: 'DEBUG',
      component,
      message,
      duration,
    };

    console.log(this.formatConsoleOutput(entry));
    this.writeToFile(entry);
    this.startTime.delete(label);

    return duration;
  }

  section(title: string): void {
    console.log(
      `\n${colors.BG_BLUE}${colors.WHITE}${colors.BRIGHT} ${title.toUpperCase().padEnd(70)} ${colors.RESET}\n`
    );
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getLogFile(): string {
    return LOG_FILE;
  }

  clearLogs(): void {
    try {
      fs.writeFileSync(LOG_FILE, '');
      this.info('LOGGER', '📝 Logs limpiados');
    } catch (err) {
      this.error('LOGGER', 'Error limpiando logs', err);
    }
  }

  tailLogs(lines: number = 50): void {
    try {
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      const logLines = content.split('\n').filter(line => line.trim());
      const lastLines = logLines.slice(-lines);

      console.log(`\n${colors.BG_BLUE}${colors.WHITE}${colors.BRIGHT} ÚLTIMAS ${lines} LÍNEAS DE LOG ${colors.RESET}\n`);

      lastLines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          console.log(this.formatConsoleOutput(entry));
        } catch {
          console.log(line);
        }
      });
    } catch (err) {
      this.error('LOGGER', 'Error leyendo logs', err);
    }
  }
}

export const authLogger = new AuthLogger();
