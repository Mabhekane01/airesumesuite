# Enhanced Document Management System

A superior document management and sharing service that goes beyond Papermark with advanced analytics, AI-powered insights, and enterprise-grade features.

## 🚀 Features

### Core Document Management

- **Document Upload & Storage**: Support for multiple file formats (PDF, DOC, PPT, etc.)
- **Folder Organization**: Hierarchical folder structure with drag-and-drop support
- **Version Control**: Track document versions and changes
- **Search & Discovery**: Full-text search across documents and content

### Advanced Document Sharing

- **Shareable Links**: Create branded, customizable sharing links
- **Data Rooms**: Secure virtual data rooms for sensitive document sharing
- **Access Control**: Password protection, IP restrictions, country restrictions
- **Branding**: Custom domains, logos, colors, and watermarks
- **QR Code Generation**: Mobile-friendly document access

### Comprehensive Analytics

- **Real-time Tracking**: Live viewer count, session duration, engagement metrics
- **Page-level Analytics**: Scroll depth, time spent, interactions, bounce rate
- **Visitor Demographics**: Geographic location, devices, browsers, operating systems
- **Traffic Sources**: UTM tracking, referrer analysis, conversion rates
- **Predictive Insights**: AI-powered engagement predictions and trends
- **Heatmaps**: Visual representation of user interactions

### Enterprise Features

- **Webhooks**: Event-driven integrations and notifications
- **API Access**: RESTful API with comprehensive endpoints
- **Multi-tenant Support**: Organization and user management
- **Audit Logs**: Complete activity tracking and compliance
- **Export & Reporting**: Data export in multiple formats

## 🏗️ Architecture

### Backend Services

- **Document Manager**: Core document operations and storage
- **Enhanced Sharing Service**: Advanced sharing and analytics
- **Analytics Engine**: Real-time data processing and insights
- **Notification Service**: Webhooks and event notifications
- **File Processor**: Document conversion and processing
- **API Gateway**: Unified API access and rate limiting

### Database Schema

- **PostgreSQL**: Robust relational database with JSONB support
- **UUID Primary Keys**: Secure, globally unique identifiers
- **Optimized Indexes**: Fast query performance for analytics
- **Real-time Updates**: Triggers for automatic timestamp updates

### Frontend Components

- **React-based UI**: Modern, responsive interface
- **Framer Motion**: Smooth animations and transitions
- **Real-time Updates**: Live data synchronization
- **Mobile-First Design**: Optimized for all devices

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for caching and sessions)
- Docker (optional)

### Backend Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd document-manager
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment configuration**

```bash
cp .env.example .env
# Edit .env with your database and service credentials
```

4. **Database setup**

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

5. **Start the service**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Frontend Setup

1. **Navigate to frontend directory**

```bash
cd apps/frontend
```

2. **Install dependencies**

```bash
npm install
```

3. **Start development server**

```bash
npm run dev
```

## 📊 API Endpoints

### Document Management

```
POST   /api/documents              # Upload document
GET    /api/documents              # List documents
GET    /api/documents/:id          # Get document
PUT    /api/documents/:id          # Update document
DELETE /api/documents/:id          # Delete document
```

### Enhanced Sharing

```
POST   /api/sharing/links          # Create shareable link
GET    /api/sharing/links          # List user's links
GET    /api/sharing/view/:slug     # Get link by slug
PUT    /api/sharing/links/:id      # Update link
DELETE /api/sharing/links/:id      # Delete link

POST   /api/sharing/datarooms      # Create data room
GET    /api/sharing/datarooms      # List data rooms
POST   /api/sharing/datarooms/:id/documents  # Add document to room
```

### Analytics

```
GET    /api/analytics/documents/:id    # Document analytics
GET    /api/analytics/realtime/:id     # Real-time analytics
GET    /api/analytics/predictive/:id   # Predictive insights
GET    /api/analytics/heatmap/:id/:page # Heatmap data
GET    /api/analytics/export           # Export analytics data
```

### Public Endpoints (No Auth Required)

```
POST   /api/sharing/view/:linkId/record      # Record document view
POST   /api/sharing/page/:viewId/record      # Record page view
POST   /api/sharing/download/record          # Record download
```

## 🔐 Authentication & Security

### JWT Authentication

- Secure token-based authentication
- Configurable token expiration
- Refresh token support

### Access Control

- User-based permissions
- Organization-level access control
- IP and country restrictions
- Password-protected links

### Data Protection

- Encrypted data transmission (HTTPS)
- Secure file storage
- Audit logging for compliance
- GDPR-compliant data handling

## 📈 Analytics & Insights

### Real-time Metrics

- Current active viewers
- Session duration tracking
- Page engagement rates
- Download conversion rates

### Advanced Analytics

- **Engagement Scoring**: AI-powered engagement calculation
- **Predictive Trends**: Future performance forecasting
- **Behavioral Analysis**: User interaction patterns
- **Geographic Insights**: Location-based analytics
- **Device Performance**: Cross-platform optimization

### Custom Dashboards

- Configurable metric displays
- Date range filtering
- Comparative analysis
- Export capabilities

## 🎨 Customization & Branding

### Brand Customization

- Custom domain support
- Brand logo integration
- Color scheme customization
- Watermark options

### Link Personalization

- Custom link names and descriptions
- Expiration dates
- View limits
- Access restrictions

## 🔌 Integrations & Webhooks

### Webhook Events

- Document viewed
- Page interaction
- Download completed
- Link accessed
- Visitor information captured

### Third-party Integrations

- CRM systems (Salesforce, HubSpot)
- Marketing platforms (Mailchimp, ConvertKit)
- Analytics tools (Google Analytics, Mixpanel)
- Storage providers (AWS S3, Google Cloud)

## 🚀 Performance & Scalability

### Optimization Features

- Database query optimization
- Caching strategies
- CDN integration
- Load balancing support

### Monitoring

- Real-time performance metrics
- Error tracking and alerting
- Usage analytics
- Health checks

## 📱 Mobile & Accessibility

### Mobile Optimization

- Responsive design
- Touch-friendly interface
- Progressive Web App support
- Offline capabilities

### Accessibility

- WCAG 2.1 compliance
- Screen reader support
- Keyboard navigation
- High contrast modes

## 🧪 Testing

### Test Coverage

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📚 Usage Examples

### Creating a Shareable Link

```typescript
const linkData = {
  documentId: "doc-123",
  name: "Q4 Financial Report",
  description: "Quarterly financial performance overview",
  password: "secure123",
  expiresAt: "2024-12-31",
  maxViews: 100,
  allowDownload: true,
  brandName: "Acme Corp",
  brandColors: {
    primary: "#2563eb",
    secondary: "#1e40af",
  },
};

const link = await sharingService.createShareableLink(userId, linkData);
```

### Getting Document Analytics

```typescript
const analytics = await analyticsService.getDocumentAnalytics("doc-123", {
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  countries: ["US", "CA", "UK"],
});

console.log(`Total views: ${analytics.totalViews}`);
console.log(`Engagement score: ${analytics.engagementScore}%`);
```

### Setting up Webhooks

```typescript
const webhookConfig = {
  linkId: "link-123",
  webhookUrl: "https://your-app.com/webhooks",
  events: ["view", "download", "email_capture"],
  secret: "webhook-secret-key",
};

await sharingService.setupWebhook(userId, webhookConfig);
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dms
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# File Storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Analytics
ANALYTICS_ENABLED=true
TRACKING_DOMAIN=your-domain.com
```

### Feature Flags

```typescript
const config = {
  features: {
    analytics: true,
    webhooks: true,
    customDomains: true,
    dataRooms: true,
    predictiveInsights: true,
  },
};
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Verify PostgreSQL is running
   - Check connection string format
   - Ensure database exists and user has permissions

2. **File Upload Failures**

   - Check file size limits
   - Verify supported file types
   - Ensure storage service credentials are correct

3. **Analytics Not Recording**
   - Verify tracking is enabled
   - Check browser console for errors
   - Ensure API endpoints are accessible

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Check service health
curl http://localhost:3000/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.example.com](https://docs.example.com)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@example.com

## 🔮 Roadmap

### Upcoming Features

- **AI Content Analysis**: Automatic document summarization and insights
- **Advanced Security**: End-to-end encryption, digital signatures
- **Collaboration Tools**: Real-time commenting and annotation
- **Advanced Workflows**: Approval processes and document routing
- **Mobile Apps**: Native iOS and Android applications

### Long-term Vision

- **Enterprise Integration**: SSO, LDAP, Active Directory
- **Advanced AI**: Content recommendations, automated tagging
- **Global CDN**: Multi-region document delivery
- **Compliance Tools**: HIPAA, SOC2, GDPR compliance features

---

Built with ❤️ for modern document management needs.
