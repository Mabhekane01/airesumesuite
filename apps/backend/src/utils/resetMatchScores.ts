import mongoose from 'mongoose';
import { JobApplication } from '../models/JobApplication';

export async function resetAllMatchScores(): Promise<{
  total: number;
  updated: number;
  message: string;
}> {
  try {
    console.log('🔄 Starting match score reset operation...');
    
    // Find all applications with match scores
    const allApplications = await JobApplication.find({
      'metrics.applicationScore': { $exists: true, $ne: 0 }
    });
    
    console.log(`📊 Found ${allApplications.length} applications with existing match scores`);
    
    // Reset all match scores to 0 to force fresh analysis
    const updateResult = await JobApplication.updateMany(
      { 'metrics.applicationScore': { $exists: true, $ne: 0 } },
      { 
        $set: { 
          'metrics.applicationScore': 0,
          'metrics.lastAnalysisDate': undefined,
          'metrics.analysisVersion': undefined
        }
      }
    );
    
    console.log(`✅ Reset ${updateResult.modifiedCount} application match scores`);
    
    return {
      total: allApplications.length,
      updated: updateResult.modifiedCount,
      message: `Successfully reset ${updateResult.modifiedCount} match scores. Fresh AI analysis will be performed on next calculation.`
    };
    
  } catch (error) {
    console.error('❌ Error resetting match scores:', error);
    throw new Error(`Failed to reset match scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cleanupStaticScores(staticScore: number = 78): Promise<{
  found: number;
  updated: number;
  message: string;
}> {
  try {
    console.log(`🧹 Cleaning up applications with static score: ${staticScore}%`);
    
    // Find applications with the specific static score
    const staticApplications = await JobApplication.find({
      'metrics.applicationScore': staticScore
    });
    
    console.log(`🎯 Found ${staticApplications.length} applications with ${staticScore}% score`);
    
    if (staticApplications.length > 0) {
      // Reset these specific scores
      const updateResult = await JobApplication.updateMany(
        { 'metrics.applicationScore': staticScore },
        { 
          $set: { 
            'metrics.applicationScore': 0,
            'metrics.lastAnalysisDate': undefined,
            'metrics.analysisVersion': undefined
          }
        }
      );
      
      console.log(`🔧 Reset ${updateResult.modifiedCount} static scores`);
      
      return {
        found: staticApplications.length,
        updated: updateResult.modifiedCount,
        message: `Found and reset ${updateResult.modifiedCount} applications with static ${staticScore}% score`
      };
    }
    
    return {
      found: 0,
      updated: 0,
      message: `No applications found with ${staticScore}% score`
    };
    
  } catch (error) {
    console.error('❌ Error cleaning static scores:', error);
    throw new Error(`Failed to clean static scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}