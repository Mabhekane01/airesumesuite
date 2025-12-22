// Simple test function to debug AI API issues
export const testAIEndpoints = async () => {
  console.log('🧪 Testing AI endpoints...');
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No auth token found');
    return;
  }

  const baseUrl = 'http://localhost:3001/api/v1';
  
  // Test 1: Basic AI generate
  try {
    console.log('1️⃣ Testing AI generate endpoint...');
    const response = await fetch(`${baseUrl}/cover-letters/ai-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jobTitle: 'Test Engineer',
        companyName: 'Test Company',
        tone: 'professional'
      })
    });
    
    const data = await response.json();
    console.log('✅ AI Generate Response:', { status: response.status, data });
  } catch (error) {
    console.error('❌ AI Generate Error:', error);
  }

  // Test 2: AI enhance  
  try {
    console.log('2️⃣ Testing AI enhance endpoint...');
    const testContent = `Dear Hiring Manager,

I am writing to express my interest in the Test Engineer position at Test Company. I have experience in software testing and would like to work for your company.

My background includes working with various testing tools and methodologies. I believe I can contribute to your team's success.

Thank you for considering my application.

Sincerely,
John Doe`;

    const response = await fetch(`${baseUrl}/cover-letters/ai-enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: testContent,
        tone: 'professional',
        jobDescription: 'Test Engineer position at Test Company',
        focusAreas: ['strengthen language', 'improve flow', 'add impact']
      })
    });
    
    const data = await response.json();
    console.log('✅ AI Enhance Response:', { 
      status: response.status, 
      success: data.success,
      hasEnhancedContent: !!data.data?.enhancedContent,
      enhancedLength: data.data?.enhancedContent?.length || 0,
      improvementsCount: data.data?.improvements?.length || 0,
      message: data.message
    });
    
    if (data.data?.enhancedContent) {
      console.log('📝 Enhanced content preview:', data.data.enhancedContent.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('❌ AI Enhance Error:', error);
  }

  // Test 3: Download endpoint
  try {
    console.log('3️⃣ Testing download endpoint...');
    const response = await fetch(`${baseUrl}/cover-letters/download-with-data/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        coverLetterData: {
          title: 'Test Cover Letter',
          content: 'This is test content.',
          jobTitle: 'Test Engineer',
          companyName: 'Test Company',
          tone: 'professional'
        }
      })
    });
    
    console.log('✅ Download Response:', { status: response.status, type: response.headers.get('content-type') });
  } catch (error) {
    console.error('❌ Download Error:', error);
  }
};

// Add to window for easy testing
(window as any).testAI = testAIEndpoints;