#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script validates environment variables for production deployment
 * Usage: node scripts/validate-env.js [environment]
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Required environment variables for different environments
const REQUIRED_VARS = {
  backend: {
    development: [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'FRONTEND_URL'
    ],
    production: [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'FRONTEND_URL',
      'SMTP_FROM',
      'SESSION_SECRET',
      'ADMIN_API_KEY',
      'SERVICE_API_KEY',
      'RECAPTCHA_SECRET_KEY'
    ]
  },
  frontend: {
    development: [
      'VITE_API_BASE_URL',
      'VITE_APP_NAME'
    ],
    production: [
      'VITE_API_BASE_URL',
      'VITE_APP_URL',
      'VITE_APP_NAME',
      'VITE_RECAPTCHA_SITE_KEY'
    ]
  }
};

// Security checks for production
const SECURITY_CHECKS = {
  backend: {
    JWT_SECRET: (value) => value.length >= 32,
    JWT_REFRESH_SECRET: (value) => value.length >= 32,
    SESSION_SECRET: (value) => value.length >= 32,
    ADMIN_API_KEY: (value) => value !== 'dev-admin-api-key-change-this',
    SERVICE_API_KEY: (value) => value !== 'dev-service-api-key-change-this',
    ENCRYPTION_KEY: (value) => !value || value.length >= 32
  }
};

function loadEnvFile(appType, environment = null) {
  const envFile = environment ? `.env.${environment}` : '.env';
  const envPath = path.join(ROOT_DIR, 'apps', appType, envFile);
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      envVars[key.trim()] = value;
    }
  });

  return envVars;
}

function validateRequiredVars(appType, environment, envVars) {
  const required = REQUIRED_VARS[appType]?.[environment] || [];
  const missing = [];
  const empty = [];

  for (const varName of required) {
    if (!envVars.hasOwnProperty(varName)) {
      missing.push(varName);
    } else if (!envVars[varName] || envVars[varName].trim() === '') {
      empty.push(varName);
    }
  }

  return { missing, empty };
}

function validateSecurity(appType, environment, envVars) {
  if (environment !== 'production') {
    return { passed: [], failed: [] };
  }

  const checks = SECURITY_CHECKS[appType] || {};
  const passed = [];
  const failed = [];

  for (const [varName, checkFn] of Object.entries(checks)) {
    if (envVars[varName]) {
      if (checkFn(envVars[varName])) {
        passed.push(varName);
      } else {
        failed.push(varName);
      }
    }
  }

  return { passed, failed };
}

function validateUrls(envVars) {
  const urlVars = Object.keys(envVars).filter(key => 
    key.includes('URL') || key.includes('URI') || key.endsWith('_URL')
  );
  
  const invalid = [];
  
  for (const varName of urlVars) {
    const value = envVars[varName];
    if (value && !isValidUrl(value)) {
      invalid.push(varName);
    }
  }

  return invalid;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    // Check if it's a MongoDB URI or Redis URI
    if (string.startsWith('mongodb://') || string.startsWith('mongodb+srv://') || 
        string.startsWith('redis://') || string.startsWith('rediss://')) {
      return true;
    }
    return false;
  }
}

function checkProductionSecurity(envVars) {
  const warnings = [];
  
  // Check for development values in production
  const devPatterns = [
    'localhost',
    '127.0.0.1',
    'dev-',
    'test-',
    'change-this',
    'your-'
  ];

  for (const [key, value] of Object.entries(envVars)) {
    if (value && typeof value === 'string') {
      for (const pattern of devPatterns) {
        if (value.toLowerCase().includes(pattern)) {
          warnings.push(`${key} contains '${pattern}' - update for production`);
        }
      }
    }
  }

  return warnings;
}

function validateEnvironment(environment = 'production') {
  console.log(`🔍 Validating ${environment} environment configuration...`);
  console.log('');

  let hasErrors = false;
  const apps = ['backend', 'frontend'];

  for (const app of apps) {
    console.log(`📦 ${app.toUpperCase()}`);
    console.log('─'.repeat(50));

    const envVars = loadEnvFile(app, environment);
    
    if (!envVars) {
      console.log(`❌ Environment file not found: apps/${app}/.env.${environment}`);
      hasErrors = true;
      continue;
    }

    // Check required variables
    const { missing, empty } = validateRequiredVars(app, environment, envVars);
    
    if (missing.length > 0) {
      console.log(`❌ Missing required variables:`);
      missing.forEach(varName => console.log(`   - ${varName}`));
      hasErrors = true;
    }

    if (empty.length > 0) {
      console.log(`⚠️  Empty required variables:`);
      empty.forEach(varName => console.log(`   - ${varName}`));
      hasErrors = true;
    }

    // Check security for production
    if (environment === 'production') {
      const { passed, failed } = validateSecurity(app, environment, envVars);
      
      if (failed.length > 0) {
        console.log(`❌ Security validation failed:`);
        failed.forEach(varName => console.log(`   - ${varName} (weak or default value)`));
        hasErrors = true;
      }

      // Check for development values in production
      const warnings = checkProductionSecurity(envVars);
      if (warnings.length > 0) {
        console.log(`⚠️  Production warnings:`);
        warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }

    // Validate URLs
    const invalidUrls = validateUrls(envVars);
    if (invalidUrls.length > 0) {
      console.log(`❌ Invalid URLs:`);
      invalidUrls.forEach(varName => console.log(`   - ${varName}: ${envVars[varName]}`));
      hasErrors = true;
    }

    if (!hasErrors) {
      console.log(`✅ ${app} configuration is valid`);
    }

    console.log('');
  }

  if (hasErrors) {
    console.log('❌ Environment validation failed');
    console.log('Please fix the errors above before deployment');
    process.exit(1);
  } else {
    console.log('✅ All environment configurations are valid');
    
    if (environment === 'production') {
      console.log('');
      console.log('🚀 Ready for production deployment!');
      console.log('');
      console.log('Final checklist:');
      console.log('  □ Database backups are configured');
      console.log('  □ SSL certificates are installed');
      console.log('  □ DNS records are configured');
      console.log('  □ Monitoring is set up');
      console.log('  □ Error tracking is configured');
      console.log('  □ Load balancer is configured (if applicable)');
    }
  }
}

function showUsage() {
  console.log('');
  console.log('🔍 AI Job Suite - Environment Validator');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/validate-env.js [environment]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/validate-env.js production');
  console.log('  node scripts/validate-env.js development');
  console.log('');
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';

  if (environment === 'help' || environment === '--help' || environment === '-h') {
    showUsage();
    return;
  }

  validateEnvironment(environment);
}

main();