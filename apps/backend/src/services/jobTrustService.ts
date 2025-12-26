import { JobPosting } from '../models/JobPosting';
import { JobFeedback, IJobFeedback } from '../models/JobFeedback';
import { User } from '../models/User';
import mongoose from 'mongoose';

interface ScoreComponents {
  responseScore: number;
  legitimacyScore: number;
  totalReviews: number;
}

export const jobTrustService = {
  /**
   * Calculate and update the authenticity score for a job posting.
   * This implements the 'Time Decay' and 'Weighted Reputation' logic.
   */
  async updateJobAuthenticityScore(jobId: string): Promise<void> {
    console.log(`🛡️ Updating Trust Score for Job: ${jobId}`);
    
    const job = await JobPosting.findById(jobId);
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return;
    }
    if (job.isLocked) {
      console.log(`🔒 Job is locked, skipping score update.`);
      return; 
    }

    const reviews = await JobFeedback.find({ jobId: new mongoose.Types.ObjectId(jobId) });
    console.log(`📊 Found ${reviews.length} reviews for job ${jobId}`);

    if (reviews.length === 0) {
      // Reset if no reviews
      await JobPosting.updateOne(
        { _id: jobId },
        { 
          $set: {
            authenticityScore: 50,
            trustBadges: [],
            reviewCount: 0
          }
        }
      );
      return;
    }

    let weightedSum = 0;
    let totalWeight = 0;
    
    // Track signals for badges
    let scamReports = 0;
    let interviewConfirmations = 0;
    let responseConfirmations = 0;
    let noResponseReports = 0;

    const now = new Date();

    for (const review of reviews) {
      // 1. Time Decay: Reviews > 90 days lose 50% weight, > 180 days lose 90%
      const daysOld = (now.getTime() - new Date(review.createdAt).getTime()) / (1000 * 3600 * 24);
      let timeWeight = 1.0;
      if (daysOld > 180) timeWeight = 0.1;
      else if (daysOld > 90) timeWeight = 0.5;

      // 2. User Reputation Weight (captured at creation time)
      const userWeight = review.userWeightAtCreation || 1.0;

      const combinedWeight = timeWeight * userWeight;

      // 3. Score Calculation based on Feedback Type
      let scoreImpact = 0; // 0-100 scale impact
      
      switch (review.feedbackType) {
        case 'hired':
        case 'interview':
          scoreImpact = 100; // Strongest positive signal
          interviewConfirmations++;
          break;
        case 'response':
          scoreImpact = 80; // Good signal
          responseConfirmations++;
          break;
        case 'rejected':
          scoreImpact = 70; // At least they responded
          responseConfirmations++;
          break;
        case 'ghosted':
        case 'expired':
          scoreImpact = 40; // Negative but common
          noResponseReports++;
          break;
        case 'payment_required':
        case 'scam':
          scoreImpact = 0; // Strongest negative signal
          scamReports++;
          break;
      }
      
      // Explicit structured data override
      if (review.isReal === false) scoreImpact = 0;
      if (review.askedForMoney) scoreImpact = 0;

      weightedSum += scoreImpact * combinedWeight;
      totalWeight += combinedWeight;
    }

    // Calculate final score
    const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;

    // 4. Determine Trust Badges
    const badges: string[] = [];
    
    // Community Verified: High score + minimum reviews
    if (finalScore >= 80 && reviews.length >= 3) {
      badges.push('verified');
    }

    // Active Responder: High response confirmations
    if (responseConfirmations >= 2 && (responseConfirmations / reviews.length) > 0.3) {
      badges.push('responsive');
    }

    // Scam Warning: Any credible scam report or very low score
    if (scamReports > 0 || finalScore < 30) {
      badges.push('scam_warning');
    }

    // Ghost Town: High no-response rate
    if (noResponseReports > 3 && (noResponseReports / reviews.length) > 0.5) {
      badges.push('unresponsive');
    }

    // Update Job using updateOne to avoid full document validation issues (e.g. missing legacy fields)
    await JobPosting.updateOne(
      { _id: jobId },
      { 
        $set: {
          authenticityScore: finalScore,
          trustBadges: badges,
          reviewCount: reviews.length,
          lastReviewDate: now
        }
      }
    );
    
    console.log(`✅ Updated Job ${jobId}: Score=${finalScore}, Reviews=${reviews.length}, Badges=${badges.join(',')}`);
  },

  /**
   * Update user reputation based on their contribution history.
   * Users who report accurately (consensus with others) gain reputation.
   */
  async updateUserReputation(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    // Basic Logic: More contributions + account age + profile completeness
    // In a real system, we'd check if their past reviews aligned with the final consensus.
    
    let score = 10; // Base score

    // Profile completeness bonus (simplified check)
    if (user.isEmailVerified) score += 10;
    if (user.firstName && user.lastName) score += 5;

    // Cap at 100
    user.reputationScore = Math.min(score, 100);
    await user.save();
  },

  /**
   * Get the weight multiplier for a user's new review.
   */
  async getUserWeight(userId: string): Promise<number> {
    const user = await User.findById(userId);
    if (!user) return 1.0;

    let weight = 1.0;

    // Admin override
    if (user.role === 'admin') return 10.0;

    // Reputation multiplier
    if (user.reputationScore) {
      weight += (user.reputationScore / 100); // 0.1 to 1.0 added
    }

    // Enterprise users have more stake
    if (user.tier === 'enterprise') weight *= 1.5;
    if (user.tier === 'pro') weight *= 1.2;

    return weight;
  }
};
