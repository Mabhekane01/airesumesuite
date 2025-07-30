import { JobScrapingService, jobScrapingService } from '../../services/job-scraper/jobScrapingService';
import axios from 'axios';
import { redisClient } from '../../config/redis';

// Mock dependencies
jest.mock('axios');
jest.mock('../../config/redis');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;

describe('JobScrapingService', () => {
  let service: JobScrapingService;

  beforeEach(() => {
    service = new JobScrapingService();
    jest.clearAllMocks();
  });

  describe('scrapeJobDetails', () => {
    it('should return simplified job data', async () => {
      const mockJobData = {
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        description: 'Great opportunity to work with cutting-edge technology...',
        requirements: ['Bachelor\'s degree', 'JavaScript experience'],
        responsibilities: ['Develop features', 'Code review'],
        url: 'https://linkedin.com/jobs/123'
      };

      // Mock the scrapeJobPosting method
      jest.spyOn(service, 'scrapeJobPosting').mockResolvedValue(mockJobData);

      const result = await service.scrapeJobDetails('https://linkedin.com/jobs/123');

      expect(result).toEqual({
        title: mockJobData.title,
        company: mockJobData.company,
        description: mockJobData.description
      });
    });
  });

  describe('scrapeJobPosting', () => {
    const mockUrl = 'https://linkedin.com/jobs/123456';
    const mockLinkedInHTML = `
      <html>
        <body>
          <h1 class="top-card-layout__title">Senior Software Engineer</h1>
          <div class="topcard__org-name-link">TechCorp Inc.</div>
          <div class="topcard__flavor--bullet">San Francisco, CA</div>
          <div class="show-more-less-html__markup">
            We are looking for a talented software engineer...
            Requirements:
            • Bachelor's degree in Computer Science
            • 5+ years of JavaScript experience
            • Experience with React
            Responsibilities:
            • Develop new features
            • Conduct code reviews
            • Mentor junior developers
          </div>
        </body>
      </html>
    `;

    beforeEach(() => {
      mockedRedis.get.mockResolvedValue(null);
      mockedRedis.setEx.mockResolvedValue('OK');
    });

    it('should scrape LinkedIn job posting successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockLinkedInHTML });

      const result = await service.scrapeJobPosting(mockUrl);

      expect(result).toEqual({
        title: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        location: 'San Francisco, CA',
        description: expect.stringContaining('We are looking for a talented software engineer'),
        requirements: expect.arrayContaining(['Bachelor\'s degree in Computer Science']),
        responsibilities: expect.arrayContaining(['Develop new features']),
        url: mockUrl,
        employmentType: undefined
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(mockUrl, {
        headers: { 'User-Agent': expect.any(String) },
        timeout: 10000
      });
    });

    it('should return cached result if available', async () => {
      const cachedJob = {
        title: 'Cached Job',
        company: 'Cached Company',
        location: 'Cached Location',
        description: 'Cached description',
        requirements: [],
        responsibilities: [],
        url: mockUrl
      };

      mockedRedis.get.mockResolvedValue(JSON.stringify(cachedJob));

      const result = await service.scrapeJobPosting(mockUrl);

      expect(result).toEqual(cachedJob);
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockedRedis.get).toHaveBeenCalledWith(expect.stringContaining('job:'));
    });

    it('should cache the scraped result', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockLinkedInHTML });

      await service.scrapeJobPosting(mockUrl);

      expect(mockedRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('job:'),
        86400,
        expect.any(String)
      );
    });

    it('should handle scraping errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.scrapeJobPosting(mockUrl))
        .rejects.toThrow('Failed to scrape job posting. Please check the URL and try again.');
    });

    it('should scrape Indeed job posting', async () => {
      const indeedHTML = `
        <html>
          <body>
            <h1 data-testid="jobsearch-JobInfoHeader-title">Frontend Developer</h1>
            <div data-testid="inlineHeader-companyName">StartupCorp</div>
            <div data-testid="job-location">Remote</div>
            <div id="jobDescriptionText">
              Join our team as a frontend developer...
              Requirements:
              • React experience
              • CSS expertise
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: indeedHTML });

      const result = await service.scrapeJobPosting('https://indeed.com/viewjob?jk=123');

      expect(result.title).toBe('Frontend Developer');
      expect(result.company).toBe('StartupCorp');
      expect(result.location).toBe('Remote');
      expect(result.description).toContain('Join our team as a frontend developer');
    });

    it('should scrape Glassdoor job posting', async () => {
      const glassdoorHTML = `
        <html>
          <body>
            <h1 data-test="job-title">Data Scientist</h1>
            <div data-test="employer-name">DataCorp</div>
            <div data-test="job-location">New York, NY</div>
            <div data-test="jobDescriptionContent">
              We are seeking a data scientist...
              Requirements:
              • PhD in Data Science
              • Python experience
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: glassdoorHTML });

      const result = await service.scrapeJobPosting('https://glassdoor.com/job/123');

      expect(result.title).toBe('Data Scientist');
      expect(result.company).toBe('DataCorp');
      expect(result.location).toBe('New York, NY');
    });

    it('should use generic scraper for unknown domains', async () => {
      const genericHTML = `
        <html>
          <body>
            <h1>Backend Engineer</h1>
            <div class="company">GenericCorp</div>
            <meta property="og:site_name" content="JobSite">
            <div>Join our backend team...</div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: genericHTML });

      const result = await service.scrapeJobPosting('https://example-jobsite.com/job/123');

      expect(result.title).toBe('Backend Engineer');
      expect(result.company).toBe('GenericCorp');
      expect(result.description).toContain('Backend Engineer');
    });
  });

  describe('extractRequirements', () => {
    it('should extract requirements from bullet points', () => {
      const text = `
        Job description here...
        Requirements:
        • Bachelor's degree in Computer Science
        • 3+ years of JavaScript experience
        • Experience with React framework
        Other text...
      `;

      const result = (service as any).extractRequirements(text);

      expect(result).toContain('Bachelor\'s degree in Computer Science');
      expect(result).toContain('3+ years of JavaScript experience');
      expect(result).toContain('Experience with React framework');
    });

    it('should handle different bullet styles', () => {
      const text = `
        Qualifications:
        - Python programming
        * Machine learning experience
        • Data analysis skills
      `;

      const result = (service as any).extractRequirements(text);

      expect(result).toContain('Python programming');
      expect(result).toContain('Machine learning experience');
      expect(result).toContain('Data analysis skills');
    });

    it('should limit to 10 requirements', () => {
      const text = `
        Requirements:
        • Req 1 • Req 2 • Req 3 • Req 4 • Req 5
        • Req 6 • Req 7 • Req 8 • Req 9 • Req 10
        • Req 11 • Req 12
      `;

      const result = (service as any).extractRequirements(text);

      expect(result).toHaveLength(10);
    });
  });

  describe('extractResponsibilities', () => {
    it('should extract responsibilities from bullet points', () => {
      const text = `
        Responsibilities:
        • Develop new features
        • Conduct code reviews
        • Mentor junior developers
      `;

      const result = (service as any).extractResponsibilities(text);

      expect(result).toContain('Develop new features');
      expect(result).toContain('Conduct code reviews');
      expect(result).toContain('Mentor junior developers');
    });

    it('should handle different section headers', () => {
      const text = `
        What you'll do:
        • Build scalable applications
        • Collaborate with design team
      `;

      const result = (service as any).extractResponsibilities(text);

      expect(result).toContain('Build scalable applications');
      expect(result).toContain('Collaborate with design team');
    });
  });

  describe('extractSalary', () => {
    it('should extract salary from text', () => {
      const text = 'Salary: $80,000 - $120,000 per year';
      const $ = require('cheerio').load('<div></div>');

      const result = (service as any).extractSalary($, text);

      expect(result).toBe('$80,000 - $120,000 per year');
    });

    it('should extract simple salary format', () => {
      const text = 'Base salary $100,000 annually';
      const $ = require('cheerio').load('<div></div>');

      const result = (service as any).extractSalary($, text);

      expect(result).toBe('$100,000');
    });

    it('should return undefined if no salary found', () => {
      const text = 'No salary information available';
      const $ = require('cheerio').load('<div></div>');

      const result = (service as any).extractSalary($, text);

      expect(result).toBeUndefined();
    });
  });

  describe('extractEmploymentType', () => {
    it('should detect full-time employment', () => {
      const text = 'This is a full-time position with benefits';

      const result = (service as any).extractEmploymentType(text);

      expect(result).toBe('Full-time');
    });

    it('should detect part-time employment', () => {
      const text = 'Part-time role, 20 hours per week';

      const result = (service as any).extractEmploymentType(text);

      expect(result).toBe('Part-time');
    });

    it('should detect contract employment', () => {
      const text = 'Contract position for 6 months';

      const result = (service as any).extractEmploymentType(text);

      expect(result).toBe('Contract');
    });

    it('should detect internship', () => {
      const text = 'Summer internship opportunity';

      const result = (service as any).extractEmploymentType(text);

      expect(result).toBe('Internship');
    });

    it('should return undefined for unknown type', () => {
      const text = 'No employment type specified';

      const result = (service as any).extractEmploymentType(text);

      expect(result).toBeUndefined();
    });
  });

  describe('validateJobUrl', () => {
    it('should validate LinkedIn URLs', async () => {
      const result = await service.validateJobUrl('https://linkedin.com/jobs/123456');
      expect(result).toBe(true);
    });

    it('should validate Indeed URLs', async () => {
      const result = await service.validateJobUrl('https://indeed.com/viewjob?jk=123');
      expect(result).toBe(true);
    });

    it('should validate generic .com domains', async () => {
      const result = await service.validateJobUrl('https://company-careers.com/job/123');
      expect(result).toBe(true);
    });

    it('should validate .org domains', async () => {
      const result = await service.validateJobUrl('https://nonprofit-jobs.org/position/123');
      expect(result).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      const result = await service.validateJobUrl('not-a-url');
      expect(result).toBe(false);
    });

    it('should reject suspicious domains', async () => {
      const result = await service.validateJobUrl('https://malicious-site.xyz/job/123');
      expect(result).toBe(false);
    });
  });
});