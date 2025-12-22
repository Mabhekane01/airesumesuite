import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../../config/redis'; // Using existing redis connection logic where possible
import { jobBoardScraperService } from './jobBoardScraperService';

const QUEUE_NAME = 'job-scraping-queue';

// Reuse the existing Redis connection configuration for BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const jobQueue = new Queue(QUEUE_NAME, { connection });

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    console.log(`👷 Worker started job ${job.id}: ${job.name}`);
    
    try {
      const { country, query, method } = job.data;

      if (method === 'ats_dorking') {
        // Implement granular method calling if needed, or just let the service handle it
        // For now, we will expose a public method in the service to handle single-country scrape
        await jobBoardScraperService.scrapeCountryJobs(country, query);
      } else if (method === 'rss_fallback') {
        await jobBoardScraperService.scrapeRssFeed();
      } else {
        // Default "smart" scrape
        await jobBoardScraperService.scrapeJobs(country, query);
      }

      console.log(`✅ Worker completed job ${job.id}`);
    } catch (error) {
      console.error(`❌ Worker failed job ${job.id}:`, error);
      throw error; // BullMQ handles retries
    }
  },
  { 
    connection,
    concurrency: 1, // Limit concurrency to avoid getting blocked
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000 // per 60 seconds
    }
  }
);

worker.on('completed', (job) => {
  console.log(`🎉 Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`💀 Job ${job?.id} has failed with ${err.message}`);
});

export const addScrapeJob = async (country: string, query: string = 'software engineer') => {
  await jobQueue.add(
    'scrape-job', 
    { country, query },
    { 
      attempts: 3, 
      backoff: { 
        type: 'exponential', 
        delay: 5000 // 5s, 10s, 20s
      },
      removeOnComplete: true
    }
  );
  console.log(`📥 Added scrape job for ${country} to queue`);
};
