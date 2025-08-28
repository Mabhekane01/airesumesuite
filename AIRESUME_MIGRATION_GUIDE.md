# 🚀 AI Resume Migration Guide to Auth Service

## 📋 **Overview**

This guide outlines the complete migration process for **airesume** to use the centralized **auth-service** instead of its own user management system. The auth-service now provides Redis-based OTP, session management, and rate limiting for scalable microservices architecture.

## 🎯 **Migration Goals**

1. **Remove user management** from airesume
2. **Integrate with auth-service** for authentication
3. **Update subscription structure** to Free/Pro/Enterprise (resume-focused)
4. **Implement Redis-based** OTP and session management
5. **Maintain existing functionality** while improving scalability

## 🔄 **What's Changing**

### **Before (Current Airesume)**

- ❌ Own user database and authentication
- ❌ Basic subscription (Free/Enterprise)
- ❌ Database-based OTP and sessions
- ❌ Limited scalability

### **After (With Auth Service)**

- ✅ Centralized user management via auth-service
- ✅ Redis-based OTP (15 min expiry, rate limited)
- ✅ Redis-based sessions (24 hour expiry, 5 concurrent)
- ✅ Redis-based rate limiting (user-friendly limits)
- ✅ Free/Pro/Enterprise subscription plans
- ✅ Scalable microservices architecture

## 🗄️ **Database Changes**

### **Remove from Airesume Database**

```sql
-- Remove these tables (handled by auth-service)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS verification_codes;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS user_subscriptions;
```

### **Keep in Airesume Database**

```sql
-- Keep business logic tables
resumes
resume_templates
cover_letters
job_applications
career_coaching_sessions
user_preferences
-- etc.
```

## 🔐 **Authentication Flow Changes**

### **Current Flow (To Remove)**

```
User Input → Airesume Auth → Airesume Database → Response
```

### **New Flow (To Implement)**

```
User Input → Airesume → Auth Service → Redis + PostgreSQL → Response
```

## 📱 **API Integration Changes**

### **1. Update Environment Variables**

```bash
# Add to .env
AUTH_SERVICE_URL=http://localhost:3001
AUTH_SERVICE_KEY=your_service_key
AUTH_SERVICE_NAME=ai-resume
```

### **2. Install Auth Client**

```bash
pnpm add @ai-job-suite/auth-client
# or copy authClient.ts from auth-service
```

### **3. Update Authentication Endpoints**

#### **Login**

```typescript
// Before: Direct database query
const user = await db.users.findByEmail(email);

// After: Auth service call
const authClient = createAuthClient({
  baseUrl: process.env.AUTH_SERVICE_URL,
  serviceKey: process.env.AUTH_SERVICE_KEY,
  serviceName: "ai-resume",
});

const { user, subscription } = await authClient.validateToken(token);
```

#### **Registration**

```typescript
// Before: Create user in local database
const user = await db.users.create(userData);

// After: Auth service handles registration
const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(userData),
});
```

#### **OTP Verification**

```typescript
// Before: Check local verification codes
const code = await db.verification_codes.findByEmail(email);

// After: Auth service handles OTP
const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/verify-otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, otp }),
});
```

### **4. Update Middleware**

#### **Authentication Middleware**

```typescript
// Before: Local JWT verification
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  // Local verification logic
};

// After: Auth service validation
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;
  try {
    const { user, subscription } = await authClient.validateToken(token);
    req.user = user;
    req.subscription = subscription;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
```

#### **Subscription Middleware**

```typescript
// Before: Local subscription check
const requireSubscription = (req, res, next) => {
  if (req.user.tier === "free") {
    return res.status(403).json({ error: "Pro subscription required" });
  }
  next();
};

// After: Auth service permission check
const requirePermission = async (req, res, next) => {
  try {
    const permission = await authClient.checkPermission(
      req.user.id,
      "resume_generation",
      "create"
    );

    if (!permission.canProceed) {
      return res.status(403).json({
        error: "Permission denied",
        reason: permission.reason,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Permission check failed" });
  }
};
```

## 💳 **Subscription Plan Updates**

### **New Plan Structure**

```typescript
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: {
      resume_generation: 3,
      cover_letter_generation: 2,
      job_applications: 10,
      ai_suggestions: 5,
    },
  },
  PRO: {
    name: "Pro",
    price: 19.99,
    features: {
      resume_generation: 50,
      cover_letter_generation: 25,
      job_applications: 100,
      ai_suggestions: 100,
      career_coaching_sessions: 20,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 49.99,
    features: {
      resume_generation: -1, // Unlimited
      cover_letter_generation: -1,
      job_applications: -1,
      ai_suggestions: -1,
      career_coaching_sessions: -1,
    },
  },
};
```

### **Update Subscription Checks**

```typescript
// Before: Simple tier check
if (user.tier === "free" && action === "export_pdf") {
  return res.status(403).json({ error: "Enterprise required" });
}

// After: Permission-based check
const permission = await authClient.checkPermission(
  user.id,
  "resume_generation",
  "export_pdf"
);

if (!permission.canProceed) {
  return res.status(403).json({
    error: "Permission denied",
    reason: permission.reason,
    upgradeRequired: true,
  });
}
```

## 🔄 **Session Management Changes**

### **Remove Local Session Storage**

```typescript
// Remove these from airesume
- Local session tokens
- Local refresh tokens
- Local session database
```

### **Use Auth Service Sessions**

```typescript
// Sessions are now managed by auth-service
// No local session management needed
// Auth service handles:
// - Session creation
// - Session refresh
// - Session cleanup
// - Concurrent session limits
```

## 📊 **Rate Limiting Changes**

### **Remove Local Rate Limiting**

```typescript
// Remove local rate limiting middleware
// Auth service provides Redis-based rate limiting
```

### **Auth Service Rate Limits**

```typescript
// Global: 1000 requests per 15 minutes
// Auth endpoints: 10 requests per 15 minutes
// User actions: 50 requests per 2 minutes
// File uploads: 20 requests per 2 minutes
```

## 🚀 **Implementation Steps**

### **Phase 1: Setup (Week 1)**

1. ✅ **Install auth-service** dependencies
2. ✅ **Update environment variables**
3. ✅ **Copy auth client library**
4. ✅ **Test auth service connection**

### **Phase 2: Authentication (Week 2)**

1. ✅ **Update login/registration** endpoints
2. ✅ **Implement OTP verification**
3. ✅ **Update authentication middleware**
4. ✅ **Test authentication flow**

### **Phase 3: Authorization (Week 3)**

1. ✅ **Update subscription checks**
2. ✅ **Implement permission middleware**
3. ✅ **Update feature gates**
4. ✅ **Test authorization flow**

### **Phase 4: Cleanup (Week 4)**

1. ✅ **Remove local user tables**
2. ✅ **Remove local auth code**
3. ✅ **Update documentation**
4. ✅ **Performance testing**

## 🧪 **Testing Checklist**

### **Authentication Tests**

- [ ] User registration
- [ ] User login
- [ ] OTP verification
- [ ] Password reset
- [ ] Token refresh
- [ ] Logout

### **Authorization Tests**

- [ ] Free user restrictions
- [ ] Pro user features
- [ ] Enterprise user features
- [ ] Permission denied responses
- [ ] Upgrade prompts

### **Integration Tests**

- [ ] Resume creation limits
- [ ] Cover letter generation limits
- [ ] Export format restrictions
- [ ] AI feature access
- [ ] Career coaching limits

## 🚨 **Rollback Plan**

### **If Issues Arise**

1. **Keep local auth code** during migration
2. **Feature flag** new auth system
3. **Gradual rollout** to users
4. **Quick revert** to local auth if needed

### **Rollback Commands**

```bash
# Revert to local authentication
git checkout main -- src/auth/
git checkout main -- src/middleware/auth.ts
git checkout main -- src/middleware/subscription.ts

# Restart with local auth
pnpm run dev
```

## 📈 **Benefits After Migration**

### **Scalability**

- ✅ **Horizontal scaling** of auth-service
- ✅ **Redis-based** session management
- ✅ **Distributed rate limiting**
- ✅ **Load balancing** support

### **Security**

- ✅ **Centralized security** policies
- ✅ **Consistent authentication** across services
- ✅ **Advanced rate limiting** and abuse prevention
- ✅ **Audit logging** and monitoring

### **Maintenance**

- ✅ **Single codebase** for auth logic
- ✅ **Easier updates** and security patches
- ✅ **Consistent user experience** across services
- ✅ **Reduced duplication** and bugs

## 🔗 **Useful Links**

- **Auth Service API**: `/api/v1/services/*`
- **Auth Service Docs**: `auth-service/README.md`
- **Client Library**: `auth-service/src/lib/authClient.ts`
- **Migration Scripts**: `auth-service/scripts/migrate-*.sh`

## 📞 **Support**

For migration support:

1. **Check auth-service logs** for errors
2. **Verify Redis connection** and health
3. **Test auth endpoints** individually
4. **Review permission checks** and responses

---

**🎯 Goal**: Complete migration within 4 weeks with zero downtime and improved user experience.
