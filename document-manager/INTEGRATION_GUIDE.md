# AI Resume Suite Integration Guide

This guide explains how to integrate the Document Manager service with your existing AI Resume Suite.

## 🔧 Quick Setup

### 1. Environment Configuration

Add these variables to your AI Resume Suite `.env`:

```env
# Document Manager Service
DOCUMENT_MANAGER_URL=http://localhost:3001
DOCUMENT_MANAGER_ENABLED=true
```

Add these variables to Document Manager `.env`:

```env
# AI Resume Suite Integration
AI_RESUME_SERVICE_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:3000

# Database (can be same as AI Resume Suite or separate)
DATABASE_URL=postgresql://username:password@localhost:5432/document_manager
```

### 2. Add Document Manager to AI Resume Suite Frontend

In your AI Resume Suite frontend, add the document manager route:

```jsx
// In your main App.tsx or routing file
import EnterpriseDocumentManager from './components/document-manager/EnterpriseDocumentManager';

// Add to your routes
<Route path="/documents" element={<EnterpriseDocumentManager />} />
```

Add a navigation link:

```jsx
// In your navigation component
<Link to="/documents" className="nav-link">
  📄 Documents
</Link>
```

### 3. Backend Integration Points

#### A. Add Document Creation Webhook to Resume Builder

```typescript
// In your resume creation service
const createResume = async (resumeData: any) => {
  // ... existing resume creation logic ...
  
  // Send to Document Manager if enabled
  if (process.env.DOCUMENT_MANAGER_ENABLED === 'true') {
    try {
      const formData = new FormData();
      formData.append('file', resumePdfBlob);
      formData.append('title', resumeData.title || 'My Resume');
      formData.append('source', 'ai_resume');
      formData.append('sourceMetadata', JSON.stringify({
        resumeId: resume.id,
        templateId: resumeData.templateId,
        createdAt: new Date().toISOString()
      }));
      
      await fetch(`${process.env.DOCUMENT_MANAGER_URL}/api/integration/ai-resume/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      });
      
      console.log('Resume sent to Document Manager');
    } catch (error) {
      console.error('Failed to send resume to Document Manager:', error);
      // Don't fail the main operation
    }
  }
};
```

#### B. Add Document Manager Auth Verification Endpoint

```typescript
// In your AI Resume Suite auth routes
router.get('/auth/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      tier: req.user.tier || 'free'
    }
  });
});
```

#### C. Add Document Manager Menu Integration

```typescript
// In your AI Resume Suite dashboard
const DocumentManagerWidget = () => {
  const [documents, setDocuments] = useState([]);
  const { token } = useAuthStore();
  
  useEffect(() => {
    // Load recent documents from document manager
    fetch(`${process.env.REACT_APP_DOCUMENT_MANAGER_URL}/api/integration/documents?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => setDocuments(data.data || []))
    .catch(console.error);
  }, [token]);
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Documents</h3>
        <Link to="/documents" className="text-blue-600 hover:text-blue-700">
          View All
        </Link>
      </div>
      
      {documents.length === 0 ? (
        <p className="text-gray-500">No documents yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {doc.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 🚀 Deployment Steps

### 1. Start Document Manager Service

```bash
cd document-manager
npm install
npm run build
npm start
```

Service will run on port 3001 by default.

### 2. Update AI Resume Suite

```bash
cd apps/frontend
# Copy the document manager components
cp -r ../../document-manager/frontend-components/src/components/document-manager ./src/components/

# Update your routing and navigation
# Add the routes and links as shown above
```

### 3. Database Migration

If using a separate database for Document Manager:

```bash
# Create the database
createdb document_manager

# Run migrations
cd document-manager
npm run db:migrate
```

If using the same database, add the Document Manager tables to your existing database by running the schema.sql file.

### 4. Test Integration

1. **Login to AI Resume Suite** - Verify authentication works
2. **Navigate to Documents** - Check the new documents page loads
3. **Create a Resume** - Verify it appears in Document Manager
4. **Create a Share Link** - Test document sharing functionality
5. **Check Analytics** - Verify tracking works

## 🔗 Frontend Integration Examples

### Add "Share" Button to Resume Card

```jsx
const ResumeCard = ({ resume }) => {
  const [shareUrl, setShareUrl] = useState('');
  const { token } = useAuthStore();
  
  const handleShare = async () => {
    try {
      // Create a shareable link via Document Manager
      const response = await fetch(`${process.env.REACT_APP_DOCUMENT_MANAGER_URL}/api/links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: resume.documentManagerId, // If you store this reference
          name: `Share of ${resume.title}`,
          allowDownload: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
      });
      
      const data = await response.json();
      setShareUrl(data.data.fullUrl);
      
      // Copy to clipboard
      navigator.clipboard.writeText(data.data.fullUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to create share link');
    }
  };
  
  return (
    <div className="resume-card">
      {/* Existing resume card content */}
      
      <button
        onClick={handleShare}
        className="share-button"
      >
        Share Resume
      </button>
    </div>
  );
};
```

### Add Document Manager Analytics to Dashboard

```jsx
const DashboardAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const { token } = useAuthStore();
  
  useEffect(() => {
    fetch(`${process.env.REACT_APP_DOCUMENT_MANAGER_URL}/api/analytics/dashboard?days=7`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => setAnalytics(data.data))
    .catch(console.error);
  }, [token]);
  
  if (!analytics) return <div>Loading analytics...</div>;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900">Document Views</h3>
        <p className="text-3xl font-bold text-blue-600">{analytics.summary.totalViews}</p>
        <p className="text-sm text-blue-700">Last 7 days</p>
      </div>
      
      <div className="bg-green-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-900">Downloads</h3>
        <p className="text-3xl font-bold text-green-600">{analytics.summary.totalDownloads}</p>
        <p className="text-sm text-green-700">Last 7 days</p>
      </div>
      
      <div className="bg-purple-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-900">Documents</h3>
        <p className="text-3xl font-bold text-purple-600">{analytics.summary.totalDocuments}</p>
        <p className="text-sm text-purple-700">Total managed</p>
      </div>
    </div>
  );
};
```

## 🔧 Configuration Options

### Document Manager Features by Tier

```javascript
// In your subscription logic
const getDocumentManagerFeatures = (tier) => {
  switch (tier) {
    case 'free':
      return {
        maxDocuments: 10,
        maxViews: 100,
        analytics: false,
        customBranding: false,
        passwordProtection: false
      };
    case 'premium':
      return {
        maxDocuments: 100,
        maxViews: 1000,
        analytics: true,
        customBranding: true,
        passwordProtection: true
      };
    case 'enterprise':
      return {
        maxDocuments: -1, // unlimited
        maxViews: -1, // unlimited
        analytics: true,
        customBranding: true,
        passwordProtection: true,
        apiAccess: true,
        webhooks: true
      };
  }
};
```

## 🧪 Testing the Integration

### 1. Unit Tests

```javascript
// Test authentication integration
describe('Document Manager Auth Integration', () => {
  it('should verify AI Resume Suite tokens', async () => {
    const token = generateAIResumeToken({ id: 'user123', email: 'test@example.com' });
    
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe('user123');
  });
});
```

### 2. Integration Tests

```javascript
// Test document creation from AI Resume Suite
describe('AI Resume Suite Integration', () => {
  it('should create document when resume is generated', async () => {
    const formData = new FormData();
    formData.append('file', mockPDFBuffer);
    formData.append('title', 'Test Resume');
    formData.append('source', 'ai_resume');
    
    const response = await request(app)
      .post('/api/integration/ai-resume/create')
      .set('Authorization', `Bearer ${validToken}`)
      .send(formData)
      .expect(201);
      
    expect(response.body.data.documentId).toBeDefined();
  });
});
```

## ✅ Verification Checklist

- [ ] Document Manager service starts successfully
- [ ] AI Resume Suite can authenticate with Document Manager
- [ ] Created resumes appear in Document Manager
- [ ] Share links work and track analytics
- [ ] User tiers are properly mapped
- [ ] Navigation between services is seamless
- [ ] Database integration works (shared or separate)
- [ ] File uploads and processing work
- [ ] Real-time analytics display correctly
- [ ] Webhooks trigger properly

## 🆘 Troubleshooting

### Common Issues

1. **Authentication Fails**
   - Check AI_RESUME_SERVICE_URL is correct
   - Verify /auth/verify endpoint exists in AI Resume Suite
   - Check JWT token format matches

2. **CORS Issues**
   - Add frontend URL to CORS_ORIGINS in Document Manager
   - Ensure both services allow cross-origin requests

3. **File Uploads Fail**
   - Check UPLOAD_PATH permissions
   - Verify MAX_FILE_SIZE is appropriate
   - Check disk space

4. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Check PostgreSQL is running
   - Run database migrations

This integration provides a seamless experience where users can manage all their documents (resumes, cover letters, PDFs) in one place while maintaining the security and analytics features needed for professional document sharing.