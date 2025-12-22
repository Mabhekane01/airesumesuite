import { create } from 'zustand';
import { jobBoardService, JobPosting } from '../services/jobBoardService';

interface JobBoardState {
  jobs: JobPosting[];
  isLoading: boolean;
  error: string | null;
  filters: {
    country: string;
  };
  
  fetchJobs: (country?: string) => Promise<void>;
  submitJob: (data: any) => Promise<void>;
  triggerScrape: (country: string) => Promise<void>;
  setCountryFilter: (country: string) => void;
}

export const useJobBoardStore = create<JobBoardState>((set, get) => ({
  jobs: [],
  isLoading: false,
  error: null,
  filters: {
    country: ''
  },

  setCountryFilter: (country: string) => {
    set({ filters: { ...get().filters, country } });
    get().fetchJobs(country); // Auto-fetch on change
  },

  fetchJobs: async (country?: string) => {
    set({ isLoading: true, error: null });
    try {
      const targetCountry = country || get().filters.country;
      const jobs = await jobBoardService.getJobs({ country: targetCountry });
      set({ jobs, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  submitJob: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      await jobBoardService.submitJob(data);
      set({ isLoading: false });
      // Don't refresh list immediately as it's pending approval
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  triggerScrape: async (country: string) => {
    set({ isLoading: true });
    try {
      await jobBoardService.triggerScrape(country);
      await get().fetchJobs(country);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
