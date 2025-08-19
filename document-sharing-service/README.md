# Document Sharing Service

A production-ready, enterprise-grade document sharing platform that rivals Papermark. Built with Node.js, TypeScript, PostgreSQL, and Redis. Provides secure document sharing, advanced analytics, and comprehensive API integration.

## 🚀 Features

### Core Functionality
- **Secure Document Management** - Upload, store, and organize documents with role-based access control
- **Advanced Sharing** - Password protection, expiration dates, custom domains, access lists
- **Real-time Analytics** - View tracking, engagement metrics, geographic insights, device analytics
- **File Processing** - PDF watermarking, format conversion, preview generation, thumbnail creation
- **Security** - End-to-end encryption, JWT authentication, rate limiting, IP whitelisting
- **API-First Design** - RESTful API with comprehensive documentation and webhook support

### Enterprise Features
- **Multi-tenant Architecture** - Organization-based isolation and management
- **Custom Branding** - White-label solutions with custom domains and styling
- **Advanced Permissions** - Granular role-based access control (Owner, Admin, Editor, Viewer)
- **Audit Logging** - Comprehensive activity tracking and compliance reporting
- **Webhook Integration** - Real-time notifications for external systems
- **Scalable Storage** - Local and cloud storage options with automatic cleanup

## 🏗️ Architecture

```
document-sharing-service/
├── packages/
│ ├── core/                    # Core business logic and models
│ │   ├── src/
│ │   │   ├── database/       # Database connection and migrations
│ │   │   ├── models/         # Data models and business logic
│ │   │   ├── services/       # Core business services
│ │   │   ├── utils/          # Utilities and helpers
│ │   │   └── types/          # TypeScript interfaces and types
│ │   └── package.json
│ ├── api-gateway/            # REST API and GraphQL endpoints
│ ├── analytics-engine/       # Real-time analytics processing
│ ├── file-processor/         # Document processing and conversion
│ └── notification-service/   # Email, webhooks, real-time updates
├── infrastructure/           # Docker and deployment configs
├── monitoring/               # Health checks and monitoring
└── docker-compose.yml        # Development environment setup
```

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL with advanced indexing and JSONB support
- **Cache**: Redis for session management and rate limiting
- **File Processing**: Sharp for image processing, pdf2pic for PDF previews
- **Security**: JWT, bcrypt, crypto, rate limiting
- **Storage**: Local file system with S3 integration support
- **Monitoring**: Winston logging, health checks, performance metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd document-sharing-service
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_sharing
DB_USER=postgres
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-change-in-production
SALT_ROUNDS=12

# Storage
LOCAL_STORAGE_PATH=./uploads
MAX_FILE_SIZE=104857600
BASE_URL=http://localhost:4000

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

3. **Database Setup**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
cd packages/core
npm run build
node dist/database/migrations.js
```

4. **Start Services**
```bash
# Start API Gateway
cd packages/api-gateway
npm run dev

# Start Core Service
cd packages/core
npm run dev

# Start Analytics Engine
cd packages/analytics-engine
npm run dev
```

5. **Verify Installation**
```bash
# Health check
curl http://localhost:4000/health

# API documentation
open http://localhost:4000/api-docs
```

## 📚 API Documentation

### Authentication
```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": { ... }
  }
}
```

### Document Management
```bash
# Upload document
POST /api/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Get documents
GET /api/documents?page=1&limit=20
Authorization: Bearer <token>

# Search documents
GET /api/documents/search?query=resume&category=resume
Authorization: Bearer <token>
```

### Document Sharing
```bash
# Create share
POST /api/shares
Authorization: Bearer <token>
{
  "documentId": "uuid",
  "title": "My Resume",
  "password": "optional_password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "settings": {
    "allowDownload": true,
    "allowPrint": false,
    "trackViews": true
  }
}

# Access shared document
GET /view/{shareId}
# or with password
POST /view/{shareId}
{
  "password": "password"
}
```

### Analytics
```bash
# Get document analytics
GET /api/analytics/documents/{documentId}
Authorization: Bearer <token>

# Get share analytics
GET /api/analytics/shares/{shareId}
Authorization: Bearer <token>

# Get organization analytics
GET /api/analytics/organization
Authorization: Bearer <token>
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with configurable expiration
- Role-based access control (Owner, Admin, Editor, Viewer)
- Organization-level isolation and permissions
- API key validation for webhook endpoints

### File Security
- File type validation by content (magic bytes)
- Secure file access tokens with expiration
- IP whitelisting and rate limiting
- Encrypted storage of sensitive metadata

### Data Protection
- Password hashing with bcrypt (configurable salt rounds)
- AES-256 encryption for sensitive data
- Secure random string generation
- Comprehensive audit logging

## 📊 Analytics & Insights

### View Tracking
- Real-time view counting and unique visitor tracking
- Geographic data (country, city) with IP geolocation
- Device and browser analytics
- Session duration and engagement metrics

### Performance Metrics
- File upload/download performance
- API response times and error rates
- Storage utilization and cleanup statistics
- Rate limiting and security event monitoring

### Custom Events
- Track specific user actions (view, download, print)
- Custom metadata and tagging
- Webhook integration for external analytics
- Export capabilities for business intelligence

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Service port | `4000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `REDIS_HOST` | Redis host | `localhost` |
| `JWT_SECRET` | JWT signing secret | `change-in-production` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `104857600` (100MB) |
| `LOG_LEVEL` | Logging level | `info` |

### Database Configuration
- Connection pooling with configurable limits
- Automatic retry and failover handling
- JSONB support for flexible metadata storage
- Advanced indexing for optimal query performance

### Storage Configuration
- Local file system with automatic directory creation
- Configurable file size limits and type restrictions
- Automatic thumbnail and preview generation
- Cleanup jobs for temporary and expired files

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api-gateway=3
```

### Production Considerations
- Use environment-specific configuration files
- Implement proper SSL/TLS termination
- Set up monitoring and alerting
- Configure backup and disaster recovery
- Use managed database and Redis services
- Implement CDN for file delivery

### Health Checks
```bash
# Service health
GET /health

# Database health
GET /health/db

# Redis health
GET /health/redis

# Storage health
GET /health/storage
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Test Coverage
- Unit tests for all business logic
- Integration tests for database operations
- End-to-end tests for API endpoints
- Security and performance testing

## 📈 Performance

### Optimization Features
- Database connection pooling
- Redis caching for frequently accessed data
- Efficient file storage and retrieval
- Optimized database queries with proper indexing
- Background job processing for heavy operations

### Monitoring
- Real-time performance metrics
- Database query performance analysis
- File operation timing and success rates
- API endpoint response time tracking
- Error rate and failure monitoring

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration for code quality
- Prettier for consistent formatting
- Comprehensive error handling
- Detailed logging and monitoring

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](./docs/api.md)
- [Integration Guide](./docs/integration.md)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting](./docs/troubleshooting.md)

### Community
- [GitHub Issues](https://github.com/your-org/document-sharing-service/issues)
- [Discussions](https://github.com/your-org/document-sharing-service/discussions)
- [Wiki](https://github.com/your-org/document-sharing-service/wiki)

### Enterprise Support
- Dedicated support team
- Custom integrations and features
- On-premise deployment assistance
- Training and consulting services

---

**Built with ❤️ by the AI Resume Suite Team**