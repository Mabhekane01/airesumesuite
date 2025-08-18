import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authMiddleware } from '@/middleware/auth';
import { validateApiKey } from '@/middleware/apiKey';

// Route imports
import authRoutes from '@/routes/authRoutes';
import documentRoutes from '@/routes/documentRoutes';
import linkRoutes from '@/routes/linkRoutes';
import analyticsRoutes from '@/routes/analyticsRoutes';
import adminRoutes from '@/routes/adminRoutes';
import publicRoutes from '@/routes/publicRoutes';
import webhookRoutes from '@/routes/webhookRoutes';
import integrationRoutes from '@/routes/integrationRoutes';

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: config.CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', authMiddleware, documentRoutes);
app.use('/api/links', authMiddleware, linkRoutes); // Integration with document-sharing-service
app.use('/api/analytics', authMiddleware, analyticsRoutes); // Integration with document-sharing-service
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/webhooks', validateApiKey, webhookRoutes);
app.use('/api/integration', integrationRoutes); // Integration routes with AI Resume Suite

// Public routes (integration with document-sharing-service)
app.use('/view', publicRoutes); // Integration with document-sharing-service
app.use('/d', publicRoutes); // Integration with document-sharing-service

// Static file serving for uploaded documents
app.use('/uploads', express.static(config.UPLOAD_PATH, {
  setHeaders: (res, path) => {
    // Security headers for file serving
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'private, max-age=3600');
  }
}));

// Socket.IO for real-time analytics
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('join-document', (documentId: string) => {
    socket.join(`document-${documentId}`);
    logger.info(`Socket ${socket.id} joined document ${documentId}`);
  });
  
  socket.on('page-view', (data: any) => {
    // Broadcast page view to analytics dashboard
    socket.to(`document-${data.documentId}`).emit('real-time-view', data);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = config.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`🚀 Document Manager Service running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Start background jobs
  require('@/services/backgroundJobs');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app, io };