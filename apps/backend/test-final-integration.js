require('dotenv').config();
const mongoose = require('mongoose');

async function testFinalIntegration() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-job-suite');
    console.log('Connected to database');
    
    // First, update an existing application to have the resume ID
    const JobApplication = mongoose.model('JobApplication', new mongoose.Schema({}, { strict: false }));
    const Resume = mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));
    
    // Get the enhanced resume we just created
    const resume = await Resume.findOne({});
    console.log(`📄 Using enhanced resume: ${resume._id}`);
    console.log(`   Work Experience: ${resume.workExperience?.length || 0} entries`);
    console.log(`   Skills: ${resume.skills?.length || 0} skills`);
    
    // Get an existing application
    const application = await JobApplication.findOne({});
    console.log(`📋 Using application: ${application._id}`);
    console.log(`   Job: ${application.jobTitle} at ${application.companyName}`);
    
    // Update the application to have the resume ID
    console.log('🔧 Updating application with resume ID...');
    application.documentsUsed = {
      resumeId: resume._id,
      resumeContent: null // Let the system fetch it
    };
    await application.save();
    
    console.log('✅ Application updated with resume ID');
    
    // Now test the AI analysis using the service directly
    console.log('\n🤖 Testing AI match score calculation...');
    const { jobApplicationService } = require('./dist/services/jobApplicationService.js');
    
    const result = await jobApplicationService.calculateMatchScore(
      application.userId.toString(),
      application._id.toString()
    );
    
    console.log('\n🎉 AI ANALYSIS RESULTS:');
    console.log(`   Match Score: ${result.matchScore}%`);
    console.log(`   Match Reasons: ${result.matchReasons?.length || 0} reasons`);
    console.log(`   Improvement Suggestions: ${result.improvementSuggestions?.length || 0} suggestions`);
    console.log(`   Keywords Matched: ${result.keywordMatches?.length || 0} keywords`);
    
    if (result.matchScore > 0) {
      console.log('\n🎊 SUCCESS! The match score system is now working!');
      console.log(`✅ AI calculated a ${result.matchScore}% match score`);
      
      // Check that the application was updated in the database
      const updatedApp = await JobApplication.findById(application._id);
      console.log(`💾 Database updated: ${updatedApp.metrics?.applicationScore}%`);
      
    } else {
      console.log('\n❌ Still not working - match score is 0');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
  
  process.exit(0);
}

testFinalIntegration();