@echo off
REM Docker Deployment Script for AI Job Suite (Windows)
REM This script handles production deployment with proper error handling

echo [INFO] Starting AI Job Suite deployment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if docker-compose is available  
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] docker-compose is not installed. Please install it and try again.
    exit /b 1
)

REM Environment setup
if not exist ".env.production" (
    echo [WARNING] Production environment file not found. Creating from example...
    copy .env.production.example .env.production
    echo [WARNING] Please edit .env.production with your production values before running again.
    exit /b 1
)

echo [INFO] Building Docker images...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Docker images
    exit /b 1
)

echo [INFO] Stopping existing containers...
docker-compose down

echo [INFO] Starting services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    exit /b 1
)

echo [INFO] Waiting for services to start...
timeout /t 30 /nobreak >nul

echo [INFO] Performing health checks...

REM Check Backend health
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 10 | Out-Null; Write-Host '[INFO] Backend is healthy' } catch { Write-Host '[ERROR] Backend health check failed'; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERROR] Backend health check failed
    docker-compose logs backend
    exit /b 1
)

REM Check Frontend health
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost/health' -UseBasicParsing -TimeoutSec 10 | Out-Null; Write-Host '[INFO] Frontend is healthy' } catch { Write-Host '[ERROR] Frontend health check failed'; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERROR] Frontend health check failed
    docker-compose logs frontend
    exit /b 1
)

echo [INFO] Deployment completed successfully!
echo [INFO] Frontend: http://localhost
echo [INFO] Backend API: http://localhost:3001

echo [INFO] Running containers:
docker-compose ps

pause