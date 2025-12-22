interface LogLevel {
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  DEBUG: 'debug';
}

interface LogData {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatMessage(level: string, message: string, data?: LogData): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };

    if (this.isDevelopment) {
      // In development, use colorized console output
      switch (level) {
        case 'error':
          console.error(`🔴 [${timestamp}] ERROR: ${message}`, data ? data : '');
          break;
        case 'warn':
          console.warn(`🟡 [${timestamp}] WARN: ${message}`, data ? data : '');
          break;
        case 'info':
          console.info(`🔵 [${timestamp}] INFO: ${message}`, data ? data : '');
          break;
        case 'debug':
          console.debug(`⚪ [${timestamp}] DEBUG: ${message}`, data ? data : '');
          break;
        default:
          console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data ? data : '');
      }
    } else {
      // In production, use structured JSON logging
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message: string, data?: LogData): void {
    this.formatMessage('info', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.formatMessage('warn', message, data);
  }

  error(message: string, data?: LogData): void {
    this.formatMessage('error', message, data);
  }

  debug(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      this.formatMessage('debug', message, data);
    }
  }

  // Security-specific logging for payment and subscription events
  security(event: string, data: LogData): void {
    this.formatMessage('info', `SECURITY: ${event}`, {
      ...data,
      securityEvent: true,
      timestamp: new Date().toISOString()
    });
  }

  // Payment-specific logging
  payment(event: string, data: LogData): void {
    this.formatMessage('info', `PAYMENT: ${event}`, {
      ...data,
      paymentEvent: true,
      timestamp: new Date().toISOString()
    });
  }

  // Subscription-specific logging
  subscription(event: string, data: LogData): void {
    this.formatMessage('info', `SUBSCRIPTION: ${event}`, {
      ...data,
      subscriptionEvent: true,
      timestamp: new Date().toISOString()
    });
  }
}

export const logger = new Logger();
export default logger;