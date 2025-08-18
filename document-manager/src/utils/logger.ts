import winston from 'winston';
import { config } from '@/config/environment';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Add request logging helper
export const logRequest = (req: any, res: any, responseTime: number) => {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  
  const logData = {
    method,
    url,
    ip,
    userAgent: headers['user-agent'],
    statusCode,
    responseTime: `${responseTime}ms`,
  };
  
  if (statusCode >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.http('HTTP Request', logData);
  }
};

// Add structured logging helpers
export const logError = (message: string, error: any, metadata?: any) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

export const logInfo = (message: string, metadata?: any) => {
  logger.info(message, metadata);
};

export const logDebug = (message: string, metadata?: any) => {
  logger.debug(message, metadata);
};

export const logWarn = (message: string, metadata?: any) => {
  logger.warn(message, metadata);
};

// Analytics logging
export const logAnalytics = (event: string, data: any) => {
  logger.info(`Analytics: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Security logging
export const logSecurity = (event: string, data: any) => {
  logger.warn(`Security: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

export default logger;