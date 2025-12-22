/**
 * Production Environment Validator
 * Validates that all required environment variables are set for production deployment
 */

interface RequiredEnvVars {
  // Database
  MONGODB_URI: string;
  
  // Authentication & Security
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  
  // Email Service
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM?: string;
  
  // Redis (for caching and sessions)
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  
  // Payment Processing
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY?: string;
  
  // AI Services (at least one required)
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  
  // Application Settings
  NODE_ENV: string;
  PORT?: string;
  APP_NAME?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnvironmentValidator {
  private static readonly REQUIRED_VARS: (keyof RequiredEnvVars)[] = [
    'MONGODB_URI',
    'JWT_SECRET', 
    'JWT_REFRESH_SECRET',
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASS',
    'REDIS_HOST',
    'REDIS_PORT',
    'PAYSTACK_SECRET_KEY',
    'NODE_ENV'
  ];

  private static readonly OPTIONAL_VARS: (keyof RequiredEnvVars)[] = [
    'SMTP_FROM',
    'REDIS_PASSWORD',
    'PAYSTACK_PUBLIC_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY', 
    'ANTHROPIC_API_KEY',
    'PORT',
    'APP_NAME'
  ];

  static validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    this.REQUIRED_VARS.forEach(varName => {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    });

    // Check NODE_ENV is set to production
    if (process.env.NODE_ENV !== 'production') {
      warnings.push(`NODE_ENV is set to '${process.env.NODE_ENV}' instead of 'production'`);
    }

    // Validate AI service keys (at least one should be present)
    const aiKeys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    const hasAIKey = aiKeys.some(key => process.env[key] && process.env[key]!.trim() !== '');
    
    if (!hasAIKey) {
      errors.push('At least one AI service API key is required (GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)');
    }

    // Validate JWT secrets are strong
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for security');
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
      warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long for security');
    }

    // Validate database URI format
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
      errors.push('MONGODB_URI must be a valid MongoDB connection string');
    }

    // Validate Redis port is numeric
    if (process.env.REDIS_PORT && isNaN(Number(process.env.REDIS_PORT))) {
      errors.push('REDIS_PORT must be a valid port number');
    }

    // Validate SMTP port is numeric
    if (process.env.SMTP_PORT && isNaN(Number(process.env.SMTP_PORT))) {
      errors.push('SMTP_PORT must be a valid port number');
    }

    // Validate Paystack keys format
    if (process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.startsWith('sk_')) {
      errors.push('PAYSTACK_SECRET_KEY must be a valid Paystack secret key (starts with sk_)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateAndExit(): void {
    const result = this.validate();
    
    if (result.warnings.length > 0) {
      console.warn('⚠️  Environment Warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
      console.warn('');
    }

    if (!result.isValid) {
      console.error('❌ Environment Validation Failed:');
      result.errors.forEach(error => console.error(`  - ${error}`));
      console.error('\nPlease fix the above issues before starting the application.');
      process.exit(1);
    }

    console.log('✅ Environment validation passed');
  }

  static getRequiredVars(): string[] {
    return [...this.REQUIRED_VARS];
  }

  static getOptionalVars(): string[] {
    return [...this.OPTIONAL_VARS];
  }
}