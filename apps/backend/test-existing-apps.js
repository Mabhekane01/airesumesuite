const mongoose = require('mongoose');

async function testExistingApplications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-job-suite');
    console.log('Connected to database');
    
    // Test existing applications to manually trigger match score calculation
    const JobApplication = mongoose.model('JobApplication', new mongoose.Schema({}, { strict: false }));
    const apps = await JobApplication.find({}).limit(3);
    
    console.log('=== TESTING EXISTING APPLICATIONS ===');
    
    for (const app of apps) {
      console.log(`\n📋 Application: ${app.jobTitle} at ${app.companyName}`);
      console.log(`   ID: ${app._id}`);
      console.log(`   Has documentsUsed: ${!!app.documentsUsed}`);
      console.log(`   Resume ID: ${app.documentsUsed?.resumeId || 'NONE'}`);
      console.log(`   Resume Content: ${!!app.documentsUsed?.resumeContent} (${app.documentsUsed?.resumeContent?.length || 0} chars)`);
      console.log(`   Current Match Score: ${app.metrics?.applicationScore || 'UNDEFINED'}`);
      
      // Try to manually call the match score calculation API
      try {
        const axios = require('axios');
        
        // This would require authentication, so we'll skip for now
        console.log(`   🔄 Would call: POST /api/v1/job-applications/${app._id}/match-score`);
        
      } catch (error) {
        console.log(`   ❌ API call failed: ${error.message}`);
      }
    }
    
    // Also check what resumes exist for this user
    const Resume = mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));
    const resumes = await Resume.find({}).limit(3);
    
    console.log('\n=== AVAILABLE RESUMES ===');
    resumes.forEach((resume, i) => {
      console.log(`Resume ${i+1}:`);
      console.log(`   ID: ${resume._id}`);
      console.log(`   User: ${resume.userId}`);
      console.log(`   Title: ${resume.title}`);
      console.log(`   Work Experience: ${resume.workExperience?.length || 0} entries`);
      console.log(`   Skills: ${resume.skills?.length || 0} skills`);
      
      // Show a brief preview of work experience
      if (resume.workExperience && resume.workExperience.length > 0) {
        const firstJob = resume.workExperience[0];
        console.log(`   First Job: ${firstJob.jobTitle} at ${firstJob.company}`);
      } else {
        console.log(`   ⚠️ NO WORK EXPERIENCE - This is likely why AI analysis fails!`);
      }
    });
    
    console.log('\n=== SOLUTION SUMMARY ===');
    console.log('🔍 Key Issues Found:');
    console.log('1. Applications may not have resumeId properly set');
    console.log('2. Resumes may have insufficient content (no work experience)');
    console.log('3. Need to ensure AI analysis can fetch resume content when resumeId is provided');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Create a test application with a proper resumeId');
    console.log('2. Ensure resumes have meaningful work experience content');
    console.log('3. Test the AI analysis API endpoint directly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

testExistingApplications();