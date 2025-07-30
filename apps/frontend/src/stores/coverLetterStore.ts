import { create } from 'zustand';
import { CoverLetterData, coverLetterService, CreateCoverLetterRequest, GenerateFromJobRequest } from '../services/coverLetterService';
import { LoadingState } from '../types';

interface CoverLetterStore {
  coverLetters: CoverLetterData[];
  currentCoverLetter: CoverLetterData | null;
  loadingState: LoadingState;
  error: string | null;
  
  // Actions
  fetchCoverLetters: () => Promise<void>;
  fetchCoverLetterById: (id: string) => Promise<void>;
  createCoverLetter: (data: CreateCoverLetterRequest) => Promise<CoverLetterData>;
  generateFromJobUrl: (data: GenerateFromJobRequest) => Promise<CoverLetterData>;
  updateCoverLetter: (id: string, data: Partial<CoverLetterData>) => Promise<void>;
  deleteCoverLetter: (id: string) => Promise<void>;
  regenerateCoverLetter: (id: string, tone?: CoverLetterData['tone']) => Promise<void>;
  setCurrentCoverLetter: (coverLetter: CoverLetterData | null) => void;
  clearError: () => void;
}

export const useCoverLetterStore = create<CoverLetterStore>((set, get) => ({
  coverLetters: [],
  currentCoverLetter: null,
  loadingState: 'idle',
  error: null,

  fetchCoverLetters: async () => {
    set({ loadingState: 'loading', error: null });
    try {
      const coverLetters = await coverLetterService.getUserCoverLetters();
      set({ coverLetters, loadingState: 'success' });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch cover letters',
        loadingState: 'error' 
      });
    }
  },

  fetchCoverLetterById: async (id: string) => {
    set({ loadingState: 'loading', error: null });
    try {
      const coverLetter = await coverLetterService.getCoverLetterById(id);
      set({ currentCoverLetter: coverLetter, loadingState: 'success' });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch cover letter',
        loadingState: 'error' 
      });
    }
  },

  createCoverLetter: async (data) => {
    set({ loadingState: 'loading', error: null });
    try {
      const result = await coverLetterService.createCoverLetter(data);
      if (result.success && result.data) {
        set((state) => ({ 
          coverLetters: [result.data!, ...state.coverLetters],
          currentCoverLetter: result.data!,
          loadingState: 'success' 
        }));
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create cover letter');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create cover letter',
        loadingState: 'error' 
      });
      throw error;
    }
  },

  generateFromJobUrl: async (data) => {
    set({ loadingState: 'loading', error: null });
    try {
      const newCoverLetter = await coverLetterService.generateFromJobUrl(data);
      set((state) => ({ 
        coverLetters: [newCoverLetter, ...state.coverLetters],
        currentCoverLetter: newCoverLetter,
        loadingState: 'success' 
      }));
      return newCoverLetter;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to generate cover letter from job URL',
        loadingState: 'error' 
      });
      throw error;
    }
  },

  updateCoverLetter: async (id: string, data: Partial<CoverLetterData>) => {
    set({ loadingState: 'loading', error: null });
    try {
      const result = await coverLetterService.updateCoverLetter(id, data);
      if (result.success && result.data) {
        set((state) => ({
          coverLetters: state.coverLetters.map(cl => cl._id === id ? result.data! : cl),
          currentCoverLetter: state.currentCoverLetter?._id === id ? result.data! : state.currentCoverLetter,
          loadingState: 'success'
        }));
      } else {
        throw new Error(result.message || 'Failed to update cover letter');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update cover letter',
        loadingState: 'error' 
      });
    }
  },

  deleteCoverLetter: async (id: string) => {
    set({ loadingState: 'loading', error: null });
    try {
      await coverLetterService.deleteCoverLetter(id);
      set((state) => ({
        coverLetters: state.coverLetters.filter(cl => cl._id !== id),
        currentCoverLetter: state.currentCoverLetter?._id === id ? null : state.currentCoverLetter,
        loadingState: 'success'
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete cover letter',
        loadingState: 'error' 
      });
    }
  },

  regenerateCoverLetter: async (id: string, tone?: CoverLetterData['tone']) => {
    set({ loadingState: 'loading', error: null });
    try {
      const updatedCoverLetter = await coverLetterService.regenerateCoverLetter(id, tone);
      set((state) => ({
        coverLetters: state.coverLetters.map(cl => cl._id === id ? updatedCoverLetter : cl),
        currentCoverLetter: state.currentCoverLetter?._id === id ? updatedCoverLetter : state.currentCoverLetter,
        loadingState: 'success'
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to regenerate cover letter',
        loadingState: 'error' 
      });
    }
  },

  setCurrentCoverLetter: (coverLetter: CoverLetterData | null) => {
    set({ currentCoverLetter: coverLetter });
  },

  clearError: () => {
    set({ error: null });
  }
}));