#!/bin/bash

# Docker Deployment Script for AI Job Suite
# This script handles production deployment with proper error handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Environment setup
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Production environment file not found. Creating from example..."
    cp .env.production.example $ENV_FILE
    print_warning "Please edit $ENV_FILE with your production values before running again."
    exit 1
fi

print_status "Loading environment from $ENV_FILE"
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Build and deploy
print_status "Building Docker images..."
docker-compose build --no-cache

print_status "Stopping existing containers..."
docker-compose down

print_status "Starting services..."
docker-compose up -d

print_status "Waiting for services to start..."
sleep 30

# Health checks
print_status "Performing health checks..."

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_status "MongoDB is healthy"
else
    print_error "MongoDB health check failed"
    docker-compose logs mongodb
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_status "Redis is healthy"
else
    print_error "Redis health check failed"
    docker-compose logs redis
    exit 1
fi

# Check Backend
if curl -f http://localhost:${BACKEND_PORT:-3001}/health > /dev/null 2>&1; then
    print_status "Backend is healthy"
else
    print_error "Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Check Frontend
if curl -f http://localhost:${FRONTEND_PORT:-80}/health > /dev/null 2>&1; then
    print_status "Frontend is healthy"
else
    print_error "Frontend health check failed"
    docker-compose logs frontend
    exit 1
fi

print_status "Deployment completed successfully!"
print_status "Frontend: http://localhost:${FRONTEND_PORT:-80}"
print_status "Backend API: http://localhost:${BACKEND_PORT:-3001}"

# Show running containers
print_status "Running containers:"
docker-compose ps