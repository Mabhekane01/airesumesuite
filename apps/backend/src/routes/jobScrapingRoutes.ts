import express, { Router, Response, NextFunction } from 'express';
import { jobScrapingController, jobUrlValidation } from '../controllers/jobScrapingController';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { createUserLimiter } from '../middleware/rateLimiter';

const router: Router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Apply rate limiting specifically for scraping endpoints (more restrictive)
const scrapingRateLimit = createUserLimiter(
  15 * 60 * 1000, // 15 minutes
  10 // Limit each user to 10 scraping requests per windowMs
);

// POST /api/v1/job-scraper/scrape - Scrape complete job posting data
router.post('/scrape', 
  scrapingRateLimit,
  jobUrlValidation, 
  (req: AuthenticatedRequest, res: Response) => jobScrapingController.scrapeJobPosting(req, res)
);

// POST /api/v1/job-scraper/scrape/basic - Scrape basic job info only (faster)
router.post('/scrape/basic', 
  scrapingRateLimit,
  jobUrlValidation, 
  (req: AuthenticatedRequest, res: Response) => jobScrapingController.scrapeJobBasicInfo(req, res)
);

// POST /api/v1/job-scraper/validate - Validate if URL is supported
router.post('/validate', 
  (req: AuthenticatedRequest, res: Response) => jobScrapingController.validateJobUrl(req, res)
);

// GET /api/v1/job-scraper/supported-domains - Get list of supported job boards
router.get('/supported-domains', 
  (req: AuthenticatedRequest, res: Response) => jobScrapingController.getSupportedDomains(req, res)
);

// GET /api/v1/job-scraper/stats - Get scraping statistics (admin only)
router.get('/stats', 
  // You might want to add admin middleware here
  (req: AuthenticatedRequest, res: Response) => jobScrapingController.getJobScrapingStats(req, res)
);

export default router;