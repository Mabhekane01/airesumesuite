import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { JobFeedback } from '../models/JobFeedback';
import { JobPosting } from '../models/JobPosting';
import { JobApplication } from '../models/JobApplication';
import { jobTrustService } from '../services/jobTrustService';
import { validationResult } from 'express-validator';

export const jobFeedbackController = {
  /**
   * Submit a new feedback/review for a job.
   * Requires proof of interaction (application or tracking).
   */
  async submitFeedback(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      let { jobId, jobApplicationId, feedbackType, isReal, isResponsive, didInterview, askedForMoney, comment } = req.body;
      const userId = (req as any).user.id;

      // 1. Resolve Job ID
      if (!jobId && jobApplicationId) {
        // Find application to get details
        const application = await JobApplication.findById(jobApplicationId);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
        
        if (application.jobPostingId) {
          jobId = application.jobPostingId.toString();
        } else if (application.jobUrl) {
          // Attempt to find existing job by URL
          let job = await JobPosting.findOne({ url: application.jobUrl });
          if (!job) {
            // Create a "Shadow" JobPosting so we can attach reviews
            job = new JobPosting({
              title: application.jobTitle,
              company: application.companyName,
              location: application.jobLocation?.city || 'Unknown',
              country: application.jobLocation?.country || 'Unknown',
              description: application.jobDescription || 'Auto-generated from application tracking.',
              url: application.jobUrl,
              source: 'user',
              status: 'approved', // Auto-approve user contributions for tracking
              postedBy: new mongoose.Types.ObjectId(userId)
            });
            await job.save();
            
            // Link application to new job
            application.jobPostingId = job._id as any;
            await application.save();
          }
          jobId = job._id.toString();
        }
      }

      if (!jobId) {
        return res.status(400).json({ success: false, message: 'Missing Job ID or valid application link.' });
      }

      const job = await JobPosting.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      // Check for duplicate review
      const existingReview = await JobFeedback.findOne({ jobId, userId });
      if (existingReview) {
        return res.status(400).json({ success: false, message: 'You have already reviewed this job.' });
      }

      // 2. Get User Weight
      const userWeight = await jobTrustService.getUserWeight(userId.toString());

      // 3. Create Review
      const review = new JobFeedback({
        jobId,
        userId,
        jobApplicationId,
        feedbackType,
        isReal,
        isResponsive,
        didInterview,
        askedForMoney,
        comment,
        userWeightAtCreation: userWeight
      });

      await review.save();

      // 4. Update Score Synchronously to prevent UI race conditions
      try {
        await jobTrustService.updateJobAuthenticityScore(jobId.toString());
        await jobTrustService.updateUserReputation(userId.toString());
      } catch (err) {
        console.error('Error updating trust scores:', err);
        // Don't fail the request if scoring fails, but log it
      }

      res.status(201).json({ success: true, data: review });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  /**
   * Get reviews for a job.
   */
  async getJobReviews(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const { limit = 10, page = 1 } = req.query;

      const reviews = await JobFeedback.find({ jobId })
        .populate('userId', 'firstName lastName reputationScore')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await JobFeedback.countDocuments({ jobId });

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};
