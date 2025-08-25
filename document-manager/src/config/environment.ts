import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Environment configuration interface
export interface Config {
  NODE_ENV: string;
  PORT: number;
  HOST: string;

  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_MAX_CONNECTIONS: number;
  DB_IDLE_TIMEOUT: number;
  DB_CONNECTION_TIMEOUT: number;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string | undefined;
  REDIS_DB: number;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // File Storage
  UPLOAD_PATH: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string[];

  // CORS
  CORS_ORIGINS: string[];

  // Document Sharing Service
  DOCUMENT_SHARING_SERVICE_URL: string;

  // AI Resume Suite Integration
  AI_RESUME_SUITE_URL: string;
  AI_RESUME_SUITE_API_KEY: string | undefined;

  // PDF Editor Service
  PDF_EDITOR_SERVICE_URL: string;

  // Security
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Logging
  LOG_LEVEL: string;

  // Monitoring
  ENABLE_METRICS: boolean;
  METRICS_PORT: number;

  // Webhooks
  WEBHOOK_RETENTION_DAYS: number;

  // Analytics
  ANALYTICS_RETENTION_DAYS: number;
}

// Environment validation
const validateConfig = (): Config => {
  const requiredEnvVars = ["JWT_SECRET", "DB_HOST", "DB_USER", "DB_PASSWORD"];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "3001"),
    HOST: process.env.HOST || "0.0.0.0",

    // Database
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: parseInt(process.env.DB_PORT || "5432"),
    DB_NAME: process.env.DB_NAME || "document_manager",
    DB_USER: process.env.DB_USER || "postgres",
    DB_PASSWORD: process.env.DB_PASSWORD || "password",
    DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
    DB_IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
    DB_CONNECTION_TIMEOUT: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || "2000"
    ),

    // Redis
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379"),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: parseInt(process.env.REDIS_DB || "0"),

    // JWT
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

    // File Storage
    UPLOAD_PATH: process.env.UPLOAD_PATH || "./uploads",
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "104857600"), // 100MB
    ALLOWED_FILE_TYPES: (
      process.env.ALLOWED_FILE_TYPES ||
      "pdf,doc,docx,ppt,pptx,txt,jpg,jpeg,png,gif,webp"
    ).split(","),

    // CORS
    CORS_ORIGINS: (
      process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173"
    ).split(","),

    // Document Sharing Service
    DOCUMENT_SHARING_SERVICE_URL:
      process.env.DOCUMENT_SHARING_SERVICE_URL || "http://localhost:4000",

    // AI Resume Suite Integration
    AI_RESUME_SUITE_URL:
      process.env.AI_RESUME_SUITE_URL || "http://localhost:3000",
    AI_RESUME_SUITE_API_KEY: process.env.AI_RESUME_SUITE_API_KEY,

    // PDF Editor Service
    PDF_EDITOR_SERVICE_URL:
      process.env.PDF_EDITOR_SERVICE_URL || "http://localhost:3002",

    // Security
    RATE_LIMIT_WINDOW_MS: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || "900000"
    ), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || "1000"
    ),

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || "info",

    // Monitoring
    ENABLE_METRICS: process.env.ENABLE_METRICS === "true",
    METRICS_PORT: parseInt(process.env.METRICS_PORT || "9090"),

    // Webhooks
    WEBHOOK_RETENTION_DAYS: parseInt(
      process.env.WEBHOOK_RETENTION_DAYS || "90"
    ),

    // Analytics
    ANALYTICS_RETENTION_DAYS: parseInt(
      process.env.ANALYTICS_RETENTION_DAYS || "365"
    ),
  };
};

// Export validated configuration
export const config = validateConfig();

// Environment-specific configurations
export const isDevelopment = config.NODE_ENV === "development";
export const isProduction = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";

// Security configurations
export const securityConfig = {
  bcryptRounds: 12,
  jwtAlgorithm: "HS256" as const,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// File processing configurations
export const fileProcessingConfig = {
  maxConcurrentProcesses: 5,
  thumbnailSizes: {
    small: { width: 150, height: 200 },
    medium: { width: 300, height: 400 },
    large: { width: 600, height: 800 },
  },
  supportedImageFormats: ["jpg", "jpeg", "png", "gif", "webp"],
  supportedDocumentFormats: ["pdf", "doc", "docx", "ppt", "pptx", "txt"],
  maxPagesForPreview: 10,
};

// Cache configurations
export const cacheConfig = {
  documentCacheTTL: 300, // 5 minutes
  userCacheTTL: 1800, // 30 minutes
  folderCacheTTL: 600, // 10 minutes
  analyticsCacheTTL: 3600, // 1 hour
};

// Export default configuration
export default config;
