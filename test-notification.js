const axios = require('axios');

// Test notification creation
async function testNotificationCreation() {
  try {
    console.log('🧪 Testing notification creation...');
    
    // You'll need to replace this with a valid access token from a logged-in user
    const accessToken = 'YOUR_ACCESS_TOKEN_HERE';
    
    if (accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
      console.log('❌ Please update the access token in the test file');
      console.log('   1. Login to the app');
      console.log('   2. Open browser dev tools');
      console.log('   3. Go to Application/Storage tab');
      console.log('   4. Find the access token and replace it in this file');
      return;
    }
    
    const baseURL = 'http://localhost:3001/api/v1';
    
    // Test creating a notification
    const response = await axios.post(`${baseURL}/notifications/test`, {
      type: 'success',
      category: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      priority: 'medium'
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Notification created successfully:', response.data);
    
    // Test fetching notifications
    const fetchResponse = await axios.get(`${baseURL}/notifications`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Notifications fetched:', {
      count: fetchResponse.data.data.notifications.length,
      unreadCount: fetchResponse.data.data.unreadCount,
      totalCount: fetchResponse.data.data.totalCount
    });
    
    if (fetchResponse.data.data.notifications.length > 0) {
      console.log('📋 Latest notification:', fetchResponse.data.data.notifications[0]);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testNotificationCreation();