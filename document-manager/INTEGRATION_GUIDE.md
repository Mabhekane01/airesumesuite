# Document Manager Service - Integration Guide

A comprehensive guide for integrating the Document Manager Service with your existing AI Resume Suite and external systems.

## 🎯 Overview

The Document Manager Service is designed to work seamlessly with your existing AI Resume Suite backend and integrate with the Document Sharing Service to create a powerful, production-ready document management solution that rivals Papermark.

## 🏗️ Architecture Integration

### Service Relationships

```
AI Resume Suite Backend
├── Document Manager Service (Port 3001)
│   ├── Manages document uploads and organization
│   ├── Integrates with existing Resume/CoverLetter models
│   └── Provides document management APIs
│
└── Document Sharing Service (Port 4000)
    ├── Handles document sharing and analytics
    ├── Provides public viewing interfaces
    └── Manages sharing permissions and tracking
```

### Data Flow

1. **Document Creation**: User uploads document through AI Resume Suite
2. **Processing**: Document Manager processes and stores the file
3. **Sharing**: Document can be shared via Document Sharing Service
4. **Analytics**: View tracking and analytics are collected
5. **Integration**: Data flows back to AI Resume Suite for reporting

## 🔗 API Integration

### Base URLs

- **Document Manager**: `http://localhost:3001`
- **Document Sharing**: `http://localhost:4000`

### Authentication

Both services use JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## 📚 Document Manager Service APIs

### Document Management

#### Upload Document

```bash
POST /api/documents
Content-Type: multipart/form-data

# Form data
file: <file>
title: "My Resume"
description: "Software Engineer Resume"
folderId: "optional-folder-id"
organizationId: "optional-org-id"
source: "upload"
sourceMetadata: {}
```

#### Get User Documents

```bash
GET /api/documents?page=1&limit=20&category=resume
```

#### Update Document

```bash
PUT /api/documents/{id}
{
  "title": "Updated Resume Title",
  "description": "Updated description"
}
```

#### Delete Document

```bash
DELETE /api/documents/{id}
```

### Folder Management

#### Create Folder

```bash
POST /api/folders
{
  "name": "Job Applications",
  "description": "Resumes for job applications",
  "color": "#3B82F6",
  "parentFolderId": "optional-parent-id"
}
```

#### Get Folder Tree

```bash
GET /api/folders/tree
```

#### Update Folder

```bash
PUT /api/folders/{id}
{
  "name": "Updated Folder Name",
  "color": "#EF4444"
}
```

### Integration APIs

#### Link with Document Sharing Service

```bash
POST /api/links
{
  "documentId": "document-uuid",
  "title": "Public Resume",
  "description": "Share this resume with potential employers",
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "settings": {
    "allowDownload": true,
    "allowPrint": false,
    "trackViews": true,
    "notifyOnView": true
  }
}
```

#### Get Integration Status

```bash
GET /api/integration/status
```

## 🔗 Document Sharing Service APIs

### Document Sharing

#### Create Share

```bash
POST /api/shares
{
  "documentId": "document-uuid",
  "title": "My Resume",
  "description": "Software Engineer Resume",
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "settings": {
    "allowDownload": true,
    "allowPrint": false,
    "watermark": "Confidential",
    "trackViews": true,
    "notifyOnView": true,
    "accessList": ["employer@company.com"]
  }
}
```

#### Access Shared Document

```bash
# Public access
GET /view/{shareId}

# Password protected
POST /view/{shareId}
{
  "password": "password"
}
```

### Analytics

#### Get Document Analytics

```bash
GET /api/analytics/documents/{documentId}
```

#### Get Share Analytics

```bash
GET /api/analytics/shares/{shareId}
```

#### Get Organization Analytics

```bash
GET /api/analytics/organization
```

## 🔄 Integration Examples

### 1. Resume Upload and Sharing Flow

```typescript
// 1. Upload resume to Document Manager
const uploadResponse = await fetch("http://localhost:3001/api/documents", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const document = await uploadResponse.json();

// 2. Create share link via Document Sharing Service
const shareResponse = await fetch("http://localhost:4000/api/shares", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    documentId: document.data.id,
    title: "My Resume",
    settings: {
      allowDownload: true,
      trackViews: true,
    },
  }),
});

const share = await shareResponse.json();
console.log("Share URL:", share.data.shareUrl);
```

### 2. Analytics Integration

```typescript
// Get analytics for a shared document
const analyticsResponse = await fetch(
  `http://localhost:4000/api/analytics/shares/${shareId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const analytics = await analyticsResponse.json();

// Update AI Resume Suite with analytics
await updateResumeAnalytics(resumeId, {
  totalViews: analytics.data.totalViews,
  uniqueViews: analytics.data.uniqueViews,
  lastViewed: analytics.data.lastViewed,
});
```

### 3. Folder Organization

```typescript
// Create folder structure
const folderResponse = await fetch("http://localhost:3001/api/folders", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Job Applications 2024",
    description: "Resumes for 2024 job applications",
    color: "#10B981",
  }),
});

const folder = await folderResponse.json();

// Move documents to folder
await fetch(`http://localhost:3001/api/documents/${documentId}`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    folderId: folder.data.id,
  }),
});
```

## 🔐 Authentication Integration

### JWT Token Management

```typescript
// Get token from AI Resume Suite
const token = getAuthToken();

// Validate token with Document Manager
const validateResponse = await fetch(
  "http://localhost:3001/api/auth/validate",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

if (validateResponse.ok) {
  // Token is valid, proceed with operations
  const userData = await validateResponse.json();
  console.log("Authenticated user:", userData);
}
```

### User Synchronization

```typescript
// Sync user data between services
const syncUserResponse = await fetch(
  "http://localhost:3001/api/integration/sync-user",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
    }),
  }
);
```

## 📊 Data Synchronization

### Document Status Updates

```typescript
// Listen for document processing status updates
const eventSource = new EventSource(
  "http://localhost:3001/api/events/documents"
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "document_processed") {
    // Update AI Resume Suite with processing results
    updateDocumentStatus(data.documentId, {
      status: "ready",
      thumbnailUrl: data.thumbnailUrl,
      pageCount: data.pageCount,
    });
  }
};
```

### Real-time Analytics

```typescript
// Subscribe to real-time analytics updates
const socket = io("http://localhost:4000");

socket.emit("join-document", documentId);

socket.on("real-time-view", (data) => {
  // Update UI with real-time view data
  updateViewCounter(data.totalViews);
  updateLastViewed(data.timestamp);
});
```

## 🚀 Production Deployment

### Environment Configuration

```bash
# Document Manager Service
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-jwt-secret
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Document Sharing Service
NODE_ENV=production
PORT=4000
JWT_SECRET=your-production-jwt-secret
DB_HOST=host
DB_PASSWORD=password
REDIS_HOST=host
```

### Docker Compose

```yaml
version: "3.8"
services:
  document-manager:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  document-sharing:
    build: ./document-sharing-service
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: document_sharing
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
```

## 🔍 Monitoring and Health Checks

### Health Endpoints

```bash
# Document Manager Health
GET http://localhost:3001/health

# Document Sharing Health
GET http://localhost:4000/health

# Database Health
GET http://localhost:4000/health/db

# Redis Health
GET http://localhost:4000/health/redis
```

### Logging Integration

```typescript
// Configure logging to central system
import { logger } from "@document-sharing/core";

logger.info("Document processed", {
  documentId,
  userId,
  processingTime: Date.now() - startTime,
});
```

## 🧪 Testing Integration

### Integration Tests

```typescript
describe("Document Manager Integration", () => {
  it("should upload and share document", async () => {
    // 1. Upload document
    const document = await uploadDocument(testFile);

    // 2. Create share
    const share = await createShare(document.id);

    // 3. Verify share is accessible
    const accessResult = await accessSharedDocument(share.shareId);

    expect(accessResult.success).toBe(true);
  });
});
```

### Mock Services

```typescript
// Mock Document Manager Service
const mockDocumentManager = {
  uploadDocument: jest.fn(),
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
};

// Mock Document Sharing Service
const mockDocumentSharing = {
  createShare: jest.fn(),
  getShare: jest.fn(),
  getAnalytics: jest.fn(),
};
```

## 🚨 Error Handling

### Service Unavailable

```typescript
try {
  const response = await fetch("http://localhost:3001/api/documents");
  // Handle response
} catch (error) {
  if (error.code === "ECONNREFUSED") {
    // Document Manager Service is down
    console.error("Document Manager Service unavailable");
    // Fallback to local storage or show error message
  }
}
```

### Retry Logic

```typescript
const retryOperation = async (operation: Function, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }
};
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// Cache frequently accessed documents
const getDocumentWithCache = async (id: string) => {
  const cacheKey = `document:${id}`;
  let document = await redis.get(cacheKey);

  if (!document) {
    document = await documentService.getDocument(id);
    await redis.setex(cacheKey, 300, JSON.stringify(document)); // 5 min cache
  }

  return document;
};
```

### Batch Operations

```typescript
// Batch document operations
const batchUpdateDocuments = async (
  updates: Array<{ id: string; data: any }>
) => {
  const promises = updates.map(({ id, data }) =>
    fetch(`http://localhost:3001/api/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  );

  return Promise.all(promises);
};
```

## 🔐 Security Considerations

### API Key Management

```typescript
// Validate API keys for webhook endpoints
const validateWebhookKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || !allowedKeys.includes(apiKey)) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
};
```

### Rate Limiting

```typescript
// Implement rate limiting for integration endpoints
const rateLimit = require("express-rate-limit");

const integrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many integration requests",
});

app.use("/api/integration", integrationLimiter);
```

## 📚 Additional Resources

- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [Performance Tuning](./docs/performance.md)

## 🆘 Support

For integration support:

- Create an issue in the repository
- Check the troubleshooting guide
- Review the API documentation
- Contact the development team

---

**Happy Integrating! 🚀**
