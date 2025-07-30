const axios = require('axios');

async function testApplicationCreation() {
  try {
    // First, let's check what resumes exist in the database
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://localhost:27017/ai-job-suite');
    
    const Resume = mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));
    const resumes = await Resume.find({}).limit(1);
    
    if (resumes.length === 0) {
      console.log('❌ No resumes found - cannot test with real resume ID');
      process.exit(1);
    }
    
    const testResume = resumes[0];
    console.log('📋 Using test resume:', {
      id: testResume._id.toString(),
      title: testResume.title,
      hasPersonalInfo: !!testResume.personalInfo,
      skillsCount: testResume.skills?.length || 0
    });
    
    // Create test application data matching frontend format
    const applicationData = {
      jobTitle: "Senior JavaScript Developer",
      companyName: "Test Company",
      jobDescription: "We are looking for a Senior JavaScript Developer with experience in React, Node.js, and TypeScript. The ideal candidate should have 3+ years of experience building scalable web applications.",
      jobUrl: "https://example.com/job",
      jobSource: "manual",
      jobLocation: {
        city: "San Francisco",
        state: "CA",
        country: "USA",
        remote: true,
        hybrid: false
      },
      compensation: {
        salaryRange: {
          min: 80000,
          max: 120000,
          currency: "USD",
          period: "yearly"
        }
      },
      applicationMethod: "online",
      documentsUsed: {
        resumeId: testResume._id.toString(),
        resumeContent: JSON.stringify(testResume.toObject()),
        coverLetterId: null
      },
      applicationStrategy: {
        whyInterested: "Great company culture and growth opportunities",
        keySellingPoints: ["React expertise", "Full-stack experience"],
        uniqueValueProposition: "Strong background in scalable architectures"
      }
    };
    
    console.log('🚀 Testing application creation...');
    console.log('📄 Resume ID being sent:', applicationData.documentsUsed.resumeId);
    console.log('📄 Resume content length:', applicationData.documentsUsed.resumeContent.length);
    
    // Test the creation endpoint
    const response = await axios.post('http://localhost:3001/api/v1/job-applications', applicationData, {
      headers: {
        'Content-Type': 'application/json',
        // Add fake auth token - we'll need to handle this
      }
    });
    
    console.log('✅ API Response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:', error.response.data);
      console.log('❌ Status:', error.response.status);
    } else {
      console.log('❌ Request Error:', error.message);
    }
  }
  
  process.exit(0);
}

testApplicationCreation();