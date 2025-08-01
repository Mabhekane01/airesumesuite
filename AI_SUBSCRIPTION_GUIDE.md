# 🔒 AI Feature Subscription System - Implementation Guide

## Overview

This guide explains how to properly implement and use the AI feature subscription system that restricts all AI functionality to Enterprise subscribers.

## ✅ What's Been Fixed

### Backend Restrictions
- **All AI endpoints now require Enterprise subscription**
- **Middleware automatically blocks non-subscribers**
- **Proper error responses with subscription codes**
- **Rate limiting per subscription tier**
- **Usage tracking for analytics**

### Frontend Integration
- **Smart subscription checking hooks**
- **Automatic subscription modal popup**
- **API error handling for subscription blocks**
- **User-friendly upgrade prompts**

---

## 🚀 How to Use

### 1. Frontend: Check Subscription Before API Calls

```tsx
import { useSubscriptionModal } from '../hooks/useSubscriptionModal';
import { callWithSubscriptionCheck } from '../utils/subscriptionUtils';

function ResumeOptimizeButton() {
  const { checkAIFeature, isModalOpen, modalProps, closeModal } = useSubscriptionModal();

  const handleOptimize = async () => {
    // Option 1: Check access first
    if (!checkAIFeature('ai-resume-optimization')) {
      return; // Modal automatically shown
    }

    // Option 2: Wrap API call with subscription check
    const result = await callWithSubscriptionCheck(
      () => resumeAPI.optimizeResume(resumeId, jobDescription),
      { featureName: 'AI Resume Optimization' }
    );

    if (result) {
      // Success - user has subscription
      setOptimizedResume(result);
    }
  };

  return (
    <>
      <button onClick={handleOptimize}>
        Optimize with AI
      </button>
      
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        featureName={modalProps.featureName}
        title={modalProps.title}
        description={modalProps.description}
      />
    </>
  );
}
```

### 2. Backend: Protect AI Endpoints

```typescript
// routes/resumeRoutes.ts
import { requireEnterpriseSubscription, subscriptionRateLimit, trackFeatureUsage } from '../middleware/subscriptionValidation';

router.post('/optimize',
  requireEnterpriseSubscription,           // Block non-subscribers
  subscriptionRateLimit('ai-resume-optimization'), // Rate limiting
  trackFeatureUsage('ai-resume-optimization'),     // Analytics
  resumeController.optimizeResume
);
```

### 3. Component-Level Subscription Checks

```tsx
import { useSubscription } from '../hooks/useSubscription';

function AIFeatureComponent() {
  const { canUseAI, tier } = useSubscription();

  if (!canUseAI) {
    return (
      <div className="subscription-required">
        <h3>Enterprise Feature</h3>
        <p>AI features require an Enterprise subscription</p>
        <button onClick={() => navigate('/dashboard/upgrade')}>
          Upgrade Now
        </button>
      </div>
    );
  }

  return <AIFeatureContent />;
}
```

---

## 🛡️ Subscription Logic

### User Has AI Access If:
1. **Has Enterprise tier** (`user.tier === 'enterprise'`)
2. **Has active subscription** (`subscription_status === 'active'`)
3. **Subscription hasn't expired** (`subscription_end_date > now`)

### All Three Must Be True!

```typescript
const canUseAI = 
  user.tier === 'enterprise' && 
  user.subscription_status === 'active' && 
  !isExpired;
```

---

## 🔧 Protected AI Features

All these features now require Enterprise subscription:

### Resume Builder
- ✅ AI optimization
- ✅ Job matching analysis
- ✅ ATS compatibility check
- ✅ Professional summary generation
- ✅ Resume parsing
- ✅ Enhancement suggestions

### Cover Letters
- ✅ AI generation from job URLs
- ✅ Template customization
- ✅ Job-specific optimization

### Career Coach
- ✅ AI chat functionality
- ✅ Career advice
- ✅ Interview preparation

### Job Applications
- ✅ Match score calculation
- ✅ Batch processing
- ✅ Interview prep generation

---

## 🚨 Error Handling

### Backend Error Responses
```json
{
  "success": false,
  "message": "AI features require an active Enterprise subscription",
  "code": "AI_FEATURE_SUBSCRIPTION_REQUIRED",
  "data": {
    "feature": "ai-resume-optimization",
    "currentTier": "free",
    "required": "enterprise",
    "upgradeUrl": "/dashboard/upgrade"
  }
}
```

### Frontend Error Handling
```typescript
// Automatic handling in API interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 && error.response?.data?.code?.includes('SUBSCRIPTION')) {
      // Show subscription modal automatically
      // User sees upgrade prompt
    }
    return Promise.reject(error);
  }
);
```

---

## 📊 Testing Subscription Restrictions

### 1. Test with Free User
```bash
# Create test user with free tier
curl -X POST /api/v1/auth/register -d '{
  "email": "test@example.com",
  "password": "password",
  "firstName": "Test",
  "lastName": "User"
}'

# Try AI endpoint - should get 403
curl -X POST /api/v1/resumes/optimize \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jobDescription": "test"}'

# Expected: 403 with subscription error
```

### 2. Test with Enterprise User
```bash
# Upgrade user to enterprise
curl -X POST /api/v1/admin/users/upgrade -d '{
  "userId": "user_id",
  "tier": "enterprise",
  "subscription_status": "active",
  "subscription_end_date": "2025-12-31"
}'

# Try AI endpoint - should work
curl -X POST /api/v1/resumes/optimize \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jobDescription": "test"}'

# Expected: 200 with AI response
```

---

## 🎯 Quick Implementation Checklist

### For New AI Features:
- [ ] Add `requireEnterpriseSubscription` middleware
- [ ] Add `subscriptionRateLimit('feature-name')` 
- [ ] Add `trackFeatureUsage('feature-name')`
- [ ] Test with free and enterprise users
- [ ] Add frontend subscription check
- [ ] Handle subscription errors gracefully

### Example New AI Endpoint:
```typescript
router.post('/new-ai-feature',
  requireEnterpriseSubscription,
  subscriptionRateLimit('ai-new-feature'),
  trackFeatureUsage('ai-new-feature'),
  validation,
  controller.newAIFeature
);
```

---

## 🚀 Deployment Ready!

Your AI subscription system is now:
- ✅ **Fully secured** - All AI features protected
- ✅ **User-friendly** - Clear upgrade prompts  
- ✅ **Production-ready** - Proper error handling
- ✅ **Analytics-enabled** - Usage tracking
- ✅ **Rate-limited** - Prevents abuse

## 🔑 Environment Variables Required

```bash
# For subscription checking
MONGODB_URI=your_mongodb_connection_string

# For payments (if using Paystack)
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLISHABLE_KEY=your_paystack_public_key
```

Your AI features are now properly protected and ready for production deployment! 🎉