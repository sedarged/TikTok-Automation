/**
 * Simple logger utility
 * TODO: Replace with proper logging library (Winston, Pino) in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
    };
  }

  info(message: string, data?: any): void {
    console.log(JSON.stringify(this.formatLog('info', message, data)));
  }

  warn(message: string, data?: any): void {
    console.warn(JSON.stringify(this.formatLog('warn', message, data)));
  }

  error(message: string, data?: any): void {
    console.error(JSON.stringify(this.formatLog('error', message, data)));
  }

  debug(message: string, data?: any): void {
    console.debug(JSON.stringify(this.formatLog('debug', message, data)));
  }
}

export default new Logger();
