import { create } from 'zustand';
import { ResumeData, resumeService } from '../services/resumeService';
import { LoadingState } from '../types';

interface ResumeStore {
  resumes: ResumeData[];
  currentResume: ResumeData | null;
  loadingState: LoadingState;
  error: string | null;
  
  // Actions
  fetchResumes: () => Promise<void>;
  fetchResumeById: (id: string) => Promise<void>;
  createResume: (data: Omit<ResumeData, '_id' | 'createdAt' | 'updatedAt'>) => Promise<ResumeData>;
  updateResume: (id: string, data: Partial<ResumeData>) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  optimizeResume: (id: string, jobData: { jobDescription: string; jobTitle: string; companyName: string }) => Promise<{
    originalResume: any;
    improvedResume: any;
    improvements: string[];
    atsAnalysis?: any;
    jobAlignment?: any;
  }>;
  setCurrentResume: (resume: ResumeData | null) => void;
  clearError: () => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  resumes: [],
  currentResume: null,
  loadingState: 'idle',
  error: null,

  fetchResumes: async () => {
    set({ loadingState: 'loading', error: null });
    try {
      const resumes = await resumeService.getUserResumes();
      set({ resumes, loadingState: 'success' });
    } catch (error) {
      let errorMessage = 'Failed to fetch resumes';
      
      if (error instanceof Error) {
        if (error.message.includes('Network Error') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'Backend server is not running. Please start the backend server on port 3001.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error('Failed to fetch resumes:', error);
      set({ 
        error: errorMessage,
        loadingState: 'error' 
      });
    }
  },

  fetchResumeById: async (id: string) => {
    set({ loadingState: 'loading', error: null });
    try {
      const resume = await resumeService.getResumeById(id);
      set({ currentResume: resume, loadingState: 'success' });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch resume',
        loadingState: 'error' 
      });
    }
  },

  createResume: async (data) => {
    set({ loadingState: 'loading', error: null });
    try {
      const result = await resumeService.createResume(data);
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to create resume');
      }
      const newResume = result.data;
      set((state) => ({ 
        resumes: [newResume, ...state.resumes],
        currentResume: newResume,
        loadingState: 'success' 
      }));
      return newResume;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create resume',
        loadingState: 'error' 
      });
      throw error;
    }
  },

  updateResume: async (id: string, data: Partial<ResumeData>) => {
    set({ loadingState: 'loading', error: null });
    try {
      const updatedResume = await resumeService.updateResume(id, data);
      set((state) => ({
        resumes: state.resumes.map(r => r._id === id ? updatedResume : r),
        currentResume: state.currentResume?._id === id ? updatedResume : state.currentResume,
        loadingState: 'success'
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update resume',
        loadingState: 'error' 
      });
    }
  },

  deleteResume: async (id: string) => {
    set({ loadingState: 'loading', error: null });
    try {
      await resumeService.deleteResume(id);
      set((state) => ({
        resumes: state.resumes.filter(r => r._id !== id),
        currentResume: state.currentResume?._id === id ? null : state.currentResume,
        loadingState: 'success'
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete resume',
        loadingState: 'error' 
      });
    }
  },

  optimizeResume: async (id: string, jobData: { jobDescription: string; jobTitle: string; companyName: string }) => {
    set({ loadingState: 'loading', error: null });
    try {
      const optimizedResume = await resumeService.optimizeResumeForJob(id, jobData);
      set({ loadingState: 'success' });
      return optimizedResume;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to optimize resume',
        loadingState: 'error' 
      });
      throw error;
    }
  },

  setCurrentResume: (resume: ResumeData | null) => {
    set({ currentResume: resume });
  },

  clearError: () => {
    set({ error: null });
  }
}));