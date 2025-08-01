@echo off
REM AI Job Suite - Production Docker Deployment Script
REM This script deploys the application using your existing production configuration

echo ========================================
echo AI JOB SUITE - PRODUCTION DEPLOYMENT
echo ========================================
echo.

REM Check if Docker is running
echo [INFO] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running

REM Check if docker-compose is available  
echo [INFO] Checking docker-compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] docker-compose is not installed. Please install it and try again.
    pause
    exit /b 1
)
echo [SUCCESS] docker-compose is available

REM Verify production environment file exists
echo [INFO] Checking production environment...
if not exist ".env.production" (
    echo [ERROR] Production environment file not found!
    echo [INFO] The .env.production file has been created with your configuration.
    echo [INFO] Please verify all values are correct before proceeding.
    pause
    exit /b 1
)
echo [SUCCESS] Production environment file found

REM Clean up any existing containers
echo [INFO] Cleaning up existing containers...
docker-compose -f docker-compose.production.yml down --remove-orphans
docker system prune -f

echo [INFO] Building production images (this may take several minutes)...
docker-compose -f docker-compose.production.yml build --no-cache --parallel
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Docker images
    echo [INFO] Check the error messages above for details
    pause
    exit /b 1
)
echo [SUCCESS] Images built successfully

echo [INFO] Starting production services...
docker-compose -f docker-compose.production.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    echo [INFO] Check the error messages above for details
    pause
    exit /b 1
)
echo [SUCCESS] Services started

echo [INFO] Waiting for services to initialize (60 seconds)...
timeout /t 60 /nobreak >nul

echo [INFO] Performing health checks...

REM Check Backend health
echo [INFO] Checking backend health...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://airesumesuite.onrender.com/health' -UseBasicParsing -TimeoutSec 30; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Backend is healthy' -ForegroundColor Green } else { Write-Host '[ERROR] Backend returned status:' $response.StatusCode -ForegroundColor Red; exit 1 } } catch { Write-Host '[ERROR] Backend health check failed:' $_.Exception.Message -ForegroundColor Red; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERROR] Backend health check failed
    echo [INFO] Checking backend logs...
    docker-compose -f docker-compose.production.yml logs --tail=50 backend
    echo.
    echo [INFO] You can check full logs with: docker-compose -f docker-compose.production.yml logs backend
    pause
    exit /b 1
)

REM Check Frontend health
echo [INFO] Checking frontend health...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://airesumesuite.web.app/health' -UseBasicParsing -TimeoutSec 30; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Frontend is healthy' -ForegroundColor Green } else { Write-Host '[ERROR] Frontend returned status:' $response.StatusCode -ForegroundColor Red; exit 1 } } catch { Write-Host '[ERROR] Frontend health check failed:' $_.Exception.Message -ForegroundColor Red; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERROR] Frontend health check failed
    echo [INFO] Checking frontend logs...
    docker-compose -f docker-compose.production.yml logs --tail=50 frontend
    echo.
    echo [INFO] You can check full logs with: docker-compose -f docker-compose.production.yml logs frontend
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Frontend URL: https://airesumesuite.web.app
echo Backend API: https://airesumesuite.onrender.com
echo Health Check: https://airesumesuite.onrender.com/health
echo.
echo Your AI Job Suite is now running in production mode!
echo.
echo Useful commands:
echo - View logs: docker-compose -f docker-compose.production.yml logs
echo - Stop services: docker-compose -f docker-compose.production.yml down
echo - Restart services: docker-compose -f docker-compose.production.yml restart
echo.
echo [INFO] Running containers:
docker-compose -f docker-compose.production.yml ps

echo.
echo [INFO] Resource usage:
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo.
echo Press any key to exit...
pause >nul