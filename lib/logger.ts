type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (__DEV__) {
      const logFn = console[level] || console.log;
      if (data !== undefined) {
        logFn(`[${level.toUpperCase()}] ${message}`, data);
      } else {
        logFn(`[${level.toUpperCase()}] ${message}`);
      }
    }
  }

  log(message: string, data?: any) {
    this.addLog('log', message, data);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, error?: any) {
    this.addLog('error', message, error);
    
    if (!__DEV__) {
      this.reportToSentry(message, error);
    }
  }

  debug(message: string, data?: any) {
    if (__DEV__) {
      this.addLog('debug', message, data);
    }
  }

  private reportToSentry(message: string, error?: any) {
    try {
      if (typeof error === 'object' && error?.stack) {
        console.error(message, error);
      }
    } catch {
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
