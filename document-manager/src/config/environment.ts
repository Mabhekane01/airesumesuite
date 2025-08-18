import { config as dotenvConfig } from "dotenv";
import path from "path";

// Load environment variables
dotenvConfig();

interface Config {
  NODE_ENV: string;
  PORT: number;

  // Database
  DATABASE_URL: string;

  // Redis
  REDIS_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // File Storage
  UPLOAD_PATH: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string[];
  STORAGE_PROVIDER: "local" | "s3" | "gcs" | "azure";

  // AWS S3 (if using S3)
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;

  // CORS
  CORS_ORIGINS: string[];

  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  FROM_EMAIL?: string;

  // Analytics
  ANALYTICS_RETENTION_DAYS: number;

  // Security
  BCRYPT_ROUNDS: number;
  API_KEY_LENGTH: number;

  // Rate Limiting
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;

  // Webhook
  WEBHOOK_SECRET: string;

  // PDF Processing
  PDF_PROCESSING_TIMEOUT: number;

  // External Services
  VIRUS_SCAN_ENABLED: boolean;
  VIRUS_SCAN_API_KEY?: string;

  // Custom Domains
  DOMAIN_VERIFICATION_ENABLED: boolean;

  // Enterprise Features
  ENTERPRISE_FEATURES_ENABLED: boolean;

  // AI Resume Suite Integration
  AI_RESUME_SERVICE_URL: string;
  PDF_EDITOR_SERVICE_URL?: string;
}

export const config: Config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3002", 10),

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/document_manager",

  // Redis
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // JWT
  JWT_SECRET:
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // File Storage
  UPLOAD_PATH: process.env.UPLOAD_PATH || path.join(process.cwd(), "uploads"),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "100", 10) * 1024 * 1024, // 100MB default
  ALLOWED_FILE_TYPES: (
    process.env.ALLOWED_FILE_TYPES || "pdf,doc,docx,ppt,pptx,txt,jpg,jpeg,png"
  ).split(","),
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || "local") as
    | "local"
    | "s3"
    | "gcs"
    | "azure",

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

  // CORS
  CORS_ORIGINS: (
    process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173"
  ).split(","),

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@airesumesuite.com",

  // Analytics
  ANALYTICS_RETENTION_DAYS: parseInt(
    process.env.ANALYTICS_RETENTION_DAYS || "365",
    10
  ),

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  API_KEY_LENGTH: parseInt(process.env.API_KEY_LENGTH || "32", 10),

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || "900000", 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10),

  // Webhook
  WEBHOOK_SECRET:
    process.env.WEBHOOK_SECRET || "webhook-secret-change-in-production",

  // PDF Processing
  PDF_PROCESSING_TIMEOUT: parseInt(
    process.env.PDF_PROCESSING_TIMEOUT || "30000",
    10
  ), // 30 seconds

  // External Services
  VIRUS_SCAN_ENABLED: process.env.VIRUS_SCAN_ENABLED === "true",
  VIRUS_SCAN_API_KEY: process.env.VIRUS_SCAN_API_KEY,

  // Custom Domains
  DOMAIN_VERIFICATION_ENABLED:
    process.env.DOMAIN_VERIFICATION_ENABLED === "true",

  // Enterprise Features
  ENTERPRISE_FEATURES_ENABLED:
    process.env.ENTERPRISE_FEATURES_ENABLED !== "false",

  // AI Resume Suite Integration
  AI_RESUME_SERVICE_URL:
    process.env.AI_RESUME_SERVICE_URL || "http://localhost:3000/api",
  PDF_EDITOR_SERVICE_URL:
    process.env.PDF_EDITOR_SERVICE_URL || "http://localhost:8080/api",
};

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => {
    console.error(`  - ${envVar}`);
  });
  process.exit(1);
}

// Validate storage configuration
if (config.STORAGE_PROVIDER === "s3") {
  const s3RequiredVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
  ];
  const missingS3Vars = s3RequiredVars.filter((envVar) => !process.env[envVar]);

  if (missingS3Vars.length > 0) {
    console.error("❌ Missing required S3 environment variables:");
    missingS3Vars.forEach((envVar) => {
      console.error(`  - ${envVar}`);
    });
    process.exit(1);
  }
}

export default config;
