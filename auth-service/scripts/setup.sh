#!/bin/bash

# AI Job Suite Auth Service Setup Script
# This script ensures pnpm is installed and sets up the service

set -e

echo "🔐 Setting up AI Job Suite Auth Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm@8.15.0
else
    echo "✅ pnpm is already installed: $(pnpm --version)"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file from template..."
    if [ -f "../env.example" ]; then
        cp ../env.example ../.env
        echo "✅ .env file created from template"
    else
        echo "⚠️  env.example not found, creating basic .env file..."
        cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_job_suite_auth
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_job_suite_auth
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Service Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Service Integration
INTERNAL_SERVICE_KEY=your-internal-service-key-for-service-to-service-communication

# Frontend URL
FRONTEND_URL=http://localhost:3000
EOF
        echo "✅ .env file created. Please review and update the secrets!"
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and update the .env file with your configuration"
echo "2. Start PostgreSQL and Redis: pnpm docker:up"
echo "3. Run database migrations: pnpm db:migrate"
echo "4. Start the service: pnpm dev"
echo ""
echo "For more information, see the README.md file"
