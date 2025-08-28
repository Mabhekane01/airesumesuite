import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import { logger } from "./utils/logger";
import { connectDB } from "./config/database";
import { connectRedis, getRedisClient } from "./config/redis";
import { rateLimiters } from "./middleware/rateLimit";
import { OTPService } from "./services/otpService";
import { SessionService } from "./services/sessionService";
import { CleanupService } from "./services/cleanupService";

// Load environment variables
dotenv.config();

const app: express.Application = express();
const PORT = process.env["PORT"] || 3001;

// =============================================================================
// DATABASE CONNECTIONS
// =============================================================================

const initializeConnections = async () => {
  try {
    // Connect to PostgreSQL
    await connectDB();
    logger.info("✅ PostgreSQL connected successfully");

    // Connect to Redis
    await connectRedis();
    logger.info("✅ Redis connected successfully");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
};

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

const initializeSessionStore = async () => {
  try {
    const redisClient = getRedisClient();

    // Test Redis connection
    await redisClient.ping();

    // Configure session middleware with Redis store
    app.use(
      session({
        store: new RedisStore({
          client: redisClient,
          prefix: "ai-job-suite:sess:",
        }),
        secret: process.env["SESSION_SECRET"] || "your-session-secret-key",
        name: "ai-job-suite-session",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env["NODE_ENV"] === "production",
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: "strict" as const,
          domain: process.env["COOKIE_DOMAIN"] || undefined,
        },
        rolling: true, // Extend session on activity
      })
    );

    logger.info("✅ Session store initialized with Redis successfully");
  } catch (error) {
    logger.error("❌ Session store initialization failed:", error);

    // Fallback to memory store if Redis fails
    app.use(
      session({
        secret: process.env["SESSION_SECRET"] || "your-session-secret-key",
        name: "ai-job-suite-session",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env["NODE_ENV"] === "production",
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: "strict" as const,
        },
        rolling: true,
      })
    );
    logger.warn("⚠️ Using memory session store as fallback");
  }
};

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

const setupMiddleware = async () => {
  // Security middleware - Updated for Helmet v8
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration for microservices
  app.use(
    cors({
      origin: process.env["ALLOWED_ORIGINS"]?.split(",") || [
        "http://localhost:3000", // AI Resume Frontend
        "http://localhost:3001", // Auth Service
        "http://localhost:3002", // Document Sharing Service
        "http://localhost:3003", // Document Manager Service
        "http://localhost:5173", // Vite Dev Server
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Service-Key",
        "X-User-ID",
        "X-User-Email",
        "X-User-Service-Type",
      ],
    })
  );

  // Redis-based rate limiting for microservices
  app.use("/api/", rateLimiters.global.middleware());

  // Stricter rate limiting for authentication endpoints
  app.use("/api/v1/auth", rateLimiters.auth.middleware());

  // User-specific rate limiting for sensitive operations
  app.use("/api/v1/profile", rateLimiters.userActions.middleware());
  app.use("/api/v1/organizations", rateLimiters.userActions.middleware());

  // File upload rate limiting
  app.use("/api/v1/upload", rateLimiters.fileUpload.middleware());

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      service: req.headers["x-service-key"] ? "internal" : "external",
      timestamp: new Date().toISOString(),
    });
    next();
  });

  // Session management middleware
  try {
    const sessionMiddleware = await import("./middleware/session");

    app.use(async (req, res, next) => {
      try {
        // Apply session middleware in sequence
        await new Promise<void>((resolve, reject) => {
          sessionMiddleware.sessionValidation(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          sessionMiddleware.sessionActivityTracking(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          sessionMiddleware.enforceSessionLimits(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          sessionMiddleware.sessionMaintenance(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        next();
      } catch (error) {
        logger.error("Session middleware error:", error);
        next(error);
      }
    });
  } catch (error) {
    logger.warn("Session middleware not found, skipping:", error);
  }
};

// =============================================================================
// HEALTH CHECK ENDPOINTS
// =============================================================================

const setupHealthChecks = () => {
  // Basic health check
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "ai-job-suite-auth-service",
      version: process.env["npm_package_version"] || "1.0.0",
      environment: process.env["NODE_ENV"] || "development",
    });
  });

  // Database health check
  app.get("/health/db", async (_req, res) => {
    try {
      // Check PostgreSQL connection
      const { query } = await import("./config/database");
      await query("SELECT 1");

      return res.status(200).json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Database health check failed:", error);
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Redis health check
  app.get("/health/redis", async (_req, res) => {
    try {
      await getRedisClient().ping();

      return res.status(200).json({
        status: "healthy",
        redis: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Redis health check failed:", error);
      return res.status(503).json({
        status: "unhealthy",
        redis: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });
};

// =============================================================================
// ROUTES SETUP
// =============================================================================

const setupRoutes = async () => {
  try {
    // Authentication routes (login, register, refresh, logout)
    const authRoutes = await import("./routes/auth");
    app.use("/api/v1/auth", authRoutes.default);

    // Authorization routes (subscription management, permissions)
    const authorizationRoutes = await import("./routes/authorization");
    app.use("/api/v1/authorization", authorizationRoutes.default);

    // Organization management routes
    const organizationRoutes = await import("./routes/organizations");
    app.use("/api/v1/organizations", organizationRoutes.default);

    // Service integration routes (for other services to validate tokens and check permissions)
    const serviceRoutes = await import("./routes/services");
    app.use("/api/v1/services", serviceRoutes.default);

    logger.info("✅ All routes initialized successfully");
  } catch (error) {
    logger.error("❌ Route initialization failed:", error);
    throw error;
  }
};

// =============================================================================
// ERROR HANDLING
// =============================================================================

const setupErrorHandlers = () => {
  // 404 handler
  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Endpoint not found",
      code: "ENDPOINT_NOT_FOUND",
      path: req.originalUrl,
      service: "ai-job-suite-auth-service",
    });
  });

  // Global error handler
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error("Unhandled error:", {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      const statusCode = error.statusCode || 500;
      const message = error.message || "Internal server error";

      res.status(statusCode).json({
        error: message,
        code: error.code || "INTERNAL_SERVER_ERROR",
        service: "ai-job-suite-auth-service",
        timestamp: new Date().toISOString(),
        ...(process.env["NODE_ENV"] === "development" && {
          stack: error.stack,
        }),
      });
    }
  );
};

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop background services
    CleanupService.stop();
    logger.info("🧹 Background cleanup service stopped");

    // Close database connections
    const { disconnectDB } = await import("./config/database");
    await disconnectDB();

    // Close Redis connection
    const { disconnectRedis } = await import("./config/redis");
    await disconnectRedis();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

const startServer = async () => {
  try {
    logger.info(
      "🚀 Starting AI Job Suite Authentication & Authorization Service..."
    );

    // Initialize connections first
    await initializeConnections();

    // Setup session store
    await initializeSessionStore();

    // Setup middleware
    await setupMiddleware();

    // Setup health checks
    setupHealthChecks();

    // Setup routes
    await setupRoutes();

    // Setup error handlers (must be last)
    setupErrorHandlers();

    // Start the server
    app.listen(PORT, () => {
      logger.info(
        "🔐 AI Job Suite Authentication & Authorization Service started successfully",
        {
          port: PORT,
          environment: process.env["NODE_ENV"] || "development",
          timestamp: new Date().toISOString(),
        }
      );

      logger.info("📊 Service Endpoints:", {
        health: `http://localhost:${PORT}/health`,
        auth: `http://localhost:${PORT}/api/v1/auth`,
        authorization: `http://localhost:${PORT}/api/v1/authorization`,
        organizations: `http://localhost:${PORT}/api/v1/organizations`,
        services: `http://localhost:${PORT}/api/v1/services`,
      });

      logger.info("🔗 Integration Points:", {
        aiResume: "http://localhost:3000",
        documentSharing: "http://localhost:3002",
        documentManager: "http://localhost:3003",
      });

      // Start background services
      CleanupService.start();
      logger.info("🧹 Background cleanup service started");
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();

export default app;
