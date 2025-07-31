#!/usr/bin/env node

/**
 * Environment Configuration Management Script
 * 
 * This script helps manage environment configurations for the AI Job Suite
 * Usage: node scripts/set-env.js [development|production]
 */

const fs = require('fs');
const path = require('path');

const ENVIRONMENTS = ['development', 'production'];
const ROOT_DIR = path.resolve(__dirname, '..');

function copyEnvFile(environment, appType) {
  const sourceFile = path.join(ROOT_DIR, 'apps', appType, `.env.${environment}`);
  const targetFile = path.join(ROOT_DIR, 'apps', appType, '.env');

  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Environment file not found: ${sourceFile}`);
    return false;
  }

  try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✅ Copied ${appType}/.env.${environment} → ${appType}/.env`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${appType} environment file:`, error.message);
    return false;
  }
}

function setEnvironment(environment) {
  if (!ENVIRONMENTS.includes(environment)) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.log(`Available environments: ${ENVIRONMENTS.join(', ')}`);
    process.exit(1);
  }

  console.log(`🔄 Setting environment to: ${environment}`);
  console.log('');

  let success = true;

  // Copy backend environment
  success &= copyEnvFile(environment, 'backend');
  
  // Copy frontend environment
  success &= copyEnvFile(environment, 'frontend');

  console.log('');

  if (success) {
    console.log(`✅ Successfully configured environment for: ${environment}`);
    console.log('');
    
    if (environment === 'production') {
      console.log('⚠️  IMPORTANT - PRODUCTION CHECKLIST:');
      console.log('   1. Update all API keys and secrets in .env files');
      console.log('   2. Update database connection strings');
      console.log('   3. Configure production URLs and domains');
      console.log('   4. Verify SSL certificates are properly configured');
      console.log('   5. Enable monitoring and error tracking');
      console.log('   6. Test all integrations in staging first');
      console.log('');
    }
    
    if (environment === 'development') {
      console.log('💡 Development environment configured');
      console.log('   - Make sure MongoDB and Redis are running locally');
      console.log('   - Update API keys in .env files as needed');
      console.log('   - Run: pnpm install && pnpm run dev');
      console.log('');
    }
  } else {
    console.log('❌ Failed to configure environment');
    process.exit(1);
  }
}

function showUsage() {
  console.log('');
  console.log('🌍 AI Job Suite - Environment Configuration Manager');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/set-env.js <environment>');
  console.log('');
  console.log('Available environments:');
  console.log('  development  - Local development configuration');
  console.log('  production   - Production deployment configuration');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/set-env.js development');
  console.log('  node scripts/set-env.js production');
  console.log('');
}

function checkEnvironmentFiles() {
  const apps = ['backend', 'frontend'];
  let allFilesExist = true;

  console.log('🔍 Checking environment files...');
  console.log('');

  for (const app of apps) {
    for (const env of ENVIRONMENTS) {
      const filePath = path.join(ROOT_DIR, 'apps', app, `.env.${env}`);
      const exists = fs.existsSync(filePath);
      
      console.log(`${exists ? '✅' : '❌'} ${app}/.env.${env}`);
      
      if (!exists) {
        allFilesExist = false;
      }
    }
  }

  console.log('');
  return allFilesExist;
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    checkEnvironmentFiles();
    return;
  }

  const command = args[0];

  if (command === 'check') {
    checkEnvironmentFiles();
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    showUsage();
    return;
  }

  setEnvironment(command);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();