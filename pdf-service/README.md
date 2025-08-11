# PDF Service

A comprehensive PDF processing service built with Spring Boot and SAMBox, providing advanced PDF manipulation capabilities including watermarking, security, optimization, and more.

## Features

- ✅ **PDF Editing**: Add text, replace content, merge/split documents
- ✅ **Watermarking**: Text and image watermarks with positioning
- ✅ **Security**: Password protection and permission management  
- ✅ **Digital Signatures**: Add and verify digital signatures
- ✅ **Optimization**: Compress and optimize PDF file sizes
- ✅ **Annotations**: Add highlights, notes, and drawings
- ✅ **Form Fields**: Create interactive PDF forms
- ✅ **OCR**: Optical Character Recognition (when enabled)
- ✅ **Conversion**: PDF to Word, HTML, text, and images

## Quick Start

### Prerequisites

- **Java 17+** (required)
- **Maven 3.8+** (for building)
- **Docker** (optional, for containerized deployment)

### Local Development

1. **Clone and navigate to the project**:
   ```bash
   cd pdf-service
   ```

2. **Start in development mode**:
   
   **Windows:**
   ```cmd
   start-dev.bat
   ```
   
   **Unix/Linux/Mac:**
   ```bash
   ./start-dev.sh
   ```

3. **Test the service**:
   ```bash
   curl http://localhost:8080/actuator/health
   ```

The service will be available at `http://localhost:8080`

### Production Deployment

#### Option 1: Docker Compose (Recommended)

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit .env** with your production values:
   ```bash
   # Update CORS_ALLOWED_ORIGINS, LOG_LEVEL_ROOT, etc.
   nano .env
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

#### Option 2: Manual JAR Deployment

1. **Build the JAR**:
   ```bash
   mvn clean package -DskipTests
   ```

2. **Set environment variables**:
   ```bash
   export SPRING_PROFILES_ACTIVE=prod
   export CORS_ALLOWED_ORIGINS=https://yourdomain.com
   # ... other production variables
   ```

3. **Run**:
   ```bash
   java -Xms512m -Xmx2048m -XX:+UseG1GC -jar target/pdf-service-*.jar
   ```

## Configuration

### Environment Profiles

- **`dev`**: Development mode with permissive CORS and debug logging
- **`prod`**: Production mode with security hardening and performance optimization

### Key Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | Service port | `8080` |
| `MAX_FILE_SIZE` | Maximum file upload size | `50MB` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `*` (dev), specific domains (prod) |
| `PDF_PROCESSING_TIMEOUT` | Processing timeout in seconds | `300` |
| `LOG_LEVEL_APP` | Application log level | `INFO` |

See `.env.example` for all available options.

## API Documentation

### Base URLs
- Development: `http://localhost:8080`
- Production: `https://yourapp.com/api/pdf`

### Core Endpoints

#### Health Check
```http
GET /actuator/health
```

#### Basic PDF Operations
```http
POST /api/pdf/extract-text        # Extract text from PDF
POST /api/pdf/replace-text        # Replace text in PDF
POST /api/pdf/add-text            # Add text at specific position
POST /api/pdf/merge               # Merge multiple PDFs
POST /api/pdf/split               # Split PDF into multiple files
```

#### Advanced Operations
```http
POST /api/pdf/advanced/add-text-watermark         # Add text watermark
POST /api/pdf/advanced/apply-watermark-all-pages  # Apply watermark to all pages
POST /api/pdf/advanced/secure-with-password       # Add password protection
POST /api/pdf/advanced/remove-security            # Remove password protection
POST /api/pdf/advanced/optimize                   # Optimize file size
```

#### Request Examples

**Add Watermark to All Pages:**
```bash
curl -X POST http://localhost:8080/api/pdf/advanced/apply-watermark-all-pages \
  -F "file=@document.pdf" \
  -F "text=CONFIDENTIAL" \
  -F "opacity=0.3" \
  -F "rotation=45" \
  -F "position=center" \
  -F "fontSize=36" \
  -F "color=lightgray"
```

**Remove Security:**
```bash
curl -X POST http://localhost:8080/api/pdf/advanced/remove-security \
  -F "file=@secured.pdf" \
  -F "ownerPassword=owner123" \
  -F "userPassword=user123"
```

## Monitoring

### Health Checks
- **Health**: `/actuator/health` - Service health status
- **Info**: `/actuator/info` - Application information

### Logging
- Development: Console output with DEBUG level
- Production: File logging at `/app/logs/pdf-service.log` with rotation

### Metrics (Optional)
Enable with `ENABLE_METRICS=true` and `ENABLE_PROMETHEUS=true` in production.

## Troubleshooting

### Common Issues

**1. Out of Memory Errors**
```bash
# Increase JVM heap size
export JAVA_OPTS="-Xms1g -Xmx4g -XX:+UseG1GC"
```

**2. File Upload Too Large**
```bash
# Increase file size limits
export MAX_FILE_SIZE=100MB
export MAX_REQUEST_SIZE=150MB
```

**3. CORS Errors in Browser**
```bash
# Update CORS origins for your domain
export CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**4. Service Won't Start**
- Check Java version: `java -version` (needs 17+)
- Check port availability: `netstat -an | grep :8080`
- Check logs: `tail -f logs/pdf-service.log`

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL_APP=DEBUG
export LOG_LEVEL_SPRING_WEB=DEBUG
```

### Performance Tuning

For high-throughput scenarios:
```bash
# Increase thread pool
export TOMCAT_MAX_THREADS=400
export TOMCAT_MAX_CONNECTIONS=10000

# Optimize JVM
export JAVA_OPTS="-Xms2g -Xmx8g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

## Security Considerations

- Always use HTTPS in production
- Restrict CORS origins to your specific domains
- Set resource limits to prevent DoS attacks
- Regularly update dependencies
- Monitor file upload sizes and processing times
- Consider implementing rate limiting

## Development

### Building from Source
```bash
mvn clean package
```

### Running Tests
```bash
mvn test
```

### Code Style
This project follows Spring Boot conventions and includes comprehensive error handling.

## License

This project is part of the AI Resume Suite application.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the logs at `logs/pdf-service.log`
3. Ensure all environment variables are properly set
4. Verify Java 17+ is installed and configured