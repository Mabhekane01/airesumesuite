# Document Manager Service

A production-ready, enterprise-grade document management service designed to rival and exceed Papermark's capabilities. This service integrates seamlessly with the AI Resume Suite and works in conjunction with the Document Sharing Service to provide a comprehensive document management solution.

## 🎯 Overview

The Document Manager Service is the core backend service that handles:

- Document upload, storage, and management
- Folder organization and hierarchy
- User and organization management
- Integration with the Document Sharing Service
- Analytics and tracking
- Webhook management for external integrations

## 🏗️ Architecture

### Service Structure

```
document-manager/
├── src/
│   ├── config/           # Configuration and environment
│   ├── models/           # Database models and data access
│   ├── services/         # Business logic and core services
│   ├── controllers/      # HTTP request handlers
│   ├── routes/           # API route definitions
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions and helpers
│   └── index.ts          # Main application entry point
├── database/             # Database schema and migrations
├── logs/                 # Application logs
└── uploads/              # File storage directory
```

### Integration Points

- **Document Sharing Service**: Handles public sharing, analytics, and view tracking
- **AI Resume Suite**: Integrates with existing resume and cover letter functionality
- **External Systems**: Webhook support for third-party integrations

## 🚀 Features

### Core Document Management

- ✅ **Document Upload**: Support for PDF, DOC, DOCX, PPT, PPTX, TXT, and image files
- ✅ **File Processing**: Automatic text extraction, thumbnail generation, and preview creation
- ✅ **Metadata Management**: Rich document metadata with search capabilities
- ✅ **Version Control**: Document versioning and history tracking
- ✅ **Storage Providers**: Support for local, S3, GCS, and Azure storage

### Organization & Collaboration

- ✅ **User Management**: User accounts with subscription tiers
- ✅ **Organization Support**: Multi-tenant organization management
- ✅ **Folder System**: Hierarchical folder organization with colors and descriptions
- ✅ **Access Control**: Role-based permissions and sharing controls

### Advanced Features

- ✅ **Search & Filtering**: Full-text search with advanced filtering options
- ✅ **Analytics**: Comprehensive document usage analytics and insights
- ✅ **Webhooks**: Real-time event notifications for external systems
- ✅ **Caching**: Redis-based caching for improved performance
- ✅ **Security**: JWT authentication, rate limiting, and input validation

## 📊 Database Schema

The service uses PostgreSQL with the following main tables:

- **users**: User accounts and profiles
- **organizations**: Organization management
- **documents**: Document metadata and storage information
- **folders**: Folder hierarchy and organization
- **document_shares**: Document sharing and access control
- **analytics**: Usage tracking and analytics data
- **webhooks**: Webhook configuration and events

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_manager
DB_USER=postgres
DB_PASSWORD=password
DB_MAX_CONNECTIONS=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,txt,jpg,jpeg,png,gif,webp

# Integration URLs
DOCUMENT_SHARING_SERVICE_URL=http://localhost:4000
AI_RESUME_SUITE_URL=http://localhost:3000

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- TypeScript 5+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd document-manager

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### Database Setup

```bash
# Create database
createdb document_manager

# Run migrations
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

## 📚 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token

### Documents

- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Folders

- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Sharing

- `POST /api/links` - Create share link
- `GET /api/links` - List share links
- `DELETE /api/links/:id` - Delete share link

### Analytics

- `GET /api/analytics/documents/:id` - Document analytics
- `GET /api/analytics/summary` - Analytics summary

### Webhooks

- `GET /api/webhooks` - List webhooks
- `POST /api/webhooks` - Create webhook
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook

## 🔌 Integration

### Document Sharing Service

The service integrates with the Document Sharing Service to provide:

- Public document viewing
- Password-protected sharing
- View tracking and analytics
- Download and print controls

### AI Resume Suite

Integration with the existing AI Resume Suite:

- Resume and cover letter management
- User authentication synchronization
- Analytics data sharing

## 📈 Performance & Scalability

### Caching Strategy

- Redis-based document caching (5-minute TTL)
- User and folder data caching
- Analytics result caching

### Database Optimization

- Connection pooling with configurable limits
- Indexed queries for common operations
- Efficient pagination and filtering

### File Processing

- Asynchronous file processing
- Thumbnail generation and optimization
- Background job processing

## 🔒 Security Features

### Authentication & Authorization

- JWT-based authentication
- Role-based access control
- Organization-level permissions

### Input Validation

- Request validation and sanitization
- File type and size validation
- SQL injection prevention

### Rate Limiting

- Configurable rate limiting
- IP-based request throttling
- Abuse prevention

## 📝 Logging & Monitoring

### Logging

- Winston-based structured logging
- Multiple log levels and transports
- File and console logging
- Log rotation and management

### Health Checks

- Database connectivity monitoring
- Redis health checks
- Service status endpoints

## 🧪 Testing

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Test Structure

- Unit tests for models and services
- Integration tests for API endpoints
- Database testing with test fixtures

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t document-manager .

# Run container
docker run -p 3001:3001 document-manager
```

### Production Considerations

- Environment variable configuration
- Database connection pooling
- Redis clustering
- Load balancing
- SSL/TLS termination
- Monitoring and alerting

## 🔄 Development Workflow

### Code Quality

- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Pre-commit hooks

### API Documentation

- OpenAPI/Swagger specification
- Interactive API documentation
- Request/response examples

## 📋 TODO & Roadmap

### Completed ✅

- Core database models and schema
- Document upload and processing
- Folder management system
- User and organization management
- Complete API structure with controllers and routes
- Authentication middleware
- Logging and error handling
- Configuration management
- File upload middleware
- Error handling middleware
- Docker configuration
- TypeScript configuration
- Webhook delivery implementation
- Background job processing

### In Progress 🚧

- Integration testing
- Performance optimization

### Planned 📅

- Advanced search capabilities
- Real-time collaboration features
- Mobile API optimization
- Advanced analytics dashboard
- Multi-language support
- Advanced security features

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comprehensive error handling
- Include JSDoc comments for public APIs
- Write unit tests for new features

## 📞 Support

### Getting Help

- Check the troubleshooting guide
- Review API documentation
- Search existing issues
- Create a new issue with detailed information

### Contact

- Development team: [team-email]
- Documentation: [docs-url]
- Community: [community-url]

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the AI Resume Suite Team**
