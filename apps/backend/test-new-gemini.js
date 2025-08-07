require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testNewGeminiSDK() {
  try {
    console.log('🔑 API Key present:', !!process.env.GEMINI_API_KEY);
    
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    console.log('✅ Client created successfully');
    
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, respond with just 'API Working'",
    });
    
    console.log('✅ API Response:', response.text);
    console.log('🎉 New Gemini SDK is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing new SDK:', error.message);
    console.error('Error details:', error);
  }
}

testNewGeminiSDK();