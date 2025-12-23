import { Request, Response } from 'express';
import { JobPosting } from '../models/JobPosting';
import { addScrapeJob } from '../services/job-scraper/jobQueue';

export const jobPostingController = {
  // Get all jobs (with filters)
  getJobs: async (req: Request, res: Response) => {
    try {
      const { country, source, status } = req.query;
      
      const query: any = { status: 'approved' }; // Default to approved
      
      if (country) query.country = { $regex: new RegExp(country as string, 'i') };
      if (source) query.source = source;
      
      const jobs = await JobPosting.find(query).sort({ postedAt: -1, createdAt: -1 }).limit(100);
      
      res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch jobs', error });
    }
  },

  // Get a specific job by ID (Public)
  getJobByIdPublic: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await JobPosting.findOne({ _id: id, status: 'approved' });
      
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found or not yet approved' });
      }
      
      res.status(200).json({ success: true, data: job });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch job details' });
    }
  },

  // Submit a new job (User or Admin)
  createJob: async (req: Request, res: Response) => {
    try {
      const { title, company, location, country, description, url, salaryRange, jobType } = req.body;
      
      // Access user from AuthenticatedRequest (ensure your type definition supports this, or cast req as any for now)
      const userRole = (req as any).user?.role;

      if (!title || !company || !country) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Admins bypass approval queue
      const isAdmin = userRole === 'admin';
      const initialStatus = isAdmin ? 'approved' : 'pending';
      const initialSource = isAdmin ? 'admin' : 'user';

      const newJob = new JobPosting({
        title,
        company,
        location,
        country,
        description,
        url,
        salaryRange,
        jobType,
        source: initialSource,
        status: initialStatus, 
        postedAt: new Date()
      });

      await newJob.save();
      
      res.status(201).json({ 
        success: true, 
        message: initialStatus === 'approved' ? 'Job published successfully' : 'Job submitted for approval', 
        data: newJob 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to submit job', error });
    }
  },

  // Trigger Scraper (Admin or Scheduled)
  scrapeJobs: async (req: Request, res: Response) => {
    try {
      const { country, query } = req.body;
      
      // If no country provided, trigger global background refresh
      if (!country) {
        // This could be expanded to trigger a batch of jobs for all target countries
        // For now, we'll just return a message saying explicit country needed for on-demand
        return res.status(400).json({ success: false, message: 'Country is required for on-demand scrape.' });
      }

      // Add to robust queue
      await addScrapeJob(country, query || 'software engineer');

      res.status(200).json({ success: true, message: `Scraping job for "${query || 'software engineer'}" in ${country} added to queue.` });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to initiate scrape', error: error.message });
    }
  },

  // Admin: Get Pending Jobs
  getPendingJobs: async (req: Request, res: Response) => {
    try {
      const jobs = await JobPosting.find({ status: 'pending' }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch pending jobs' });
    }
  },

  // Admin: Verify/Reject Job
  verifyJob: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body; 

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const job = await JobPosting.findByIdAndUpdate(id, { status }, { new: true });
      
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      res.status(200).json({ success: true, message: `Job ${status}`, data: job });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update job status' });
    }
  },

  // AI: Extract job details from raw text or URL
  extractJobDetails: async (req: Request, res: Response) => {
    try {
      const { text, url } = req.body;
      
      if (!text && !url) {
        return res.status(400).json({ success: false, message: 'Text or URL is required' });
      }

      const { geminiService } = await import('../services/ai/gemini');
      
      let extractionInput = text;
      
      // If URL provided, we'd ideally scrape it here. 
      // For now, let's assume the frontend sends the scraped text or we just use the URL as context.
      if (url && !text) {
        // Simple placeholder for scraping logic
        // In a real app, you'd use cheerio/puppeteer to get the content
        extractionInput = `Please extract job details from this URL: ${url}`;
      }

      const extractedData = await geminiService.extractJobDetails(extractionInput);
      
      res.status(200).json({ success: true, data: extractedData });
    } catch (error) {
      console.error('Error extracting job details:', error);
      res.status(500).json({ success: false, message: 'AI extraction failed' });
    }
  }
};
