import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Resume } from '../types';
import { useAuthStore } from '../stores/authStore';
import { resumeService } from '../services/resumeService';
import { getResumeHash } from '../utils/resumeHash';

interface AIEnhancementData {
  atsScore?: number;
  atsAnalysis?: any;
  aiSuggestions?: string[];
  optimizedSummary?: string;
  lastOptimized?: string;
  // Tracking specific AI usage for subscription logic
  wasSummaryGenerated?: boolean;
  wasAnalysisRun?: boolean;
  wasOptimizationApplied?: boolean;
  isAIUsed?: boolean;
  jobOptimizationHistory?: Array<{
    jobTitle: string;
    companyName: string;
    optimizedAt: string;
    improvements: string[];
  }>;
  // LaTeX optimization data
  optimizedLatexCode?: string;
  templateId?: string;
  optimizedForJob?: {
    jobUrl: string;
    jobTitle: string;
    companyName: string;
    optimizedAt: string;
  };
  cachedPdfUrl?: string;
  pdfCacheHash?: string;
  pdfBlob?: Blob;
  pdfBlobBase64?: string; // For localStorage persistence across page refreshes
  lastPdfGenerated?: string;
  savedPdfs?: Array<{
    id: string;
    name: string;
    url: string;
    blob: Blob;
    generatedAt: string;
    resumeHash: string;
    jobOptimized?: {
      jobUrl: string;
      jobTitle: string;
      companyName: string;
    };
  }>;
  shouldAutoTrigger?: boolean;
  lastEnhanced?: string;
  isEnhanced?: boolean;
  analysisProgress?: {
    isLoading: boolean;
    currentStep: string;
    progress: number;
    error: string | null;
  };
  enhancementProgress?: {
    isLoading: boolean;
    currentStep: string;
    progress: number;
    error: string | null;
  };
  enhancementType?: string;
  lastApplied?: string;
  qualityScore?: number;
}

interface ResumeAuditEntry {
  timestamp: string;
  resumeHash: string;
  changedFields: string[];
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
  lastSaved: Date | null;
  isLoading: boolean;
  // Enhanced PDF management methods
  setOptimizedLatexCode: (code: string, templateId: string, jobData?: { jobUrl: string; jobTitle: string; companyName: string }) => void;
  clearOptimizedContent: () => void;
  setCachedPdf: (pdfUrl: string, hash: string, blob?: Blob) => void;
  savePdfToLibrary: (name: string, jobData?: { jobUrl: string; jobTitle: string; companyName: string }) => Promise<string>;
  downloadPdf: (pdfId?: string) => void;
  deleteSavedPdf: (pdfId: string) => void;
  isCacheValid: (currentHash: string) => boolean;
  generateResumeHash: () => string;
  markPdfCacheStale: (options?: { clearOptimizedLatex?: boolean }) => void;
  clearAllCacheAndBlobUrls: () => void;
  hasRequiredFields: (resumeData: any) => boolean;
  isDirty: boolean; 
  setIsDirty: (dirty: boolean) => void;
  resumeAuditLog: ResumeAuditEntry[];
  // Subscription and locking
  isAIUsed: boolean;
  isSubscriptionLockActive: boolean;
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
  initialData?: Partial<Resume>;
}

export const ResumeProvider: React.FC<ResumeProviderProps> = ({ children, initialData }) => {
  const [resumeData, setResumeData] = useState<Partial<Resume>>({});
  const [aiData, setAIData] = useState<AIEnhancementData>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false); // New state for dirty tracking
  const [resumeAuditLog, setResumeAuditLog] = useState<ResumeAuditEntry[]>([]);
  const resumeDataRef = useRef(resumeData);
  const aiDataRef = useRef(aiData);
  
  const { user } = useAuthStore();

  useEffect(() => {
    resumeDataRef.current = resumeData;
  }, [resumeData]);

  useEffect(() => {
    aiDataRef.current = aiData;
  }, [aiData]);

  const getAuditLogKey = useCallback(() => {
    return user?.id ? `resume-audit-log-${user.id}` : 'resume-audit-log-guest';
  }, [user?.id]);

  const normalizeForAudit = (value: any): any => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
      return value.map(normalizeForAudit).filter((item) => item !== undefined);
    }

    if (typeof value === 'object') {
      const normalized: Record<string, any> = {};
      Object.keys(value)
        .sort()
        .forEach((key) => {
          const normalizedValue = normalizeForAudit(value[key]);
          if (normalizedValue !== undefined) {
            normalized[key] = normalizedValue;
          }
        });
      return normalized;
    }

    return value;
  };

  const stableSerialize = (value: any): string => {
    const normalized = normalizeForAudit(value);
    return JSON.stringify(normalized ?? null);
  };

  const getChangedResumeFields = (prev: Partial<Resume>, next: Partial<Resume>): string[] => {
    const keys = [
      'personalInfo',
      'professionalSummary',
      'workExperience',
      'education',
      'skills',
      'projects',
      'certifications',
      'languages',
      'volunteerExperience',
      'awards',
      'publications',
      'references',
      'hobbies',
      'additionalSections',
      'template',
      'templateId',
      'isLatexTemplate'
    ];

    return keys.filter((key) => {
      const prevValue = (prev as any)?.[key];
      const nextValue = (next as any)?.[key];
      return stableSerialize(prevValue) !== stableSerialize(nextValue);
    });
  };

  const appendAuditEntry = useCallback((changedFields: string[], nextResumeData: Partial<Resume>) => {
    if (changedFields.length === 0) return;

    const resumeHash = getResumeHash(nextResumeData, {
      optimizedForJob: aiDataRef.current.optimizedForJob,
      optimizedLatexCode: aiDataRef.current.optimizedLatexCode
    });

    const entry: ResumeAuditEntry = {
      timestamp: new Date().toISOString(),
      resumeHash,
      changedFields
    };

    setResumeAuditLog(prev => {
      const nextLog = [...prev, entry].slice(-200);
      try {
        localStorage.setItem(getAuditLogKey(), JSON.stringify(nextLog));
      } catch (error) {
        console.warn('Failed to persist resume audit log:', error);
      }
      return nextLog;
    });
  }, [getAuditLogKey]);

  // Clear resume data when user changes (login/logout)
  useEffect(() => {
    const newUserId = user?.id || null;
    
    // If user changed (login/logout/switch user), clear resume data
    if (currentUserId !== newUserId) {
      console.log('User changed - clearing resume data and PDF cache', { 
        previousUser: currentUserId, 
        newUser: newUserId 
      });
      
      // Revoke any existing blob URLs to prevent memory leaks
      if (aiData.cachedPdfUrl && aiData.cachedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(aiData.cachedPdfUrl);
        console.log('🧹 Revoked blob URL on user change/logout');
      }
      
      setResumeData({});
      setAIData({});
      setIsDirty(false); // Clear dirty state
      
      // Clear localStorage resume data for all users
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('resume-builder-data') || key.startsWith('resume-ai-data')) {
          localStorage.removeItem(key);
        }
      });
      if (currentUserId) {
        localStorage.removeItem(`resume-audit-log-${currentUserId}`);
      }
      localStorage.removeItem('resume-audit-log-guest');
      
      setCurrentUserId(newUserId);
    }
  }, [user?.id, currentUserId]);

  // Load data from localStorage on mount (only if user is logged in)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setIsDirty(false); // Assume clean on load
      
      try {
        const userResumeKey = user?.id ? `resume-builder-data-${user.id}` : 'resume-builder-data-guest';
        const userAIKey = user?.id ? `resume-ai-data-${user.id}` : 'resume-ai-data-guest';
        const auditLogKey = user?.id ? `resume-audit-log-${user.id}` : 'resume-audit-log-guest';
        
        const savedResumeData = localStorage.getItem(userResumeKey);
        const savedAIData = localStorage.getItem(userAIKey);
        const savedAuditLog = localStorage.getItem(auditLogKey);
        
        console.log('🔍 ResumeContext initialization:', {
          hasSavedResumeData: !!savedResumeData,
          hasSavedAIData: !!savedAIData,
          hasInitialData: !!initialData,
          userId: user?.id
        });

        if (savedResumeData) {
          console.log('📋 Loading saved resume data from localStorage');
          const parsedData = JSON.parse(savedResumeData);
          const mergedData = initialData ? { ...parsedData, ...initialData } : parsedData;
          if (mergedData.template && !mergedData.templateId) {
            mergedData.templateId = mergedData.template;
          } else if (mergedData.templateId && !mergedData.template) {
            mergedData.template = mergedData.templateId;
          }
          
          // Sanitizer: Fix corrupted professionalSummary from storage
          if (mergedData.professionalSummary && typeof mergedData.professionalSummary === 'object') {
             console.warn('🔥 SANITIZER: Detected corrupted professionalSummary in storage, repairing...');
             const summaryObj = mergedData.professionalSummary as any;
             mergedData.professionalSummary = String(summaryObj.summary || summaryObj.text || Object.values(summaryObj)[0] || '');
             // Update storage immediately to fix persistence
             localStorage.setItem(userResumeKey, JSON.stringify(mergedData));
          }
          
          setResumeData(mergedData);
        } else if (initialData) {
          console.log('📋 Using initial data provided to ResumeProvider');
          // Sanitizer: Fix corrupted professionalSummary from initialData
          const safeInitialData = { ...initialData };
          if (safeInitialData.professionalSummary && typeof safeInitialData.professionalSummary === 'object') {
             console.warn('🔥 SANITIZER: Detected corrupted professionalSummary in initialData, repairing...');
             const summaryObj = safeInitialData.professionalSummary as any;
             safeInitialData.professionalSummary = String(summaryObj.summary || summaryObj.text || Object.values(summaryObj)[0] || '');
          }
          setResumeData(safeInitialData);
        }
        
        if (savedAIData) {
          console.log('🤖 Loading saved AI data from localStorage');
          const parsedAIData = JSON.parse(savedAIData);
          
          // Sanitizer: Fix corrupted optimizedSummary from storage
          if (parsedAIData.optimizedSummary && typeof parsedAIData.optimizedSummary === 'object') {
             console.warn('🔥 SANITIZER: Detected corrupted optimizedSummary in storage, repairing...');
             const summaryObj = parsedAIData.optimizedSummary as any;
             parsedAIData.optimizedSummary = String(summaryObj.summary || summaryObj.text || Object.values(summaryObj)[0] || '');
             localStorage.setItem(userAIKey, JSON.stringify(parsedAIData));
          }
          
          console.log('🔍 Checking cached PDF URL:', {
            hasCachedPdfUrl: !!parsedAIData.cachedPdfUrl,
            cachedPdfUrl: parsedAIData.cachedPdfUrl?.substring(0, 20),
            isBlob: parsedAIData.cachedPdfUrl?.startsWith('blob:'),
            hasPdfBlobBase64: !!parsedAIData.pdfBlobBase64
          });
          
          // Restore blob from base64 if available
          if (parsedAIData.pdfBlobBase64) {
            try {
              console.log('🔄 Restoring PDF blob from base64 data');
              
              // Convert base64 back to blob
              const base64Data = parsedAIData.pdfBlobBase64.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const restoredBlob = new Blob([byteArray], { type: 'application/pdf' });
              
              // Create fresh blob URL
              const freshBlobUrl = URL.createObjectURL(restoredBlob);
              
              // Update parsed data with restored blob and fresh URL
              parsedAIData.pdfBlob = restoredBlob;
              parsedAIData.cachedPdfUrl = freshBlobUrl;
              
              // Clean up base64 data
              delete parsedAIData.pdfBlobBase64;
              
              console.log('✅ PDF blob restored successfully, new URL:', freshBlobUrl.substring(0, 20));
            } catch (blobError) {
              console.warn('⚠️ Failed to restore blob from base64:', blobError);
              parsedAIData.cachedPdfUrl = null;
              parsedAIData.pdfBlob = null;
              parsedAIData.pdfCacheHash = null;
              delete parsedAIData.pdfBlobBase64;
            }
          }
          // Clear invalid blob URLs only if no base64 data available  
          else if (parsedAIData.cachedPdfUrl && parsedAIData.cachedPdfUrl.startsWith('blob:')) {
            console.log('🧹 Clearing invalid blob URL from cache after page refresh (no blob data available)');
            parsedAIData.cachedPdfUrl = null;
            parsedAIData.pdfBlob = null;
            parsedAIData.pdfCacheHash = null;
            
            // Set flag to trigger auto-request if user has completed compulsory fields
            if (savedResumeData) {
              const resumeContent = JSON.parse(savedResumeData);
              
              // Inline validation since hasRequiredFields might not be defined yet
              const hasRequired = (
                resumeContent.personalInfo?.firstName &&
                resumeContent.personalInfo?.lastName &&
                (resumeContent.personalInfo?.email || resumeContent.personalInfo?.phone) &&
                resumeContent.professionalSummary &&
                resumeContent.professionalSummary.trim().length > 50 &&
                resumeContent.workExperience?.length > 0 &&
                resumeContent.workExperience.some(exp => 
                  exp.jobTitle && exp.company && exp.description &&
                  exp.description.trim().length > 20
                )
              );
              
              if (hasRequired) {
                console.log('📋 User has completed compulsory fields - PDF preview ready (AI enhancement available on demand)');
                // Remove auto-trigger - AI enhancement should only happen when user clicks the button
                parsedAIData.shouldAutoTrigger = false;
              } else {
                console.log('📝 User has incomplete resume data - skipping auto-trigger');
              }
            }
          }
          
          // Also check if AI data exists but has no cached PDF - trigger auto-request
          if (!parsedAIData.cachedPdfUrl && savedResumeData) {
            const resumeContent = JSON.parse(savedResumeData);
            
            // Inline validation with detailed debugging
            const personalInfoValid = resumeContent.personalInfo?.firstName && 
                                    resumeContent.personalInfo?.lastName && 
                                    (resumeContent.personalInfo?.email || resumeContent.personalInfo?.phone);
            
            const summaryValid = resumeContent.professionalSummary && 
                                resumeContent.professionalSummary.trim().length > 50;
            
            const workExperienceValid = resumeContent.workExperience?.length > 0 &&
                                      resumeContent.workExperience.some(exp => 
                                        exp.jobTitle && 
                                        exp.company && 
                                        exp.responsibilities && 
                                        exp.responsibilities.length > 0 &&
                                        exp.responsibilities.some(resp => resp.trim().length > 20)
                                      );
            
            const hasRequired = personalInfoValid && summaryValid && workExperienceValid;
            
            console.log('🔍 Required fields validation:', {
              personalInfoValid,
              firstName: !!resumeContent.personalInfo?.firstName,
              lastName: !!resumeContent.personalInfo?.lastName,
              hasContact: !!(resumeContent.personalInfo?.email || resumeContent.personalInfo?.phone),
              summaryValid,
              summaryLength: resumeContent.professionalSummary?.trim().length || 0,
              workExperienceValid,
              workExperienceCount: resumeContent.workExperience?.length || 0,
              hasRequired
            });
            
            if (hasRequired) {
              console.log('📋 User has completed required fields - basic PDF preview ready (AI enhancement available on demand)');
              // Remove auto-trigger - AI enhancement should only happen when user clicks the button
              parsedAIData.shouldAutoTrigger = false;
            } else {
              console.log('📝 User has incomplete resume data - no auto-trigger needed');
            }
          }

          setAIData(parsedAIData);
        } else {
          // No AI data exists - check if user has required fields for initial auto-trigger
          if (savedResumeData) {
            const resumeContent = JSON.parse(savedResumeData);
            
            // Inline validation since hasRequiredFields might not be defined yet
            const hasRequired = (
              resumeContent.personalInfo?.firstName &&
              resumeContent.personalInfo?.lastName &&
              (resumeContent.personalInfo?.email || resumeContent.personalInfo?.phone) &&
              resumeContent.professionalSummary &&
              resumeContent.professionalSummary.trim().length > 50 &&
              resumeContent.workExperience?.length > 0 &&
              resumeContent.workExperience.some(exp => 
                exp.jobTitle && exp.company && exp.description &&
                exp.description.trim().length > 20
              )
            );
            
            if (hasRequired) {
              console.log('📋 User has completed required fields - basic PDF preview ready (AI enhancement available on demand)');
              // Remove auto-trigger - AI enhancement should only happen when user clicks the button
              setAIData({ shouldAutoTrigger: false });
            } else {
              console.log('📝 User has incomplete resume data - no auto-trigger needed');
            }
          }
        }

        if (savedAuditLog) {
          try {
            setResumeAuditLog(JSON.parse(savedAuditLog));
          } catch (error) {
            console.warn('Failed to parse resume audit log:', error);
            setResumeAuditLog([]);
          }
        } else {
          setResumeAuditLog([]);
        }
      } catch (error) {
        console.warn('Failed to load resume data from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?.id, initialData]);

  // Save immediately before page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty) { // Only save if dirty
        // Clear any pending debounced save and save immediately
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveToStorage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, resumeData, aiData, saveTimeout]); // Added isDirty to dependencies

  const updateResumeData = useCallback((newData: Partial<Resume>) => {
    // Sanitizer: Ensure professionalSummary is always a string to prevent React crashes
    if (newData.professionalSummary && typeof newData.professionalSummary === 'object') {
      console.warn('🔥 SANITIZER: Detected corrupted professionalSummary object in update, fixing...', newData.professionalSummary);
      const summaryObj = newData.professionalSummary as any;
      newData.professionalSummary = String(summaryObj.summary || summaryObj.text || Object.values(summaryObj)[0] || '');
    }

    setResumeData(prev => {
      const nextData = { ...prev, ...newData };
      if (nextData.template && !nextData.templateId) {
        nextData.templateId = nextData.template;
      } else if (nextData.templateId && !nextData.template) {
        nextData.template = nextData.templateId;
      }
      const changedFields = getChangedResumeFields(prev, nextData);
      appendAuditEntry(changedFields, nextData);
      return nextData;
    });
    setIsDirty(true); // Mark as dirty on any data update
  }, [appendAuditEntry]);

  const updateAIData = useCallback((newData: Partial<AIEnhancementData>) => {
    // Sanitizer: Ensure optimizedSummary is always a string
    if (newData.optimizedSummary && typeof newData.optimizedSummary === 'object') {
      console.warn('🔥 SANITIZER: Detected corrupted optimizedSummary object in update, fixing...', newData.optimizedSummary);
      const summaryObj = newData.optimizedSummary as any;
      newData.optimizedSummary = String(summaryObj.summary || summaryObj.text || Object.values(summaryObj)[0] || '');
    }
    
    setAIData(prev => {
      const nextData = { ...prev, ...newData };
      const aiChangedFields: string[] = [];
      if (stableSerialize(prev.optimizedLatexCode) !== stableSerialize(nextData.optimizedLatexCode)) {
        aiChangedFields.push('optimizedLatexCode');
      }
      if (stableSerialize(prev.optimizedForJob) !== stableSerialize(nextData.optimizedForJob)) {
        aiChangedFields.push('optimizedForJob');
      }
      if (aiChangedFields.length > 0) {
        appendAuditEntry(aiChangedFields, resumeDataRef.current);
      }
      return nextData;
    });
    setIsDirty(true); // Mark as dirty on any AI data update
  }, [appendAuditEntry]);

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

  const handleDataChange = useCallback((stepId: string, data: any) => {
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
    setIsDirty(true); // Explicitly mark as dirty when data changes
  }, [updateResumeData]);

  // Note: Auto-save removed - users must manually save their resumes

  const saveToStorage = async () => {
    try {
      setIsAutoSaving(true);
      const userResumeKey = user?.id ? `resume-builder-data-${user.id}` : 'resume-builder-data-guest';
      const userAIKey = user?.id ? `resume-ai-data-${user.id}` : 'resume-ai-data-guest';
      
      localStorage.setItem(userResumeKey, JSON.stringify(resumeData));
      
      // Handle aiData with blob serialization
      const aiDataToSave = { ...aiData };
      
      // Convert blob to base64 for localStorage persistence
      if (aiData.pdfBlob && aiData.cachedPdfUrl) {
        try {
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(aiData.pdfBlob!);
          });
          aiDataToSave.pdfBlobBase64 = base64Data;
          console.log('💾 PDF blob converted to base64 for localStorage');
        } catch (blobError) {
          console.warn('⚠️ Failed to convert blob to base64:', blobError);
          // Remove blob reference if conversion fails
          aiDataToSave.cachedPdfUrl = null;
          aiDataToSave.pdfBlob = null;
        }
      }
      
      // Remove the actual blob before saving (it can't be serialized)
      delete aiDataToSave.pdfBlob;
      
      localStorage.setItem(userAIKey, JSON.stringify(aiDataToSave));
      try {
        localStorage.setItem(getAuditLogKey(), JSON.stringify(resumeAuditLog));
      } catch (error) {
        console.warn('Failed to save resume audit log:', error);
      }
      
      // Set last saved time and stop auto-saving indicator
      setTimeout(() => {
        setIsAutoSaving(false);
        setLastSaved(new Date());
        setIsDirty(false); // Mark as clean after successful save
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
    localStorage.removeItem(getAuditLogKey());
    
    setResumeData({});
    setAIData({});
    setIsDirty(false); // Clear dirty state
    setResumeAuditLog([]);
  };

  // New methods for LaTeX optimization state management
  const setOptimizedLatexCode = (code: string, templateId: string, jobData?: { jobUrl: string; jobTitle: string; companyName: string }) => {
    const optimizationData: Partial<AIEnhancementData> = {
      optimizedLatexCode: code,
      templateId,
      lastOptimized: new Date().toISOString()
    };
    
    if (jobData) {
      optimizationData.optimizedForJob = {
        ...jobData,
        optimizedAt: new Date().toISOString()
      };
    }
    
    updateAIData(optimizationData);
  };

  const clearOptimizedContent = () => {
    // Clear PDF cache URL if it exists
    if (aiData.cachedPdfUrl) {
      URL.revokeObjectURL(aiData.cachedPdfUrl);
    }
    
    updateAIData({
      optimizedLatexCode: undefined,
      templateId: undefined,
      optimizedForJob: undefined,
      cachedPdfUrl: undefined,
      pdfCacheHash: undefined
    });
    setIsDirty(true); // Mark as dirty since optimized content is cleared
  };

  const setCachedPdf = (pdfUrl: string, hash: string, blob?: Blob) => {
    // Revoke previous URL if it exists
    if (aiData.cachedPdfUrl && aiData.cachedPdfUrl !== pdfUrl) {
      URL.revokeObjectURL(aiData.cachedPdfUrl);
    }
    
    updateAIData({
      cachedPdfUrl: pdfUrl,
      pdfCacheHash: hash,
      pdfBlob: blob,
      lastPdfGenerated: new Date().toISOString()
    });
    // Do not set dirty here, as PDF caching doesn't change form data directly
  };

  const isCacheValid = useCallback((currentHash: string) => {
    // Basic checks
    if (!aiData.pdfCacheHash || aiData.pdfCacheHash !== currentHash) {
      return false;
    }
    
    if (!aiData.cachedPdfUrl) {
      return false;
    }
    
    // If it's a blob URL, check if we have the blob data to validate it
    if (aiData.cachedPdfUrl.startsWith('blob:')) {
      if (!aiData.pdfBlob) {
        console.log('🔄 Blob URL detected without blob data - invalid after page refresh, will regenerate');
        return false;
      }
      console.log('🔄 Blob URL detected with blob data - valid for current session');
    }
    
    return true;
  }, [aiData.pdfCacheHash, aiData.cachedPdfUrl, aiData.pdfBlob]);

  const generateResumeHash = useCallback(() => {
    return getResumeHash(resumeData, {
      optimizedForJob: aiData.optimizedForJob,
      optimizedLatexCode: aiData.optimizedLatexCode
    });
  }, [resumeData, aiData.optimizedForJob, aiData.optimizedLatexCode]);

  const markPdfCacheStale = (options?: { clearOptimizedLatex?: boolean }) => {
    updateAIData({
      pdfCacheHash: null,
      ...(options?.clearOptimizedLatex
        ? {
            optimizedLatexCode: undefined,
            optimizedForJob: undefined,
            templateId: undefined
          }
        : {})
    });
  };

  const hasRequiredFields = useCallback((resumeData: any) => {
    return (
      // Personal Info - Name and contact are compulsory
      resumeData.personalInfo?.firstName &&
      resumeData.personalInfo?.lastName &&
      (resumeData.personalInfo?.email || resumeData.personalInfo?.phone) &&
      
      // Professional Summary - compulsory for good resume
      resumeData.professionalSummary &&
      resumeData.professionalSummary.trim().length > 50 &&
      
      // Work Experience - at least one entry with meaningful content
      resumeData.workExperience?.length > 0 &&
      resumeData.workExperience.some(exp => 
        exp.jobTitle && exp.company && exp.description &&
        exp.description.trim().length > 20
      )
    );
  }, []);

  const clearAllCacheAndBlobUrls = () => {
    console.log('🧹 Clearing all cached PDF data and revoking blob URLs');
    
    // Revoke existing blob URLs to prevent memory leaks
    if (aiData.cachedPdfUrl && aiData.cachedPdfUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(aiData.cachedPdfUrl);
        console.log('✅ Revoked cached PDF blob URL');
      } catch (error) {
        console.warn('Failed to revoke cached PDF blob URL:', error);
      }
    }

    // Clear all AI-related cache data
    updateAIData({
      cachedPdfUrl: null,
      pdfCacheHash: null,
      pdfBlob: null,
      optimizedLatexCode: null,
      lastPdfGenerated: null,
      enhancementProgress: {
        isLoading: false,
        currentStep: '',
        progress: 0,
        error: null
      }
    });
    setIsDirty(true); // Mark as dirty since cache is cleared
    console.log('✅ All PDF cache and blob URLs cleared');
  };

  const savePdfToLibrary = async (name: string, jobData?: { jobUrl: string; jobTitle: string; companyName: string }) => {
    if (!aiData.cachedPdfUrl || !aiData.pdfBlob) {
      throw new Error('No PDF available to save');
    }

    const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentHash = generateResumeHash();
    
    const savedPdf = {
      id: pdfId,
      name,
      url: aiData.cachedPdfUrl,
      blob: aiData.pdfBlob,
      generatedAt: new Date().toISOString(),
      resumeHash: currentHash,
      jobOptimized: jobData
    };

    // Save to localStorage first for immediate access
    const updatedSavedPdfs = [...(aiData.savedPdfs || []), savedPdf];
    updateAIData({
      savedPdfs: updatedSavedPdfs
    });

    // Try to save to database if resume has an ID
    const resumeId = (resumeData._id || resumeData.id) as any;
    if (resumeId) {
      // Convert ObjectId to string properly - handle all cases
      let stringResumeId;
      if (typeof resumeId === 'string') {
        stringResumeId = resumeId;
      } else if (resumeId && typeof resumeId === 'object') {
        // Handle MongoDB ObjectId or any object with toString method
        if (typeof resumeId.toString === 'function') {
          stringResumeId = resumeId.toString();
        } else if (resumeId.$oid) {
          // MongoDB ObjectId JSON format
          stringResumeId = resumeId.$oid;
        } else {
          console.error('❌ Cannot convert resumeId object to string:', resumeId);
          throw new Error('Invalid resumeId object format');
        }
      } else {
        stringResumeId = String(resumeId);
      }
      try {
        await resumeService.savePDFToDatabase(stringResumeId, {
          templateId: aiData.templateId,
          optimizedLatexCode: aiData.optimizedLatexCode,
          jobOptimized: jobData
        });
        console.log('✅ PDF saved to database successfully');
        setIsDirty(false); // Mark as clean after successful save to database
      } catch (error) {
        console.warn('⚠️ Failed to save PDF to database, saved locally only:', error);
        // PDF is still saved locally, so this is not a critical error
      }
    }

    return pdfId;
  };

  const downloadPdf = (pdfId?: string) => {
    let pdfToDownload: { url: string; name: string } | null = null;

    if (pdfId) {
      // Download specific saved PDF
      const savedPdf = aiData.savedPdfs?.find(pdf => pdf.id === pdfId);
      if (savedPdf) {
        pdfToDownload = { url: savedPdf.url, name: savedPdf.name };
      }
    } else {
      // Download current cached PDF
      if (aiData.cachedPdfUrl) {
        const defaultName = `${resumeData.personalInfo?.firstName || 'Resume'}_${resumeData.personalInfo?.lastName || ''}_${new Date().toISOString().split('T')[0]}.pdf`.trim();
        pdfToDownload = { url: aiData.cachedPdfUrl, name: defaultName };
      }
    }

    if (pdfToDownload) {
      const link = document.createElement('a');
      link.href = pdfToDownload.url;
      link.download = pdfToDownload.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      throw new Error('No PDF available to download');
    }
    // Do not set dirty here, as download is not a form change
  };

  const deleteSavedPdf = (pdfId: string) => {
    const pdfToDelete = aiData.savedPdfs?.find(pdf => pdf.id === pdfId);
    if (pdfToDelete) {
      URL.revokeObjectURL(pdfToDelete.url);
    }

    const updatedSavedPdfs = aiData.savedPdfs?.filter(pdf => pdf.id !== pdfId) || [];
    
    updateAIData({
      savedPdfs: updatedSavedPdfs
    });
    setIsDirty(true); // Mark as dirty since saved PDF is deleted
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Only cleanup on actual unmount, not on re-renders
      if (aiData.cachedPdfUrl && aiData.cachedPdfUrl.startsWith('blob:')) {
        console.log('🧹 Cleanup: Revoking blob URL on component unmount');
        URL.revokeObjectURL(aiData.cachedPdfUrl);
      }
    };
  }, []); // Empty dependency array ensures this only runs on unmount

  const value: ResumeContextType = {
    resumeData,
    aiData,
    updateResumeData,
    updateAIData,
    handleDataChange,
    saveToStorage,
    clearStorage,
    isAutoSaving,
    lastSaved,
    setOptimizedLatexCode,
    clearOptimizedContent,
    setCachedPdf,
    savePdfToLibrary,
    downloadPdf,
    deleteSavedPdf,
    isCacheValid,
    generateResumeHash,
    markPdfCacheStale,
    clearAllCacheAndBlobUrls,
    hasRequiredFields,
    isLoading,
    isDirty,
    setIsDirty,
    resumeAuditLog,
    // AI Usage and Subscription Lock Logic
    get isAIUsed() {
      return !!(
        aiData.wasSummaryGenerated || 
        aiData.wasAnalysisRun || 
        aiData.wasOptimizationApplied || 
        aiData.optimizedLatexCode
      );
    },
    get isSubscriptionLockActive() {
      const aiUsed = !!(
        aiData.wasSummaryGenerated || 
        aiData.wasAnalysisRun || 
        aiData.wasOptimizationApplied || 
        aiData.optimizedLatexCode
      );
      // Lock is active if AI was used and user is not enterprise
      return aiUsed && user?.tier !== 'enterprise';
    }
  };

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
};
