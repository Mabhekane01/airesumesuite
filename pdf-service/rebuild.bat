@echo off
REM ============================================
REM PDF Service - Rebuild Script (Windows)
REM ============================================

echo Rebuilding PDF Service with new dependencies...
echo.

REM Check if Maven is installed
where mvn >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Maven is required for rebuilding
    echo Please install Maven and run this script again
    echo.
    echo Alternative: The current JAR will work, just ignore VS Code warnings
    pause
    exit /b 1
)

echo Building with Maven...
mvn clean compile

if %errorlevel% equ 0 (
    echo.
    echo Packaging...
    mvn package -DskipTests
    
    if %errorlevel% equ 0 (
        echo.
        echo ✅ Build successful! New JAR created with DevTools and Actuator support.
        echo VS Code warnings should now be resolved.
    ) else (
        echo.
        echo ❌ Package failed. Check the output above for errors.
    )
) else (
    echo.
    echo ❌ Compile failed. Check the output above for errors.
)

pause