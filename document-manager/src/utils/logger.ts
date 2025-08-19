import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      
      return log;
    })
  )
});

// File transports
const errorTransport = new winston.transports.File({
  filename: path.join(logsDir, 'error.log'),
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  format: logFormat
});

const combinedTransport = new winston.transports.File({
  filename: path.join(logsDir, 'combined.log'),
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  format: logFormat
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: logFormat,
  defaultMeta: { service: 'document-manager' },
  transports: [
    errorTransport,
    combinedTransport
  ],
  exitOnError: false
});

// Add console transport in development
if (process.env['NODE_ENV'] !== 'production') {
  logger.add(consoleTransport);
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: logFormat
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    format: logFormat
  })
);

// Specialized logging functions
export const logAnalytics = (message: string, data?: any) => {
  logger.info(message, { category: 'analytics', ...data });
};

export const logSecurity = (message: string, data?: any) => {
  logger.warn(message, { category: 'security', ...data });
};

export const logPerformance = (message: string, data?: any) => {
  logger.info(message, { category: 'performance', ...data });
};

export const logApiRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'API Request', {
    category: 'api',
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId
  });
};

export const logError = (message: string, error: Error, context?: any) => {
  logger.error(message, {
    category: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context
  });
};

export const logDatabaseQuery = (query: string, duration: number, params?: any[]) => {
  logger.debug('Database Query', {
    category: 'database',
    query,
    duration: `${duration}ms`,
    params: params || []
  });
};

export const logFileOperation = (operation: string, filePath: string, userId: string, details?: any) => {
  logger.info('File Operation', {
    category: 'file',
    operation,
    filePath,
    userId,
    ...details
  });
};

export const logShareEvent = (event: string, documentId: string, userId: string, shareId?: string, details?: any) => {
  logger.info('Share Event', {
    category: 'share',
    event,
    documentId,
    userId,
    shareId,
    ...details
  });
};

export const logViewEvent = (documentId: string, shareId: string, ipAddress: string, userAgent: string, details?: any) => {
  logger.info('View Event', {
    category: 'view',
    documentId,
    shareId,
    ipAddress,
    userAgent,
    ...details
  });
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?.id || req.headers['x-user-id'];
    
    logApiRequest(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      duration,
      userId
    );
  });
  
  next();
};

// Export logger and specialized functions
export { logger };
export default logger;