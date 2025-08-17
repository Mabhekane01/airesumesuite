# Document Sharing Service - Development Commands

.PHONY: help install dev dev-db build test lint clean logs stop

# Default target
help:
	@echo "Document Sharing Service - Available Commands:"
	@echo ""
	@echo "  make install    - Install dependencies for all packages"
	@echo "  make dev-db     - Start only database and Redis"
	@echo "  make dev        - Start all services in development mode"
	@echo "  make build      - Build all Docker images"
	@echo "  make test       - Run test suite for all packages"
	@echo "  make lint       - Run linting for all packages"
	@echo "  make logs       - View logs from all services"
	@echo "  make stop       - Stop all services"
	@echo "  make clean      - Clean up containers, volumes, and node_modules"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install
	@echo "Dependencies installed successfully!"

# Start only database and Redis for development
dev-db:
	@echo "Starting database and Redis..."
	docker-compose up -d postgres redis redis-commander minio
	@echo "Database and Redis are running!"
	@echo "Redis Commander: http://localhost:8082"
	@echo "MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)"

# Start all services in development mode
dev: dev-db
	@echo "Starting all services..."
	docker-compose up api-gateway analytics-engine file-processor notification-service
	@echo "All services are running!"
	@echo "API Gateway: http://localhost:4000"

# Build all Docker images
build:
	@echo "Building Docker images..."
	docker-compose build
	@echo "Build completed!"

# Run tests
test:
	@echo "Running tests..."
	npm run test
	@echo "Tests completed!"

# Run linting
lint:
	@echo "Running linting..."
	npm run lint
	@echo "Linting completed!"

# View logs from all services
logs:
	docker-compose logs -f

# Stop all services
stop:
	@echo "Stopping all services..."
	docker-compose down
	@echo "All services stopped!"

# Clean up everything
clean:
	@echo "Cleaning up..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	npm run clean
	@echo "Cleanup completed!"

# Development helpers
check-db:
	@echo "Checking database connection..."
	docker-compose exec postgres pg_isready -U docshare_user -d document_sharing

check-redis:
	@echo "Checking Redis connection..."
	docker-compose exec redis redis-cli ping

# Database operations
db-migrate:
	@echo "Running database migrations..."
	docker-compose exec api-gateway npm run migrate

db-seed:
	@echo "Seeding database..."
	docker-compose exec api-gateway npm run seed

db-reset:
	@echo "Resetting database..."
	docker-compose down postgres
	docker volume rm document-sharing-service_postgres_data || true
	docker-compose up -d postgres
	@echo "Database reset completed!"

# Quick development start
quick-start: install dev-db
	@echo "Quick start completed! Run 'make dev' to start all services."