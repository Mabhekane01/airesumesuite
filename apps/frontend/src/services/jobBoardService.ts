import { API_CONFIG, buildApiUrl } from '../config/api';

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
  source: 'scraper' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  postedAt?: string;
  createdAt: string;
}

class JobBoardService {
  async getJobs(filters: { country?: string; source?: string } = {}): Promise<JobPosting[]> {
    const query = new URLSearchParams(filters as any).toString();
    const response = await fetch(buildApiUrl(`/api/v1/jobs?${query}`), {
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch jobs');
    return data.data;
  }

  async submitJob(jobData: Partial<JobPosting>): Promise<JobPosting> {
    const response = await fetch(buildApiUrl('/api/v1/jobs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to submit job');
    return data.data;
  }

  // Admin: Trigger scrape
  async triggerScrape(country: string): Promise<any> {
    const token = localStorage.getItem('token'); // Assuming admin protection
    const response = await fetch(buildApiUrl('/api/v1/jobs/scrape'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ country })
    });
    return await response.json();
  }
}

export const jobBoardService = new JobBoardService();
