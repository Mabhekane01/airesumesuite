#!/bin/bash

# AI Job Suite - Production Docker Deployment Script
# This script deploys the application using your existing production configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo "========================================"
    echo "  AI JOB SUITE - PRODUCTION DEPLOYMENT"
    echo "========================================"
    echo
}

# Check if Docker is running
check_docker() {
    print_info "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if docker-compose is available
check_docker_compose() {
    print_info "Checking docker-compose..."
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
    print_success "docker-compose is available"
}

# Verify environment file
check_environment() {
    print_info "Checking production environment..."
    if [ ! -f ".env.production" ]; then
        print_error "Production environment file not found!"
        print_info "The .env.production file has been created with your configuration."
        print_info "Please verify all values are correct before proceeding."
        exit 1
    fi
    print_success "Production environment file found"
}

# Clean up existing containers
cleanup() {
    print_info "Cleaning up existing containers..."
    docker-compose -f docker-compose.production.yml down --remove-orphans || true
    docker system prune -f
}

# Build images
build_images() {
    print_info "Building production images (this may take several minutes)..."
    if ! docker-compose -f docker-compose.production.yml build --no-cache --parallel; then
        print_error "Failed to build Docker images"
        print_info "Check the error messages above for details"
        exit 1
    fi
    print_success "Images built successfully"
}

# Start services
start_services() {
    print_info "Starting production services..."
    if ! docker-compose -f docker-compose.production.yml up -d; then
        print_error "Failed to start services"
        print_info "Check the error messages above for details"
        exit 1
    fi
    print_success "Services started"
}

# Wait for services
wait_for_services() {
    print_info "Waiting for services to initialize (60 seconds)..."
    sleep 60
}

# Health checks
health_checks() {
    print_info "Performing health checks..."
    
    # Check Backend health
    print_info "Checking backend health..."
    local backend_retries=5
    local backend_healthy=false
    
    for i in $(seq 1 $backend_retries); do
        if curl -f https://airesumesuite.onrender.com/health > /dev/null 2>&1; then
            print_success "Backend is healthy"
            backend_healthy=true
            break
        else
            print_warning "Backend health check attempt $i/$backend_retries failed, retrying..."
            sleep 10
        fi
    done
    
    if [ "$backend_healthy" = false ]; then
        print_error "Backend health check failed after $backend_retries attempts"
        print_info "Checking backend logs..."
        docker-compose -f docker-compose.production.yml logs --tail=50 backend
        echo
        print_info "You can check full logs with: docker-compose -f docker-compose.production.yml logs backend"
        exit 1
    fi
    
    # Check Frontend health
    print_info "Checking frontend health..."
    local frontend_retries=5
    local frontend_healthy=false
    
    for i in $(seq 1 $frontend_retries); do
        if curl -f https://airesumesuite.web.app/health > /dev/null 2>&1; then
            print_success "Frontend is healthy"
            frontend_healthy=true
            break
        else
            print_warning "Frontend health check attempt $i/$frontend_retries failed, retrying..."
            sleep 10
        fi
    done
    
    if [ "$frontend_healthy" = false ]; then
        print_error "Frontend health check failed after $frontend_retries attempts"
        print_info "Checking frontend logs..."
        docker-compose -f docker-compose.production.yml logs --tail=50 frontend
        echo
        print_info "You can check full logs with: docker-compose -f docker-compose.production.yml logs frontend"
        exit 1
    fi
}

# Show deployment success
show_success() {
    echo
    echo "========================================"
    echo "  DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "========================================"
    echo
    echo "Frontend URL: https://airesumesuite.web.app"
    echo "Backend API: https://airesumesuite.onrender.com"
    echo "Health Check: https://airesumesuite.onrender.com/health"
    echo
    echo "Your AI Job Suite is now running in production mode!"
    echo
    echo "Useful commands:"
    echo "- View logs: docker-compose -f docker-compose.production.yml logs"
    echo "- Stop services: docker-compose -f docker-compose.production.yml down"
    echo "- Restart services: docker-compose -f docker-compose.production.yml restart"
    echo
    print_info "Running containers:"
    docker-compose -f docker-compose.production.yml ps
    echo
    print_info "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
}

# Main deployment process
main() {
    print_header
    check_docker
    check_docker_compose
    check_environment
    cleanup
    build_images
    start_services
    wait_for_services
    health_checks
    show_success
}

# Run main function
main "$@"