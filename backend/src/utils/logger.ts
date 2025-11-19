type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  jobId?: string;
  stage?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };
  }

  info(message: string, context?: LogContext): void {
    console.log(JSON.stringify(this.formatLog('info', message, context)));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(JSON.stringify(this.formatLog('warn', message, context)));
  }

  error(message: string, context?: LogContext): void {
    console.error(JSON.stringify(this.formatLog('error', message, context)));
  }

  debug(message: string, context?: LogContext): void {
    if ((process.env.LOG_LEVEL || 'info') === 'debug') {
      console.debug(JSON.stringify(this.formatLog('debug', message, context)));
    }
  }
}

export default new Logger();
