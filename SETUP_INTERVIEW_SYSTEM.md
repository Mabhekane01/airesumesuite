# Interview System Setup Guide

## 🔧 Required Dependencies

The interview scheduling and notification system requires additional dependencies that may not be installed by default.

### Install Missing Dependencies

Run the following command in your project root:

```bash
# Install required dependencies for interview system
pnpm add node-cron @types/node-cron nodemailer @types/nodemailer
```

Or if using npm:
```bash
npm install node-cron @types/node-cron nodemailer @types/nodemailer
```

Or if using yarn:
```bash
yarn add node-cron @types/node-cron nodemailer @types/nodemailer
```

## 📧 Email Configuration

To enable email notifications and calendar invites, add these environment variables to your `.env` file:

```env
# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourcompany.com

# Application Configuration
APP_NAME=Job Suite
FRONTEND_URL=https://yourapp.com
```

### Gmail Setup

If using Gmail, you'll need an "App Password":

1. Enable 2-factor authentication on your Google account
2. Go to Google Account settings → Security → 2-Step Verification
3. Generate an "App Password" for "Mail"
4. Use this app password (not your regular password) in `SMTP_PASS`

### Other Email Providers

For other email providers, update the SMTP settings accordingly:

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

**Custom SMTP:**
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=true  # Set to true for port 465
```

## ✅ Verify Installation

After installing dependencies and configuring email, restart your server. You should see:

```
✅ Interview notification service started
📧 Email service ready for calendar invites and reminders
```

## ⚠️ Troubleshooting

### If you see "node-cron not found":
```bash
pnpm add node-cron @types/node-cron
```

### If you see "nodemailer not found":
```bash
pnpm add nodemailer @types/nodemailer
```

### If email tests fail:
1. Check your SMTP credentials
2. Verify your email provider allows SMTP
3. For Gmail, ensure you're using an App Password
4. Check firewall/network restrictions

### If the server crashes on startup:
The system now includes graceful error handling. Missing dependencies will log warnings but won't crash the server. However, for full functionality, install all required dependencies.

## 🚀 Features Enabled After Setup

Once properly configured, you'll have access to:

- ✅ Automated interview reminder emails (24h, 4h, 1h, 15min before)
- ✅ Calendar invite generation (ICS files)
- ✅ Interview confirmation emails
- ✅ Rescheduling notifications
- ✅ Thank you note reminders
- ✅ Google/Outlook/Apple calendar integration
- ✅ Interview status tracking and analytics

## 📱 API Endpoints

After setup, these endpoints will be available:

```
POST   /api/v1/interviews                 # Create interview
GET    /api/v1/interviews                 # List interviews
GET    /api/v1/interviews/upcoming        # Upcoming interviews
GET    /api/v1/interviews/:id/calendar/download   # Download ICS
POST   /api/v1/interviews/:id/test-reminder       # Test notifications
```

## 🔄 Development vs Production

### Development:
- Email notifications work but may be throttled
- Calendar invites are generated but may not auto-sync
- Mock services activate if dependencies are missing

### Production:
- All dependencies must be installed
- Email service must be properly configured
- Consider using a dedicated email service (SendGrid, SES, etc.)

## 📦 Alternative: Disable Interview System

If you don't need the interview system, you can disable it by:

1. Commenting out the interview routes in `src/index.ts`
2. Removing interview-related imports
3. The system will run without the interview features

---

**Need help?** Check the error logs for specific missing dependencies and install them using the commands above.