# Document Sharing Service

A comprehensive, enterprise-grade document sharing and analytics platform designed to rival and exceed Papermark's capabilities.

## 🚀 Features

### Core Functionality

- **Document Management**: Upload, organize, and manage documents with advanced metadata
- **Secure Sharing**: Create password-protected, expiring shareable links
- **Multi-format Support**: PDF, DOC, PPT, XLS, images, and more
- **Organization Management**: Multi-tenant architecture with role-based access control
- **Advanced Analytics**: Real-time tracking, page-level insights, and comprehensive reporting

### Security & Access Control

- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-Based Access Control**: Owner, Admin, Member, and Viewer roles
- **Organization Isolation**: Complete data separation between organizations
- **Password Protection**: Optional password protection for shared documents
- **Link Expiration**: Set expiration dates for shared links

### Analytics & Insights

- **Real-time Tracking**: Live viewer tracking and engagement metrics
- **Geographic Analytics**: Country and city-level visitor insights
- **Device Analytics**: Browser, OS, and device type tracking
- **Page-level Insights**: Individual page performance and engagement
- **Traffic Sources**: Referrer tracking and source analysis

### File Processing

- **Document Conversion**: Convert Office documents to PDF
- **Thumbnail Generation**: Automatic thumbnail creation for documents
- **Text Extraction**: OCR and text extraction from images and PDFs
- **Preview Generation**: Multiple resolution previews for documents

## 🏗️ Architecture

The service is built using a microservices architecture with the following components:

```
document-sharing-service/
├── packages/
│   ├── core/                 # Core functionality and models
│   ├── api-gateway/          # Main API service
│   ├── analytics-engine/     # Analytics and tracking service
│   ├── file-processor/       # File processing and conversion
│   └── notification-service/ # Email and push notifications
├── docker/                   # Docker configuration
├── infrastructure/           # Infrastructure setup
└── monitoring/              # Monitoring and logging
```

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL with advanced indexing
- **Caching**: Redis for sessions and caching
- **File Storage**: Local storage with S3 integration support
- **Authentication**: JWT with bcrypt password hashing
- **Containerization**: Docker and Docker Compose
- **Monitoring**: Winston logging, health checks

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)
- LibreOffice (for document conversion)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd document-sharing-service
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/document_sharing
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600

# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Database Setup

```bash
# Create database
createdb document_sharing

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Start Services

```bash
# Development mode (all services)
npm run dev

# Production build
npm run build
npm start

# Individual services
npm run dev:api
npm run dev:analytics
npm run dev:file-processor
npm run dev:notifications
```

### 5. Docker (Alternative)

```bash
# Build and start all services
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "organizationId": "optional-org-id"
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Document Management

#### Upload Document

```http
POST /api/v1/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
title: "Document Title"
description: "Optional description"
tags: "tag1,tag2,tag3"
isPublic: false
```

#### Get Documents

```http
GET /api/v1/documents?page=1&limit=20&search=keyword&tags=tag1,tag2
Authorization: Bearer <token>
```

#### Get Public Documents

```http
GET /api/v1/documents/public?page=1&limit=20&search=keyword
```

### Document Sharing

#### Create Shareable Link

```http
POST /api/v1/shares
Authorization: Bearer <token>
Content-Type: application/json

{
  "documentId": "doc-uuid",
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "allowDownload": true,
  "customDomain": "optional-domain.com"
}
```

#### View Shared Document

```http
GET /d/{slug}?password=optional-password
```

### Analytics

#### Document Analytics

```http
GET /api/v1/analytics/documents/{documentId}?timeRange=30d
Authorization: Bearer <token>
```

#### Organization Analytics

```http
GET /api/v1/analytics/organization?timeRange=30d
Authorization: Bearer <token>
```

#### Record View (for document viewer)

```http
POST /api/v1/analytics/record-view
Content-Type: application/json

{
  "documentId": "doc-uuid",
  "linkId": "optional-link-uuid",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "timeOnPage": 120,
  "pagesViewed": [1, 2, 3],
  "interactions": ["scroll_50", "click_button"]
}
```

### User Management

#### Get Users

```http
GET /api/v1/users?page=1&limit=20&role=admin&search=john
Authorization: Bearer <token>
```

#### Update User

```http
PUT /api/v1/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "role": "admin",
  "permissions": ["manage_members", "manage_documents"]
}
```

### Organization Management

#### Get Organization

```http
GET /api/v1/organizations/{orgId}
Authorization: Bearer <token>
```

#### Update Organization

```http
PUT /api/v1/organizations/{orgId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Org Name",
  "domain": "newdomain.com",
  "settings": {
    "branding": {
      "logo": "logo-url",
      "colors": ["#007bff", "#28a745"]
    }
  }
}
```

## 🔐 Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "organizationId": "org-uuid",
  "role": "admin",
  "permissions": ["manage_members", "manage_documents"],
  "subscriptionTier": "pro",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Permission System

- **Owner**: Full access to organization and all features
- **Admin**: Manage members, documents, and organization settings
- **Member**: Create and manage documents, view analytics
- **Viewer**: View documents and basic analytics

### Rate Limiting

- **Free Tier**: 100 requests per 15 minutes
- **Pro Tier**: 500 requests per 15 minutes
- **Enterprise Tier**: 2000 requests per 15 minutes

## 📊 Database Schema

### Core Tables

- `users` - User accounts and authentication
- `organizations` - Multi-tenant organizations
- `documents` - Document metadata and storage
- `document_links` - Shareable links and access control
- `document_views` - Analytics and tracking data

### Key Features

- UUID primary keys for security
- JSONB fields for flexible metadata storage
- Proper indexing for performance
- Soft deletes for data integrity
- Timestamp tracking for all records

## 🚀 Deployment

### Production Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=very-long-random-secret
JWT_REFRESH_SECRET=very-long-random-refresh-secret
UPLOAD_PATH=/var/uploads
MAX_FILE_SIZE=104857600
BASE_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

### Docker Production

```bash
# Build production image
docker build -f Dockerfile.production -t document-sharing:latest .

# Run with environment variables
docker run -d \
  --name document-sharing \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  document-sharing:latest
```

### Health Checks

```bash
# Service health
curl http://localhost:3000/health

# Database connectivity
curl http://localhost:3000/health/db

# Redis connectivity
curl http://localhost:3000/health/redis
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific service tests
npm run test:api
npm run test:analytics
npm run test:file-processor
npm run test:notifications

# Watch mode
npm run test:watch
```

## 📈 Performance & Scaling

### Optimization Features

- Database connection pooling
- Redis caching for sessions and data
- Efficient file processing with streaming
- Pagination for all list endpoints
- Proper database indexing

### Scaling Considerations

- Horizontal scaling with load balancers
- Database read replicas for analytics
- CDN integration for file delivery
- Microservice architecture for independent scaling

## 🔍 Monitoring & Logging

### Logging

- Structured logging with Winston
- Request/response logging
- Error tracking and alerting
- Performance metrics

### Health Monitoring

- Service health checks
- Database connectivity monitoring
- Redis connectivity monitoring
- File system health checks

## 🛡️ Security Features

- JWT token validation
- Password hashing with bcrypt
- CORS configuration
- Rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection with helmet

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the API examples

## 🚧 Roadmap

### Phase 1 (Current)

- ✅ Core API functionality
- ✅ Authentication and authorization
- ✅ Document management
- ✅ Basic sharing features
- ✅ Analytics foundation

### Phase 2 (Next)

- 🔄 Advanced file processing
- 🔄 Real-time analytics with WebSockets
- 🔄 Advanced sharing features
- 🔄 Mobile optimization

### Phase 3 (Future)

- 📋 AI-powered document analysis
- 📋 Advanced collaboration features
- 📋 Enterprise integrations
- 📋 Mobile applications

---

**Built with ❤️ for enterprise document sharing needs**
