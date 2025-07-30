require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');

async function testResumeFlow() {
  try {
    console.log('🔑 GEMINI_API_KEY configured:', !!process.env.GEMINI_API_KEY);
    
    await mongoose.connect('mongodb://localhost:27017/ai-job-suite');
    console.log('Connected to database');
    
    // Get an existing resume
    const Resume = mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));
    const resumes = await Resume.find({}).limit(1);
    
    if (resumes.length === 0) {
      console.log('❌ No resumes found - creating a test resume first');
      
      // Create a test resume with meaningful content
      const testResume = new Resume({
        userId: mongoose.Types.ObjectId('68853563bddc528be242b1ba'), // Use existing user
        title: 'Software Engineer Resume',
        personalInfo: {
          firstName: 'John',
          lastName: 'Developer',
          email: 'john@example.com',
          phone: '555-123-4567',
          location: 'San Francisco, CA'
        },
        professionalSummary: 'Experienced software engineer with 5+ years in full-stack development using JavaScript, React, Node.js, and TypeScript.',
        workExperience: [
          {
            jobTitle: 'Senior Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            startDate: new Date('2020-01-01'),
            endDate: new Date('2024-01-01'),
            isCurrent: false,
            responsibilities: [
              'Developed React applications with TypeScript',
              'Built Node.js APIs and microservices',
              'Worked with MongoDB and PostgreSQL',
              'Implemented CI/CD pipelines'
            ]
          }
        ],
        skills: [
          { name: 'JavaScript', category: 'technical', proficiencyLevel: 'expert' },
          { name: 'React', category: 'technical', proficiencyLevel: 'expert' },
          { name: 'Node.js', category: 'technical', proficiencyLevel: 'advanced' },
          { name: 'TypeScript', category: 'technical', proficiencyLevel: 'advanced' }
        ],
        education: [
          {
            institution: 'University of Technology',
            degree: 'Bachelor of Science',
            fieldOfStudy: 'Computer Science',
            graduationDate: new Date('2018-05-01')
          }
        ]
      });
      
      await testResume.save();
      console.log(`✅ Created test resume with ID: ${testResume._id}`);
      resumes.push(testResume);
    }
    
    const testResume = resumes[0];
    console.log('📋 Using resume:', {
      id: testResume._id.toString(),
      title: testResume.title,
      hasWorkExp: (testResume.workExperience?.length || 0) > 0,
      skillsCount: testResume.skills?.length || 0
    });
    
    // Create a job application using the jobApplicationService
    const { jobApplicationService } = require('./dist/services/jobApplicationService.js');
    
    const applicationData = {
      jobTitle: "Senior JavaScript Developer",
      companyName: "AI Startup Inc",
      jobDescription: `We are looking for a Senior JavaScript Developer with 3+ years of experience in React, Node.js, and TypeScript. 
      
Key Requirements:
- Expert level JavaScript and TypeScript
- Strong React experience with hooks and modern patterns
- Node.js backend development experience
- Experience with databases (MongoDB preferred)
- Understanding of CI/CD processes
- Strong problem-solving skills

Responsibilities:
- Build scalable web applications
- Collaborate with cross-functional teams
- Mentor junior developers
- Participate in code reviews`,
      
      jobLocation: {
        city: "San Francisco",
        state: "CA", 
        country: "USA",
        remote: true,
        hybrid: false
      },
      
      compensation: {
        salaryRange: {
          min: 100000,
          max: 140000,
          currency: "USD",
          period: "yearly"
        }
      },
      
      documentsUsed: {
        resumeId: testResume._id.toString(),
        // Don't include resumeContent - let the system fetch it
      },
      
      jobSource: "manual",
      applicationMethod: "online"
    };
    
    console.log('\n🚀 Testing application creation with resume ID...');
    console.log('📄 Resume ID:', applicationData.documentsUsed.resumeId);
    console.log('📄 Job description length:', applicationData.jobDescription.length);
    
    const application = await jobApplicationService.createApplication(
      '68853563bddc528be242b1ba', // Use existing user ID
      applicationData
    );
    
    console.log('\n✅ Application created successfully!');
    console.log('📊 Results:', {
      applicationId: application._id.toString(),
      matchScore: application.metrics?.applicationScore,
      hasResumeId: !!application.documentsUsed?.resumeId,
      hasResumeContent: !!application.documentsUsed?.resumeContent,
      resumeContentLength: application.documentsUsed?.resumeContent?.length || 0
    });
    
    if (application.metrics?.applicationScore > 0) {
      console.log('🎉 SUCCESS! AI analysis worked and calculated a match score!');
    } else {
      console.log('❌ ISSUE: Match score is still 0');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testResumeFlow();