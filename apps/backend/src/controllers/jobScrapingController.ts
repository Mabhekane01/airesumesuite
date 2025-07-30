import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { jobScrapingService } from '../services/job-scraper/jobScrapingService';

export const jobUrlValidation = [
  body('url')
    .isURL()
    .withMessage('Valid URL is required')
    .custom(async (url) => {
      const isValid = await jobScrapingService.validateJobUrl(url);
      if (!isValid) {
        throw new Error('URL must be from a supported job board');
      }
      return true;
    })
];

export class JobScrapingController {
  async scrapeJobPosting(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array(),
          message: 'Invalid job URL provided'
        });
        return;
      }

      const { url } = req.body;
      
      // Rate limiting check (optional, depends on your rate limiting middleware)
      
      const jobData = await jobScrapingService.scrapeJobPosting(url);

      res.status(200).json({
        success: true,
        data: jobData
      });
    } catch (error) {
      console.error('Error in scrapeJobPosting:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          res.status(408).json({ 
            success: false, 
            message: 'Request timeout. The job posting may not be accessible.',
            code: 'JOB_SCRAPING_TIMEOUT'
          });
          return;
        }
        
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          res.status(403).json({ 
            success: false, 
            message: 'Access denied. This job posting may require authentication to view.',
            code: 'JOB_CONTENT_INACCESSIBLE'
          });
          return;
        }
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          res.status(404).json({ 
            success: false, 
            message: 'Job posting not found. The URL may be expired or invalid.',
            code: 'JOB_NOT_FOUND'
          });
          return;
        }
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to scrape job posting. Please check the URL and try again.',
        code: 'JOB_SCRAPING_FAILED'
      });
    }
  }

  async validateJobUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;
      
      if (!url) {
        res.status(400).json({ 
          success: false, 
          message: 'URL is required' 
        });
        return;
      }

      const isValid = await jobScrapingService.validateJobUrl(url);

      res.status(200).json({
        success: true,
        data: { 
          isValid,
          message: isValid ? 'URL is valid' : 'URL is not from a supported job board'
        }
      });
    } catch (error) {
      console.error('Error in validateJobUrl:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to validate URL' 
      });
    }
  }

  async getSupportedDomains(req: Request, res: Response): Promise<void> {
    try {
      const supportedDomains = [
        {
          domain: 'linkedin.com',
          name: 'LinkedIn',
          description: 'Professional networking and job board',
          supported: true,
          quality: 'high'
        },
        {
          domain: 'indeed.com',
          name: 'Indeed',
          description: 'Job search engine and listings',
          supported: true,
          quality: 'high'
        },
        {
          domain: 'glassdoor.com',
          name: 'Glassdoor',
          description: 'Company reviews and job listings',
          supported: true,
          quality: 'medium'
        },
        {
          domain: 'monster.com',
          name: 'Monster',
          description: 'Job search and career resources',
          supported: true,
          quality: 'medium'
        },
        {
          domain: 'ziprecruiter.com',
          name: 'ZipRecruiter',
          description: 'Job search platform',
          supported: true,
          quality: 'medium'
        },
        {
          domain: 'dice.com',
          name: 'Dice',
          description: 'Tech jobs and career community',
          supported: true,
          quality: 'high'
        },
        {
          domain: 'stackoverflow.com',
          name: 'Stack Overflow Jobs',
          description: 'Developer community and job board',
          supported: true,
          quality: 'high'
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          supportedDomains,
          totalSupported: supportedDomains.length,
          note: 'We also support many company career pages. If a URL is not listed, try it anyway!'
        }
      });
    } catch (error) {
      console.error('Error in getSupportedDomains:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get supported domains' 
      });
    }
  }

  async getJobScrapingStats(req: Request, res: Response): Promise<void> {
    try {
      // This would typically come from your analytics/metrics system
      const stats = {
        totalJobsScraped: 15420,
        successRate: 94.2,
        averageResponseTime: 2.3, // seconds
        topDomains: [
          { domain: 'linkedin.com', count: 6234, successRate: 96.1 },
          { domain: 'indeed.com', count: 4521, successRate: 93.8 },
          { domain: 'glassdoor.com', count: 2103, successRate: 91.5 },
          { domain: 'dice.com', count: 1342, successRate: 97.2 },
          { domain: 'other', count: 1220, successRate: 89.1 }
        ],
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getJobScrapingStats:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get scraping statistics' 
      });
    }
  }

  async scrapeJobBasicInfo(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { url } = req.body;
      
      // Get basic info only (faster response)
      const basicInfo = await jobScrapingService.scrapeJobDetails(url);

      res.status(200).json({
        success: true,
        data: basicInfo
      });
    } catch (error) {
      console.error('Error in scrapeJobBasicInfo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to scrape basic job information',
        code: 'JOB_SCRAPING_FAILED'
      });
    }
  }
}

export const jobScrapingController = new JobScrapingController();