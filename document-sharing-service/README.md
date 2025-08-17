# Document Sharing Service

A comprehensive document sharing platform with analytics, similar to Papermark. Provides secure document sharing, view tracking, and detailed analytics for any document type.

## 🎯 Features

- **Secure Document Sharing** - Password protection, expiration dates, custom domains
- **Advanced Analytics** - View tracking, engagement metrics, geographic insights
- **File Processing** - PDF watermarking, format conversion, preview generation
- **Access Controls** - Role-based permissions, download restrictions
- **Real-time Notifications** - WebSocket updates, email alerts, webhooks
- **API-First** - RESTful API for easy integration with any platform

## 🏗️ Architecture

```
document-sharing-service/
├── packages/
│ ├── core/              # Shared utilities and configurations
│ ├── api-gateway/       # REST API and GraphQL endpoints
│ ├── analytics-engine/  # View tracking and data processing
│ ├── file-processor/    # Document handling and conversion
│ └── notification-service/ # Email, webhooks, real-time updates
├── infrastructure/     # Docker and deployment configs
└── monitoring/         # Simple monitoring and health checks
```

## 🚀 Services

### Core Package
- Database connections (PostgreSQL)
- Redis caching and session management
- Authentication and authorization
- File storage abstraction (S3/local)
- Configuration management

### API Gateway
- RESTful API endpoints
- GraphQL for complex queries
- Authentication middleware
- Rate limiting and validation
- API documentation (OpenAPI/Swagger)

### Analytics Engine
- Real-time view tracking
- Geographic and device analytics
- Engagement metrics (time spent, scroll depth)
- Custom event tracking
- Data aggregation and reporting

### File Processor
- Document upload and validation
- PDF watermarking and protection
- Format conversion (PDF, Word, etc.)
- Preview generation and thumbnails
- Virus scanning and security checks

### Notification Service
- Email notifications for shares and views
- Webhook integration for external systems
- Real-time WebSocket updates
- Custom notification templates

## 🔗 Integration Examples

### With AI Resume Suite
```typescript
// Share resume after creation
const shareResult = await documentSharingAPI.share({
  document: resumePDF,
  title: "John Doe - Software Engineer Resume",
  password: "optional-password",
  expiresAt: "2024-12-31",
  trackViews: true
});

// Get analytics for job applications
const analytics = await documentSharingAPI.getAnalytics(shareResult.id);
```

### With PDF Service
```typescript
// Share edited PDF
const editedPDF = await pdfService.merge([pdf1, pdf2]);
const shareLink = await documentSharingAPI.share({
  document: editedPDF,
  allowDownload: false,
  watermark: "Confidential"
});
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- AWS S3 (or compatible storage)

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd document-sharing-service

# Start infrastructure
make dev-db

# Install dependencies
make install

# Start all services
make dev

# View logs
make logs
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/document_sharing
REDIS_URL=redis://localhost:6379

# Storage
AWS_S3_BUCKET=your-documents-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# External integrations
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

## 📡 API Endpoints

### Documents
- `POST /api/documents` - Upload and share document
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

### Analytics  
- `GET /api/analytics/:documentId` - Get document analytics
- `GET /api/analytics/:documentId/views` - Get view details
- `POST /api/analytics/events` - Track custom events

### Sharing
- `POST /api/shares` - Create sharing link
- `GET /api/shares/:shareId` - Access shared document
- `PUT /api/shares/:shareId` - Update sharing settings

## 🔒 Security Features

- **End-to-end encryption** for sensitive documents
- **Password protection** with bcrypt hashing
- **Time-based access** with automatic expiration
- **IP whitelisting** for restricted access
- **Watermarking** to prevent unauthorized distribution
- **Audit logging** for compliance and security

## 📊 Analytics & Insights

- **View tracking** - Who, when, how long
- **Geographic data** - Country, city, timezone
- **Device information** - Browser, OS, mobile/desktop
- **Engagement metrics** - Pages viewed, time spent
- **Download tracking** - When and by whom
- **Custom events** - Track specific user actions

## 🚀 Deployment

### Docker Compose (Recommended)
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Platforms
- **Render** - Use provided `render.yaml`
- **Railway** - Use provided `railway.json`
- **AWS/GCP** - Use Docker images with load balancer

## 🤝 Integration Partners

This service is designed to integrate with:
- **AI Resume Suite** - Share resumes and cover letters
- **PDF Service** - Share edited documents
- **Job Intelligence Platform** - Share job-related documents
- **External platforms** - Via REST API and webhooks

## 📈 Pricing Model

- **Free Tier** - 100 document shares/month, basic analytics
- **Pro Tier** - Unlimited shares, advanced analytics, custom branding
- **Enterprise** - White-label, custom domains, SSO, advanced security

## 🔧 Development Commands

```bash
make dev-db    # Start only database and Redis
make dev       # Start all services  
make logs      # View all logs
make test      # Run test suite
make build     # Build Docker images
make clean     # Clean up containers and volumes
```

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.