# AI Job Suite Auth Service Integration Guide

This guide explains how to integrate your service (AI Resume, Document Manager, Document Sharing) with the centralized Authentication & Authorization Service.

## 🎯 Why Centralized Auth?

**Before**: Each service had its own auth logic, leading to:

- Duplicate code and maintenance overhead
- Inconsistent user experience
- Security vulnerabilities
- Difficult subscription management

**After**: Single source of truth for:

- User authentication
- Subscription management
- Permission checking
- Usage tracking and billing

## 🚀 Quick Integration

### 1. Install the Auth Client Library

```bash
pnpm add @ai-job-suite/auth-client
# or copy the authClient.ts file to your project
```

### 2. Initialize the Client

```typescript
import { createAuthClient, PERMISSIONS } from "./authClient";

const authClient = createAuthClient({
  baseUrl: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  serviceKey: process.env.INTERNAL_SERVICE_KEY,
  serviceName: "document-manager", // or 'ai-resume', 'document-sharing'
  timeout: 5000,
});
```

### 3. Replace Existing Auth Logic

**Before (old way)**:

```typescript
// Old auth middleware
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
```

**After (new way)**:

```typescript
// New auth middleware using centralized service
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authorization token required",
        code: "AUTH_REQUIRED",
      });
    }

    // Validate token with auth service
    const { user, subscription } = await authClient.validateToken(token);

    // Add user and subscription info to request
    req.user = user;
    req.subscription = subscription;

    next();
  } catch (error) {
    if (error.code === "TOKEN_EXPIRED") {
      return res.status(401).json({
        message: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
};
```

## 🔐 Permission Checking

### Check Before Allowing Actions

```typescript
// Before allowing document upload
export const uploadDocument = async (req, res) => {
  try {
    const { userId } = req.user;

    // Check if user can upload documents
    const permissionCheck = await authClient.checkPermission(
      userId,
      PERMISSIONS.RESOURCES.DOCUMENT_UPLOAD,
      PERMISSIONS.ACTIONS.CREATE
    );

    if (!permissionCheck.canProceed) {
      return res.status(403).json({
        message: "Insufficient permissions or usage limit exceeded",
        code: "PERMISSION_DENIED",
        reason: permissionCheck.reason,
      });
    }

    // Proceed with upload
    const document = await uploadDocumentToStorage(req.file);

    // Track usage for billing
    await authClient.trackUsage({
      userId,
      resource: PERMISSIONS.RESOURCES.DOCUMENT_UPLOAD,
      action: PERMISSIONS.ACTIONS.CREATE,
      metadata: {
        documentId: document.id,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      },
    });

    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
};
```

### Check Multiple Permissions

```typescript
// Check multiple permissions at once
export const bulkOperation = async (req, res) => {
  const { userId } = req.user;
  const { operations } = req.body;

  // Bulk permission check
  const permissionChecks = await authClient.bulkCheckPermissions(
    operations.map((op) => ({
      userId,
      resource: op.resource,
      action: op.action,
    }))
  );

  // Filter allowed operations
  const allowedOperations = operations.filter(
    (_, index) => permissionChecks[index].hasPermission
  );

  if (allowedOperations.length === 0) {
    return res.status(403).json({
      message: "No operations allowed",
      code: "NO_PERMISSIONS",
    });
  }

  // Process allowed operations
  const results = await processOperations(allowedOperations);

  // Track usage for each operation
  for (const operation of allowedOperations) {
    await authClient.trackUsage({
      userId,
      resource: operation.resource,
      action: operation.action,
    });
  }

  res.json({ success: true, results });
};
```

## 📊 Usage Tracking

### Track All Resource Usage

```typescript
// Track resume generation
export const generateResume = async (req, res) => {
  try {
    const { userId } = req.user;

    // Check permission
    const permissionCheck = await authClient.checkPermission(
      userId,
      PERMISSIONS.RESOURCES.RESUME_GENERATION,
      PERMISSIONS.ACTIONS.CREATE
    );

    if (!permissionCheck.canProceed) {
      return res.status(403).json({
        message: "Resume generation limit reached",
        code: "USAGE_LIMIT_EXCEEDED",
      });
    }

    // Generate resume
    const resume = await aiResumeGenerator.generate(req.body);

    // Track usage
    await authClient.trackUsage({
      userId,
      resource: PERMISSIONS.RESOURCES.RESUME_GENERATION,
      action: PERMISSIONS.ACTIONS.CREATE,
      metadata: {
        resumeId: resume.id,
        template: req.body.template,
        aiFeatures: req.body.aiFeatures,
      },
    });

    res.json({ success: true, resume });
  } catch (error) {
    res.status(500).json({ message: "Generation failed" });
  }
};
```

### Get Usage Statistics

```typescript
// Show user their current usage
export const getUsageStats = async (req, res) => {
  try {
    const { userId } = req.user;

    const usage = await authClient.getUserUsage(userId);
    const permissions = await authClient.getUserPermissions(userId);

    res.json({
      success: true,
      data: {
        usage,
        permissions,
        limits: permissions.limits,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get usage stats" });
  }
};
```

## 🛡️ Error Handling

### Handle Auth Service Errors Gracefully

```typescript
// Centralized error handler for auth-related errors
export const handleAuthError = (error) => {
  if (error.code === "AUTH_SERVICE_UNAVAILABLE") {
    // Auth service is down, allow limited functionality
    return {
      status: 503,
      message: "Authentication service temporarily unavailable",
      code: "AUTH_SERVICE_UNAVAILABLE",
    };
  }

  if (error.code === "TOKEN_EXPIRED") {
    return {
      status: 401,
      message: "Please log in again",
      code: "TOKEN_EXPIRED",
    };
  }

  if (error.code === "USAGE_LIMIT_EXCEEDED") {
    return {
      status: 429,
      message: "Monthly usage limit reached. Please upgrade your plan.",
      code: "USAGE_LIMIT_EXCEEDED",
    };
  }

  // Default error
  return {
    status: 500,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  };
};
```

### Fallback Strategy

```typescript
// Implement fallback when auth service is unavailable
export const authMiddlewareWithFallback = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    try {
      // Try centralized auth first
      const { user, subscription } = await authClient.validateToken(token);
      req.user = user;
      req.subscription = subscription;
      next();
    } catch (authError) {
      // Fallback to local JWT validation if auth service is down
      if (authError.code === "AUTH_SERVICE_UNAVAILABLE") {
        console.warn("Auth service unavailable, using fallback validation");

        try {
          const decoded = jwt.verify(token, process.env.FALLBACK_JWT_SECRET);
          req.user = decoded;
          req.subscription = { status: "unknown" }; // Limited info
          next();
        } catch (fallbackError) {
          return res.status(401).json({ message: "Invalid token" });
        }
      } else {
        throw authError;
      }
    }
  } catch (error) {
    const errorResponse = handleAuthError(error);
    res.status(errorResponse.status).json(errorResponse);
  }
};
```

## 🔄 Migration Strategy

### Phase 1: Add Auth Service Client

- Install/import auth client library
- Keep existing auth logic
- Add new centralized auth calls alongside existing ones

### Phase 2: Gradual Migration

- Migrate one endpoint at a time
- Test thoroughly with both auth methods
- Monitor for any issues

### Phase 3: Complete Migration

- Remove old auth logic
- Update all endpoints to use centralized auth
- Remove fallback JWT secrets

### Phase 4: Cleanup

- Remove old auth dependencies
- Clean up unused code
- Update documentation

## 📋 Integration Checklist

### Setup

- [ ] Install auth client library
- [ ] Configure environment variables
- [ ] Initialize auth client
- [ ] Test connection to auth service

### Authentication

- [ ] Replace JWT verification with auth service calls
- [ ] Update auth middleware
- [ ] Handle auth service errors gracefully
- [ ] Implement fallback strategy

### Authorization

- [ ] Add permission checks before protected operations
- [ ] Check usage limits
- [ ] Handle permission denied responses
- [ ] Update error messages

### Usage Tracking

- [ ] Track all resource usage
- [ ] Add usage metadata
- [ ] Handle tracking failures gracefully
- [ ] Monitor usage patterns

### Testing

- [ ] Test with different subscription tiers
- [ ] Test permission boundaries
- [ ] Test usage limits
- [ ] Test error scenarios
- [ ] Test fallback behavior

### Monitoring

- [ ] Monitor auth service health
- [ ] Track integration errors
- [ ] Monitor response times
- [ ] Set up alerts for failures

## 🚨 Common Issues & Solutions

### Issue: Auth Service Timeout

**Solution**: Increase timeout in client config, implement retry logic

### Issue: Permission Check Fails

**Solution**: Verify resource/action names match exactly, check subscription status

### Issue: Usage Not Tracked

**Solution**: Ensure tracking calls don't block main operations, implement async tracking

### Issue: Service Unavailable

**Solution**: Implement fallback validation, cache user permissions locally

## 📚 Examples by Service Type

### AI Resume Service

```typescript
// Check resume generation permission
const canGenerateResume = await authClient.checkPermission(
  userId,
  PERMISSIONS.RESOURCES.RESUME_GENERATION,
  PERMISSIONS.ACTIONS.CREATE
);

// Track AI suggestions usage
await authClient.trackUsage({
  userId,
  resource: PERMISSIONS.RESOURCES.AI_SUGGESTIONS,
  action: PERMISSIONS.ACTIONS.ACCESS,
});
```

### Document Manager Service

```typescript
// Check document upload permission
const canUpload = await authClient.checkPermission(
  userId,
  PERMISSIONS.RESOURCES.DOCUMENT_UPLOAD,
  PERMISSIONS.ACTIONS.CREATE
);

// Track storage usage
await authClient.trackUsage({
  userId,
  resource: PERMISSIONS.RESOURCES.STORAGE,
  action: PERMISSIONS.ACTIONS.ACCESS,
  quantity: fileSizeInMB,
});
```

### Document Sharing Service

```typescript
// Check sharing permission
const canShare = await authClient.checkPermission(
  userId,
  PERMISSIONS.RESOURCES.DOCUMENT_SHARING,
  PERMISSIONS.ACTIONS.SHARE
);

// Track sharing usage
await authClient.trackUsage({
  userId,
  resource: PERMISSIONS.RESOURCES.DOCUMENT_SHARING,
  action: PERMISSIONS.ACTIONS.SHARE,
  metadata: { documentId, shareType },
});
```

## 🎉 Benefits After Integration

- **Unified User Experience**: Single login across all services
- **Centralized Billing**: Easy subscription management
- **Better Security**: Consistent security policies
- **Reduced Maintenance**: No duplicate auth code
- **Scalability**: Easy to add new services
- **Analytics**: Comprehensive usage insights
- **Compliance**: Centralized audit logging

## 📞 Support

If you encounter issues during integration:

1. Check the auth service health endpoint
2. Verify environment variables
3. Check service key configuration
4. Review error logs
5. Create an issue in the repository

Remember: The goal is to make authentication and authorization seamless for your users while maintaining security and scalability for your services.
