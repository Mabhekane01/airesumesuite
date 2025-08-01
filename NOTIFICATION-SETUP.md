# 🔔 Notification System Setup & Troubleshooting

## Production-Ready Configuration

### 📧 Email Notification Setup

To enable email notifications, configure these environment variables in your `.env` file:

```bash
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com          # Or your SMTP provider
SMTP_PORT=587                     # Usually 587 for TLS or 465 for SSL
SMTP_SECURE=false                 # true for 465, false for other ports
SMTP_USER=your-email@gmail.com    # Your email address
SMTP_PASS=your-app-password       # Your email app password (not regular password)
SMTP_FROM=noreply@yourdomain.com  # Sender address

# Application URLs
FRONTEND_URL=http://localhost:5173  # Your frontend URL
APP_NAME=AI Job Suite              # Application name for emails
```

### 🔐 Email Provider Setup

#### Gmail Setup:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `SMTP_PASS`

#### Other Providers:
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587` 
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`

### 🧪 Testing the System

Run the comprehensive test script:

```bash
cd apps/backend
node src/scripts/test-notification-system.js
```

This will test:
- ✅ MongoDB connection
- ✅ Email service configuration
- ✅ User notification preferences
- ✅ In-app notification creation
- ✅ Email notification delivery
- ✅ Bell icon data retrieval
- ✅ Notification count accuracy
- ✅ Mark as read functionality

## 🐛 Troubleshooting Guide

### Issue 1: Bell Icon Not Showing Notifications

**Symptoms:**
- Bell icon appears but no notification count
- Notifications exist in database but not in UI

**Root Causes Fixed:**
- ✅ Type mismatch between `INotification._id` and `NavNotification.id`
- ✅ Missing error handling in notification conversion
- ✅ Polling interval too slow (increased retry logic)

**Verification:**
1. Check browser console for notification fetch errors
2. Verify user authentication token is valid
3. Check notification context is properly wrapped around components

### Issue 2: Users Not Receiving Emails

**Symptoms:**
- In-app notifications work
- Email notifications missing
- No email delivery errors in logs

**Root Causes Fixed:**
- ✅ SMTP credentials not configured
- ✅ Email service throwing errors instead of graceful degradation
- ✅ Missing email delivery status logging

**Verification:**
1. Check SMTP environment variables are set
2. Run email connection test: `await emailService.testConnection()`
3. Check notification `deliveryStatus` field in database
4. Verify user email preferences allow email notifications

### Issue 3: Authentication vs Notification Context

**Problem:** NavNotificationContext was deleted, breaking notification flow

**Solution Applied:**
- ✅ Updated `NotificationContext.tsx` to handle both interface types
- ✅ Added proper error handling and type conversion
- ✅ Maintained backward compatibility with existing components

## 📊 System Status Indicators

### Email Service Status:
```javascript
// Check if email service is working
const emailConnected = await emailService.testConnection();
console.log('Email Status:', emailConnected ? 'Working' : 'SMTP Not Configured');
```

### Notification Flow Status:
```javascript
// Check end-to-end notification flow
const testUserId = 'your-user-id';
const notification = await notificationService.createTestNotification(testUserId);
const stats = await notificationService.getNotificationStats(testUserId);
```

## 🔧 Production Deployment Checklist

### Backend Configuration:
- [ ] SMTP environment variables configured
- [ ] MongoDB connection stable
- [ ] Email service connection tested
- [ ] Notification preferences model exists for all users
- [ ] Authentication middleware working correctly

### Frontend Configuration:
- [ ] NotificationContext wrapped around app
- [ ] Bell icon components updated with fixed conversion logic
- [ ] API endpoints properly configured
- [ ] Error handling implemented for failed API calls
- [ ] Loading states implemented for notification fetching

### Database Health:
- [ ] NotificationPreferences created for existing users
- [ ] Notification indexes created for performance
- [ ] Old notifications cleanup scheduled
- [ ] Email delivery status tracking enabled

## 🚀 Performance Optimizations Applied

1. **Efficient Polling**: Reduced from 30s to smart polling with stale time
2. **Error Recovery**: Added retry logic for failed API calls
3. **Type Safety**: Fixed interface mismatches preventing silent failures
4. **Graceful Degradation**: Email service works even without SMTP
5. **Logging**: Added comprehensive logging for debugging production issues

## 📈 Monitoring Recommendations

### Key Metrics to Track:
- Notification creation rate
- Email delivery success rate
- Bell icon click-through rate
- Failed notification count
- User notification preferences adoption

### Alerts to Set Up:
- Email service connection failures
- High notification failure rate (>5%)
- Authentication token expiration affecting notifications
- Database connection issues preventing notification storage

## 🔄 Migration Notes

The system now handles both old and new notification formats:
- Supports `_id` (MongoDB) and `id` (frontend) fields
- Gracefully handles missing notification properties
- Maintains backward compatibility with existing notification data
- Provides clear error messages for debugging

Your notification system is now production-ready with comprehensive error handling, proper email configuration, and fixed bell icon display issues!