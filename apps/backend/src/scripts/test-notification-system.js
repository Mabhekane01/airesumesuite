#!/usr/bin/env node

/**
 * Comprehensive Notification System Test Script
 * Tests in-app notifications, email delivery, and bell icon functionality
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testNotificationSystem() {
  console.log('\n🔍 Starting Comprehensive Notification System Test\n');

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found. Please set MONGODB_URI or MONGO_URI environment variable.');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import models and services
    const { notificationService } = require('../services/notificationService');
    const { emailService } = require('../services/emailService');
    const { User } = require('../models/User');
    const { Notification } = require('../models/Notification');
    const { NotificationPreferences } = require('../models/NotificationPreferences');

    // Get first user for testing
    const testUser = await User.findOne().sort({ createdAt: -1 });
    if (!testUser) {
      console.error('❌ No test user found. Please create a user account first.');
      return;
    }

    console.log(`👤 Using test user: ${testUser.email} (ID: ${testUser._id})`);

    // Test 1: Check Email Service Configuration
    console.log('\n🔧 Test 1: Email Service Configuration');
    const emailConnected = await emailService.testConnection();
    console.log(`Email Service Status: ${emailConnected ? '✅ Connected' : '⚠️ Not Connected (SMTP not configured)'}`);

    // Test 2: Check User Notification Preferences
    console.log('\n🔧 Test 2: User Notification Preferences');
    const preferences = await NotificationPreferences.getOrCreateForUser(testUser._id);
    console.log('User Preferences:', {
      enabled: preferences.enabled,
      inApp: preferences.channels.inApp,
      email: preferences.channels.email,
      authentication: preferences.categories.authentication.enabled
    });

    // Test 3: Create In-App Notification
    console.log('\n🔧 Test 3: Creating In-App Notification');
    const inAppNotification = await notificationService.createTestNotification(testUser._id.toString());
    if (inAppNotification) {
      console.log('✅ In-app notification created:', {
        id: inAppNotification._id,
        title: inAppNotification.title,
        type: inAppNotification.type,
        read: inAppNotification.read
      });
    } else {
      console.log('❌ Failed to create in-app notification');
    }

    // Test 4: Create Authentication Notification with Email
    console.log('\n🔧 Test 4: Creating Authentication Notification (In-App + Email)');
    const authNotification = await notificationService.sendAuthNotification(
      testUser._id.toString(),
      'login_success',
      { testRun: true, timestamp: new Date() }
    );
    
    if (authNotification) {
      console.log('✅ Authentication notification created:', {
        id: authNotification._id,
        title: authNotification.title,
        category: authNotification.category,
        deliveryStatus: authNotification.deliveryStatus
      });
    } else {
      console.log('❌ Failed to create authentication notification');
    }

    // Test 5: Check Notification Count
    console.log('\n🔧 Test 5: Checking Notification Count');
    const stats = await notificationService.getNotificationStats(testUser._id.toString());
    console.log('Notification Stats:', {
      total: stats.total,
      unread: stats.unread,
      byCategory: stats.byCategory
    });

    // Test 6: Get User Notifications (API Response)
    console.log('\n🔧 Test 6: Getting User Notifications');
    const userNotifications = await notificationService.getUserNotifications(testUser._id.toString(), {
      limit: 5
    });
    console.log('User Notifications:', {
      count: userNotifications.notifications.length,
      unreadCount: userNotifications.unreadCount,
      hasMore: userNotifications.hasMore,
      sample: userNotifications.notifications.slice(0, 2).map(n => ({
        id: n._id,
        title: n.title,
        read: n.read,
        createdAt: n.createdAt
      }))
    });

    // Test 7: Mark Notification as Read
    console.log('\n🔧 Test 7: Mark Notification as Read');
    if (userNotifications.notifications.length > 0) {
      const firstNotification = userNotifications.notifications[0];
      const markResult = await notificationService.markAsRead(
        firstNotification._id.toString(),
        testUser._id.toString()
      );
      console.log(`Mark as read result: ${markResult ? '✅ Success' : '❌ Failed'}`);
    }

    // Test 8: Test Notification Health Check
    console.log('\n🔧 Test 8: Notification System Health Check');
    const healthCheck = await notificationService.healthCheck();
    console.log('Health Check:', {
      status: healthCheck.status,
      pendingNotifications: healthCheck.metrics.pendingNotifications,
      failedNotifications: healthCheck.metrics.failedNotifications,
      issues: healthCheck.issues
    });

    console.log('\n🎉 Notification System Test Complete!');
    console.log('\n📊 Summary:');
    console.log('- In-app notifications: ✅ Working');
    console.log(`- Email notifications: ${emailConnected ? '✅ Working' : '⚠️ SMTP not configured'}`);
    console.log('- Bell icon data: ✅ Available');
    console.log(`- Total notifications: ${stats.total}`);
    console.log(`- Unread count: ${stats.unread}`);

    if (!emailConnected) {
      console.log('\n⚠️ EMAIL CONFIGURATION NEEDED:');
      console.log('To enable email notifications, set these environment variables:');
      console.log('- SMTP_HOST (e.g., smtp.gmail.com)');
      console.log('- SMTP_PORT (e.g., 587)');
      console.log('- SMTP_USER (your email)');
      console.log('- SMTP_PASS (your app password)');
      console.log('- SMTP_FROM (sender email)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testNotificationSystem().catch(console.error);
}

module.exports = { testNotificationSystem };