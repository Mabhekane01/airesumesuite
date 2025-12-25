import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowPathIcon, 
  DocumentTextIcon, 
  ArrowsPointingOutIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

// Component to convert blob to data URL for inline display
const PDFFromBlob = ({ blobUrl, pdfBlob, title, isFullscreenMode, onFullscreen, pdfBlobBase64 }) => {
  const [dataUrl, setDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🎯 PDFFromBlob useEffect triggered:', {
      blobUrl: !!blobUrl,
      blobUrlValue: blobUrl,
      pdfBlob: !!pdfBlob,
      pdfBlobType: pdfBlob?.type,
      pdfBlobSize: pdfBlob?.size,
      pdfBlobConstructor: pdfBlob?.constructor?.name
    });
    const convertBlobToDataUrl = async () => {
      try {
        let blob = pdfBlob;
        
        // If we have a direct blob, use it. Otherwise try to fetch from blob URL
        if (!blob && blobUrl && blobUrl.startsWith('blob:')) {
          console.log(`🔄 No direct blob available, trying to fetch from URL: ${blobUrl}`);
          try {
            const response = await fetch(blobUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            blob = await response.blob();
          } catch (fetchErr) {
            console.error('❌ Failed to fetch blob from URL:', fetchErr);
            throw new Error('PDF blob is no longer accessible');
          }
        } else if (blob) {
          // Handle React state proxy issues - try to access size/type safely
          const blobSize = blob.size || 'unknown';
          const blobType = blob.type || 'application/pdf';
          console.log(`🔄 Using direct blob: ${blobSize} bytes, type: ${blobType}`);
        }
        
        if (!blob) {
          throw new Error('No blob data available');
        }
        
        // Validate that blob is actually a Blob object
        if (!(blob instanceof Blob)) {
          console.warn('⚠️ pdfBlob is not a valid Blob object:', typeof blob, blob);
          throw new Error('Invalid blob object - possibly corrupted from storage');
        }
        
        console.log(`📦 Processing blob: ${blob.size} bytes, type: ${blob.type}`);
        
        // Validate blob has content and correct type
        if (blob.size === 0) {
          throw new Error('PDF file is empty - regeneration required');
        }
        
        // Relaxed type check as some browsers might not set application/pdf correctly for blobs created on the fly
        if (blob.type && !blob.type.includes('pdf') && !blob.type.includes('application/octet-stream')) {
           console.warn('⚠️ Blob type mismatch:', blob.type);
        }
        
        // Convert to data URL for iframe
        console.log('🔄 Starting FileReader conversion...');
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          console.log(`✅ Successfully converted to data URL`);
          
          if (typeof result === 'string') {
            // Validate that it's a PDF data URL (or at least starts with data:)
            if (!result.startsWith('data:application/pdf') && !result.startsWith('data:application/octet-stream')) {
              console.warn(`⚠️ Data URL might have incorrect MIME type: ${result.substring(0, 30)}`);
            }
            setDataUrl(result);
            setLoading(false);
            console.log('✅ PDF data URL set successfully');
          } else {
             console.error('❌ FileReader result is not a string');
             setError('Failed to convert PDF to displayable format');
             setLoading(false);
          }
        };
        reader.onerror = (e) => {
          console.error('❌ FileReader error:', e);
          setError('Failed to convert PDF to displayable format');
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        console.error('❌ Failed to process blob:', err);
        console.error('❌ Error details:', err.message);
        
        // Show more specific error messages
        if (err.message.includes('Invalid blob object')) {
          setError('PDF data corrupted - please regenerate');
        } else if (err.message.includes('PDF blob is no longer accessible')) {
           setError('PDF session expired - please regenerate');
        } else if (err.message.includes('No blob data')) {
          setError('PDF data not available');
        } else if (err.message.includes('HTTP')) {
          setError('PDF server error');
        } else {
          setError('Failed to load PDF');
        }
        setLoading(false);
      }
    };

    // If we have base64 data, use it directly (most reliable)
    if (pdfBlobBase64) {
      console.log('🎯 Using base64 data directly');
      setDataUrl(pdfBlobBase64);
      setLoading(false);
      return;
    }
    
    // If we have a valid blob URL, use it directly
    if (blobUrl && blobUrl.startsWith('blob:')) {
      // Test if the blob URL is still valid by attempting to fetch it
      console.log('🔄 Testing blob URL validity:', blobUrl);
      fetch(blobUrl)
        .then(response => {
          if (response.ok) {
            console.log('🔄 Using valid blob URL directly for iframe display');
            setDataUrl(blobUrl);
            setLoading(false);
          } else {
            throw new Error('Blob URL no longer accessible');
          }
        })
        .catch(error => {
          console.log('❌ Blob URL invalid, checking if we have blob data as fallback');
          console.log('❌ pdfBlob available:', !!pdfBlob, 'instanceof Blob:', pdfBlob instanceof Blob);
          
          // If blob URL is invalid but we have blob data, use it
          if (pdfBlob && pdfBlob instanceof Blob && pdfBlob.size > 0) {
            console.log('🔄 Falling back to blob data conversion');
            convertBlobToDataUrl();
          } else {
            console.log('❌ No valid blob data available for fallback');
            setError('PDF data lost after page refresh - please regenerate');
            setLoading(false);
          }
        });
    } else if (pdfBlob && pdfBlob instanceof Blob && pdfBlob.size > 0) {
      console.log('🔄 Using blob data directly for conversion - Size:', pdfBlob.size, 'Type:', pdfBlob.type);
      convertBlobToDataUrl();
    } else {
      console.log('❌ No valid PDF source available - blobUrl:', !!blobUrl, 'pdfBlob:', !!pdfBlob);
      setError('No PDF data available');
      setLoading(false);
    }
  }, [blobUrl, pdfBlob, pdfBlobBase64]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[650px] md:min-h-[800px] bg-white">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-600">Converting PDF for display...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[650px] md:min-h-[800px] bg-white">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">PDF preview temporarily unavailable</p>
          <Button 
            onClick={() => window.open(blobUrl || dataUrl, '_blank')}
            className="mt-4"
            variant="outline"
          >
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  }

  if (!dataUrl) {
    // Fallback to direct blob URL if data URL conversion failed
    return (
      <iframe
        src={blobUrl}
        className="w-full h-full min-h-[650px] md:min-h-[800px] border-none"
        title={title || 'PDF Preview'}
      />
    );
  }

  return (
    <div className="relative w-full h-full min-h-[650px] md:min-h-[1000px] group">
      {/* PDF Display - Make PDF fill the container better */}
      <iframe
        src={`${dataUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=FitH&view=FitH`}
        className="w-full h-full min-h-[650px] md:min-h-[1000px] border-none"
        title={title || 'PDF Preview'}
        style={{
          transform: 'scale(1.0)',
          transformOrigin: 'top center',
          overflow: 'hidden'
        }}
        onLoad={() => {
          console.log(`✅ Iframe loaded successfully with data URL`);
        }}
        onError={(e) => {
          console.error('❌ Iframe failed to load:', e);
          setError('PDF iframe failed to load');
        }}
      />
      
      {/* Hover Overlay - shows on hover */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-none">
        <div 
          className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            console.log(`🔗 Opening full PDF view from overlay`);
            // Use existing blob URL or data URL instead of creating new one
            if (blobUrl && blobUrl.startsWith('blob:')) {
              window.open(blobUrl, '_blank');
            } else if (dataUrl) {
              window.open(dataUrl, '_blank');
            } else {
              console.error('No valid URL available for opening PDF');
            }
          }}
        >
          <EyeIcon className="h-5 w-5 text-gray-700" />
          <span className="text-gray-700 font-medium">Click to view full PDF</span>
        </div>
      </div>
      
      {/* Fullscreen button - only visible in fullscreen mode */}
      {!isFullscreenMode && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            onClick={onFullscreen}
            variant="outline"
            className="bg-white/90 text-gray-800 border-gray-300 hover:bg-white shadow-lg"
          >
            <ArrowsPointingOutIcon className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      )}
    </div>
  );
};

interface PDFPreviewProps {
  pdfUrl?: string;
  pdfData?: string; // Base64 PDF data
  pdfBlob?: Blob; // Direct blob data
  pdfBlobBase64?: string; // Base64 blob data for persistence
  templateId?: string;
  resumeData?: any;
  title?: string;
  onClose?: () => void;
  className?: string;
  onPdfGenerated?: (pdfUrl: string, blob: Blob) => void;
  onGenerationStart?: () => void;
  refreshTrigger?: number; // Force regeneration when this changes
}

export default function PDFPreview({ 
  pdfUrl, 
  pdfData, 
  pdfBlob: propPdfBlob,
  pdfBlobBase64,
  templateId, 
  resumeData, 
  title, 
  onClose,
  className = '',
  onPdfGenerated,
  onGenerationStart,
  refreshTrigger
}: PDFPreviewProps) {
  // Immediate browser detection
  const userAgent = navigator.userAgent;
  const isEdge = /Edg/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
  const shouldUseFallback = (url: string) => url.startsWith('blob:') && (isEdge || isChrome);
  
  console.log('🌐 PDF Preview component initialized:', {
    userAgent,
    isEdge,
    isChrome,
    pdfUrl: !!pdfUrl,
    pdfData: !!pdfData,
    propPdfBlob: !!propPdfBlob,
    propPdfBlobSize: propPdfBlob?.size || 0,
    propPdfBlobType: propPdfBlob?.type || 'none'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualPdfUrl, setActualPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(() => {
    // Try to restore blob from localStorage on component mount
    if (propPdfBlob) return propPdfBlob;
    
    try {
      const cacheKey = `pdf_cache_${templateId || 'default'}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { base64Data, timestamp, resumeHash, templateId: cachedTemplateId } = JSON.parse(cachedData);
        // Only use cached data if it's less than 1 hour old and matches current resume
        const currentHash = (() => {
          if (!resumeData) return '';
          const contentToHash = {
            personalInfo: resumeData.personalInfo,
            professionalSummary: resumeData.professionalSummary,
            workExperience: resumeData.workExperience,
            education: resumeData.education,
            skills: resumeData.skills,
            projects: resumeData.projects,
            certifications: resumeData.certifications,
            templateId: templateId
          };
          const jsonString = JSON.stringify(contentToHash);
          let hash = 0;
          for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash).toString(16);
        })();
        
        const isExpired = Date.now() - timestamp > 3600000; // 1 hour
        const isDataChanged = resumeHash !== currentHash;
        const isTemplateChanged = cachedTemplateId !== templateId;
        
        if (!isExpired && !isDataChanged && !isTemplateChanged) {
          console.log('🔄 Restoring PDF blob from localStorage cache - data unchanged');
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          return new Blob([byteArray], { type: 'application/pdf' });
        } else {
          // Remove invalid cache
          localStorage.removeItem(cacheKey);
          console.log('🗑️ Removed invalid PDF cache:', { isExpired, isDataChanged, isTemplateChanged });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore PDF blob from cache:', error);
    }
    
    return null;
  });
  // Initialize iframe error state - TRUE for any blob URL
  const [iframeError, setIframeError] = useState(() => {
    return pdfUrl && pdfUrl.startsWith('blob:');
  });
  // Initialize viewer method - FALLBACK for any blob URL
  const [viewerMethod, setViewerMethod] = useState<'embed' | 'object' | 'fallback'>(() => {
    if (pdfUrl && pdfUrl.startsWith('blob:')) {
      console.log('🚨 Initial fallback mode for ANY blob URL');
      return 'fallback';
    }
    return 'embed';
  });
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  const lastResumeHashRef = useRef<string>('');
  
  // Initialize hash from localStorage on mount
  useEffect(() => {
    try {
      lastResumeHashRef.current = localStorage.getItem('lastResumeHash') || '';
    } catch {
      lastResumeHashRef.current = '';
    }
  }, []);

  // Update pdfBlob when prop changes
  useEffect(() => {
    if (propPdfBlob && propPdfBlob !== pdfBlob) {
      console.log(`📦 Updating pdfBlob from prop: ${propPdfBlob.size} bytes`);
      setPdfBlob(propPdfBlob);
      const url = URL.createObjectURL(propPdfBlob);
      setActualPdfUrl(url);
      setViewerMethod('fallback');
      setIframeError(true);
    }
  }, [propPdfBlob]);

  // Clean up expired PDF cache entries on component mount
  useEffect(() => {
    const cleanupExpiredCache = () => {
      try {
        const keys = Object.keys(localStorage);
        const pdfCacheKeys = keys.filter(key => key.startsWith('pdf_cache_'));
        let cleanedCount = 0;
        
        pdfCacheKeys.forEach(key => {
          try {
            const cachedData = localStorage.getItem(key);
            if (cachedData) {
              const { timestamp } = JSON.parse(cachedData);
              // Remove cache older than 1 hour
              if (Date.now() - timestamp > 3600000) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch (error) {
            // Remove corrupted cache entries
            localStorage.removeItem(key);
            cleanedCount++;
          }
        });
        
        if (cleanedCount > 0) {
          console.log(`🧹 Cleaned up ${cleanedCount} expired PDF cache entries`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to cleanup PDF cache:', error);
      }
    };
    
    cleanupExpiredCache();
  }, []);

  useEffect(() => {
    // Generate hash of current resume data to detect actual changes
    const generateResumeHash = () => {
      if (!resumeData) return '';
      const contentToHash = {
        personalInfo: resumeData.personalInfo,
        professionalSummary: resumeData.professionalSummary,
        workExperience: resumeData.workExperience,
        education: resumeData.education,
        skills: resumeData.skills,
        projects: resumeData.projects,
        certifications: resumeData.certifications,
        languages: resumeData.languages,
        hobbies: resumeData.hobbies,
        volunteerExperience: resumeData.volunteerExperience,
        awards: resumeData.awards,
        publications: resumeData.publications,
        references: resumeData.references,
        additionalSections: resumeData.additionalSections,
        templateId: templateId
      };
      const jsonString = JSON.stringify(contentToHash);
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    };

    const currentHash = generateResumeHash();
    const isFirstLoad = lastResumeHashRef.current === '';
    const hasContentChanged = currentHash !== lastResumeHashRef.current;
    const isForceRefresh = refreshTrigger !== undefined && refreshTrigger > 0;
    
    // Update hash immediately to prevent re-render loops
    if (hasContentChanged && currentHash) {
      lastResumeHashRef.current = currentHash;
      try {
        localStorage.setItem('lastResumeHash', currentHash);
      } catch (error) {
        console.warn('Failed to save hash to localStorage:', error);
      }
    }
    
    console.log('🎯 PDFPreview useEffect triggered:', {
      pdfUrl: !!pdfUrl,
      pdfData: !!pdfData,
      propPdfBlob: !!propPdfBlob,
      currentPdfBlob: !!pdfBlob,
      templateId,
      hasResumeData: !!resumeData,
      currentHash: currentHash.substring(0, 8),
      lastHash: lastResumeHashRef.current.substring(0, 8),
      isFirstLoad,
      hasContentChanged,
      isForceRefresh,
      shouldGeneratePDF: !pdfUrl && !pdfData && templateId && resumeData && (isFirstLoad || hasContentChanged || isForceRefresh)
    });

    // Note: Hash will be updated after successful PDF generation, not here
    // This prevents premature hash updates that break change detection

    if (pdfUrl && !hasContentChanged) {
      console.log('📎 Using cached PDF URL, input unchanged since last stage 12 visit');
      setActualPdfUrl(pdfUrl);
      setLoading(false);
      setError(null);
      
      if (pdfUrl.startsWith('blob:')) {
        console.log(`🚨 Using immediate fallback for cached blob URL`);
        setViewerMethod('fallback');
        setIframeError(true);
        // Don't fetch - we should have blob data from props
        if (!pdfBlob && !propPdfBlob) {
          console.warn('⚠️ No blob data available for cached blob URL, will regenerate');
          // If we have resume data, regenerate the PDF
          if (templateId && resumeData) {
            console.log('🔄 Regenerating PDF since blob data is missing');
            generatePDFPreview();
          } else {
            setError('PDF data not available');
          }
        }
      } else {
        setIframeError(false);
        setViewerMethod('embed');
        // Set timeout for embed method - shorter for blob URLs
        const timeout = setTimeout(() => {
          console.log('Embed method timed out, trying object...');
          setViewerMethod('object');
          // Set timeout for object method too
          const objectTimeout = setTimeout(() => {
            console.log('Object method timed out, showing fallback...');
            setViewerMethod('fallback');
            setIframeError(true);
          }, 2000);
          setLoadTimeout(objectTimeout);
        }, 2000);
        setLoadTimeout(timeout);
      }
    } else if (pdfData) {
      console.log('📎 Using provided PDF data');
      // Convert base64 to blob URL
      const blob = base64ToBlob(pdfData, 'application/pdf');
      const url = URL.createObjectURL(blob);
      setActualPdfUrl(url);
      setPdfBlob(blob);
      
      if (url.startsWith('blob:')) {
        console.log(`🚨 Using immediate fallback for ALL pdfData blob URLs`);
        setViewerMethod('fallback');
        setIframeError(true);
        console.log(`📦 Stored pdfBlob from pdfData: ${!!blob}`);
      } else {
        setIframeError(false);
        setViewerMethod('embed');
      }
      
      // Cleanup URL when component unmounts - but DON'T revoke immediately!
      return () => {
        // Only revoke after a longer delay to allow conversion
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000); // 10 seconds delay
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
      };
    } else if (!pdfUrl && propPdfBlob) {
      console.log('📎 Using provided PDF blob prop');
      const url = URL.createObjectURL(propPdfBlob);
      setActualPdfUrl(url);
      setPdfBlob(propPdfBlob);
      
      if (url.startsWith('blob:')) {
        console.log(`🚨 Using immediate fallback for prop blob URL`);
        setViewerMethod('fallback');
        setIframeError(true);
      } else {
        setIframeError(false);
        setViewerMethod('embed');
      }

      return () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);
      };
    } else if (!pdfUrl && propPdfBlob) {
      console.log('📎 Using provided PDF blob prop');
      const url = URL.createObjectURL(propPdfBlob);
      setActualPdfUrl(url);
      setPdfBlob(propPdfBlob);
      
      if (url.startsWith('blob:')) {
        console.log(`🚨 Using immediate fallback for prop blob URL`);
        setViewerMethod('fallback');
        setIframeError(true);
      } else {
        setIframeError(false);
        setViewerMethod('embed');
      }

      return () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);
      };
    } else if (pdfUrl && (hasContentChanged || isForceRefresh)) {
      console.log('🔄 Input changed or force refresh triggered, clearing cache and regenerating PDF');
      // Content has changed or force refresh, clear cache and regenerate
      generatePDFPreview();
    } else if (templateId && resumeData && (isFirstLoad || hasContentChanged || isForceRefresh)) {
      if (isFirstLoad) {
        console.log('🚀 First load, generating PDF for template:', templateId, 'Hash:', currentHash.substring(0, 8));
      } else if (isForceRefresh) {
        console.log('🚀 Force refresh triggered, generating new PDF for template:', templateId, 'Trigger:', refreshTrigger);
      } else {
        console.log('🚀 Content changed, generating new PDF for template:', templateId, 'Hash:', currentHash.substring(0, 8));
      }
      generatePDFPreview();
    } else if (templateId && resumeData && !hasContentChanged && !isFirstLoad) {
      console.log('📋 Content unchanged, skipping PDF generation. Hash:', currentHash.substring(0, 8));
    } else {
      console.log('❌ Missing requirements for PDF generation:', {
        templateId: !!templateId,
        resumeData: !!resumeData
      });
    }
  }, [pdfUrl, pdfData, templateId, resumeData, refreshTrigger]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  // Force fallback for ALL blob URLs - no browser detection needed
  useEffect(() => {
    if (actualPdfUrl && actualPdfUrl.startsWith('blob:')) {
      console.log(`🚨 Detected blob URL, forcing immediate fallback for ALL browsers`);
      setViewerMethod('fallback');
      setIframeError(true);
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        setLoadTimeout(null);
      }
    }
  }, [actualPdfUrl, loadTimeout]);

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const generateResumeHash = (): string => {
    if (!resumeData) return '';
    const contentToHash = {
      personalInfo: resumeData.personalInfo,
      professionalSummary: resumeData.professionalSummary,
      workExperience: resumeData.workExperience,
      education: resumeData.education,
      skills: resumeData.skills,
      projects: resumeData.projects,
      certifications: resumeData.certifications,
      languages: resumeData.languages,
      hobbies: resumeData.hobbies,
      volunteerExperience: resumeData.volunteerExperience,
      awards: resumeData.awards,
      publications: resumeData.publications,
      references: resumeData.references,
      additionalSections: resumeData.additionalSections,
      templateId: templateId
    };
    const jsonString = JSON.stringify(contentToHash);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const generatePDFPreview = async () => {
    if (!templateId || !resumeData) return;

    // OPTIMIZATION: Only generate if content has actually changed
    const currentHash = generateResumeHash();
    if (pdfUrl && !iframeError && lastResumeHashRef.current === currentHash && refreshTrigger === undefined) {
      console.log('📋 Content unchanged, skipping redundant PDF generation request');
      return;
    }

    setLoading(true);
    setError(null);
    setIframeError(false);
    setViewerMethod('embed');
    
    // Notify parent that generation started
    if (onGenerationStart) {
      onGenerationStart();
    }

    try {
      // Basic PDF preview - always generate fresh LaTeX (no optimization)
      const requestPayload = {
        templateId,
        resumeData,
        engine: 'latex'
      };

      console.log('📄 Requesting PDF generation from server...');

      // Generate PDF using LaTeX engine (extended timeout for LaTeX compilation)
      const response = await api.post('/resumes/generate-preview-pdf', requestPayload, {
        responseType: 'blob',
        timeout: 300000 // 5 minutes for LaTeX compilation
      });

      const blob = response.data;
      
      // Validate the PDF blob before using it
      if (!blob || blob.size === 0) {
        throw new Error('Server returned empty PDF file. Please check your resume data and try again.');
      }
      
      if (blob.size < 1000) { // PDF files should be at least 1KB
        console.warn('⚠️ PDF file is suspiciously small:', blob.size, 'bytes');
      }
      
      const url = URL.createObjectURL(blob);
      setActualPdfUrl(url);
      setPdfBlob(blob);
      
      // Update last generated hash after successful generation
      lastResumeHashRef.current = currentHash;
      try {
        localStorage.setItem('lastResumeHash', currentHash);
      } catch (e) {
        console.warn('Failed to save hash to localStorage');
      }
      
      // Cache the blob in localStorage for persistence across page refreshes
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = (reader.result as string).split(',')[1]; // Remove data:application/pdf;base64, prefix
          const cacheKey = `pdf_cache_${templateId || 'default'}`;
          const cacheData = {
            base64Data,
            timestamp: Date.now(),
            resumeHash: currentHash,
            templateId
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log('✅ PDF blob cached in localStorage for persistence');
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.warn('⚠️ Failed to cache PDF blob:', error);
      }
      
      if (url.startsWith('blob:')) {
        console.log(`🚨 Using immediate fallback for ALL generated blob URLs`);
        setViewerMethod('fallback');
        setIframeError(true);
        console.log(`📦 Stored pdfBlob for fallback: ${!!blob}`);
      } else {
        // Set timeout for embed method - shorter for blob URLs  
        const timeout = setTimeout(() => {
          console.log('Embed method timed out, trying object...');
          setViewerMethod('object');
          // Set timeout for object method too
          const objectTimeout = setTimeout(() => {
            console.log('Object method timed out, showing fallback...');
            setViewerMethod('fallback');
            setIframeError(true);
          }, 2000);
          setLoadTimeout(objectTimeout);
        }, 2000);
        setLoadTimeout(timeout);
      }
      
      // Notify parent that PDF was generated and provide URL and blob for enhanced caching
      if (onPdfGenerated) {
        onPdfGenerated(url, blob);
      }
      
      // Don't revoke the blob URL immediately - give time for conversion
      console.log(`🕐 Blob URL created, will be available for conversion: ${url}`);
      console.log(`📦 PDF Blob stored for conversion: ${!!blob}, size: ${blob?.size || 0} bytes`);

    } catch (err: any) {
      console.error('PDF generation error:', err);
      console.error('PDF generation error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        templateId,
        resumeData: JSON.stringify(resumeData, null, 2)
      });
      
      // Show user-friendly error message
      const errorData = err.response?.data;
      if (errorData?.code === 'INSUFFICIENT_RESUME_DATA') {
        setError(errorData.message || 'Please add more resume content to generate a preview');
      } else if (err.response?.status === 400) {
        setError(errorData?.message || 'Invalid resume data. Please check your information.');
      } else {
        setError('Failed to generate PDF preview. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPDFViewer = () => {
    // Add browser detection logging
    const userAgent = navigator.userAgent;
    const isEdge = /Edg/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isBlob = actualPdfUrl?.startsWith('blob:');
    
    console.log('🔍 Browser detection in renderPDFViewer:', {
      userAgent,
      isEdge,
      isChrome,
      isBlob,
      actualPdfUrl,
      viewerMethod,
      iframeError
    });

    // Handle different rendering methods based on URL type and browser support
    const shouldUseSpecialRender = viewerMethod === 'fallback' || iframeError;
    
    console.log('🎯 Render decision:', {
      isBlob,
      isEdge,
      isChrome,
      viewerMethod,
      iframeError,
      shouldUseSpecialRender,
      actualPdfUrl
    });
    
    if (isBlob) {
      console.log(`🎯 Using PDFFromBlob component for blob URL`);
      console.log(`🎯 actualPdfUrl: ${actualPdfUrl}`);
      console.log(`🎯 pdfBlob exists: ${!!pdfBlob}`);
    } else if (shouldUseSpecialRender) {
      console.log(`🚨 Using fallback UI for non-blob URL`);
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[650px] md:min-h-[800px] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-surface-100">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-2xl animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center mx-auto relative z-10">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-brand-blue" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-brand-dark uppercase tracking-[0.2em]">Compiling Architecture Preview...</p>
              <p className="text-xs font-medium text-text-secondary max-w-[240px] mx-auto leading-relaxed">Synthesizing Vector LaTeX layers into a high-fidelity deployment.</p>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[650px] md:min-h-[800px] bg-white rounded-[2rem] md:rounded-[2.5rem] border border-red-100 shadow-sm">
          <div className="text-center space-y-6 max-w-md px-10">
            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto text-red-500 border border-red-100">
              <DocumentTextIcon className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black text-brand-dark tracking-tight">Preview Unavailable</p>
              <p className="text-sm text-text-secondary font-medium leading-relaxed">{error}</p>
            </div>
            {templateId && resumeData && (
              <Button
                onClick={generatePDFPreview}
                variant="outline"
                className="px-8 py-3.5 rounded-xl border-2 border-surface-200 text-[10px] font-black uppercase tracking-[0.15em] hover:bg-surface-50 hover:border-brand-dark transition-all duration-300"
              >
                Retry Compilation
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (!actualPdfUrl) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[650px] md:min-h-[800px] bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 border-dashed border-surface-200">
          <div className="text-center space-y-4 opacity-40 group-hover:opacity-60 transition-opacity duration-500">
            <div className="w-20 h-20 bg-surface-50 rounded-[2rem] flex items-center justify-center mx-auto text-text-tertiary">
              <DocumentTextIcon className="h-10 w-10" />
            </div>
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Idle: Target node not generated.</p>
          </div>
        </div>
      );
    }

    // If iframe fails to load blob URL, use direct blob display
    if (iframeError && pdfBlob) {
      return (
        <div className={`relative w-full h-full min-h-[650px] md:min-h-[1000px] bg-gray-50 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-surface-200 shadow-inner`}>
          <PDFFromBlob 
            blobUrl={actualPdfUrl}
            pdfBlob={pdfBlob}
            title={title}
            pdfBlobBase64={pdfBlobBase64}
          />
        </div>
      );
    }

    const handleViewerError = () => {
      console.log(`PDF viewer error with method: ${viewerMethod}`);
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        setLoadTimeout(null);
      }
      
      if (viewerMethod === 'embed') {
        console.log('Trying object method...');
        setViewerMethod('object');
        // Set timeout for object method too - shorter timeout
        const timeout = setTimeout(() => {
          console.log('Object method timed out, falling back...');
          setViewerMethod('fallback');
          setIframeError(true);
        }, 2000);
        setLoadTimeout(timeout);
      } else if (viewerMethod === 'object') {
        console.log('Falling back to manual controls...');
        setViewerMethod('fallback');
        setIframeError(true);
      }
    };

    const handleViewerLoad = () => {
      console.log(`PDF viewer loaded successfully with method: ${viewerMethod}`);
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        setLoadTimeout(null);
      }
      setIframeError(false);
    };

    // Show fallback only for non-blob URLs that have errors
    if (shouldUseSpecialRender && !isBlob) {
      return (
        <div className={`relative w-full h-full min-h-[600px] bg-white rounded-[2.5rem] overflow-hidden flex items-center justify-center border border-red-100 shadow-sm`}>
          <div className="text-center p-10 space-y-4">
            <DocumentTextIcon className="h-16 w-16 text-text-tertiary mx-auto opacity-30" />
            <div className="space-y-1">
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Preview Error</h3>
              <p className="text-sm font-medium text-text-secondary">Unable to load deployment preview. Please refresh.</p>
            </div>
          </div>
        </div>
      );
    }

    // Convert blob URL to data URL for inline display
    if (isBlob) {
      console.log(`🔄 Converting blob URL to data URL for inline display`);
      
                  // Use iframe with data URL instead of blob URL
      
                  return (
      
                    <div className={`relative w-full h-full min-h-[650px] md:min-h-[1000px] bg-gray-50 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-surface-200 shadow-inner`}>              <PDFFromBlob 
                blobUrl={actualPdfUrl} 
                pdfBlob={pdfBlob}
                title={title}
                pdfBlobBase64={pdfBlobBase64}
              />
            </div>
          );    }

    return (
      <div className={`relative w-full h-full min-h-[650px] md:min-h-[1000px] bg-gray-50 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-surface-200 shadow-inner`}>
        {/* PDF Viewer - Try different methods based on viewerMethod state */}
        {viewerMethod === 'embed' ? (
          <embed
            src={`${actualPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=FitH&view=FitH`}
            type="application/pdf"
            className="w-full h-full min-h-[650px] md:min-h-[1000px] border-none rounded-[2rem] md:rounded-[2.5rem]"
            title={title || 'PDF Preview'}
            onLoad={handleViewerLoad}
            onError={handleViewerError}
            style={{
              imageRendering: 'crisp-edges',
              transform: 'scale(1.0)',
              transformOrigin: 'top center'
            }}
          />
        ) : (
          <object
            data={`${actualPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=FitH&view=FitH`}
            type="application/pdf"
            className="w-full h-full min-h-[650px] md:min-h-[1000px] border-none rounded-[2rem] md:rounded-[2.5rem]"
            title={title || 'PDF Preview'}
            onLoad={handleViewerLoad}
            onError={handleViewerError}
            style={{
              imageRendering: 'crisp-edges',
              transform: 'scale(1.0)',
              transformOrigin: 'top center'
            }}
          >
            {/* Empty fallback - we handle fallback with our own UI */}
          </object>
        )}
        
        {/* PDF Controls Overlay */}
        <div className="absolute top-6 right-6 flex space-x-2 relative z-30">
          <Button
            onClick={() => window.open(actualPdfUrl, '_blank')}
            className="bg-white/90 backdrop-blur-md text-brand-dark border border-surface-200 hover:bg-white hover:shadow-xl transition-all duration-300 rounded-[1rem] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2.5 shadow-lg active:scale-95"
          >
            <EyeIcon className="h-4 w-4 stroke-[2.5px]" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3 md:mb-8 px-1 md:px-2">
          <h3 className="text-lg md:text-2xl font-display font-black text-brand-dark tracking-tighter uppercase">{title}</h3>
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="w-10 h-10 rounded-full p-0 flex items-center justify-center border-surface-200 text-text-tertiary hover:text-brand-dark hover:bg-surface-50 transition-all"
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
      {renderPDFViewer()}
    </div>
  );
}
