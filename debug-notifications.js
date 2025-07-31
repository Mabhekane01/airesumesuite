const mongoose = require('mongoose');

// Simple script to check if notifications are being stored in MongoDB
async function checkNotifications() {
  try {
    // Connect to MongoDB (update with your connection string if different)
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-job-suite';
    
    console.log('🔌 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get notification collection
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    
    // Count total notifications
    const totalCount = await Notification.countDocuments();
    console.log(`📊 Total notifications in database: ${totalCount}`);
    
    if (totalCount > 0) {
      // Get recent notifications
      const recentNotifications = await Notification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      console.log('📋 Recent notifications:');
      recentNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} - ${notification.type} - ${notification.category}`);
        console.log(`     Created: ${notification.createdAt}`);
        console.log(`     User: ${notification.userId}`);
        console.log(`     Read: ${notification.read}`);
        console.log('');
      });
    } else {
      console.log('❌ No notifications found in database');
      console.log('');
      console.log('💡 This could mean:');
      console.log('   1. No users have logged in since the notification fix');
      console.log('   2. Notifications are being created but not saved due to validation errors');
      console.log('   3. Database connection issues');
      console.log('   4. Model registration issues');
    }
    
    // Check if users exist
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const userCount = await User.countDocuments();
    console.log(`👥 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const recentUser = await User.findOne().sort({ createdAt: -1 });
      console.log(`📧 Most recent user: ${recentUser?.email} (${recentUser?._id})`);
    }
    
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkNotifications();