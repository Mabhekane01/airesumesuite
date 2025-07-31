# 🌍 Environment Configuration Guide

This guide explains how to set up and manage environment variables for the AI Job Suite.

## 📁 Environment Files Structure

```
ai-job-suite/
├── apps/
│   ├── backend/
│   │   ├── .env                 # Current environment (auto-generated)
│   │   ├── .env.development     # Development configuration
│   │   └── .env.production      # Production configuration
│   └── frontend/
│       ├── .env                 # Current environment (auto-generated)
│       ├── .env.development     # Development configuration
│       └── .env.production      # Production configuration
└── scripts/
    ├── set-env.js              # Environment switcher
    └── validate-env.js         # Environment validator
```

## 🚀 Quick Start

### 1. Set Development Environment
```bash
# Use the environment manager script
pnpm run env:dev

# Or manually copy files
cp apps/backend/.env.development apps/backend/.env
cp apps/frontend/.env.development apps/frontend/.env
```

### 2. Configure Your API Keys
Edit the `.env` files and update:
- `GEMINI_API_KEY` - Your Google Gemini API key
- `SMTP_USER` and `SMTP_PASS` - Your email credentials
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - Your Google OAuth credentials
- Database and Redis connection strings

### 3. Start Development
```bash
pnpm install
pnpm run dev
```

## 🏭 Production Setup

### 1. Set Production Environment
```bash
# Use the environment manager
pnpm run env:prod

# Validate configuration
pnpm run env:validate
```

### 2. Update Production Values
Replace all placeholder values in `.env` files:
- Update all `your-*` placeholders with real values
- Use secure, unique secrets for JWT and session keys
- Configure production database URLs
- Set up production email service

### 3. Deploy
```bash
# Pre-deployment check
pnpm run deploy:check

# Start production server
pnpm run start:prod
```

## 🔧 Environment Management Commands

| Command | Description |
|---------|-------------|
| `pnpm run env:dev` | Switch to development environment |
| `pnpm run env:prod` | Switch to production environment |
| `pnpm run env:check` | Check if all environment files exist |
| `pnpm run env:validate` | Validate production environment |
| `pnpm run env:validate:dev` | Validate development environment |
| `pnpm run deploy:check` | Full pre-deployment validation |

## 🔒 Security Best Practices

### Development
- Use test API keys and credentials
- Keep development secrets separate from production
- Don't commit `.env` files to version control

### Production
- Use strong, unique secrets (64+ characters for JWT)
- Enable all security features
- Use managed services for databases and Redis
- Configure proper CORS origins
- Enable HTTPS everywhere

## 📋 Required Environment Variables

### Backend (Critical)
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` - Frontend application URL
- Email service configuration (SMTP or SendGrid)

### Frontend (Critical)
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_APP_URL` - Frontend application URL
- `VITE_RECAPTCHA_SITE_KEY` - reCAPTCHA site key

## 🆘 Troubleshooting

### Environment Files Not Found
```bash
# Check which environment files exist
pnpm run env:check

# Manually create missing files from templates
cp apps/backend/.env.development apps/backend/.env
```

### Validation Errors
```bash
# Validate and see detailed error messages
pnpm run env:validate

# Common issues:
# - Missing required variables
# - Weak secrets (too short)
# - Invalid URLs
# - Development values in production
```

### Application Won't Start
1. Check environment variables are loaded: `node -e "console.log(process.env.NODE_ENV)"`
2. Verify database connectivity
3. Check API key validity
4. Review application logs

## 📚 Additional Resources

- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/)
- [Redis Cloud Setup](https://redis.com/redis-enterprise-cloud/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [SendGrid Setup](https://docs.sendgrid.com/)

## 🔄 Environment Sync

To sync environment variables between team members:
1. Share the `.env.development` template
2. Each developer creates their own `.env` file
3. Never commit actual `.env` files
4. Use the validation script to ensure consistency

---

**Remember:** 
- ✅ Commit `.env.development` and `.env.production` templates
- ❌ Never commit actual `.env` files with real secrets
- 🔒 Use strong, unique secrets for production