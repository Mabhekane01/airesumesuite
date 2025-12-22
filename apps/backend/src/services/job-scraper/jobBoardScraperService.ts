import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { JobPosting } from '../../models/JobPosting';
import cron from 'node-cron';
import { addScrapeJob } from './jobQueue';

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

interface ScrapedJobSummary {
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  url: string;
  externalId: string;
  source: 'scraper';
  postedAt?: Date;
}

// Target countries for background scraping
const TARGET_COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Germany', 'Australia', 'India', 'Singapore'];
// ATS domains to dork for (high quality sources)
const ATS_DOMAINS = ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'workable.com', 'breezy.hr'];

export class JobBoardScraperService {
  
  constructor() {
    this.initializeCronJobs();
  }

  private initializeCronJobs() {
    // Run extensive scrape every 6 hours
    cron.schedule('0 */6 * * *', () => {
      console.log('⏰ Starting scheduled global job scrape...');
      this.triggerGlobalScrape();
    });
    console.log('✅ Job Scraper Cron Initialized (Runs every 6 hours)');
  }

  /**
   * Public trigger for manual admin scrape (pushes to queue)
   */
  public async triggerGlobalScrape(): Promise<void> {
    for (const country of TARGET_COUNTRIES) {
      await addScrapeJob(country);
    }
  }

  /**
   * Main entry point for the Worker.
   * Orchestrates the scraping strategy for a single country.
   */
  public async scrapeJobs(country: string, query: string = 'software engineer'): Promise<void> {
    try {
      console.log(`🌍 [Worker] Scraping jobs for ${country}...`);
      
      // 1. Try ATS Dorking (Most Robust)
      await this.scrapeATSJobs(country, query);
      
      // 2. Try Google Jobs (Stealth - Good for aggregation)
      await this.scrapeGoogleJobs(country, query);
      
      // 3. Always refresh RSS feeds (Baseline)
      await this.scrapeAggregatorFeeds();
      
    } catch (error) {
      console.error(`❌ [Worker] Failed to scrape ${country}:`, error.message);
      throw error; // Rethrow to let BullMQ handle retry
    }
  }

  /**
   * Expose specific methods if needed by the queue
   */
  public async scrapeCountryJobs(country: string, query: string): Promise<void> {
    return this.scrapeJobs(country, query);
  }

  public async scrapeRssFeed(): Promise<void> {
    return this.scrapeAggregatorFeeds();
  }

  /**
   * ATS Dorking Strategy:
   * Uses Google Search to find direct job listings on popular ATS platforms.
   * Query: `site:greenhouse.io "software engineer" "United States"`
   */
  private async scrapeATSJobs(country: string, queryTerm: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      for (const domain of ATS_DOMAINS) {
        // Dork query: site:greenhouse.io (software OR developer OR engineer) location
        // Using "software" as a generic term if query is generic, otherwise use specific query
        const query = `site:${domain} (${queryTerm} OR developer OR engineer) "${country}"`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`; // Get 20 results per domain per country

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract search results
        const jobs = await page.evaluate((country, domain) => {
          const results: ScrapedJobSummary[] = [];
          // Selectors change frequently, so we look for generic structure of search results
          // .g is the container for a result
          // @ts-ignore
          const elements = document.querySelectorAll('.g'); 

          elements.forEach((el: any) => {
            const titleEl = el.querySelector('h3');
            const linkEl = el.querySelector('a');
            const snippetEl = el.querySelector('.VwiC3b') || el.querySelector('div[style*="-webkit-line-clamp"]'); 

            if (titleEl && linkEl) {
              const titleRaw = titleEl.innerText;
              const url = linkEl.href;
              const description = snippetEl ? (snippetEl as any).innerText : 'Click to apply';
              
              // Heuristic to extract company from title "Software Engineer at Google"
              let company = 'Unknown';
              let title = titleRaw;

              if (titleRaw.includes(' at ')) {
                const parts = titleRaw.split(' at ');
                company = parts.pop() || 'Unknown';
                title = parts.join(' at ');
              } else if (titleRaw.includes(' - ')) {
                const parts = titleRaw.split(' - ');
                company = parts.pop() || 'Unknown';
                title = parts.join(' - ');
              } else if (titleRaw.includes(' | ')) {
                const parts = titleRaw.split(' | ');
                company = parts.shift() || 'Unknown'; // often Company | Title on some sites
                title = parts.join(' | ');
              }

              results.push({
                title: title.replace(/\.\.\.$/, '').trim(),
                company: company.replace(/\.\.\.$/, '').trim(),
                location: country, 
                country: country,
                description,
                url,
                externalId: `ats_${domain}_${btoa(url).substring(0, 30)}`,
                source: 'scraper',
                postedAt: new Date()
              });
            }
          });
          return results;
        }, country, domain);

        if (jobs.length > 0) {
          console.log(`✅ [ATS] Found ${jobs.length} jobs via ${domain} dorking for ${country}`);
          await this.saveJobs(jobs);
        } else {
          console.log(`⚠️ [ATS] No jobs found for ${domain} in ${country} (might be blocked or empty)`);
        }
        
        // Random delay to be polite and avoid blocks
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));
      }

    } catch (error) {
      console.error(`❌ [ATS] Scraping error for ${country}:`, error.message);
    } finally {
      await browser.close();
    }
  }

  /**
   * Google Jobs Strategy (Stealth):
   * Direct interface with Google Jobs widget
   */
  private async scrapeGoogleJobs(country: string, queryTerm: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=en-US,en']
    });

    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
      await page.setViewport({ width: 1366, height: 768 });
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${queryTerm} jobs in ${country}`)}&ibp=htl;jobs`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      // Selector for job list items - Google changes these, so we need robust selectors
      // ul.vH0yjd is common for the list container
      try {
        await page.waitForSelector('ul', { timeout: 10000 });
      } catch (e) {
        // console.warn('Google jobs selector timeout'); 
      }

      const jobs = await page.evaluate((country) => {
        const results: ScrapedJobSummary[] = [];
        // @ts-ignore
        const items = document.querySelectorAll('li'); // Generic list item
        
        items.forEach((el: any) => {
           const titleEl = el.querySelector('[role="heading"]');
           if (titleEl) {
             const title = titleEl.textContent || '';
             // Attempt to find company/location from siblings/children
             const divs = el.querySelectorAll('div');
             let company = 'Unknown';
             let location = country;

             // Heuristic: usually company is in one of the first few divs under the text content
             // This is brittle but works for broad aggregation
             for (const div of Array.from(divs) as any[]) {
                if (div.textContent && div.textContent.length < 30 && div.textContent !== title) {
                    company = div.textContent;
                    break;
                }
             }
             
             results.push({
               title,
               company,
               location,
               country,
               description: 'View details to apply.',
               // @ts-ignore
               url: window.location.href, // Google jobs often don't have direct links easily without clicking
               externalId: `gjobs_${btoa(title + company).substring(0, 30)}`,
               source: 'scraper',
               postedAt: new Date()
             });
           }
        });
        return results;
      }, country);

      if (jobs.length > 0) {
        console.log(`✅ [GoogleJobs] Found ${jobs.length} jobs via widget for ${country}`);
        await this.saveJobs(jobs);
      }

    } catch (error) {
      console.error(`❌ [GoogleJobs] Scraping error for ${country}:`, error.message);
    } finally {
      await browser.close();
    }
  }

  /**
   * Aggregator Feeds Strategy:
   * RSS feeds from major remote boards
   */
  private async scrapeAggregatorFeeds(): Promise<void> {
    const feeds = [
      'https://jobscollider.com/remote-software-development-jobs.rss',
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      'https://stackoverflow.com/jobs/feed'
    ];

    console.log('📡 [RSS] Scraping aggregator feeds...');

    for (const feed of feeds) {
      try {
        const response = await axios.get(feed, { timeout: 10000 });
        const parsed = await parseStringPromise(response.data);
        const items = parsed.rss?.channel?.[0]?.item || parsed.feed?.entry || [];

        const jobs: ScrapedJobSummary[] = [];

        for (const item of items) {
          const title = item.title?.[0] || item.title;
          const link = item.link?.[0] || item.link?.['@']?.href || item.id;
          const desc = item.description?.[0] || item.summary?.[0]?.['_'] || '';
          const guid = item.guid?.[0]?.['_'] || item.id?.[0] || link;
          const pubDate = item.pubDate?.[0] ? new Date(item.pubDate[0]) : new Date();
          
          // Basic Country Extraction
          let country = 'Remote';
          for (const c of TARGET_COUNTRIES) {
            if (title.includes(c) || desc.includes(c)) country = c;
          }

          jobs.push({
            title: title || 'Unknown Role',
            company: 'Aggregator Job', 
            location: 'Remote',
            country: country,
            description: desc.substring(0, 500) + '...',
            url: link,
            externalId: `rss_${btoa(guid).substring(0, 30)}`,
            source: 'scraper',
            postedAt: pubDate
          });
        }

        if (jobs.length > 0) {
          console.log(`✅ [RSS] Found ${jobs.length} jobs from ${feed}`);
          await this.saveJobs(jobs);
        }

      } catch (error) {
        // console.error(`❌ RSS Feed error for ${feed}:`, error.message);
      }
    }
  }

  private async saveJobs(jobs: ScrapedJobSummary[]): Promise<void> {
    let count = 0;
    for (const job of jobs) {
      try {
        await JobPosting.updateOne(
          { externalId: job.externalId },
          {
            $set: {
              ...job,
              status: 'approved'
            }
          },
          { upsert: true }
        );
        count++;
      } catch (e) {
        // ignore dupes
      }
    }
    // console.log(`💾 Saved/Updated ${count} jobs.`);
  }
}

export const jobBoardScraperService = new JobBoardScraperService();
