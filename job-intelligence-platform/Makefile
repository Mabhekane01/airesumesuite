# Job Intelligence Platform - Development Commands

.PHONY: help dev dev-db prod logs clean test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-db: ## Start only database and Redis for development
	docker-compose -f docker-compose.dev.yml up -d

dev: ## Start all services for development
	docker-compose up -d

prod: ## Start all services for production
	docker-compose -f docker-compose.yml up -d

logs: ## Show logs for all services
	docker-compose logs -f

logs-service: ## Show logs for specific service (usage: make logs-service SERVICE=api-gateway)
	docker-compose logs -f $(SERVICE)

clean: ## Stop and remove all containers and volumes
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v

test: ## Run tests for all services
	@echo "Running tests..."
	# Add test commands here

install: ## Install dependencies for all Node.js services
	@echo "Installing dependencies..."
	cd packages/api-gateway && npm install
	cd packages/scraper-engine && npm install
	cd packages/etl-pipeline && npm install
	cd packages/scheduler && npm install

build: ## Build all Docker images
	docker-compose build

restart: ## Restart all services
	docker-compose restart

status: ## Show status of all services
	docker-compose ps