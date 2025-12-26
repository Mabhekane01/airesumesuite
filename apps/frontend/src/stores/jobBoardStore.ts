import { create } from 'zustand';
import { jobBoardService, JobPosting } from '../services/jobBoardService';
import { api } from '../services/api';

interface JobBoardState {
  jobs: JobPosting[];
  pendingJobs: JobPosting[];
  isLoading: boolean;
  error: string | null;
  filters: {
    country: string;
  };
  
  fetchJobs: (country?: string) => Promise<void>;
  fetchPendingJobs: () => Promise<void>;
  approveJob: (id: string) => Promise<void>;
  rejectJob: (id: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  updateJob: (id: string, data: any) => Promise<void>;
  submitJob: (data: any) => Promise<void>;
  triggerScrape: (country: string) => Promise<void>;
  setCountryFilter: (country: string) => void;
}

export const useJobBoardStore = create<JobBoardState>((set, get) => ({
  jobs: [],
  pendingJobs: [],
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

  fetchPendingJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/jobs/pending');
      set({ pendingJobs: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  approveJob: async (id: string) => {
    try {
      await jobBoardService.approveJob(id, 'approved');
      // Refresh both lists
      await get().fetchJobs();
      await get().fetchPendingJobs();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  rejectJob: async (id: string) => {
    try {
      await jobBoardService.approveJob(id, 'rejected');
      await get().fetchPendingJobs();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteJob: async (id: string) => {
    try {
      await jobBoardService.deleteJob(id);
      // Refresh list
      await get().fetchJobs();
      await get().fetchPendingJobs();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateJob: async (id: string, data: any) => {
    try {
      await jobBoardService.updateJob(id, data);
      await get().fetchJobs();
      await get().fetchPendingJobs();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
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
