const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Readable } = require('stream');

// Test Gemini API configuration
const API_KEY = 'AIzaSyCtBf6MjCPWkNR560Zlyitq_2cmqWZ3hro';

async function testGeminiStream() {
  console.log('🤖 Testing Gemini API streaming...');
  
  if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not found');
    return;
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  try {
    const prompt = `
You are an expert AI Career Coach. Analyze this resume and provide career advice:

Resume: {"title": "Software Engineer", "workExperience": [{"jobTitle": "Frontend Developer", "company": "Tech Corp", "responsibilities": ["Built React apps", "Improved performance"]}]}

Question: "How can I improve my resume to get more interviews?"

Provide 3-5 actionable recommendations.
`;

    console.log('📡 Starting stream...');
    const result = await model.generateContentStream(prompt);
    
    // Create a readable stream
    const stream = new Readable({
      read() {}
    });

    let fullResponse = '';
    
    // Process the stream
    (async () => {
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullResponse += chunkText;
            console.log('📥 Chunk:', chunkText.substring(0, 50) + '...');
            stream.push(chunkText);
          }
        }
        stream.push(null); // End the stream
        console.log('✅ Stream completed');
        console.log('📄 Full response length:', fullResponse.length);
      } catch (error) {
        console.error('❌ Error in stream processing:', error);
        stream.destroy(error);
      }
    })();

    // Test reading from stream
    stream.on('data', (chunk) => {
      console.log('🔥 Received chunk size:', chunk.length);
    });

    stream.on('end', () => {
      console.log('🏁 Stream ended successfully');
    });

    stream.on('error', (error) => {
      console.error('💥 Stream error:', error);
    });

    // Wait a bit to see the results
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Error creating Gemini stream:', error);
  }
}

testGeminiStream();