import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { Resume } from '../src/models/Resume';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config();

async function checkResumeCreationBehavior() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();

    console.log('\n🕒 Resume Creation Timeline Analysis:');
    
    const resumes = await Resume.find({})
      .select('_id title userId createdAt updatedAt personalInfo.firstName personalInfo.lastName')
      .sort({ createdAt: 1 });

    console.log(`Found ${resumes.length} total resume(s):`);

    resumes.forEach((resume, i) => {
      const owner = resume.personalInfo;
      const createdDate = new Date(resume.createdAt).toLocaleString();
      const updatedDate = new Date(resume.updatedAt).toLocaleString();
      const isUpdated = resume.updatedAt.getTime() !== resume.createdAt.getTime();
      
      console.log(`\n📄 Resume ${i + 1}:`);
      console.log(`   Title: "${resume.title}"`);
      console.log(`   Owner: ${owner?.firstName} ${owner?.lastName}`);
      console.log(`   User ID: ${resume.userId}`);
      console.log(`   Created: ${createdDate}`);
      console.log(`   Updated: ${updatedDate}`);
      console.log(`   ${isUpdated ? '🔄 WAS UPDATED' : '✨ NEVER UPDATED'}`);
      
      if (isUpdated) {
        const timeDiff = resume.updatedAt.getTime() - resume.createdAt.getTime();
        const minutes = Math.round(timeDiff / (1000 * 60));
        console.log(`   ⏰ Updated ${minutes} minutes after creation`);
      }
    });

    // Check for potential duplicate detection logic
    console.log('\n🔍 Checking for duplicate resume patterns:');
    
    const userResumes = await Resume.aggregate([
      {
        $group: {
          _id: '$userId',
          resumeCount: { $sum: 1 },
          resumes: { 
            $push: { 
              title: '$title', 
              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
              id: '$_id'
            } 
          }
        }
      }
    ]);

    userResumes.forEach(userGroup => {
      console.log(`\n👤 User ${userGroup._id}: ${userGroup.resumeCount} resume(s)`);
      userGroup.resumes.forEach((resume, i) => {
        const created = new Date(resume.createdAt).toLocaleString();
        const isUpdated = new Date(resume.updatedAt).getTime() !== new Date(resume.createdAt).getTime();
        console.log(`   ${i + 1}. "${resume.title}" - Created: ${created} ${isUpdated ? '(UPDATED)' : ''}`);
      });
    });

    // Check if there might be duplicate prevention logic
    console.log('\n🚨 Potential Issues:');
    
    // Check for resumes with same title
    const titleGroups = await Resume.aggregate([
      {
        $group: {
          _id: { userId: '$userId', title: '$title' },
          count: { $sum: 1 },
          resumes: { $push: { id: '$_id', createdAt: '$createdAt' } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (titleGroups.length > 0) {
      console.log('❌ Found duplicate titles (might indicate update instead of create):');
      titleGroups.forEach(group => {
        console.log(`   User ${group._id.userId}: "${group._id.title}" appears ${group.count} times`);
      });
    } else {
      console.log('✅ No duplicate titles found');
    }

    // Check resume creation service logic
    console.log('\n📋 Resume Creation Logic Check:');
    console.log('Looking for clues in the database about creation vs update behavior...');
    
    // Check if there are any unique constraints or indexes that might prevent duplicates
    const indexes = await Resume.collection.listIndexes().toArray();
    console.log('\n📊 Database Indexes:');
    indexes.forEach(index => {
      console.log(`   ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`   ⚠️ UNIQUE INDEX - prevents duplicates!`);
      }
    });

    console.log('\n✅ Resume creation behavior check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Creation behavior check failed:', error);
    process.exit(1);
  }
}

checkResumeCreationBehavior();