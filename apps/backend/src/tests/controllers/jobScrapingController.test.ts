import request from 'supertest';
import express from 'express';
import { jobScrapingController } from '../../controllers/jobScrapingController';
import { jobScrapingService } from '../../services/job-scraper/jobScrapingService';

// Mock the job scraping service
jest.mock('../../services/job-scraper/jobScrapingService');

const app = express();
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  req.user = { id: 'mock-user-id' };
  next();
});

// Test routes
app.post('/scrape', jobScrapingController.scrapeJobPosting.bind(jobScrapingController));
app.post('/scrape/basic', jobScrapingController.scrapeJobBasicInfo.bind(jobScrapingController));
app.post('/validate', jobScrapingController.validateJobUrl.bind(jobScrapingController));
app.get('/supported-domains', jobScrapingController.getSupportedDomains.bind(jobScrapingController));
app.get('/stats', jobScrapingController.getJobScrapingStats.bind(jobScrapingController));

describe('Job Scraping Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scrapeJobPosting', () => {
    const mockJobData = {
      title: 'Senior Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      description: 'We are looking for a skilled software engineer...',
      requirements: ['5+ years experience', 'JavaScript expertise'],
      responsibilities: ['Develop applications', 'Lead projects'],
      url: 'https://linkedin.com/jobs/123',
      salary: '$120,000 - $150,000',
      employmentType: 'Full-time'
    };

    it('should scrape job posting successfully', async () => {
      // Mock URL validation
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobPosting as jest.Mock).mockResolvedValue(mockJobData);

      const response = await request(app)
        .post('/scrape')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockJobData);
      expect(jobScrapingService.scrapeJobPosting).toHaveBeenCalledWith('https://linkedin.com/jobs/123');
    });

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/scrape')
        .send({ url: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobPosting as jest.Mock).mockRejectedValue(
        new Error('timeout')
      );

      const response = await request(app)
        .post('/scrape')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(408);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Request timeout. The job posting may not be accessible.');
      expect(response.body.code).toBe('JOB_SCRAPING_TIMEOUT');
    });

    it('should handle 403 Forbidden errors', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobPosting as jest.Mock).mockRejectedValue(
        new Error('403 Forbidden')
      );

      const response = await request(app)
        .post('/scrape')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. This job posting may require authentication to view.');
      expect(response.body.code).toBe('JOB_CONTENT_INACCESSIBLE');
    });

    it('should handle 404 Not Found errors', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobPosting as jest.Mock).mockRejectedValue(
        new Error('404 Not Found')
      );

      const response = await request(app)
        .post('/scrape')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job posting not found. The URL may be expired or invalid.');
      expect(response.body.code).toBe('JOB_NOT_FOUND');
    });

    it('should handle general scraping errors', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobPosting as jest.Mock).mockRejectedValue(
        new Error('General scraping error')
      );

      const response = await request(app)
        .post('/scrape')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to scrape job posting. Please check the URL and try again.');
      expect(response.body.code).toBe('JOB_SCRAPING_FAILED');
    });
  });

  describe('scrapeJobBasicInfo', () => {
    const mockBasicInfo = {
      title: 'Senior Software Engineer',
      company: 'TechCorp',
      description: 'We are looking for a skilled software engineer...'
    };

    it('should scrape basic job info successfully', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobDetails as jest.Mock).mockResolvedValue(mockBasicInfo);

      const response = await request(app)
        .post('/scrape/basic')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBasicInfo);
      expect(jobScrapingService.scrapeJobDetails).toHaveBeenCalledWith('https://linkedin.com/jobs/123');
    });

    it('should handle scraping errors for basic info', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);
      (jobScrapingService.scrapeJobDetails as jest.Mock).mockRejectedValue(
        new Error('Scraping failed')
      );

      const response = await request(app)
        .post('/scrape/basic')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to scrape basic job information');
      expect(response.body.code).toBe('JOB_SCRAPING_FAILED');
    });
  });

  describe('validateJobUrl', () => {
    it('should validate URL successfully', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/validate')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.message).toBe('URL is valid');
      expect(jobScrapingService.validateJobUrl).toHaveBeenCalledWith('https://linkedin.com/jobs/123');
    });

    it('should return false for invalid URL', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/validate')
        .send({ url: 'https://unsupported-site.com/jobs/123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.message).toBe('URL is not from a supported job board');
    });

    it('should return 400 if URL is missing', async () => {
      const response = await request(app)
        .post('/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('URL is required');
    });

    it('should handle validation errors', async () => {
      (jobScrapingService.validateJobUrl as jest.Mock).mockRejectedValue(
        new Error('Validation failed')
      );

      const response = await request(app)
        .post('/validate')
        .send({ url: 'https://linkedin.com/jobs/123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to validate URL');
    });
  });

  describe('getSupportedDomains', () => {
    it('should return supported domains successfully', async () => {
      const response = await request(app)
        .get('/supported-domains');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.supportedDomains).toBeDefined();
      expect(response.body.data.totalSupported).toBeGreaterThan(0);
      expect(response.body.data.note).toBeDefined();

      // Check that LinkedIn is in the supported domains
      const linkedinDomain = response.body.data.supportedDomains.find(
        (domain: any) => domain.domain === 'linkedin.com'
      );
      expect(linkedinDomain).toBeDefined();
      expect(linkedinDomain.name).toBe('LinkedIn');
      expect(linkedinDomain.supported).toBe(true);
      expect(linkedinDomain.quality).toBe('high');
    });
  });

  describe('getJobScrapingStats', () => {
    it('should return scraping statistics successfully', async () => {
      const response = await request(app)
        .get('/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalJobsScraped).toBeDefined();
      expect(response.body.data.successRate).toBeDefined();
      expect(response.body.data.averageResponseTime).toBeDefined();
      expect(response.body.data.topDomains).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();

      // Verify the structure of top domains
      expect(Array.isArray(response.body.data.topDomains)).toBe(true);
      if (response.body.data.topDomains.length > 0) {
        const firstDomain = response.body.data.topDomains[0];
        expect(firstDomain.domain).toBeDefined();
        expect(firstDomain.count).toBeDefined();
        expect(firstDomain.successRate).toBeDefined();
      }
    });
  });
});