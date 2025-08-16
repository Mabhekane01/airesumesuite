# ============================================
# Multi-stage Docker build for PDF Service
# ============================================

# Stage 1: Build stage
FROM eclipse-temurin:23-jdk AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    maven \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Maven files
COPY pom.xml .

# Download dependencies (this layer will be cached if pom.xml doesn't change)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests=true

# Stage 2: Production stage
FROM eclipse-temurin:23-jre AS production

# Install runtime dependencies for PDF processing
RUN apt-get update && apt-get install -y \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto \
    libreoffice-core-nogui \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r pdfservice && useradd -r -g pdfservice pdfservice

# Create app directory and set permissions
WORKDIR /app
RUN chown -R pdfservice:pdfservice /app

# Create directories for temp files and logs
RUN mkdir -p /app/temp/pdf /app/logs \
    && chown -R pdfservice:pdfservice /app/temp /app/logs

# Copy the built JAR from builder stage
COPY --from=builder /app/target/pdf-service-*.jar app.jar

# Switch to non-root user
USER pdfservice

# Set environment variables
ENV JAVA_OPTS="-Xms512m -Xmx2048m -XX:+UseG1GC -XX:G1HeapRegionSize=16m -XX:+UseStringDeduplication"
ENV SPRING_PROFILES_ACTIVE=prod
# Render will provide $PORT dynamically
ENV PORT=8080

# Health check (uses dynamic $PORT)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/actuator/health || exit 1

# Expose the Render port
EXPOSE $PORT

# Run the application (bind to dynamic $PORT)
CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=$PORT -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
