#!/bin/bash
# ============================================
# PDF Service - Rebuild Script (Unix/Linux/Mac)  
# ============================================

echo "Rebuilding PDF Service with new dependencies..."
echo ""

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "ERROR: Maven is required for rebuilding"
    echo "Please install Maven and run this script again"
    echo ""
    echo "Alternative: The current JAR will work, just ignore VS Code warnings"
    exit 1
fi

echo "Building with Maven..."
mvn clean compile

if [ $? -eq 0 ]; then
    echo ""
    echo "Packaging..."
    mvn package -DskipTests
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Build successful! New JAR created with DevTools and Actuator support."
        echo "VS Code warnings should now be resolved."
    else
        echo ""
        echo "❌ Package failed. Check the output above for errors."
    fi
else
    echo ""
    echo "❌ Compile failed. Check the output above for errors."
fi