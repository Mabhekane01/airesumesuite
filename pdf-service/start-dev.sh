#!/bin/bash
# ============================================
# PDF Service - Development Startup Script (Unix/Linux/Mac)
# ============================================

echo "Starting PDF Service in Development Mode..."
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "ERROR: Java 17+ is required but not found in PATH"
    echo "Please install Java 17 or later and add it to your PATH"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2)
echo "Found Java version: $JAVA_VERSION"

# Set development environment
export SPRING_PROFILES_ACTIVE=dev
export JAVA_OPTS="-Xms256m -Xmx1024m -XX:+UseG1GC"

# Create necessary directories
mkdir -p temp/pdf
mkdir -p logs

echo ""
echo "========================================"
echo "  PDF Service Configuration (DEV)"
echo "========================================"
echo "  Profile: $SPRING_PROFILES_ACTIVE"
echo "  Port: 8080"
echo "  CORS: Permissive (localhost only)"
echo "  Logging: DEBUG level"
echo "  Memory: $JAVA_OPTS"
echo "========================================"
echo ""

# Check if Maven is available
if command -v mvn &> /dev/null; then
    echo "Building and starting with Maven..."
    mvn clean spring-boot:run -Dspring-boot.run.profiles=dev
else
    echo "Maven not found. Checking for pre-built JAR..."
    JAR_FILE=$(find target -name "pdf-service-*.jar" 2>/dev/null | head -1)
    
    if [ -n "$JAR_FILE" ] && [ -f "$JAR_FILE" ]; then
        echo "Running pre-built JAR: $JAR_FILE"
        java $JAVA_OPTS -Dspring.profiles.active=dev -jar "$JAR_FILE"
    else
        echo "ERROR: No Maven found and no pre-built JAR available"
        echo "Please install Maven or build the project first"
        exit 1
    fi
fi