const mongoose = require('mongoose');

async function testMatchScore() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-job-suite');
    console.log('Connected to database');
    
    // Create a test application with real resume content
    const jobDescription = `
We are looking for a Senior Software Engineer with 5+ years of experience in JavaScript, React, Node.js, and TypeScript. 
The ideal candidate should have experience with:
- Frontend development with React and TypeScript
- Backend APIs with Node.js and Express
- Database experience with MongoDB or PostgreSQL
- Experience with cloud platforms (AWS, GCP)
- Agile development methodologies
- Strong problem-solving skills and ability to work in a team environment

Responsibilities:
- Design and develop scalable web applications
- Collaborate with cross-functional teams
- Mentor junior developers
- Participate in code reviews and technical discussions
- Drive technical decisions and architecture choices
    `.trim();

    const resumeContent = JSON.stringify({
      personalInfo: {
        firstName: "John",
        lastName: "Developer",
        email: "john@example.com",
        phone: "555-123-4567"
      },
      professionalSummary: "Experienced software engineer with 6 years of experience in full-stack development using JavaScript, React, Node.js, and TypeScript.",
      workExperience: [
        {
          jobTitle: "Senior Software Engineer",
          company: "Tech Corp",
          location: "San Francisco, CA",
          startDate: "2020-01-01",
          endDate: "2024-01-01",
          responsibilities: [
            "Developed and maintained React applications using TypeScript",
            "Built RESTful APIs using Node.js and Express",
            "Worked with MongoDB and PostgreSQL databases",
            "Implemented CI/CD pipelines on AWS",
            "Led a team of 3 junior developers"
          ]
        },
        {
          jobTitle: "Software Engineer",
          company: "Startup Inc",
          location: "Remote",
          startDate: "2018-06-01",
          endDate: "2019-12-31",
          responsibilities: [
            "Built frontend components with React and JavaScript",
            "Developed backend services with Node.js",
            "Participated in agile development processes"
          ]
        }
      ],
      skills: [
        { name: "JavaScript", category: "technical", proficiencyLevel: "expert" },
        { name: "React", category: "technical", proficiencyLevel: "expert" },
        { name: "Node.js", category: "technical", proficiencyLevel: "expert" },
        { name: "TypeScript", category: "technical", proficiencyLevel: "advanced" },
        { name: "MongoDB", category: "technical", proficiencyLevel: "advanced" },
        { name: "AWS", category: "technical", proficiencyLevel: "intermediate" }
      ],
      education: [
        {
          institution: "University of Technology",
          degree: "Bachelor of Science",
          fieldOfStudy: "Computer Science",
          graduationDate: "2018-05-01"
        }
      ]
    });

    console.log('=== TESTING AI MATCH SCORE CALCULATION ===');
    console.log(`Job Description: ${jobDescription.length} characters`);
    console.log(`Resume Content: ${resumeContent.length} characters`);
    
    // Test the Gemini service directly
    const { geminiService } = require('./dist/services/ai/gemini.js');
    
    console.log('\n🤖 Calling Gemini service...');
    const startTime = Date.now();
    
    const result = await geminiService.calculateJobMatchScore(
      jobDescription,
      resumeContent,
      "Senior Software Engineer",
      "Test Company"
    );
    
    const endTime = Date.now();
    console.log(`✅ Analysis completed in ${endTime - startTime}ms`);
    console.log('\n=== RESULTS ===');
    console.log(`Match Score: ${result.matchScore}%`);
    console.log(`Match Reasons: ${result.matchReasons?.length || 0} reasons`);
    console.log(`Improvement Suggestions: ${result.improvementSuggestions?.length || 0} suggestions`);
    console.log(`Keyword Matches: ${result.keywordMatches?.length || 0} keywords`);
    console.log(`Skills Matched: ${result.skillsAlignment?.matched?.length || 0}`);
    console.log(`Skills Missing: ${result.skillsAlignment?.missing?.length || 0}`);
    
    if (result.matchScore > 0) {
      console.log('\n✅ AI ANALYSIS IS WORKING!');
      console.log('✅ The issue is not with the AI service itself.');
    } else {
      console.log('\n❌ AI ANALYSIS FAILED!');
      console.log('❌ The AI service is not working properly.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMatchScore();