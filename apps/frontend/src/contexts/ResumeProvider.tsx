import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Resume } from '../types';
import { resumeTemplates } from '../data/resumeTemplates';

interface AIEnhancementData {
  atsScore?: number;
  atsAnalysis?: any;
  aiSuggestions?: string[];
  optimizedSummary?: string;
  lastOptimized?: string;
  jobOptimizationHistory?: Array<{
    jobTitle: string;
    companyName: string;
    optimizedAt: string;
    improvements: string[];
  }>;
}

interface ResumeContextType {
  resumeData: Partial<Resume>;
  aiData: AIEnhancementData;
  updateResumeData: (newData: Partial<Resume>) => void;
  updateAIData: (newData: Partial<AIEnhancementData>) => void;
  handleDataChange: (stepId: string, data: any) => void;
  saveToStorage: () => void;
  clearStorage: () => void;
  isAutoSaving: boolean;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

const STORAGE_KEY = 'resume-builder-data';
const AI_DATA_KEY = 'resume-ai-data';
const SESSION_KEY = 'resume-session-data';

// Debounce utility for auto-save - using useRef to prevent infinite loops
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current();
    }, delay);
  }, [delay]);

  return debouncedCallback;
};

const getInitialData = (initialData?: Partial<Resume>): Partial<Resume> => {
  // Try to load from localStorage first
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedData = JSON.parse(saved);
      // Merge with session data if available
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      const sessionParsed = sessionData ? JSON.parse(sessionData) : {};
      
      return {
        ...parsedData,
        ...sessionParsed,
        ...initialData // Override with any provided initial data
      };
    }
  } catch (error) {
    console.warn('Failed to load resume data from localStorage:', error);
  }

  // Default data
  return {
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      linkedinUrl: '',
      portfolioUrl: '',
      githubUrl: '',
      websiteUrl: '',
      professionalTitle: ''
    },
    professionalSummary: '',
    workExperience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    volunteerExperience: [],
    awards: [],
    hobbies: [],
    additionalSections: [],
    template: resumeTemplates[0].id, // Use first available template ID
    aiGenerated: {
      summary: false,
      atsScore: undefined,
      improvements: []
    },
    ...initialData
  };
};

const getInitialAIData = (): AIEnhancementData => {
  try {
    const saved = localStorage.getItem(AI_DATA_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load AI data from localStorage:', error);
  }

  return {
    atsScore: undefined,
    atsAnalysis: undefined,
    aiSuggestions: [],
    optimizedSummary: undefined,
    lastOptimized: undefined,
    jobOptimizationHistory: []
  };
};

export const ResumeProvider: React.FC<{ children: React.ReactNode; initialData?: Partial<Resume> }> = ({ children, initialData }) => {
  const [resumeData, setResumeData] = useState<Partial<Resume>>(getInitialData(initialData));
  const [aiData, setAIData] = useState<AIEnhancementData>(getInitialAIData());
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Use refs to access current data without causing re-renders
  const resumeDataRef = useRef(resumeData);
  const aiDataRef = useRef(aiData);

  // Update refs when data changes
  useEffect(() => {
    resumeDataRef.current = resumeData;
  }, [resumeData]);

  useEffect(() => {
    aiDataRef.current = aiData;
  }, [aiData]);

  // Auto-save function - stable reference that doesn't change on data updates
  const saveToStorage = useCallback(() => {
    setIsAutoSaving(true);
    try {
      // Save main resume data to localStorage (persistent)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeDataRef.current));
      
      // Save AI data to localStorage (persistent)
      localStorage.setItem(AI_DATA_KEY, JSON.stringify(aiDataRef.current));
      
      // Save current session data to sessionStorage (temporary)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        lastSaved: new Date().toISOString(),
        template: resumeDataRef.current.template
      }));
      
      console.log('✅ Auto-saved resume data');
    } catch (error) {
      console.warn('Failed to save data to storage:', error);
    } finally {
      setTimeout(() => setIsAutoSaving(false), 500); // Show saving indicator briefly
    }
  }, []); // Stable reference using refs to access current data

  // Debounced auto-save
  const debouncedSave = useDebounce(saveToStorage, 1000); // Save 1 second after last change

  // Save to localStorage whenever resumeData or aiData changes (debounced)
  useEffect(() => {
    debouncedSave();
  }, [resumeData, aiData, debouncedSave]);

  // Save immediately when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToStorage();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveToStorage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveToStorage]);

  const updateResumeData = useCallback((newData: Partial<Resume>) => {
    setResumeData(prev => ({ ...prev, ...newData }));
  }, []);

  const updateAIData = useCallback((newData: Partial<AIEnhancementData>) => {
    setAIData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleDataChange = useCallback((stepId: string, data: any) => {
    const keyMapping: { [key: string]: keyof Resume } = {
      'personal-info': 'personalInfo',
      'professional-summary': 'professionalSummary',
      'work-experience': 'workExperience',
      'education': 'education',
      'skills': 'skills',
      'projects': 'projects',
      'certifications': 'certifications',
      'volunteer-experience': 'volunteerExperience',
      'awards': 'awards',
      'languages': 'languages',
      'hobbies': 'hobbies',
    };
    const key = keyMapping[stepId];
    if (key) {
      setResumeData(prev => ({
        ...prev,
        [key]: data
      }));
    }
  }, []);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AI_DATA_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      console.log('🗑️ Cleared all resume data from storage');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }, []);

  return (
    <ResumeContext.Provider value={{ 
      resumeData, 
      aiData, 
      updateResumeData, 
      updateAIData, 
      handleDataChange, 
      saveToStorage, 
      clearStorage, 
      isAutoSaving 
    }}>
      {children}
    </ResumeContext.Provider>
  );
};

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (context === undefined) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};
