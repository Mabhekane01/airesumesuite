import { Request, Response } from 'express';
import { JobPosting } from '../models/JobPosting';
import { AuthenticatedRequest } from '../middleware/auth';

export const jobPostingController = {
  // Get all approved jobs (Public & Community)
  getJobs: async (req: Request, res: Response) => {
    try {
      const { country, jobType } = req.query;
      
      const query: any = { status: 'approved' }; 
      
      if (country) query.country = { $regex: new RegExp(country as string, 'i') };
      if (jobType) query.jobType = jobType;
      
      // Focus on reliability: Return verified community jobs
      const jobs = await JobPosting.find(query)
        .populate('postedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);
      
      res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch community jobs', error });
    }
  },

  // Get a specific job by ID (Public)
  getJobByIdPublic: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await JobPosting.findOne({ _id: id, status: 'approved' })
        .populate('postedBy', 'firstName lastName');
      
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found or awaiting verification' });
      }
      
      res.status(200).json({ success: true, data: job });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch job details' });
    }
  },

  // Submit a new job (Community Driven)
  createJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, company, location, country, description, url, salaryRange, jobType, postedDate, applicationDeadline } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!title || !company || !country || !description) {
        return res.status(400).json({ success: false, message: 'Missing required community job fields' });
      }

      // BUSINESS LOGIC: 
      // Admin-posted jobs are trusted and auto-approved.
      // User-posted jobs are pending until verified for truth and reliability.
      const isAdmin = userRole === 'admin';
      const status = isAdmin ? 'approved' : 'pending';
      const source = isAdmin ? 'admin' : 'user';

      const newJob = new JobPosting({
        title,
        company,
        location,
        country,
        description,
        url,
        salaryRange,
        jobType,
        postedDate,
        applicationDeadline,
        source,
        status,
        postedBy: userId,
        // If admin, they also verify their own job
        verifiedBy: isAdmin ? userId : undefined,
        verifiedAt: isAdmin ? new Date() : undefined
      });

      await newJob.save();
      
      res.status(201).json({ 
        success: true, 
        message: isAdmin ? 'Verified job published' : 'Job submitted for community verification', 
        data: newJob 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to submit community job', error });
    }
  },

  // Admin: Get Pending Jobs for Verification
  getPendingJobs: async (req: Request, res: Response) => {
    try {
      const jobs = await JobPosting.find({ status: 'pending' })
        .populate('postedBy', 'firstName lastName email')
        .sort({ createdAt: 1 });
      
      res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch jobs for verification' });
    }
  },

  // Admin: Verify/Reject Job (Ensuring high quality data)
  verifyJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body; 
      const adminId = req.user?.id;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid verification status' });
      }

      const job = await JobPosting.findByIdAndUpdate(id, { 
        status,
        verificationNotes: notes,
        verifiedBy: adminId,
        verifiedAt: new Date()
      }, { new: true });
      
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      res.status(200).json({ 
        success: true, 
        message: `Job ${status === 'approved' ? 'verified and published' : 'rejected'}`, 
        data: job 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Verification process failed' });
    }
  },

  // Admin: Delete Job
  deleteJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const job = await JobPosting.findByIdAndDelete(id);
      
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      res.status(200).json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete job' });
    }
  },

  // Admin: Update Job
  updateJob: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, company, location, country, description, url, salaryRange, jobType, postedDate, applicationDeadline } = req.body;

      if (!title || !company || !country || !description) {
        return res.status(400).json({ success: false, message: 'Missing required community job fields' });
      }

      const job = await JobPosting.findByIdAndUpdate(id, {
        title,
        company,
        location,
        country,
        description,
        url,
        salaryRange,
        jobType,
        postedDate,
        applicationDeadline,
        updatedAt: new Date()
      }, { new: true });

      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      res.status(200).json({ 
        success: true, 
        message: 'Job architecture updated successfully', 
        data: job 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update job' });
    }
  },

  // AI: Community Tool - Assist users in creating high-quality job descriptions
  extractJobDetails: async (req: Request, res: Response) => {
    try {
      const { text, url } = req.body;
      
      if (!text && !url) {
        return res.status(400).json({ success: false, message: 'Context required for AI assistance' });
      }

      const { geminiService } = await import('../services/ai/gemini');
      const extractionInput = text || `Analyze this job link for community posting: ${url}`;

      const extractedData = await geminiService.extractJobDetails(extractionInput);
      
      res.status(200).json({ 
        success: true, 
        message: 'AI assistant extracted structured data for your post',
        data: extractedData 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'AI assistant unavailable' });
    }
  }
};
