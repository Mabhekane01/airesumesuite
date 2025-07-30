# AI Job Suite - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

Transform your job search with AI-powered tools! This comprehensive platform combines intelligent resume building, cover letter generation, job tracking, and personalized career coaching.

### ⚡ Prerequisites (2 minutes)

Before starting, ensure you have:
- **Node.js 20+** installed ([Download here](https://nodejs.org/))
- **pnpm** (recommended) or npm: `npm install -g pnpm`
- **Git** for cloning the repository
- **Modern browser** (Chrome, Firefox, Safari, Edge)

Optional but recommended:
- **Docker Desktop** for containerized development
- **MongoDB** (local or MongoDB Atlas account)
- **Redis** for caching (optional)

### 🎯 Quick Setup Options

Choose your preferred setup method:

#### Option A: Docker Setup (Recommended - Easiest)

1. **Clone and Start**
   ```bash
   git clone <repository-url>
   cd ai-job-suite
   pnpm install
   pnpm docker:up
   ```

2. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - MongoDB: localhost:27017
   - Redis: localhost:6379

#### Option B: Manual Setup (More Control)

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd ai-job-suite
   pnpm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment templates
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```

3. **Configure Backend Environment** (`apps/backend/.env`)
   ```env
   # Essential Configuration
   MONGODB_URI=mongodb://localhost:27017/ai-job-suite
   JWT_SECRET=your-super-secure-jwt-secret-here
   PORT=3001
   
   # AI Services (Optional - for full functionality)
   GEMINI_API_KEY=your-gemini-api-key
   OPENAI_API_KEY=your-openai-api-key
   
   # Redis (Optional - for caching)
   REDIS_URL=redis://localhost:6379
   ```

4. **Start Services**
   ```bash
   # Terminal 1 - Backend
   cd apps/backend
   pnpm dev
   
   # Terminal 2 - Frontend  
   cd apps/frontend
   pnpm dev
   ```

#### Option C: Batch Files (Windows)

For Windows users, use the provided batch files:
```batch
# Start backend
start-backend.bat

# Start frontend (in new terminal)
start-frontend.bat
```

### 🎉 First Login & Setup

1. **Open the Application**: Navigate to http://localhost:5173
2. **Create Account**: Click "Register" and create your account
3. **Complete Profile**: Add your basic information to unlock full features
4. **Explore Features**: Start with the AI Career Coach at `/dashboard/coach`

## 🎯 Core Features Overview

### 🤖 AI Career Coach (`/dashboard/coach`)
**Transform your career with personalized AI guidance**

**Key Capabilities:**
- **Resume Analysis**: Upload and get instant feedback on ATS compatibility
- **Interview Preparation**: Practice with AI-generated questions specific to your target roles
- **Career Path Planning**: Get strategic advice on career progression
- **Skill Gap Analysis**: Identify missing skills and get learning recommendations
- **Salary Negotiation**: Market-based salary insights and negotiation strategies
- **Real-time Coaching**: Interactive chat with streaming responses

**How to Use:**
1. Navigate to `/dashboard/coach`
2. Select a resume or upload a new one
3. Start chatting with specific questions like:
   - "Analyze my resume for ATS optimization"
   - "Help me prepare for a software engineer interview at Google"
   - "What skills should I develop to become a senior developer?"

### 📄 Intelligent Resume Builder (`/dashboard/resume-builder`)
**Create ATS-optimized resumes tailored to specific jobs**

**Key Capabilities:**
- **AI Content Generation**: Automatically generate resume content based on job descriptions
- **Multiple Templates**: Professional, modern, and creative templates
- **Real-time Preview**: See changes instantly with mobile-responsive design
- **ATS Optimization**: Automatic keyword optimization for applicant tracking systems
- **Export Options**: High-quality PDF, DOCX, and TXT formats
- **Version Control**: Track different resume versions for different applications

**How to Use:**
1. Go to `/dashboard/resume-builder`
2. Choose "Create New Resume" or upload existing resume
3. Select a professional template
4. Fill in sections or use AI to generate content
5. Preview and export in your preferred format

### 📝 Advanced Cover Letter Generator (`/dashboard/cover-letter`)
**Generate compelling, job-specific cover letters**

**Key Capabilities:**
- **Job-Specific Customization**: Tailors content to specific job descriptions
- **Multiple Tone Options**: Professional, casual, enthusiastic, or conservative
- **Company Research Integration**: Incorporates company values and culture
- **ATS Optimization**: Strategic keyword placement
- **Variation Generation**: Create multiple versions for A/B testing
- **Match Analysis**: Score alignment with job requirements

**How to Use:**
1. Navigate to `/dashboard/cover-letter`
2. Select a resume to base the cover letter on
3. Paste job description or provide job URL
4. Choose tone and style preferences
5. Generate and customize the content
6. Export in your preferred format

### 📊 Job Application Tracker (`/dashboard/applications`)
**Manage your entire job search pipeline**

**Key Capabilities:**
- **Application Management**: Track applications from submission to outcome
- **Interview Scheduling**: Calendar integration with automated reminders
- **Communication Logging**: Record all interactions with companies
- **Status Tracking**: Visual pipeline with automated status updates
- **Analytics Dashboard**: Success rates, response times, and trends
- **Task Management**: Automated follow-up reminders

**How to Use:**
1. Go to `/dashboard/applications`
2. Click "Add Application" to create new entries
3. Track status changes and add notes
4. Schedule interviews and log communications
5. Review analytics to optimize your approach

### 🔍 Job Search & Research
**Discover opportunities with intelligent matching**

**Key Capabilities:**
- **Job Scraping**: Automatically discover relevant job postings
- **Company Intelligence**: Research company culture and values
- **Salary Insights**: Market-based compensation data
- **Location Analysis**: Cost of living and market conditions
- **Match Scoring**: AI-powered job-to-profile matching

## 🔧 Configuration & Customization

### AI Service Setup

To unlock full AI capabilities, configure these API keys:

1. **Google Gemini (Primary AI Service)**
   - Get API key: https://makersuite.google.com/app/apikey
   - Add to `.env`: `GEMINI_API_KEY=your-key-here`

2. **OpenAI (Secondary AI Service)**
   - Get API key: https://platform.openai.com/api-keys
   - Add to `.env`: `OPENAI_API_KEY=your-key-here`

3. **Anthropic Claude (Advanced Analysis)**
   - Get API key: https://console.anthropic.com/
   - Add to `.env`: `ANTHROPIC_API_KEY=your-key-here`

### Database Configuration

**Local MongoDB:**
```bash
# Install MongoDB Community Edition
# macOS: brew install mongodb-community
# Windows: Download from mongodb.com
# Ubuntu: sudo apt install mongodb

# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
net start MongoDB  # Windows
```

**MongoDB Atlas (Cloud):**
1. Create account at https://www.mongodb.com/atlas
2. Create cluster and get connection string
3. Update `.env`: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-job-suite`

### Performance Optimization

**Enable Redis Caching:**
```bash
# Install Redis
# macOS: brew install redis
# Windows: Download from redis.io
# Ubuntu: sudo apt install redis-server

# Start Redis
redis-server  # All platforms
```

Update `.env`: `REDIS_URL=redis://localhost:6379`

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Backend Connection Issues
**Symptoms**: "Network Error", CORS errors, API failures

**Solutions:**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Restart backend
cd apps/backend
pnpm install
pnpm dev

# Check CORS configuration
# Ensure FRONTEND_URL matches your frontend URL
```

#### 2. Database Connection Problems
**Symptoms**: "Database connection failed", authentication errors

**Solutions:**
```bash
# Check MongoDB status
# Local: mongosh
# Atlas: Verify connection string and IP whitelist

# Reset database
# Clear data: drop database in MongoDB shell
# Restart backend to recreate schemas
```

#### 3. AI Services Not Working
**Symptoms**: AI features return errors, empty responses

**Solutions:**
```bash
# Verify API keys in .env file
echo $GEMINI_API_KEY  # Should show your key

# Check API quotas and billing
# Visit your AI service provider's dashboard

# Test API connection
curl -H "Authorization: Bearer $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1/models
```

#### 4. Frontend Build Issues
**Symptoms**: Compilation errors, TypeScript issues

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
pnpm install

# Type checking
pnpm type-check

# Build test
pnpm build
```

#### 5. Docker Issues
**Symptoms**: Container startup failures, port conflicts

**Solutions:**
```bash
# Check if ports are free
lsof -i :3001  # Backend port
lsof -i :5173  # Frontend port
lsof -i :27017 # MongoDB port

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Debug Commands

```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/auth/status

# View logs
docker-compose logs backend
docker-compose logs frontend

# Database debugging
mongosh ai-job-suite
# > db.users.find()
# > db.resumes.find()

# Redis debugging
redis-cli
# > ping
# > keys *
```

### Performance Issues

**Slow AI Responses:**
- Check API rate limits and quotas
- Ensure Redis caching is enabled
- Monitor network connectivity

**Database Slowdown:**
- Check database indexes
- Monitor query performance
- Consider database optimization

**Frontend Performance:**
- Enable production build: `pnpm build`
- Use CDN for static assets
- Implement code splitting

## 🎯 Getting the Most Out of AI Job Suite

### Best Practices

1. **Profile Completion**: Complete your profile for better AI recommendations
2. **Regular Updates**: Keep resumes and profiles current
3. **Use Analytics**: Review metrics to optimize your job search strategy
4. **Leverage AI**: Ask specific, detailed questions to the AI career coach
5. **Track Everything**: Log all job-related activities for better insights

### Advanced Tips

1. **Batch Operations**: Use batch features for mass resume updates
2. **A/B Testing**: Create multiple cover letter versions to test effectiveness
3. **Market Research**: Use salary and location insights for negotiation
4. **Network Building**: Track connections and referrals through the system
5. **Skill Development**: Use AI recommendations to guide learning priorities

### Integration Ideas

1. **Calendar Sync**: Connect with Google Calendar for interview scheduling
2. **Email Integration**: Forward job-related emails to track communications
3. **LinkedIn Export**: Export optimized content to LinkedIn profiles
4. **Portfolio Links**: Connect with GitHub, personal websites, etc.

## 🏆 Success Metrics

Track your progress with built-in analytics:

- **Application Success Rate**: Monitor interview invitation rates
- **Response Time**: Track how quickly companies respond
- **Interview Conversion**: Measure interview-to-offer ratios
- **Salary Progress**: Compare offers to market rates
- **Skill Development**: Track skill acquisition over time

## 🎉 You're Ready to Transform Your Job Search!

Your AI Job Suite is now fully operational with:

✅ **AI Career Coach** - Personalized career guidance  
✅ **Intelligent Resume Builder** - ATS-optimized resumes  
✅ **Advanced Cover Letter Generator** - Job-specific cover letters  
✅ **Comprehensive Job Tracker** - Full pipeline management  
✅ **Market Intelligence** - Salary and industry insights  
✅ **Enterprise Security** - Your data is protected  
✅ **Mobile Responsive** - Works on all devices  

### Next Steps

1. **Complete Your Profile** - Add skills, experience, and preferences
2. **Upload Your Resume** - Get instant AI analysis and optimization
3. **Start Job Searching** - Use the tracker to manage applications
4. **Engage with AI Coach** - Get personalized career advice
5. **Monitor Analytics** - Track your progress and optimize strategy

### Need Help?

- 📖 **Documentation**: Check the full README.md for detailed information
- 🚀 **Deployment**: See DEPLOYMENT_GUIDE.md for production setup
- 🐛 **Issues**: Report bugs via GitHub issues
- 💬 **Support**: Reach out to the development team

**Start transforming your career today with AI Job Suite!** 🚀