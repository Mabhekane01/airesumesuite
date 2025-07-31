import axios from 'axios';
import * as cheerio from 'cheerio';
import { redisClient } from '../../config/redis';

export interface JobPostingData {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  url: string;
  salary?: string;
  employmentType?: string;
  datePosted?: string;
}

export class JobScrapingService {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  
  async scrapeJobDetails(url: string): Promise<{ title: string; company: string; description: string }> {
    const jobData = await this.scrapeJobPosting(url);
    return {
      title: jobData.title,
      company: jobData.company,
      description: jobData.description
    };
  }
  
  async scrapeJobPosting(url: string): Promise<JobPostingData> {
    // Check cache first (with error handling)
    let cached;
    try {
      const cacheKey = `job:${Buffer.from(url).toString('base64')}`;
      cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.warn('Cache operation failed, proceeding without cache:', cacheError);
    }

    try {
      // Validate URL
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      let jobData: JobPostingData;

      // Use specific scrapers based on the job board
      if (hostname.includes('linkedin.com')) {
        jobData = await this.scrapeLinkedIn(url);
      } else if (hostname.includes('indeed.com')) {
        jobData = await this.scrapeIndeed(url);
      } else if (hostname.includes('glassdoor.com')) {
        jobData = await this.scrapeGlassdoor(url);
      } else {
        // Generic scraper for other sites
        jobData = await this.scrapeGeneric(url);
      }

      // Cache the result for 24 hours (with error handling)
      try {
        const cacheKey = `job:${Buffer.from(url).toString('base64')}`;
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(jobData));
      } catch (cacheError) {
        console.warn('Failed to cache job data:', cacheError);
      }

      return jobData;
    } catch (error) {
      console.error('Error scraping job posting:', error);
      throw new Error('Failed to scrape job posting. Please check the URL and try again.');
    }
  }

  private async scrapeLinkedIn(url: string): Promise<JobPostingData> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses
      });

      const $ = cheerio.load(response.data);

      // LinkedIn-specific selectors
      const title = $('h1.top-card-layout__title, .job-title').first().text().trim();
      const company = $('.topcard__org-name-link, .job-company-name').first().text().trim();
      const location = $('.topcard__flavor--bullet, .job-location').first().text().trim();
      
      // Get job description
      let description = $('.show-more-less-html__markup, .job-description').text().trim();
      if (!description) {
        description = $('[data-automation-id="jobPostingDescription"]').text().trim();
      }

      return {
        title: title || 'Job Title Not Found',
        company: company || 'Company Not Found',
        location: location || 'Location Not Found',
        description: description || 'Description not available',
        requirements: this.extractRequirements(description),
        responsibilities: this.extractResponsibilities(description),
        url,
        employmentType: this.extractEmploymentType(description)
      };
    } catch (error) {
      console.error('LinkedIn scraping failed:', error);
      throw new Error('Unable to access LinkedIn job posting. Please verify the URL is accessible.');
    }
  }

  private async scrapeIndeed(url: string): Promise<JobPostingData> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      const $ = cheerio.load(response.data);

      const title = $('[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title').first().text().trim();
      const company = $('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating').first().text().trim();
      const location = $('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle').first().text().trim();
      const description = $('#jobDescriptionText, .jobsearch-jobDescriptionText').text().trim();

      return {
        title: title || 'Job Title Not Found',
        company: company || 'Company Not Found',
        location: location || 'Location Not Found',
        description: description || 'Description not available',
        requirements: this.extractRequirements(description),
        responsibilities: this.extractResponsibilities(description),
        url,
        salary: this.extractSalary($, description)
      };
    } catch (error) {
      console.error('Indeed scraping failed:', error);
      throw new Error('Unable to access Indeed job posting. Please verify the URL is accessible.');
    }
  }

  private async scrapeGlassdoor(url: string): Promise<JobPostingData> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

    const $ = cheerio.load(response.data);

    const title = $('[data-test="job-title"], .job-title').first().text().trim();
    const company = $('[data-test="employer-name"], .employer-name').first().text().trim();
    const location = $('[data-test="job-location"], .job-location').first().text().trim();
    const description = $('[data-test="jobDescriptionContent"], .jobDescriptionContent').text().trim();

      return {
        title: title || 'Job Title Not Found',
        company: company || 'Company Not Found', 
        location: location || 'Location Not Found',
        description: description || 'Description not available',
        requirements: this.extractRequirements(description),
        responsibilities: this.extractResponsibilities(description),
        url
      };
    } catch (error) {
      console.error('Glassdoor scraping failed:', error);
      throw new Error('Unable to access Glassdoor job posting. Please verify the URL is accessible.');
    }
  }

  private async scrapeGeneric(url: string): Promise<JobPostingData> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

    const $ = cheerio.load(response.data);

    // Try common selectors for job title
    let title = $('h1').first().text().trim();
    if (!title) {
      title = $('[class*="title"], [class*="job-title"], [id*="title"]').first().text().trim();
    }

    // Try to find company name
    let company = $('[class*="company"], [class*="employer"]').first().text().trim();
    if (!company) {
      company = $('meta[property="og:site_name"]').attr('content') || '';
    }

    // Get page text for description
    const bodyText = $('body').text();
    const description = bodyText.substring(0, 2000); // Limit to first 2000 chars

      return {
        title: title || 'Job Title Not Found',
        company: company || 'Company Not Found',
        location: 'Location Not Found',
        description: description || 'Description not available',
        requirements: this.extractRequirements(description),
        responsibilities: this.extractResponsibilities(description),
        url
      };
    } catch (error) {
      console.error('Generic scraping failed:', error);
      throw new Error('Unable to access the job posting URL. Please verify the URL is accessible and publicly available.');
    }
  }

  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];
    const lowerText = text.toLowerCase();

    // Look for requirements sections
    const reqSections = [
      'requirements:', 'qualifications:', 'what you need:', 'you should have:',
      'required skills:', 'must have:', 'essential skills:'
    ];

    for (const section of reqSections) {
      const index = lowerText.indexOf(section);
      if (index !== -1) {
        const afterSection = text.substring(index + section.length, index + 500);
        const bullets = afterSection.match(/[•\-\*]\s*([^\n\r•\-\*]+)/g);
        if (bullets) {
          requirements.push(...bullets.map(b => b.replace(/[•\-\*]\s*/, '').trim()));
        }
      }
    }

    return requirements.slice(0, 10); // Limit to 10 requirements
  }

  private extractResponsibilities(text: string): string[] {
    const responsibilities: string[] = [];
    const lowerText = text.toLowerCase();

    // Look for responsibility sections
    const respSections = [
      'responsibilities:', 'duties:', 'what you\'ll do:', 'key responsibilities:',
      'job duties:', 'role:', 'you will:'
    ];

    for (const section of respSections) {
      const index = lowerText.indexOf(section);
      if (index !== -1) {
        const afterSection = text.substring(index + section.length, index + 500);
        const bullets = afterSection.match(/[•\-\*]\s*([^\n\r•\-\*]+)/g);
        if (bullets) {
          responsibilities.push(...bullets.map(b => b.replace(/[•\-\*]\s*/, '').trim()));
        }
      }
    }

    return responsibilities.slice(0, 10); // Limit to 10 responsibilities
  }

  private extractSalary($: cheerio.CheerioAPI, text: string): string | undefined {
    // Try to find salary in specific elements
    const salarySelectors = [
      '[class*="salary"]', '[data-testid*="salary"]', '[class*="compensation"]'
    ];

    for (const selector of salarySelectors) {
      const salaryText = $(selector).text().trim();
      if (salaryText && salaryText.match(/\$[\d,]+/)) {
        return salaryText;
      }
    }

    // Look for salary in text
    const salaryMatch = text.match(/\$[\d,]+\s*-?\s*\$?[\d,]*\s*(per\s+year|annually|\/year)?/i);
    return salaryMatch ? salaryMatch[0] : undefined;
  }

  private extractEmploymentType(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('full-time') || lowerText.includes('full time')) {
      return 'Full-time';
    }
    if (lowerText.includes('part-time') || lowerText.includes('part time')) {
      return 'Part-time';
    }
    if (lowerText.includes('contract')) {
      return 'Contract';
    }
    if (lowerText.includes('internship') || lowerText.includes('intern')) {
      return 'Internship';
    }
    
    return undefined;
  }

  async validateJobUrl(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const allowedDomains = [
        'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
        'ziprecruiter.com', 'dice.com', 'stackoverflow.com'
      ];
      
      return allowedDomains.some(domain => urlObj.hostname.includes(domain)) ||
             urlObj.hostname.endsWith('.com') || urlObj.hostname.endsWith('.org');
    } catch {
      return false;
    }
  }
}

export const jobScrapingService = new JobScrapingService();