# AI Job Suite Auth Service Changelog

## [2.0.0] - 2024-12-19

### 🎯 Major Changes

#### Pricing Structure Update

- **Removed Basic ($9.99/month) plan** - Now free tier includes all Basic features
- **Updated plan numbering**: Pro is now plan #2, Enterprise is plan #3
- **Free tier enhanced** with features previously in Basic plan

#### Organization Support Added

- **Multi-tenant architecture** for teams and companies
- **Role-based access control** (admin, user, viewer)
- **Domain-based organization detection** for seamless onboarding
- **Organization management endpoints** for full CRUD operations
- **User management within organizations** with role assignment

#### Enhanced Session Management

- **Redis-based session store** with memory fallback
- **Session isolation** between organizations
- **Concurrent user limits** per organization
- **Session activity tracking** for analytics
- **Automatic session cleanup** and maintenance
- **Cross-organization access control** for system admins

### 🚀 New Features

#### Organization Management

- `POST /api/v1/organizations` - Create new organization
- `GET /api/v1/organizations/:id` - Get organization details
- `PUT /api/v1/organizations/:id` - Update organization
- `POST /api/v1/organizations/:id/users` - Add user to organization
- `GET /api/v1/organizations/:id/users` - Get organization users
- `DELETE /api/v1/organizations/:id/users/:userId` - Remove user
- `PATCH /api/v1/organizations/:id/users/:userId/role` - Update user role

#### Session Middleware

- `sessionValidation` - Validates and enhances session data
- `requireOrganizationAccess` - Ensures user belongs to specific organization
- `requireRole` - Requires specific role in organization
- `crossOrganizationAccess` - Handles cross-organization requests
- `sessionActivityTracking` - Tracks session activity for analytics
- `enforceSessionLimits` - Enforces concurrent user limits
- `sessionMaintenance` - Handles session cleanup and maintenance

### 🗄️ Database Schema Updates

#### New Tables

- **`organizations`** - Organization information and settings
- **Enhanced `users` table** - Added `organization_id` and `role` fields

#### Updated Tables

- **`subscription_plans`** - Removed Basic plan, updated sort orders
- **`sessions`** - Enhanced for organization-based session management

### 🔧 Technical Improvements

#### Package Management

- **Migrated to pnpm** for consistency with root turborepo
- **Updated dependencies** to latest stable versions
- **Enhanced package.json scripts** for Docker operations

#### Configuration

- **Environment configuration template** (`env.example`)
- **Comprehensive setup script** with pnpm installation
- **Docker configuration** optimized for pnpm

#### Security Enhancements

- **Session-based authentication** alongside JWT
- **Organization-level access control**
- **Enhanced rate limiting** with organization awareness
- **Improved CORS configuration** for microservices

### 📚 Documentation Updates

#### README.md

- **Updated pricing structure** reflecting new plan layout
- **Organization management section** with endpoints and features
- **Enhanced service integration guide** with organization examples
- **pnpm commands** throughout documentation

#### INTEGRATION_GUIDE.md

- **Organization integration examples** for different service types
- **Session management integration** patterns
- **Updated installation commands** for pnpm

#### New Files

- **`CHANGELOG.md`** - This changelog document
- **`env.example`** - Environment configuration template
- **`src/routes/organizations.ts`** - Organization management routes
- **`src/middleware/session.ts`** - Session management middleware

### 🐛 Bug Fixes

- **Fixed session handling** for multiple users from same organization
- **Resolved authentication flow** with organization context
- **Improved error handling** for organization-related operations
- **Enhanced database connection** management

### 🔄 Migration Notes

#### For Existing Users

- **Basic plan users** automatically upgraded to enhanced Free tier
- **Existing users** assigned to default organization
- **JWT tokens** now include organization and role information

#### For Service Integration

- **Update client libraries** to handle organization context
- **Implement session management** for better user experience
- **Add organization checks** in permission validation

### 🚨 Breaking Changes

- **Basic plan removed** - Users need to be migrated to Free or Pro
- **JWT payload structure** now includes `organizationId` and `role`
- **Session management** requires Redis for production use
- **Organization context** required for most operations

### 📋 Next Steps

1. **Update client applications** to handle organization context
2. **Implement session management** in frontend applications
3. **Test organization workflows** with multiple users
4. **Monitor session performance** and adjust limits as needed
5. **Plan migration strategy** for existing Basic plan users

---

## [1.0.0] - 2024-12-18

### Initial Release

- Basic authentication service with JWT support
- Subscription plan management
- Service-to-service authentication
- Usage tracking and limits
- PostgreSQL and Redis integration
