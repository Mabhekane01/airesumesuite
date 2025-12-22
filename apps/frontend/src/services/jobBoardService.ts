import { api } from './api';

export interface JobPosting {
  _id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  url?: string;
  salaryRange?: string;
  jobType?: string;
  source: 'scraper' | 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  postedAt?: string;
  createdAt: string;
}

class JobBoardService {
  async getJobs(filters: { country?: string; source?: string } = {}): Promise<JobPosting[]> {
    const query = new URLSearchParams(filters as any).toString();
    try {
      const response = await api.get(`/jobs?${query}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }

  async submitJob(jobData: Partial<JobPosting>): Promise<JobPosting> {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit job');
    }
  }

  // Admin: Trigger scrape
  async triggerScrape(country: string): Promise<any> {
    try {
      const response = await api.post('/jobs/scrape', { country });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to trigger scrape');
    }
  }
}

export const jobBoardService = new JobBoardService();
