#!/usr/bin/env node

/**
 * Monitor de Autenticación - Interfaz de Terminal
 * Muestra estadísticas y flujo de autenticación en tiempo real
 */

import fs from 'fs';
import path from 'path';
import { watch } from 'fs';
import readline from 'readline';

const LOG_FILE = path.join(process.cwd(), 'logs/auth.log');

interface LogEntry {
  sessionId: string;
  timestamp: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'SUCCESS';
  component: string;
  message: string;
  data?: any;
  duration?: number;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

class AuthMonitor {
  private lastPosition = 0;
  private logEntries: LogEntry[] = [];
  private sessionStats = new Map<string, { startTime: number; endTime?: number; events: number }>();

  constructor() {
    this.clearScreen();
    this.showHeader();
    this.startMonitoring();
  }

  private clearScreen(): void {
    console.clear();
  }

  private showHeader(): void {
    console.log(`
${colors.bgBlue}${colors.white}${colors.bright}
  🔐 MONITOR DE AUTENTICACIÓN - PROJECTINGENES
${colors.reset}

${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}
`);
  }

  private formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es-ES');
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  private getColorByLevel(level: string): string {
    switch (level) {
      case 'SUCCESS':
        return colors.green;
      case 'ERROR':
        return colors.red;
      case 'WARN':
        return colors.yellow;
      case 'DEBUG':
        return colors.cyan;
      case 'INFO':
        return colors.blue;
      default:
        return colors.white;
    }
  }

  private getSymbolByLevel(level: string): string {
    switch (level) {
      case 'SUCCESS':
        return '✅';
      case 'ERROR':
        return '❌';
      case 'WARN':
        return '⚠️ ';
      case 'DEBUG':
        return '🔍';
      case 'INFO':
        return 'ℹ️ ';
      default:
        return '•';
    }
  }

  private updateStats(entry: LogEntry): void {
    if (!this.sessionStats.has(entry.sessionId)) {
      this.sessionStats.set(entry.sessionId, {
        startTime: new Date(entry.timestamp).getTime(),
        events: 0,
      });
    }

    const stat = this.sessionStats.get(entry.sessionId)!;
    stat.events++;
    stat.endTime = new Date(entry.timestamp).getTime();
  }

  private printStats(): void {
    if (this.sessionStats.size === 0) return;

    console.log(
      `${colors.magenta}${colors.bright}📊 ESTADÍSTICAS DE SESIONES${colors.reset}\n`
    );

    this.sessionStats.forEach((stat, sessionId) => {
      const duration = (stat.endTime || stat.startTime) - stat.startTime;
      console.log(
        `  ${colors.cyan}${sessionId.substring(0, 20)}...${colors.reset} ` +
        `(${stat.events} eventos, ${this.formatDuration(duration)})`
      );
    });

    console.log('');
  }

  private printCurrentSession(): void {
    if (this.logEntries.length === 0) {
      console.log(`${colors.yellow}⏳ Esperando eventos...${colors.reset}\n`);
      return;
    }

    const lastSession = this.logEntries[this.logEntries.length - 1].sessionId;
    const sessionLogs = this.logEntries.filter(log => log.sessionId === lastSession);

    console.log(
      `${colors.magenta}${colors.bright}🔄 SESIÓN ACTUAL${colors.reset}\n`
    );

    sessionLogs.slice(-10).forEach(entry => {
      const time = this.formatTime(entry.timestamp);
      const color = this.getColorByLevel(entry.level);
      const symbol = this.getSymbolByLevel(entry.level);

      let line =
        `  ${colors.dim}[${time}]${colors.reset} ` +
        `${symbol} ${color}${colors.bright}${entry.level}${colors.reset} ` +
        `${colors.magenta}[${entry.component}]${colors.reset} ` +
        `${entry.message}`;

      if (entry.duration !== undefined) {
        line += ` ${colors.dim}(${entry.duration}ms)${colors.reset}`;
      }

      console.log(line);
    });

    console.log('');
  }

  private readNewLogs(): void {
    try {
      if (!fs.existsSync(LOG_FILE)) {
        return;
      }

      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      const newLines = lines.slice(this.logEntries.length);

      newLines.forEach(line => {
        try {
          const entry: LogEntry = JSON.parse(line);
          this.logEntries.push(entry);
          this.updateStats(entry);
        } catch (e) {
          // Ignorar líneas que no sean JSON válido
        }
      });

      this.lastPosition = lines.length;
      this.render();
    } catch (err) {
      // Ignorar errores de lectura
    }
  }

  private render(): void {
    this.showHeader();
    this.printStats();
    this.printCurrentSession();

    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}📡 Monitor activo - Presiona Ctrl+C para salir${colors.reset}`);
  }

  private startMonitoring(): void {
    // Leer logs iniciales
    this.readNewLogs();

    // Configurar watcher para cambios en el archivo
    if (fs.existsSync(LOG_FILE)) {
      watch(LOG_FILE, { persistent: false }, () => {
        this.readNewLogs();
      });
    }

    // Polling cada 500ms como alternativa
    setInterval(() => {
      this.readNewLogs();
    }, 500);
  }
}

// Iniciar monitor
console.log(`${colors.yellow}Iniciando monitor de autenticación...${colors.reset}`);
console.log(`${colors.dim}Archivo de log: ${LOG_FILE}${colors.reset}\n`);

setTimeout(() => {
  new AuthMonitor();
}, 1000);

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Monitor detenido.${colors.reset}`);
  process.exit(0);
});
