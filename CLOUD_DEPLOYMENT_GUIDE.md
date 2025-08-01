# 🚀 Cloud Deployment Guide - AI Job Suite

## ✅ **PRODUCTION READY CONFIGURATION**

Your AI Job Suite is configured with **PRODUCTION URLS** and ready for cloud deployment:

- **Frontend**: `https://airesumesuite.web.app` (Firebase Hosting)
- **Backend**: `https://airesumesuite.onrender.com` (Render.com)
- **Database**: MongoDB Atlas (Cloud)
- **Cache**: Redis Cloud

---

## 🌐 **DEPLOYMENT OPTIONS**

### **Option 1: Render.com (Backend) + Firebase Hosting (Frontend)**

**Backend Deployment on Render:**
1. Connect your GitHub repository to Render
2. Use the provided `render.yaml` configuration file
3. Or manually configure with:
   - **Build Command**: `docker build -f apps/backend/Dockerfile -t backend .`
   - **Start Command**: `docker run -p 3001:3001 backend`
   - **Environment**: Import from `render.yaml`

**Frontend Deployment on Firebase:**
1. Already configured for `https://airesumesuite.web.app`
2. Build with: `cd apps/frontend && npm run build`
3. Deploy with: `firebase deploy`

### **Option 2: Docker Compose Cloud Deployment**

Use the cloud-optimized Docker Compose file:
```bash
docker-compose -f docker-compose.cloud.yml up -d
```

### **Option 3: Railway Deployment**

1. Connect your GitHub repository to Railway
2. Railway will auto-detect your Docker configuration
3. Set environment variables from `.env.production`

### **Option 4: DigitalOcean App Platform**

1. Create new app from your GitHub repository
2. Select Docker as the source
3. Configure environment variables

---

## 🔧 **ENVIRONMENT CONFIGURATION**

### **Production URLs (Already Configured)**
```env
# Frontend
FRONTEND_URL=https://airesumesuite.web.app
VITE_API_BASE_URL=https://airesumesuite.onrender.com/api/v1

# Backend
BACKEND_URL=https://airesumesuite.onrender.com
ALLOWED_ORIGINS=https://airesumesuite.web.app,https://airesumesuite.onrender.com

# Google OAuth Callback
GOOGLE_CALLBACK_URL=https://airesumesuite.onrender.com/api/v1/auth/google/callback
```

### **External Services (Already Configured)**
- ✅ **MongoDB Atlas**: Production cluster connected
- ✅ **Redis Cloud**: Production instance connected
- ✅ **Google OAuth**: Production credentials
- ✅ **Email (Gmail)**: SMTP configured
- ✅ **Payment (Paystack)**: Test keys configured
- ✅ **AI APIs**: Gemini API configured
- ✅ **Monitoring**: Sentry + Google Analytics

---

## 🚀 **QUICK DEPLOYMENT COMMANDS**

### **For Local Testing with Production URLs:**
```bash
# Windows
deploy-production.bat

# Linux/macOS
./deploy-production.sh
```

### **For Cloud Deployment:**
```bash
# Build and push to your cloud provider
docker build -f apps/backend/Dockerfile -t ai-job-suite-backend .
docker build -f apps/frontend/Dockerfile -t ai-job-suite-frontend .

# Or use cloud-specific configurations
docker-compose -f docker-compose.cloud.yml build
```

---

## 🔍 **HEALTH CHECK ENDPOINTS**

After deployment, these should work:

### **Backend Health Checks**
- ✅ **Health**: `https://airesumesuite.onrender.com/health`
- ✅ **API Status**: `https://airesumesuite.onrender.com/api/v1/`

### **Frontend Health Checks**
- ✅ **App**: `https://airesumesuite.web.app`
- ✅ **Health**: `https://airesumesuite.web.app/health`

### **Database Connections**
- ✅ **MongoDB Atlas**: Auto-verified by backend
- ✅ **Redis Cloud**: Auto-verified by backend

---

## 🛠️ **PLATFORM-SPECIFIC INSTRUCTIONS**

### **Render.com Deployment**

1. **Create New Web Service**
   - Connect your GitHub repository
   - Select "Docker" as environment
   - Use `apps/backend/Dockerfile` as Dockerfile path
   - Set Docker Context to `/` (root)

2. **Environment Variables**
   - Import all variables from `render.yaml`
   - Or manually add from `.env.production`

3. **Build Settings**
   - Build Command: (Leave empty for Docker)
   - Start Command: (Leave empty for Docker)

### **Railway Deployment**

1. **Connect Repository**
   - Import from GitHub
   - Railway auto-detects Docker setup

2. **Configure Service**
   - Root Directory: `/`
   - Dockerfile Path: `apps/backend/Dockerfile`

3. **Environment Variables**
   - Import from `.env.production`
   - Railway provides automatic HTTPS

### **Firebase Hosting (Frontend)**

Already configured! Your frontend is set to deploy to:
- **URL**: `https://airesumesuite.web.app`
- **API Connection**: `https://airesumesuite.onrender.com/api/v1`

Build and deploy:
```bash
cd apps/frontend
npm run build
firebase deploy
```

---

## 🔒 **CORS & SECURITY CONFIGURATION**

Your backend is configured to accept requests from:
- `https://airesumesuite.web.app` (Frontend)
- `https://airesumesuite.onrender.com` (Backend/API)

**Security Headers Enabled:**
- HTTPS enforcement
- CORS properly configured
- Security middleware active
- Rate limiting enabled

---

## 📊 **MONITORING & DEBUGGING**

### **Error Tracking**
- **Sentry**: `https://e5cfaa159c3404393d2aa5ff5ab2d7ad@o4509756801351680.ingest.de.sentry.io/4509756804038736`

### **Analytics**
- **Google Analytics**: `G-Y4CHQRKG7R`

### **Log Access**
```bash
# For Docker deployments
docker-compose -f docker-compose.cloud.yml logs backend
docker-compose -f docker-compose.cloud.yml logs frontend

# For cloud platforms
# Check platform-specific logging (Render, Railway, etc.)
```

---

## ⚠️ **IMPORTANT NOTES**

### **Database Connections**
- Uses **MongoDB Atlas** (cloud) - no local MongoDB
- Uses **Redis Cloud** - no local Redis
- Both are already configured and ready

### **File Uploads**
- Configured for cloud storage
- Uploads directory will be created automatically
- Consider using cloud storage (AWS S3, Cloudinary) for production

### **SSL/HTTPS**
- All URLs use HTTPS
- Cloud platforms provide automatic SSL
- No additional SSL configuration needed

---

## 🎉 **DEPLOYMENT STATUS**

**✅ READY FOR PRODUCTION DEPLOYMENT**

Your AI Job Suite is **100% configured** for cloud deployment with:
- Production URLs configured
- External databases connected
- All APIs and services configured
- Security and monitoring enabled
- Health checks implemented

**Simply choose your preferred cloud platform and deploy!**

---

## 🆘 **TROUBLESHOOTING**

### **If Backend Deployment Fails**
1. Check MongoDB Atlas connection string
2. Verify Redis Cloud credentials
3. Ensure all environment variables are set
4. Check platform-specific logs

### **If Frontend Can't Connect to Backend**
1. Verify `VITE_API_BASE_URL=https://airesumesuite.onrender.com/api/v1`
2. Check CORS configuration in backend
3. Ensure backend is deployed and healthy

### **Database Connection Issues**
1. Verify MongoDB Atlas allows connections from your cloud platform
2. Check Redis Cloud firewall settings
3. Test connections using the health endpoint

### **OAuth Issues**
1. Update Google Console with production URLs
2. Verify callback URL: `https://airesumesuite.onrender.com/api/v1/auth/google/callback`
3. Check client ID and secret configuration

**Your app is ready to go live! 🚀**