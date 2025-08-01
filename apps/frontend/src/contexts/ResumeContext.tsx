import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Resume } from '../types';
import { useAuthStore } from '../stores/authStore';

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

export const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (context === undefined) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};

interface ResumeProviderProps {
  children: ReactNode;
}

export const ResumeProvider: React.FC<ResumeProviderProps> = ({ children }) => {
  const [resumeData, setResumeData] = useState<Partial<Resume>>({});
  const [aiData, setAIData] = useState<AIEnhancementData>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { user } = useAuthStore();

  // Clear resume data when user changes (login/logout)
  useEffect(() => {
    const newUserId = user?.id || null;
    
    // If user changed (login/logout/switch user), clear resume data
    if (currentUserId !== newUserId) {
      console.log('User changed - clearing resume data', { 
        previousUser: currentUserId, 
        newUser: newUserId 
      });
      
      setResumeData({});
      setAIData({});
      
      // Clear localStorage resume data
      localStorage.removeItem('resume-builder-data');
      localStorage.removeItem('resume-ai-data');
      
      setCurrentUserId(newUserId);
    }
  }, [user?.id, currentUserId]);

  // Load data from localStorage on mount (only if user is logged in)
  useEffect(() => {
    if (!user?.id) return;
    
    try {
      const userResumeKey = `resume-builder-data-${user.id}`;
      const userAIKey = `resume-ai-data-${user.id}`;
      
      const savedResumeData = localStorage.getItem(userResumeKey);
      const savedAIData = localStorage.getItem(userAIKey);
      
      if (savedResumeData) {
        setResumeData(JSON.parse(savedResumeData));
      }
      
      if (savedAIData) {
        setAIData(JSON.parse(savedAIData));
      }
    } catch (error) {
      console.warn('Failed to load resume data from localStorage:', error);
    }
  }, [user?.id]);

  // Auto-save to localStorage when data changes (debounced)
  useEffect(() => {
    if (Object.keys(resumeData).length > 0) {
      debouncedSave();
    }
  }, [resumeData]);

  useEffect(() => {
    if (Object.keys(aiData).length > 0) {
      debouncedSave();
    }
  }, [aiData]);

  const updateResumeData = (newData: Partial<Resume>) => {
    setResumeData(prev => ({ ...prev, ...newData }));
  };

  const updateAIData = (newData: Partial<AIEnhancementData>) => {
    setAIData(prev => ({ ...prev, ...newData }));
  };

  const handleDataChange = (stepId: string, data: any) => {
    // Map step IDs to resume property names
    const stepMapping: { [key: string]: string } = {
      'personal-info': 'personalInfo',
      'professional-summary': 'professionalSummary',
      'work-experience': 'workExperience',
      'education': 'education',
      'skills': 'skills',
      'certifications': 'certifications',
      'languages': 'languages',
      'projects': 'projects',
      'volunteer-experience': 'volunteerExperience',
      'awards': 'awards',
      'hobbies': 'hobbies'
    };
    
    const propertyName = stepMapping[stepId] || stepId;
    updateResumeData({ [propertyName]: data });
  };

  const debouncedSave = () => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout
    const newTimeout = setTimeout(() => {
      saveToStorage();
    }, 1000); // Save after 1 second of no changes
    
    setSaveTimeout(newTimeout);
  };

  const saveToStorage = () => {
    if (!user?.id) {
      console.warn('Cannot save - no user logged in');
      return;
    }
    
    try {
      setIsAutoSaving(true);
      const userResumeKey = `resume-builder-data-${user.id}`;
      const userAIKey = `resume-ai-data-${user.id}`;
      
      localStorage.setItem(userResumeKey, JSON.stringify(resumeData));
      localStorage.setItem(userAIKey, JSON.stringify(aiData));
      
      // Simulate saving delay
      setTimeout(() => {
        setIsAutoSaving(false);
      }, 500);
    } catch (error) {
      console.error('Failed to save resume data to localStorage:', error);
      setIsAutoSaving(false);
    }
  };

  const clearStorage = () => {
    // Clear both old format and user-specific format
    localStorage.removeItem('resume-builder-data');
    localStorage.removeItem('resume-ai-data');
    
    if (user?.id) {
      const userResumeKey = `resume-builder-data-${user.id}`;
      const userAIKey = `resume-ai-data-${user.id}`;
      localStorage.removeItem(userResumeKey);
      localStorage.removeItem(userAIKey);
    }
    
    setResumeData({});
    setAIData({});
  };

  const value: ResumeContextType = {
    resumeData,
    aiData,
    updateResumeData,
    updateAIData,
    handleDataChange,
    saveToStorage,
    clearStorage,
    isAutoSaving
  };

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
};

