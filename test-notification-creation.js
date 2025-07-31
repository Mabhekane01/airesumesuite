const mongoose = require('mongoose');

async function testNotificationCreation() {
  try {
    console.log('🧪 Testing notification creation directly...');
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-job-suite';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import the notification model
    const { Notification } = require('./apps/backend/src/models/Notification');
    const { NotificationPreferences } = require('./apps/backend/src/models/NotificationPreferences');
    
    // Get a test user ID
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const testUser = await User.findOne().sort({ createdAt: -1 });
    
    if (!testUser) {
      console.error('❌ No users found in database');
      return;
    }
    
    console.log('👤 Using test user:', testUser.email, testUser._id);

    // Test 1: Create notification directly
    console.log('\n🧪 Test 1: Creating notification directly...');
    
    const testNotification = new Notification({
      userId: testUser._id,
      type: 'success',
      category: 'authentication',
      title: 'Test Direct Creation',
      message: 'This is a direct test notification',
      priority: 'medium',
      read: false,
      deliveryStatus: 'delivered',
      deliveryAttempts: 1,
      deliveredAt: new Date()
    });

    try {
      const savedNotification = await testNotification.save();
      console.log('✅ Direct notification creation SUCCESS:', savedNotification._id);
      
      // Verify it was saved
      const found = await Notification.findById(savedNotification._id);
      console.log('✅ Notification found in database:', !!found);
      
    } catch (error) {
      console.error('❌ Direct notification creation FAILED:', error.message);
      if (error.errors) {
        Object.keys(error.errors).forEach(field => {
          console.error(`   - ${field}: ${error.errors[field].message}`);
        });
      }
    }

    // Test 2: Test NotificationPreferences
    console.log('\n🧪 Test 2: Testing NotificationPreferences...');
    
    try {
      const preferences = await NotificationPreferences.getOrCreateForUser(testUser._id);
      console.log('✅ NotificationPreferences work:', !!preferences);
      console.log('   - Enabled:', preferences.enabled);
      console.log('   - Auth category enabled:', preferences.categories?.authentication?.enabled);
      
      const shouldSend = await NotificationPreferences.shouldSendNotification(
        testUser._id,
        'authentication',
        'inApp'
      );
      console.log('   - Should send auth notification:', shouldSend);
      
    } catch (error) {
      console.error('❌ NotificationPreferences FAILED:', error.message);
    }

    // Test 3: Test NotificationService
    console.log('\n🧪 Test 3: Testing NotificationService...');
    
    try {
      const { notificationService } = require('./apps/backend/src/services/notificationService');
      
      const serviceNotification = await notificationService.createNotification({
        userId: testUser._id.toString(),
        type: 'success',
        category: 'authentication',
        title: 'Test Service Creation',
        message: 'This is a service test notification',
        priority: 'medium'
      });
      
      if (serviceNotification) {
        console.log('✅ NotificationService creation SUCCESS:', serviceNotification._id);
      } else {
        console.log('❌ NotificationService returned null - likely blocked by preferences');
      }
      
    } catch (error) {
      console.error('❌ NotificationService FAILED:', error.message);
    }

    // Test 4: Test Auth notification specifically
    console.log('\n🧪 Test 4: Testing sendAuthNotification...');
    
    try {
      const { notificationService } = require('./apps/backend/src/services/notificationService');
      
      const authNotification = await notificationService.sendAuthNotification(
        testUser._id.toString(),
        'login_success',
        {
          loginTime: new Date(),
          location: 'Test Location',
          userAgent: 'Test Agent'
        }
      );
      
      if (authNotification) {
        console.log('✅ sendAuthNotification SUCCESS:', authNotification._id);
      } else {
        console.log('❌ sendAuthNotification returned null');
      }
      
    } catch (error) {
      console.error('❌ sendAuthNotification FAILED:', error.message);
    }

    // Final count
    const finalCount = await Notification.countDocuments();
    console.log(`\n📊 Final notification count: ${finalCount}`);
    
    // List all notifications
    if (finalCount > 0) {
      const allNotifications = await Notification.find().sort({ createdAt: -1 });
      console.log('\n📋 All notifications:');
      allNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title} (${notif.type}) - User: ${notif.userId}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testNotificationCreation();