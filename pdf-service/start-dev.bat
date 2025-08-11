@echo off
REM ============================================
REM PDF Service - Development Startup Script (Windows)
REM ============================================

echo Starting PDF Service in Development Mode...
echo.

REM Check if Java is installed
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Java 17+ is required but not found in PATH
    echo Please install Java 17 or later and add it to your PATH
    pause
    exit /b 1
)

REM Check Java version (basic check)
for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVA_VERSION=%%g
)
echo Found Java version: %JAVA_VERSION%

REM Set development environment
set SPRING_PROFILES_ACTIVE=dev
set JAVA_OPTS=-Xms256m -Xmx1024m -XX:+UseG1GC

REM Create necessary directories
if not exist "temp\pdf" mkdir temp\pdf
if not exist "logs" mkdir logs

echo.
echo ========================================
echo  PDF Service Configuration (DEV)
echo ========================================
echo  Profile: %SPRING_PROFILES_ACTIVE%
echo  Port: 8080
echo  CORS: Permissive (localhost only)
echo  Logging: DEBUG level
echo  Memory: %JAVA_OPTS%
echo ========================================
echo.

REM Check if Maven is available
where mvn >nul 2>&1
if %errorlevel% equ 0 (
    echo Building and starting with Maven...
    mvn clean spring-boot:run -Dspring-boot.run.profiles=dev
) else (
    echo Maven not found. Checking for pre-built JAR...
    if exist "target\pdf-service-*.jar" (
        echo Running pre-built JAR...
        for %%f in (target\pdf-service-*.jar) do (
            java %JAVA_OPTS% -Dspring.profiles.active=dev -jar "%%f"
        )
    ) else (
        echo ERROR: No Maven found and no pre-built JAR available
        echo Please install Maven or build the project first
        pause
        exit /b 1
    )
)

pause