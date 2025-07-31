# 🚀 AI Job Suite - Production Deployment Guide

This guide will help you deploy the AI Job Suite to production with proper environment configuration.

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Create production environment files
- [ ] Update all API keys and secrets
- [ ] Configure production database connections
- [ ] Set up production email service
- [ ] Configure SSL certificates

### 2. Infrastructure Requirements
- [ ] MongoDB database (Atlas recommended)
- [ ] Redis instance (Redis Cloud recommended)
- [ ] Email service (SendGrid/AWS SES)
- [ ] File storage (AWS S3)
- [ ] Domain name and SSL certificate

### 3. External Services
- [ ] Google OAuth credentials
- [ ] Stripe payment processing
- [ ] AI API keys (OpenAI, Gemini, Anthropic)
- [ ] reCAPTCHA keys
- [ ] Monitoring and error tracking

## 🔧 Environment Setup

### Quick Environment Configuration

```bash
# Set development environment
node scripts/set-env.js development

# Set production environment
node scripts/set-env.js production

# Validate environment configuration
node scripts/validate-env.js production
```

### Manual Environment Setup

1. **Copy environment templates:**
   ```bash
   # Backend
   cp apps/backend/.env.production apps/backend/.env
   
   # Frontend  
   cp apps/frontend/.env.production apps/frontend/.env
   ```

2. **Update critical production values:**
   - Replace all `CHANGE-THIS-*` values
   - Update `your-domain.com` to your actual domain
   - Configure production database URLs
   - Set secure JWT secrets (64+ characters)

## 🛠 Production Configuration

### Backend Environment (.env)

**Critical Variables to Update:**

```env
# Domain Configuration
FRONTEND_URL=https://your-domain.com
ADMIN_URL=https://admin.your-domain.com

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-job-suite-prod

# Redis (Redis Cloud)
REDIS_URL=redis://username:password@your-redis-host:6379

# JWT Secrets (Generate secure 64+ character strings)
JWT_SECRET=your-super-secure-production-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret

# Email Service (SendGrid recommended)
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# API Keys
GEMINI_API_KEY=your-production-gemini-key
STRIPE_SECRET_KEY=sk_live_your-stripe-live-key
```

## 🚀 Quick Deployment Commands

```bash
# 1. Set production environment
node scripts/set-env.js production

# 2. Validate configuration
node scripts/validate-env.js production

# 3. Install dependencies
pnpm install --frozen-lockfile

# 4. Build applications
pnpm run build

# 5. Start production server
pnpm run start:prod
```

## 📊 Environment Management Scripts

The following scripts help manage environment configurations:

- `node scripts/set-env.js [development|production]` - Switch environments
- `node scripts/validate-env.js [environment]` - Validate environment configuration
- `node scripts/set-env.js check` - Check all environment files exist

## 🔒 Security Notes

1. **Never commit production .env files**
2. **Use strong, unique secrets for production**
3. **Enable all security features in production**
4. **Configure proper CORS origins**
5. **Use HTTPS everywhere**

## 📞 Quick Support

For deployment issues:
1. Run `node scripts/validate-env.js production`
2. Check database and Redis connectivity
3. Verify all required environment variables are set
4. Check application logs for specific errors