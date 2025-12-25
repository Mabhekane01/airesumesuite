import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { EnvironmentValidator } from './utils/environmentValidator';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { configurePassport } from './config/passport';
import passport from 'passport';
import resumeRoutes from './routes/resumeRoutes';
import fileUploadRoutes from './routes/fileUploadRoutes';
import authRoutes from './routes/authRoutes';
import jobApplicationRoutes from './routes/jobApplicationRoutes';
import advancedAnalyticsRoutes from './routes/advancedAnalyticsRoutes';
import simpleAnalyticsRoutes from './routes/simpleAnalyticsRoutes';
import accountRoutes from './routes/accountRoutes';
import enterpriseRoutes from './routes/enterpriseRoutes';
import locationRoutes from './routes/locationRoutes';
import companyRoutes from './routes/companyRoutes';
import currencyRoutes from './routes/currencyRoutes';
import interviewRoutes from './routes/interviewRoutes';
import careerCoachRoutes from './routes/careerCoachRoutes';
import paymentRoutes from './routes/paymentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import publicRoutes from './routes/publicRoutes';
import adminRoutes from './routes/adminRoutes';
import jobPostingRoutes from './routes/jobPostingRoutes';
import resumeShareRoutes from './routes/resumeShareRoutes';
import { cleanupExpiredTokens } from './utils/tokenCleanup';
import { tokenCleanupScheduler } from './services/tokenCleanupScheduler';
import { 
  requestIdMiddleware, 
  requestLogger, 
  auditLogger, 
  securityMonitor,
  errorHandler,
  notFoundHandler
} from './middleware/enterpriseErrorHandler';
import { automationService } from './services/automationService';
import { locationService } from './services/locationService';
import { companyService } from './services/companyService';
import { currencyService } from './services/currencyService';
// Import interview services with error handling
let interviewNotificationService: any;
let emailService: any;

try {
  const { interviewNotificationService: notificationService } = require('./services/interviewNotificationService');
  const { emailService: mailService } = require('./services/emailService');
  interviewNotificationService = notificationService;
  emailService = mailService;
} catch (error) {
  console.warn('⚠️  Interview system dependencies missing. Some features will be disabled.');
  console.warn('📦 To enable full interview functionality, run: pnpm add node-cron @types/node-cron');
  console.warn('📧 For email notifications, run: pnpm add nodemailer @types/nodemailer');
  console.warn('📖 See SETUP_INTERVIEW_SYSTEM.md for complete setup instructions');
  
  // Create mock services
  interviewNotificationService = {
    startService: async () => console.log('Interview notification service disabled - dependencies missing')
  };
  emailService = {
    testConnection: async () => {
      console.log('Email service disabled - dependencies missing');
      return false;
    }
  };
}

dotenv.config();

// Comprehensive environment validation
console.log('🔍 Validating environment configuration...');
EnvironmentValidator.validateAndExit();

if (process.env.NODE_ENV === 'production') {
  console.log('🚀 PRODUCTION MODE: All environment variables validated');
  console.log('🔒 PRODUCTION: Security features enabled');
} else {
  console.log('🔧 DEVELOPMENT MODE: Running with relaxed security settings');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

// Enhanced CORS configuration for enterprise security
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    console.log('🌐 CORS Request from origin:', origin || 'no-origin');
    
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:5178',
      'http://localhost:3000',
      'http://localhost:3001', // Backend itself
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5176',
      'http://127.0.0.1:5177',
      'http://127.0.0.1:5178',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://airesumesuite.web.app',
      'https://aijobsuite.bankhosa.com',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ];
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin allowed from whitelist');
      return callback(null, true);
    }
    
    // In development, be more permissive for localhost variants
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      if (isLocalhost) {
        console.log('✅ CORS: Allowing localhost origin in development:', origin);
        return callback(null, true);
      }
    }
    
    console.error('❌ CORS: Origin not allowed:', origin);
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cache-Control',
    'Pragma',
    'response-type'
  ],
  exposedHeaders: ['Set-Cookie', 'X-Request-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours cache for preflight
};

app.use(cors(corsOptions));

// Additional CORS debugging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} from ${req.get('Origin') || 'no-origin'}`);
  console.log('📋 Headers:', {
    'Content-Type': req.get('Content-Type'),
    'Authorization': req.get('Authorization') ? '[PRESENT]' : '[NOT PRESENT]',
    'User-Agent': req.get('User-Agent')?.substring(0, 50) + '...'
  });
  next();
});

// Rate limiting - More reasonable limits for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per 15 minutes (~1.1 requests/second)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for static assets and health checks
  skip: (req) => {
    return req.path === '/health' || 
           req.path.startsWith('/templates') || 
           req.path.startsWith('/static');
  }
});
app.use(limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure passport strategies (after env vars are loaded)
configurePassport();

// Passport middleware
app.use(passport.initialize());

// Enterprise middleware
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(auditLogger);
app.use(securityMonitor);

// Static file serving for template images and assets with CORS headers
app.use('/static', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '../../frontend/public')));

// Static file serving for LaTeX template previews
app.use('/templates', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(process.cwd(), '../frontend/public/templates')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORS test endpoint
app.get('/api/v1/test-cors', (req, res) => {
  res.status(200).json({ 
    message: 'CORS is working!', 
    origin: req.get('Origin'),
    timestamp: new Date().toISOString() 
  });
});

// Auth endpoints test
app.get('/api/v1/auth/status', (req, res) => {
  res.status(200).json({ 
    message: 'Auth service is running', 
    endpoints: [
      'POST /api/v1/auth/send-registration-otp',
      'POST /api/v1/auth/verify-registration-otp',
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/check-email'
    ],
    timestamp: new Date().toISOString() 
  });
});

// API Routes
app.use('/api/v1', publicRoutes); // Public routes are not behind auth
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/upload', fileUploadRoutes);
app.use('/api/v1/job-applications', jobApplicationRoutes);
app.use('/api/v1/advanced-analytics', advancedAnalyticsRoutes);
app.use('/api/v1/analytics', simpleAnalyticsRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/enterprise', enterpriseRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/currencies', currencyRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/coach', careerCoachRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/jobs', jobPostingRoutes);
app.use('/api/v1/share', resumeShareRoutes);

// 404 handler for unmatched API routes
app.use('/api/v1', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize database connections and start server
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    
    // Initialize location, company, and currency databases
    console.log('🌍 Initializing location, company, and currency databases...');
    await locationService.initializeDatabase();
    await companyService.initializeDatabase();
    await currencyService.initializeDatabase();
    
    // Clean up expired tokens on startup
    console.log('🧹 Running startup token cleanup...');
    try {
      const cleanupResult = await cleanupExpiredTokens();
      console.log(`✅ Startup cleanup: ${cleanupResult.tokensRemoved} expired tokens removed, ${cleanupResult.oldSessionsClosed} old sessions closed`);
    } catch (error) {
      console.warn('⚠️  Startup token cleanup failed:', error);
    }
    
    // Test email service connection
    try {
      console.log('📧 Testing email service connection...');
      const emailConnected = await emailService.testConnection();
      if (!emailConnected) {
        console.warn('⚠️  Email service not properly configured - email notifications will be limited');
      }
    } catch (error) {
      console.warn('⚠️  Email service initialization failed:', error);
    }
    
    // Start interview notification service
    try {
      console.log('🔔 Starting interview notification service...');
      await interviewNotificationService.startService();
    } catch (error) {
      console.warn('⚠️  Interview notification service failed to start:', error);
      console.warn('📦 Some dependencies may be missing. Check package.json and run: pnpm install');
    }
    
    // Start automation service
    automationService.startAutomation();
    
    // Start token cleanup scheduler (runs every 6 hours)
    tokenCleanupScheduler.start();
    
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`🤖 Enterprise automation service started`);
      console.log(`📍 Location service ready with comprehensive English-speaking countries data`);
      console.log(`🏢 Company service ready with major company database`);
      console.log(`💰 Currency service ready with all English-speaking countries' currencies`);
      console.log(`🔔 Interview notification service with automated reminders`);
      console.log(`📧 Email service ready for calendar invites and reminders`);
      console.log(`🧹 Token cleanup scheduler started (runs every 6 hours)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();