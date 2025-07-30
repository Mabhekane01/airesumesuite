import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Resume } from '../types';

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

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedResumeData = localStorage.getItem('resume-builder-data');
      const savedAIData = localStorage.getItem('resume-ai-data');
      
      if (savedResumeData) {
        setResumeData(JSON.parse(savedResumeData));
      }
      
      if (savedAIData) {
        setAIData(JSON.parse(savedAIData));
      }
    } catch (error) {
      console.warn('Failed to load resume data from localStorage:', error);
    }
  }, []);

  // Auto-save to localStorage when data changes
  useEffect(() => {
    if (Object.keys(resumeData).length > 0) {
      saveToStorage();
    }
  }, [resumeData]);

  useEffect(() => {
    if (Object.keys(aiData).length > 0) {
      saveToStorage();
    }
  }, [aiData]);

  const updateResumeData = (newData: Partial<Resume>) => {
    setResumeData(prev => ({ ...prev, ...newData }));
  };

  const updateAIData = (newData: Partial<AIEnhancementData>) => {
    setAIData(prev => ({ ...prev, ...newData }));
  };

  const handleDataChange = (stepId: string, data: any) => {
    updateResumeData({ [stepId]: data });
  };

  const saveToStorage = () => {
    try {
      setIsAutoSaving(true);
      localStorage.setItem('resume-builder-data', JSON.stringify(resumeData));
      localStorage.setItem('resume-ai-data', JSON.stringify(aiData));
      
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
    localStorage.removeItem('resume-builder-data');
    localStorage.removeItem('resume-ai-data');
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

