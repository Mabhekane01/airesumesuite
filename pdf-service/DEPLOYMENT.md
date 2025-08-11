# PDF Service Deployment Guide

## ✅ Status: Ready for Production

The PDF Service has been successfully configured for both development and production environments. All functionality is working including the fixed watermark and security endpoints.

## 🚀 Quick Start (Development)

### Option 1: Automated Startup Script
```bash
# Windows
start-dev.bat

# Unix/Linux/Mac
./start-dev.sh
```

### Option 2: Manual Startup
```bash
# Create directories
mkdir -p temp/pdf logs

# Run the service
java -Xms256m -Xmx1024m -XX:+UseG1GC -Dspring.profiles.active=dev -jar target/pdf-service-1.0.0.jar
```

The service will be available at: **http://localhost:8080**

## 🧪 Testing Your Local Instance

Once started, test these endpoints:

```bash
# Health checks
curl http://localhost:8080/api/pdf/health
curl http://localhost:8080/api/pdf/advanced/health

# Test watermark endpoint (fixed)
curl -X POST http://localhost:8080/api/pdf/advanced/apply-watermark-all-pages \
  -F "file=@test.pdf" \
  -F "text=TEST" \
  -F "opacity=0.3" \
  -F "rotation=45" \
  -F "position=center" \
  -F "fontSize=36" \
  -F "color=lightgray"

# Test remove security endpoint (fixed)  
curl -X POST http://localhost:8080/api/pdf/advanced/remove-security \
  -F "file=@secured.pdf" \
  -F "ownerPassword=owner123" \
  -F "userPassword=user123"
```

## 📋 Fixed Issues

### ✅ Watermark All Pages Endpoint
- **Fixed**: Now accepts all required parameters: `position`, `fontSize`, `color`
- **Controller**: `AdvancedPdfController.java` - lines 95-105
- **Endpoint**: `POST /api/pdf/advanced/apply-watermark-all-pages`

### ✅ Remove Security Endpoint  
- **Fixed**: Now accepts both `ownerPassword` and `userPassword` parameters
- **Controller**: `AdvancedPdfController.java` - lines 271-287
- **Endpoint**: `POST /api/pdf/advanced/remove-security`

### ✅ Full Stack Integration
- **Backend Services**: Node.js service methods updated
- **API Routes**: New routes added for both endpoints  
- **Frontend**: WatermarkEditor enhanced with position controls

## 🌐 Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your production values

# 2. Deploy
docker-compose up -d

# 3. Test
curl https://yourapp.com/api/pdf/health
```

### Option 2: Manual Production Deploy

```bash
# 1. Set environment variables
export SPRING_PROFILES_ACTIVE=prod
export CORS_ALLOWED_ORIGINS=https://yourdomain.com
export LOG_LEVEL_APP=INFO
# ... other production variables

# 2. Run with production JVM settings
java -Xms512m -Xmx2048m -XX:+UseG1GC \
  -XX:G1HeapRegionSize=16m \
  -XX:+UseStringDeduplication \
  -jar target/pdf-service-1.0.0.jar
```

## 📁 Configuration Files Created

```
pdf-service/
├── src/main/resources/
│   ├── application.properties          # Base config
│   ├── application-dev.properties      # Development settings  
│   └── application-prod.properties     # Production settings
├── .env.example                        # Production environment template
├── .env.local                          # Local development environment  
├── docker-compose.yml                  # Container orchestration
├── Dockerfile                          # Production container build
├── start-dev.bat                       # Windows startup script
├── start-dev.sh                        # Unix startup script  
├── README.md                           # Complete documentation
└── DEPLOYMENT.md                       # This file
```

## ⚙️ Environment Profiles

### Development Profile (`dev`)
- **Port**: 8080
- **CORS**: Permissive (localhost only)
- **Logging**: DEBUG level for troubleshooting
- **Memory**: Conservative (256MB-1GB)
- **Features**: All enabled

### Production Profile (`prod`) 
- **Port**: Configurable via `SERVER_PORT`
- **CORS**: Restrictive (specific domains only)
- **Logging**: INFO level with file rotation
- **Memory**: Optimized (512MB-2GB+)
- **Security**: Hardened headers and settings

## 🔧 Common Configuration

### CORS Settings
```bash
# Development (permissive)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Production (restrictive)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Memory Tuning
```bash
# Light usage
JAVA_OPTS="-Xms256m -Xmx1g -XX:+UseG1GC"

# Heavy usage
JAVA_OPTS="-Xms1g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

### File Limits  
```bash
# Standard limits
MAX_FILE_SIZE=50MB
MAX_REQUEST_SIZE=100MB

# High-volume limits
MAX_FILE_SIZE=100MB  
MAX_REQUEST_SIZE=150MB
```

## 🐛 Troubleshooting

### Service Won't Start
1. **Check Java version**: Needs Java 17+ (you have Java 23 ✅)
2. **Check port**: Ensure 8080 is available
3. **Check permissions**: Ensure write access to `temp/` and `logs/`

### Memory Issues
```bash
# Increase heap size
export JAVA_OPTS="-Xms1g -Xmx4g -XX:+UseG1GC"
```

### CORS Errors
```bash
# Update allowed origins for your domain
export CORS_ALLOWED_ORIGINS=https://yourapp.com
```

### File Upload Errors
```bash
# Check and increase limits
export MAX_FILE_SIZE=100MB
export MAX_REQUEST_SIZE=150MB
```

## 📈 Monitoring

### Health Endpoints
- **Basic**: `GET /api/pdf/health`  
- **Advanced**: `GET /api/pdf/advanced/health`
- **Actuator**: `GET /actuator/health` (if enabled)

### Log Files
- **Development**: Console output
- **Production**: `./logs/pdf-service.log` (with rotation)

## 🔒 Security Checklist

### Development
- [x] CORS limited to localhost
- [x] Debug logging enabled  
- [x] All features enabled for testing

### Production  
- [ ] Update `CORS_ALLOWED_ORIGINS` to your domains
- [ ] Set `LOG_LEVEL_APP=INFO` or `WARN`
- [ ] Configure file size limits appropriately
- [ ] Enable HTTPS in reverse proxy
- [ ] Set up log monitoring
- [ ] Configure resource limits

## 🎯 Next Steps

1. **Test locally**: Use `start-dev.bat` or `start-dev.sh`
2. **Configure production**: Update `.env` file with your values
3. **Deploy**: Use Docker Compose or manual deployment  
4. **Monitor**: Check health endpoints and logs
5. **Scale**: Adjust memory and thread settings as needed

Your PDF Service is now production-ready with all functionality working! 🚀