// Test script to debug payment verification
const jwt = require('jsonwebtoken');

// Generate a test JWT token (you'll need to match your JWT_SECRET from .env)
const testPayload = {
  id: '507f1f77bcf86cd799439011', // Sample MongoDB ObjectId
  email: 'test@example.com'
};

// You'll need to replace 'your-jwt-secret' with your actual JWT_SECRET
const testToken = jwt.sign(testPayload, 'your-jwt-secret-here', { expiresIn: '1h' });

console.log('Test token:', testToken);
console.log('\nTest the endpoint with:');
console.log(`curl -X GET "http://localhost:3001/api/payments/verify/ENTERPRISE_1753898746601_LDJOD3" -H "Authorization: Bearer ${testToken}" -H "Content-Type: application/json"`);