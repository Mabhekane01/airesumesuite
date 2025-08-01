# Docker Deployment Guide

This guide provides comprehensive instructions for deploying the AI Job Suite using Docker in production.

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10.0+
- Docker Compose 2.0.0+
- At least 2GB RAM available
- At least 5GB disk space

### Production Deployment

1. **Clone and navigate to the project:**
   ```bash
   git clone <your-repo-url>
   cd ai-job-suite
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your actual values
   ```

3. **Deploy using the script:**
   
   **Linux/macOS:**
   ```bash
   chmod +x docker-deploy.sh
   ./docker-deploy.sh
   ```
   
   **Windows:**
   ```cmd
   docker-deploy.bat
   ```

4. **Access your application:**
   - Frontend: http://localhost (or your configured port)
   - Backend API: http://localhost:3001 (or your configured port)

## 📁 Docker Files Structure

```
├── apps/
│   ├── backend/
│   │   ├── Dockerfile          # Multi-stage backend build
│   │   └── nginx.conf          # Nginx configuration
│   └── frontend/
│       ├── Dockerfile          # Multi-stage frontend build
│       └── nginx.conf          # Nginx configuration for SPA
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development overrides
├── .dockerignore              # Docker build context optimization
├── .env.production.example    # Environment template
├── docker-deploy.sh          # Linux/macOS deployment script
├── docker-deploy.bat         # Windows deployment script
└── DOCKER_DEPLOYMENT.md      # This file
```

## 🏗️ Architecture

### Multi-Stage Builds

**Backend Dockerfile:**
- **Base Stage:** Install dependencies and copy source
- **Build Stage:** Compile TypeScript with `--skipLibCheck`
- **Production Stage:** Lightweight Node.js runtime with security hardening

**Frontend Dockerfile:**
- **Base Stage:** Install dependencies and copy source
- **Build Stage:** Build React app with Vite
- **Production Stage:** Nginx serving static files with optimized configuration

### Services

1. **MongoDB (mongo:7.0)**
   - Persistent data storage
   - Health checks enabled
   - Authentication configured

2. **Redis (redis:7.2-alpine)**
   - Session storage and caching
   - Persistence enabled
   - Optional password protection

3. **Backend (Node.js)**
   - TypeScript compiled with optimizations
   - Non-root user execution
   - Health checks and proper signal handling
   - Resource limits configured

4. **Frontend (Nginx)**
   - Static file serving
   - Gzip compression
   - Security headers
   - SPA routing support

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | No |
| `MONGO_ROOT_USERNAME` | MongoDB admin username | `admin` | Yes |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | - | Yes |
| `MONGO_DATABASE` | Database name | `ai_job_suite` | No |
| `REDIS_PASSWORD` | Redis password | - | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh secret | - | Yes |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | No |
| `GEMINI_API_KEY` | Google Gemini API key | - | No |

### Port Configuration

| Service | Default Port | Environment Variable |
|---------|--------------|---------------------|
| Frontend | 80 | `FRONTEND_PORT` |
| Backend | 3001 | `BACKEND_PORT` |
| MongoDB | 27017 | `MONGO_PORT` |
| Redis | 6379 | `REDIS_PORT` |

## 🛠️ Development Setup

For development with hot reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

This overrides the production configuration with:
- Volume mounts for live code editing
- Development command execution
- Increased resource limits

## 🔍 Monitoring and Health Checks

### Built-in Health Checks

- **MongoDB:** `mongosh --eval "db.adminCommand('ping')"`
- **Redis:** `redis-cli ping`
- **Backend:** HTTP GET `/health`
- **Frontend:** HTTP GET `/health`

### Viewing Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
docker-compose logs redis

# Follow logs
docker-compose logs -f backend
```

### Container Status

```bash
docker-compose ps
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures:**
   ```bash
   # Clean build
   docker-compose build --no-cache
   
   # Remove all containers and volumes
   docker-compose down -v
   docker system prune -a
   ```

2. **TypeScript Build Issues:**
   - The Dockerfiles use `--skipLibCheck` to avoid type definition issues
   - Ensure `pnpm-lock.yaml` is present for consistent dependencies

3. **Health Check Failures:**
   ```bash
   # Check service logs
   docker-compose logs [service-name]
   
   # Restart specific service
   docker-compose restart [service-name]
   ```

4. **Permission Issues:**
   ```bash
   # Fix file permissions (Linux/macOS)
   sudo chown -R $USER:$USER .
   
   # Fix Windows line endings
   git config core.autocrlf false
   ```

### Performance Optimization

1. **Resource Limits:**
   - Adjust memory limits in `docker-compose.yml` based on your server capacity
   - Monitor usage: `docker stats`

2. **Build Performance:**
   - Use `.dockerignore` to exclude unnecessary files
   - Enable BuildKit: `export DOCKER_BUILDKIT=1`

3. **Production Optimization:**
   - Use external managed databases for better performance
   - Implement container orchestration (Kubernetes, Docker Swarm)
   - Set up reverse proxy (Nginx, Traefik) for SSL termination

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable Redis password protection
- [ ] Configure proper firewall rules
- [ ] Use HTTPS in production
- [ ] Regular security updates
- [ ] Monitor container vulnerabilities
- [ ] Implement proper backup strategy

### Network Security

- All services communicate through internal Docker network
- Only necessary ports are exposed to the host
- Non-root users in containers
- Security headers configured in Nginx

## 📊 Scaling

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Load balancer configuration needed for multiple instances
```

### Vertical Scaling

Adjust resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

### Database Backups

```bash
# MongoDB backup
docker-compose exec mongodb mongodump --out /data/backup

# Redis backup
docker-compose exec redis redis-cli BGSAVE
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (BE CAREFUL!)
docker volume prune

# Complete cleanup (DESTRUCTIVE!)
docker system prune -a --volumes
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables in `.env.production`
3. Ensure all required API keys are configured
4. Check Docker and Docker Compose versions
5. Review this documentation for troubleshooting steps

For additional support, refer to the main project documentation or create an issue in the repository.