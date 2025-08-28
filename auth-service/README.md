# AI Job Suite - Authentication & Authorization Service

A centralized authentication and authorization service that handles user authentication, subscription management, and access control for all AI Job Suite services.

## 🎯 Purpose

This service focuses **exclusively** on:

- **Authentication**: User login, registration, token management
- **Authorization**: Subscription-based access control, permissions, usage limits
- **Service Integration**: APIs for other services to validate tokens and check permissions

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Resume     │    │ Document Manager│    │Document Sharing │
│   Service       │    │   Service       │    │   Service       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   Auth Service            │
                    │   (This Service)         │
                    │                           │
                    │ • User Authentication    │
                    │ • Subscription Management│
                    │ • Permission Checking    │
                    │ • Usage Tracking         │
                    └───────────────────────────┘
```

## 🚀 Quick Start

### 1. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_job_suite_auth
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Service Integration
INTERNAL_SERVICE_KEY=your-internal-service-key-for-inter-service-communication

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3003
```

### 2. Database Setup

```bash
# Run the schema
psql -d ai_job_suite_auth -f database/schema.sql
```

### 3. Start Service

```bash
pnpm install
pnpm dev
```

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint    | Description          |
| ------ | ----------- | -------------------- |
| POST   | `/register` | User registration    |
| POST   | `/login`    | User login           |
| POST   | `/refresh`  | Refresh access token |
| POST   | `/logout`   | User logout          |
| GET    | `/profile`  | Get user profile     |

### Authorization (`/api/v1/authorization`)

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| GET    | `/subscription`        | Get current subscription   |
| GET    | `/plans`               | Get available plans        |
| POST   | `/subscription`        | Create/update subscription |
| POST   | `/subscription/cancel` | Cancel subscription        |
| POST   | `/permissions/check`   | Check specific permission  |
| GET    | `/permissions/summary` | Get permissions summary    |
| POST   | `/usage/track`         | Track resource usage       |
| GET    | `/usage/current`       | Get current month usage    |

### Service Integration (`/api/v1/services`)

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| POST   | `/validate-token`           | Validate JWT token    |
| POST   | `/check-permission`         | Check user permission |
| GET    | `/user-permissions/:userId` | Get user permissions  |
| POST   | `/track-usage`              | Track resource usage  |
| GET    | `/user-usage/:userId`       | Get user usage        |
| POST   | `/bulk-permissions`         | Bulk permission check |

## 🏢 Organization Management

The auth service supports multi-tenant organizations with role-based access control:

### Organization Features

- **Multi-tenant support** for teams and companies
- **Role-based access control** (admin, user, viewer)
- **Domain-based organization detection** for seamless onboarding
- **User limits** per organization based on subscription plans
- **Organization settings** for customization

### Organization Endpoints

| Method | Endpoint                                | Description                   |
| ------ | --------------------------------------- | ----------------------------- |
| POST   | `/organizations`                        | Create new organization       |
| GET    | `/organizations/:id`                    | Get organization details      |
| PUT    | `/organizations/:id`                    | Update organization           |
| POST   | `/organizations/:id/users`              | Add user to organization      |
| GET    | `/organizations/:id/users`              | Get organization users        |
| DELETE | `/organizations/:id/users/:userId`      | Remove user from organization |
| PATCH  | `/organizations/:id/users/:userId/role` | Update user role              |

## 🔐 Service Integration Guide

### For Other Services (AI Resume, Document Manager, Document Sharing)

#### 1. Token Validation

```typescript
// Validate user token before processing requests
const validateToken = async (token: string) => {
  const response = await fetch(
    "http://localhost:3001/api/v1/services/validate-token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
        "X-Service-Name": "document-manager",
      },
      body: JSON.stringify({ token }),
    }
  );

  if (!response.ok) {
    throw new Error("Invalid token");
  }

  return response.json();
};
```

#### 2. Permission Checking

```typescript
// Check if user can perform specific action
const checkPermission = async (
  userId: string,
  resource: string,
  action: string
) => {
  const response = await fetch(
    "http://localhost:3001/api/v1/services/check-permission",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
        "X-Service-Name": "document-manager",
      },
      body: JSON.stringify({ userId, resource, action }),
    }
  );

  const result = await response.json();
  return result.data.canProceed;
};

// Usage example
if (await checkPermission(userId, "document_upload", "create")) {
  // Allow document upload
  await uploadDocument();
} else {
  throw new Error("Insufficient permissions or usage limit exceeded");
}
```

#### 3. Usage Tracking

```typescript
// Track resource usage for billing and limits
const trackUsage = async (
  userId: string,
  resource: string,
  action: string,
  metadata = {}
) => {
  await fetch("http://localhost:3001/api/v1/services/track-usage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
      "X-Service-Name": "document-manager",
    },
    body: JSON.stringify({ userId, resource, action, metadata }),
  });
};

// Usage example
await trackUsage(userId, "document_upload", "create", {
  fileSize: fileSize,
  fileType: fileType,
  documentId: documentId,
});
```

## 🎭 Subscription Plans & Features

### Free Tier

- Resume generation: 3/month
- Document management: 5 documents
- Storage: 100MB
- Basic templates

### Pro ($19.99/month)

- Resume generation: 50/month
- Document management: 100 documents
- Storage: 2GB
- AI suggestions: 200/month
- Advanced templates
- Analytics

### Enterprise ($49.99/month)

- Unlimited usage
- Storage: 10GB
- Team management
- API access
- Custom features

## 🔒 Security Features

- **JWT-based authentication** with short-lived access tokens
- **Refresh token rotation** for security
- **Service-to-service authentication** using internal service keys
- **Rate limiting** to prevent abuse
- **Audit logging** of all security events
- **CORS protection** for cross-origin requests

## 📊 Usage Tracking

The service tracks usage for:

- Resume generation
- Document operations
- AI suggestions
- Storage usage
- API calls

Usage is reset monthly and used for:

- Enforcing subscription limits
- Billing calculations
- Feature access control
- Analytics and insights

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE_FOR_CLIENTS",
  "details": {} // Additional context when available
}
```

Common error codes:

- `AUTH_REQUIRED`: Authentication needed
- `SUBSCRIPTION_REQUIRED`: Active subscription needed
- `FEATURE_NOT_AVAILABLE`: Feature not in current plan
- `USAGE_LIMIT_EXCEEDED`: Monthly limit reached
- `TOKEN_EXPIRED`: JWT token has expired

## 🔧 Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Local Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev

# Run tests
pnpm test
```

### Database Migrations

```bash
# Create new migration
pnpm migration:create -- --name add_new_feature

# Run migrations
pnpm db:migrate

# Rollback migrations
pnpm db:rollback
```

## 📈 Monitoring & Health Checks

- **Health endpoint**: `/health`
- **Database health**: `/health/db`
- **Redis health**: `/health/redis`

All endpoints return service status and connection information.

## 🔄 Integration Checklist for Other Services

- [ ] Remove existing auth logic
- [ ] Add auth service client library
- [ ] Implement token validation middleware
- [ ] Add permission checking before protected operations
- [ ] Implement usage tracking for billing
- [ ] Update error handling for auth-related errors
- [ ] Test with different subscription tiers
- [ ] Monitor auth service health

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
