import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  SparklesIcon,
  ChartBarIcon,
  BriefcaseIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  BoltIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Resume } from "../../types";
import { EnhancementReviewModal } from './EnhancementReviewModal';
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { resumeTemplates, getTemplateById } from "../../data/resumeTemplates";
import TemplateRenderer from "./TemplateRenderer";
import PDFPreview from "./PDFPreview";
import { useResume } from "../../contexts/ResumeContext";
import { resumeService } from "../../services/resumeService";
import { api } from "../../services/api";
import AILoadingOverlay from "../ui/AILoadingOverlay";
import { useAIProgress } from "../../hooks/useAIProgress";
import { toast } from "sonner";
import { useSubscriptionModal } from "../../hooks/useSubscriptionModal";
import { useSubscription } from "../../hooks/useSubscription";
import SubscriptionModal from "../subscription/SubscriptionModal";
import { useNavigate } from "react-router-dom";

interface AIAnalysis {
  overallScore: number;
  atsCompatibility: number;
  keywordDensity: number;
  contentQuality: number;
  industryAlignment: number;
  strengths: string[];
  improvements: Array<{
    category: string;
    priority: "high" | "medium" | "low";
    suggestions: string[];
    impact: string;
  }>;
  competitorComparison: {
    percentile: number;
    industry: string;
    improvements: string[];
  };
}

interface JobMatchAnalysis {
  matchScore: number;
  keywordAlignment: number;
  skillsMatch: number;
  experienceMatch: number;
  missingKeywords: string[];
  recommendedImprovements: string[];
}

interface EnterpriseResumeEnhancerProps {
  resume: Resume;
  onResumeUpdate?: (updatedResume: Resume) => void;
  hasUnsavedChanges?: boolean;
  onAnalysisComplete?: () => void;
  onJobOptimizationClick?: () => void;
  onSwitchToPreview?: () => void;
  shouldSwitchToPreview?: boolean;
  onPreviewSwitched?: () => void;
}

export default function EnterpriseResumeEnhancer({
  resume,
  onResumeUpdate,
  hasUnsavedChanges = false,
  onAnalysisComplete,
  onJobOptimizationClick,
  onSwitchToPreview,
  shouldSwitchToPreview,
  onPreviewSwitched,
}: EnterpriseResumeEnhancerProps) {
  console.log("🔍 EnterpriseResumeEnhancer mounted with props:", {
    hasUnsavedChanges,
    onAnalysisComplete: !!onAnalysisComplete,
    resumeHasContent: !!resume?.personalInfo?.firstName,
  });

  const navigate = useNavigate();
  const {
    updateResumeData,
    updateAIData,
    aiData,
    setOptimizedLatexCode,
    clearOptimizedContent,
    setCachedPdf,
    isCacheValid,
    clearStorage,
    clearAllCacheAndBlobUrls,
    // Enhanced PDF management
    savePdfToLibrary,
    downloadPdf,
    deleteSavedPdf,
    generateResumeHash,
    // Subscription locks
    isSubscriptionLockActive
  } = useResume();

  // State for the new preview-first enhancement flow
  const [showEnhancementReview, setShowEnhancementReview] = useState(false);
  const [enhancementReviewData, setEnhancementReviewData] = useState(null);

  console.log("🔍 EnterpriseResumeEnhancer aiData on mount:", {
    shouldAutoTrigger: aiData.shouldAutoTrigger,
    cachedPdfUrl: !!aiData.cachedPdfUrl,
    pdfCacheHash: !!aiData.pdfCacheHash,
    analysisProgressLoading: aiData.analysisProgress?.isLoading,
    isSubscriptionLockActive
  });

  // Check if required fields are missing and show user what's needed
  const checkRequiredFields = () => {
    const personalInfoValid =
      resume.personalInfo?.firstName &&
      resume.personalInfo?.lastName &&
      (resume.personalInfo?.email || resume.personalInfo?.phone);

    const summaryValid =
      resume.professionalSummary &&
      resume.professionalSummary.trim().length > 50;

    const workExperienceValid =
      resume.workExperience?.length > 0 &&
      resume.workExperience.some(
        (exp) =>
          exp.jobTitle &&
          exp.company &&
          exp.responsibilities &&
          exp.responsibilities.length > 0 &&
          exp.responsibilities.some((resp) => resp.trim().length > 20)
      );

    return { personalInfoValid, summaryValid, workExperienceValid };
  };

  const requiredFieldsStatus = checkRequiredFields();
  const hasAllRequiredFields =
    requiredFieldsStatus.personalInfoValid &&
    requiredFieldsStatus.summaryValid &&
    requiredFieldsStatus.workExperienceValid;

  const [activeTab, setActiveTab] = useState<
    "preview" | "analysis" | "optimization" | "benchmarking"
  >("preview");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [jobMatchAnalysis, setJobMatchAnalysis] =
    useState<JobMatchAnalysis | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [dynamicTemplate, setDynamicTemplate] = useState<any>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // PDF caching to prevent regeneration on tab switches - now managed by ResumeContext
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);

  // Track last resume hash for change detection
  const [lastResumeHash, setLastResumeHash] = useState<string>("");
  // Force PDF regeneration trigger
  const [pdfRefreshTrigger, setPdfRefreshTrigger] = useState<number>(0);

  // AI Progress hooks for different operations
  const atsProgress = useAIProgress("ats-analysis");
  const analysisProgress = useAIProgress("resume-analysis");
  const jobMatchingProgress = useAIProgress("job-matching");

  const jobOptimizationProgress = useAIProgress("job-optimization");

  // Subscription modal
  const { isModalOpen, modalProps, closeModal, checkAIFeature } =
    useSubscriptionModal();
  const { hasActiveSubscription, isEnterprise, tier, canUseAI } =
    useSubscription();

  // Debug subscription state changes
  console.log("🔍 EnterpriseResumeEnhancer subscription state:", {
    hasActiveSubscription,
    isEnterprise,
    tier,
    canUseAI,
    timestamp: new Date().toISOString(),
  });

  // Force component to re-render when subscription state changes
  useEffect(() => {
    console.log("🔄 Subscription state changed, forcing re-render:", {
      hasActiveSubscription,
      isEnterprise,
      tier,
      canUseAI,
    });
  }, [hasActiveSubscription, isEnterprise, tier, canUseAI]);

  // Dynamic template resolution - prioritize LaTeX templates
  const template =
    dynamicTemplate || getTemplateById(resume.template) || resumeTemplates[0];

  // Check if resume content has changed (requires PDF regeneration)
  const hasResumeChanged = useCallback(() => {
    const currentHash = generateResumeHash();
    return currentHash !== lastResumeHash;
  }, [generateResumeHash, lastResumeHash]);

  // Clear cached PDF when resume changes and update last hash
  useEffect(() => {
    const currentHash = generateResumeHash();

    // Update last hash if this is the first render or hash has changed
    if (lastResumeHash !== currentHash) {
      setLastResumeHash(currentHash);
    }

    if (
      !isCacheValid(currentHash) &&
      aiData.cachedPdfUrl
    ) {
      console.log("📄 Resume content changed, clearing cached PDF");
      clearOptimizedContent();
    }
  }, [
    resume,
    generateResumeHash,
    isCacheValid,
    aiData.cachedPdfUrl,
    clearOptimizedContent,
    lastResumeHash,
  ]);

  // PDF generation callback that handles enhanced caching
  const handlePdfGenerated = useCallback(
    (pdfUrl: string, blob: Blob) => {
      console.log("✅ PDF generated and cached");
      const currentHash = generateResumeHash();
      setCachedPdf(pdfUrl, currentHash, blob);

      setPdfGenerating(false);
    },
    [generateResumeHash, setCachedPdf]
  );

  // PDF generation started callback
  const handlePdfGenerationStart = useCallback(() => {
    console.log("🔄 PDF generation started");
    setPdfGenerating(true);
  }, []);

  // PDF Management Handlers (using context functions)
  const handleSavePdf = useCallback(
    async (name?: string) => {
      // PRE-ACTION SUBSCRIPTION CHECK
      if (isSubscriptionLockActive) {
        console.log("🔒 PDF Save blocked: AI features used without enterprise subscription");
        checkAIFeature("Save AI-Optimized PDF");
        return;
      }

      try {
        const pdfName =
          name ||
          `${resume.personalInfo?.firstName || "Resume"}_${resume.personalInfo?.lastName || ""}_${new Date().toISOString().split("T")[0]}`.trim();
        const jobData = aiData.optimizedForJob
          ? {
              jobUrl: aiData.optimizedForJob.jobUrl,
              jobTitle: aiData.optimizedForJob.jobTitle,
              companyName: aiData.optimizedForJob.companyName,
            }
          : undefined;

        const pdfId = await savePdfToLibrary(pdfName, jobData);
        console.log(`✅ PDF saved to library with ID: ${pdfId}`);
        toast.success("PDF saved to library!");
        return pdfId;
      } catch (error) {
        console.error("❌ Failed to save PDF:", error);
        toast.error("Failed to save PDF");
        throw error;
      }
    },
    [savePdfToLibrary, resume, aiData, isSubscriptionLockActive, checkAIFeature]
  );

  const handleDownloadCurrentPdf = useCallback(() => {
    // PRE-ACTION SUBSCRIPTION CHECK
    if (isSubscriptionLockActive) {
      console.log("🔒 PDF Download blocked: AI features used without enterprise subscription");
      checkAIFeature("Download AI-Optimized PDF");
      return;
    }

    try {
      downloadPdf();
      console.log("✅ PDF download initiated");
      toast.success("PDF download started!");
    } catch (error) {
      console.error("❌ Failed to download PDF:", error);
      toast.error("Failed to download PDF");
      throw error;
    }
  }, [downloadPdf, isSubscriptionLockActive, checkAIFeature]);

  const handleDownloadSavedPdf = useCallback(
    (pdfId: string) => {
      try {
        downloadPdf(pdfId);
        console.log(`✅ Saved PDF download initiated: ${pdfId}`);
        toast.success("Saved PDF download started!");
      } catch (error) {
        console.error("❌ Failed to download saved PDF:", error);
        toast.error("Failed to download saved PDF");
        throw error;
      }
    },
    [downloadPdf]
  );

  // Helper function to check if error is subscription-related
  const isSubscriptionError = (error: any): boolean => {
    return (
      error?.response?.status === 403 ||
      error?.isSubscriptionError ||
      error?.response?.data?.code?.includes("SUBSCRIPTION")
    );
  };

  // State for AI Enhancement loading
  const [aiEnhancementLoading, setAiEnhancementLoading] = useState(false);

  // NEW: Preview-First AI Enhancement - Shows suggestions before generating PDF
  const startAIEnhancementReview = useCallback(async () => {
    if (aiEnhancementLoading) return;

    console.log("🤖 Starting AI enhancement preview...");
    setAiEnhancementLoading(true);

    try {
      const templateId = resume.templateId || resume.template || "template1";

      // Step 1: Get AI enhancement suggestions (no PDF generation yet)
      const enhancementData = await resumeService.enhanceResumeContentOnly(
        resume,
        templateId,
        {
          improvementLevel: "comprehensive",
        }
      );

      console.log("🎯 AI Enhancement Suggestions Received:", {
        improvements: enhancementData.improvements.length,
        keywordsAdded: enhancementData.keywordsAdded.length,
        atsScore: enhancementData.atsScore,
        sectionsWithChanges: Object.keys(enhancementData.enhancementSuggestions).filter(
          key => enhancementData.enhancementSuggestions[key].hasChanges
        )
      });

      // Show the enhancement review modal
      setEnhancementReviewData(enhancementData);
      setShowEnhancementReview(true);

    } catch (error) {
      console.error("❌ AI enhancement preview failed:", error);
      toast.error(`AI enhancement failed: ${error.message}`);
    } finally {
      setAiEnhancementLoading(false);
    }
  }, [resume, aiEnhancementLoading]);

  // Cleanup function to clear all data and return to template selection
  const handleStartFresh = useCallback(async () => {
    try {
      console.log("🧹 Starting fresh resume build process...");
      console.log("📊 Current resume data before clear:", resume);
      console.log("🤖 Current AI data before clear:", aiData);
      
      // Clear any local component state first
      setAiAnalysis(null);
      setJobMatchAnalysis(null);
      setOptimizationHistory([]);
      setShowEnhancementReview(false);
      setEnhancementReviewData(null);
      
      // Clear all cached data and blob URLs
      clearAllCacheAndBlobUrls();
      
      // Clear localStorage FIRST to prevent any data restoration
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
      const userResumeKey = user?.id ? `resume-builder-data-${user.id}` : 'resume-builder-data-guest';
      const userAIKey = user?.id ? `resume-ai-data-${user.id}` : 'resume-ai-data-guest';
      
      // Clear all possible localStorage keys
      localStorage.removeItem('resume-builder-data');
      localStorage.removeItem('resume-ai-data');
      localStorage.removeItem(userResumeKey);
      localStorage.removeItem(userAIKey);
      
      console.log("🗑️ localStorage cleared manually");
      
      // Clear context state AFTER localStorage to prevent auto-restore
      updateResumeData({});
      updateAIData({});
      
      // Force clear context storage function (in case it has different logic)
      clearStorage();
      
      console.log("✅ All data clearing operations completed");
      
      toast.success("All data cleared successfully! Starting fresh...");
      
      // Navigate immediately
      console.log("🔄 Navigating to template selection...");
      navigate("/dashboard/resume/templates");
      
    } catch (error) {
      console.error("❌ Failed to clear data:", error);
      toast.error("Failed to clear data. Please try again.");
    }
  }, [clearAllCacheAndBlobUrls, clearStorage, navigate, updateResumeData, updateAIData, resume, aiData]);


  // REAL AI Analysis - Actually calls backend AI services
  const runComprehensiveAnalysis = useCallback(async () => {
    if (analysisProgress.isLoading) return; // Prevent multiple simultaneous calls

    analysisProgress.startProgress();

    try {
      // Track successful API calls
      let successfulCalls = 0;
      let totalCalls = 2; // summary, ATS (enhancement is now separate)

      // First, generate REAL AI professional summary
      console.log("📝 Generating REAL AI professional summary...");
      let aiSummary = null;
      try {
        const summaryResponse = await api.post("/resumes/generate-summary", {
          resumeData: resume,
        });
        aiSummary = summaryResponse.data.data || summaryResponse.data.summary;
        console.log(
          "✅ REAL AI summary generated:",
          aiSummary?.substring(0, 50) + "..."
        );
        successfulCalls++;
      } catch (summaryError) {
        console.warn(
          "⚠️ AI summary generation failed:",
          summaryError.response?.data || summaryError.message
        );
        if (isSubscriptionError(summaryError)) {
          analysisProgress.cancelProgress();
          // Let the API interceptor handle subscription modal
          checkAIFeature("AI Resume Analysis");
          return; // Stop processing - subscription error
        }
      }

      // Second, run ATS analysis with AI
      console.log("🔍 Running AI-powered ATS analysis...");
      let atsResponse;
      try {
        atsResponse = await resumeService.analyzeATSCompatibility(resume);
        console.log("✅ ATS analysis completed. Score:", atsResponse.score);
        successfulCalls++;
      } catch (atsError) {
        console.warn("⚠️ ATS analysis failed:", atsError);
        if (isSubscriptionError(atsError)) {
          analysisProgress.cancelProgress();
          // Let the API interceptor handle subscription modal
          checkAIFeature("AI Resume Analysis");
          return; // Stop processing - subscription error
        }
        // Use fallback data
        atsResponse = {
          score: 70,
          strengths: [],
          recommendations: [],
          improvementAreas: [],
        };
      }

      // Third, get job alignment score for industry analysis
      console.log("📊 Analyzing industry alignment...");
      let alignmentScore = 75;
      try {
        const alignmentResponse = await resumeService.getJobAlignmentScore(
          resume,
          "Generate a comprehensive analysis of this resume for general business positions, focusing on industry alignment and competitive positioning."
        );
        alignmentScore = alignmentResponse.score;
        console.log("✅ Industry alignment score:", alignmentScore);
      } catch (alignmentError) {
        console.warn("⚠️ Industry alignment analysis failed, using fallback");
      }

      // Analysis complete - no enhancement during analysis
      console.log(
        "📊 Analysis phase completed, skipping automatic enhancement"
      );

      // Process all the REAL AI responses
      const analysis: AIAnalysis = {
        overallScore: atsResponse.score || 75,
        atsCompatibility: atsResponse.score,
        keywordDensity:
          atsResponse.keywordMatch || calculateKeywordDensity(resume),
        contentQuality:
          atsResponse.contentScore || assessContentQuality(resume),
        industryAlignment: alignmentScore,
        strengths: atsResponse.strengths || extractStrengths(resume),
        improvements: formatImprovements(atsResponse.recommendations || []),
        competitorComparison: {
          percentile: Math.min(Math.round((atsResponse.score / 100) * 85), 95),
          industry: detectIndustry(resume),
          improvements: atsResponse.improvementAreas || [
            "Add more quantified achievements",
            "Improve keyword optimization",
            "Enhance professional summary",
          ],
        },
      };

      console.log("✅ AI Analysis completed successfully:", {
        overallScore: analysis.overallScore,
        atsScore: analysis.atsCompatibility,
        improvements: analysis.improvements.length,
      });

      setAiAnalysis(analysis);
      updateAIData({
        atsScore: analysis.atsCompatibility,
        aiSuggestions: analysis.improvements.flatMap((imp) => imp.suggestions),
        optimizedSummary: aiSummary,
        wasAnalysisRun: true, // Track AI usage for lock logic
      });

      analysisProgress.completeProgress();

      // Only show success if we had actual AI successes
      if (successfulCalls > 0) {
        toast.success("AI analysis completed successfully", {
          description: `ATS Score: ${analysis.atsCompatibility}% | ${analysis.improvements.length} improvements identified | ${successfulCalls}/${totalCalls} AI services used`,
        });
      } else {
        // All AI calls failed - show fallback message
        toast.warning("Analysis completed with limited features", {
          description: "AI services unavailable. Using basic analysis instead.",
        });
      }
    } catch (error: any) {
      console.error("❌ AI Analysis completely failed:", error);
      analysisProgress.cancelProgress();

      // Show specific error message to help debug
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";
      toast.error(`AI analysis failed: ${errorMessage}`, {
        description: "Check console for details. Using local fallback.",
      });

      // Only use local fallback if ALL AI calls fail
      const analysis: AIAnalysis = {
        overallScore: calculateOverallScore(resume),
        atsCompatibility: 70,
        keywordDensity: calculateKeywordDensity(resume),
        contentQuality: assessContentQuality(resume),
        industryAlignment: 75,
        strengths: extractStrengths(resume),
        improvements: formatImprovements([]),
        competitorComparison: {
          percentile: 65,
          industry: detectIndustry(resume),
          improvements: [
            "AI services not configured",
            "Check API keys in backend",
            "Enable enterprise AI features",
          ],
        },
      };

      setAiAnalysis(analysis);
    } finally {
      console.log("🏁 AI Analysis process completed");
      // Notify parent that analysis is complete
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    }
  }, [resume, updateAIData, analysisProgress, onAnalysisComplete]);

  // Job-Specific Optimization using existing working endpoints
  const optimizeForJob = useCallback(
    async (jobUrl: string) => {
      if (!jobUrl.trim()) {
        toast.error("Please enter a valid job URL");
        return;
      }

      jobOptimizationProgress.startProgress();
      try {
        // Use existing working job analysis endpoint
        const jobAnalysis = await resumeService.analyzeJobFromUrl({ jobUrl });

        // Use existing working job matching endpoint
        const matchResult = await resumeService.getJobMatchingScore(
          resume,
          jobUrl
        );

        setJobMatchAnalysis({
          matchScore: matchResult.matchScore,
          keywordAlignment: calculateAlignment(
            matchResult.keywordAlignment,
            matchResult.missingKeywords
          ),
          skillsMatch: calculateSkillsMatch(resume, jobAnalysis),
          experienceMatch: calculateExperienceMatch(
            resume,
            jobAnalysis
          ),
          missingKeywords: matchResult.missingKeywords,
          recommendedImprovements: matchResult.recommendations,
        });

        // Include template code in optimization request
        const optimizationPayload = {
          resume,
          jobUrl,
          templateCode: dynamicTemplate?.latexCode || null,
          templateId: resume.template || resume.templateId,
        };

        console.log("🎯 Optimizing resume with template code for job:", {
          jobUrl,
          hasTemplateCode: !!optimizationPayload.templateCode,
          templateId: optimizationPayload.templateId,
        });

        // Use existing working optimization endpoint with enhanced payload
        const optimizedResult = await resumeService.optimizeResumeWithJobUrl(
          resume,
          jobUrl,
          {
            templateCode: dynamicTemplate?.latexCode,
            templateId: resume.template || resume.templateId,
          }
        );

        console.log("🔍 Job optimization result:", optimizedResult);

        // Handle case where optimizedResult is undefined or null
        if (!optimizedResult) {
          throw new Error("No optimization result received from server");
        }

        // Check if the result is a PDF (string starting with %PDF)
        const resultStr = String(optimizedResult || '');
        const isRawPDF = typeof optimizedResult === 'string' && resultStr.startsWith('%PDF-1');
        
        if (isRawPDF) {
          console.log("✅ Job optimization returned PDF data directly");
          
          // Convert PDF string to blob and update PDF preview
          const pdfBlob = new Blob([optimizedResult as string], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          
          // Cache the PDF using the existing PDF management system
          const currentHash = generateResumeHash();
          setCachedPdf(pdfUrl, currentHash, pdfBlob);
          updateAIData({ wasOptimizationApplied: true }); // Track AI usage for lock logic
          
          console.log("✅ PDF preview updated with optimization result");
          toast.success("Resume optimized and PDF updated!");
          
          // Auto-switch to preview tab
          setTimeout(() => {
            setActiveTab("preview");
          }, 1000);
          
          jobOptimizationProgress.completeProgress();
          
        } else {
          // Handle structured JSON response (legacy format)
          const result = optimizedResult as any;
          const optimizedResumeData = result?.optimizedResume || 
                                     result?.enhancedResume || 
                                     result?.improvedResume ||
                                     result?.data?.optimizedResume ||
                                     result?.data?.enhancedResume;

          if (optimizedResumeData) {

            console.log(
              "✅ Resume optimized for job, updating data and generating new PDF"
            );
            updateResumeData(optimizedResumeData);

          if (onResumeUpdate) {
            onResumeUpdate(optimizedResumeData);
          }

          // Check if we got optimized LaTeX code
          if (result?.optimizedLatexCode) {
            console.log(
              "🎯 Got optimized LaTeX code, storing in context for download"
            );

            // Store optimized LaTeX code in context with job information
            setOptimizedLatexCode(
              result.optimizedLatexCode,
              result.templateUsed || resume.templateId || "template1",
              {
                jobUrl,
                jobTitle: jobAnalysis?.jobDetails?.title || jobAnalysis?.jobDetails?.jobTitle || "Unknown",
                companyName: jobAnalysis?.jobDetails?.company || jobAnalysis?.jobDetails?.companyName || "Unknown",
              }
            );

            // Store the optimized LaTeX code for PDF generation
            optimizedResumeData.optimizedLatexCode =
              result.optimizedLatexCode || result.data?.optimizedLatexCode;
            optimizedResumeData.templateUsed = result.templateUsed || result.data?.templateUsed;

            // Clear cached PDF since resume is now optimized
            clearOptimizedContent();
            
            // Note: PDF will be automatically regenerated when preview system detects form changes
            console.log("✅ Job optimization completed - PDF will auto-regenerate on preview");
          }

          // Auto-switch to preview tab to show optimized resume
          setTimeout(() => {
            console.log(
              "🔄 Auto-switching to preview tab to show optimized resume"
            );
            setActiveTab("preview");
          }, 1000);

          // Track optimization history
          setOptimizationHistory((prev) => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              jobUrl,
              jobTitle: jobAnalysis?.jobDetails?.title || jobAnalysis?.jobDetails?.jobTitle || "Unknown",
              company: jobAnalysis?.jobDetails?.company || jobAnalysis?.jobDetails?.companyName || "Unknown",
              improvements: result?.improvements || [],
              scoreImprovement: result?.qualityScore || 0,
            },
          ]);

          // Handle AI status notifications
          console.log("🔍 DEBUG: Job Optimization Result:", {
            hasAiStatus: !!result?.aiStatus,
            aiStatus: result?.aiStatus,
            resultKeys: Object.keys(result || {}),
          });

          if (result?.aiStatus) {
            console.log(
              "⚠️ SHOWING JOB OPTIMIZATION FALLBACK WARNING:",
              result.aiStatus
            );
            toast.warning(`⚠️ ${result.aiStatus}`, {
              description:
                "Your resume was still optimized, but AI services encountered issues. Contact support for full AI capabilities.",
              duration: 8000,
            });
          } else {
            console.log("✅ SHOWING JOB OPTIMIZATION AI SUCCESS MESSAGE");
            jobOptimizationProgress.completeProgress();
            toast.success("🤖 Resume optimized with full AI power!", {
              description:
                "Your resume has been enhanced using our advanced AI algorithms.",
            });
          }
          } else {
            // Handle case where no optimized resume data is found in structured response
            console.warn("⚠️ No optimized resume data found in structured response:", result);
            
            // Check if there's an error message in the response
            const errorMessage = result?.error || 
                               result?.message || 
                               result?.data?.error ||
                               "No optimized resume data received from server";
            
            throw new Error(errorMessage);
          }
        }
      } catch (error) {
        console.error("Job optimization error:", error);
        jobOptimizationProgress.cancelProgress();

        // Check if it's a subscription error
        if (isSubscriptionError(error)) {
          // Show subscription modal for job optimization
          checkAIFeature("AI Job Optimization");
          return;
        }

        toast.error(
          "Job optimization failed. Please check the URL and try again."
        );
      }
    },
    [resume, updateResumeData, onResumeUpdate, jobOptimizationProgress]
  );

  // Load dynamic template - check for LaTeX templates
  useEffect(() => {
    const loadDynamicTemplate = async () => {
      console.log("🔍 Template Loading Debug:", {
        resumeTemplate: resume.template,
        isLatexTemplate: resume.isLatexTemplate,
        templateId: resume.templateId,
        resumeKeys: Object.keys(resume),
      });

      // Try to load LaTeX template if resume has template ID
      const templateId = resume.template || resume.templateId;
      if (templateId) {
        setLoadingTemplate(true);
        try {
          console.log("📡 Fetching LaTeX templates from API...");
          const response = await api.get("/resumes/latex-templates");
          const templates = response.data.data || [];
          console.log(
            "📄 Available templates:",
            templates.map((t) => ({ id: t.id, name: t.name }))
          );

          const matchedTemplate = templates.find(
            (t: any) => t.id === templateId
          );
          if (matchedTemplate) {
            console.log(
              "✅ Found matching LaTeX template:",
              matchedTemplate.name
            );
            setDynamicTemplate(matchedTemplate);
            // Force set isLatexTemplate if we found a LaTeX template
            if (!resume.isLatexTemplate) {
              console.log(
                "🔧 Setting isLatexTemplate to true for matched template"
              );
            }
          } else {
            console.log(
              "❌ No matching LaTeX template found for ID:",
              templateId
            );
          }
        } catch (error) {
          console.warn("⚠️ Failed to load dynamic template:", error);
        } finally {
          setLoadingTemplate(false);
        }
      } else {
        console.log("❌ No template ID found in resume");
      }
    };

    loadDynamicTemplate();
  }, [resume.template, resume.templateId, resume.isLatexTemplate]);

  // Auto-trigger AI analysis when component mounts with unsaved changes OR after refresh with content
  useEffect(() => {
    console.log("🔍 Auto-trigger check:", {
      hasUnsavedChanges,
      shouldAutoTrigger: aiData.shouldAutoTrigger,
      isLoading: analysisProgress.isLoading,
      willTrigger:
        (hasUnsavedChanges || aiData.shouldAutoTrigger) &&
        !analysisProgress.isLoading,
    });

    if (
      (hasUnsavedChanges || aiData.shouldAutoTrigger) &&
      !analysisProgress.isLoading
    ) {
      if (hasUnsavedChanges) {
        console.log("🤖 Auto-triggering AI analysis due to unsaved changes");
      } else if (aiData.shouldAutoTrigger) {
        console.log(
          "🤖 Auto-triggering AI analysis after page refresh (invalid cache cleared)"
        );
      }

      runComprehensiveAnalysis();

      // Clear the auto-trigger flag after using it
      if (aiData.shouldAutoTrigger) {
        updateAIData({ shouldAutoTrigger: false });
      }
    }
  }, [
    hasUnsavedChanges,
    aiData.shouldAutoTrigger,
    analysisProgress.isLoading,
    updateAIData,
  ]); // Added shouldAutoTrigger dependency

  // Effect to handle switching to preview tab when requested
  useEffect(() => {
    if (shouldSwitchToPreview) {
      setActiveTab("preview");
      if (onPreviewSwitched) {
        onPreviewSwitched();
      }
    }
  }, [shouldSwitchToPreview, onPreviewSwitched]);

  // Auto-trigger PDF generation when entering preview tab if needed
  useEffect(() => {
    if (activeTab === 'preview') {
      const currentHash = generateResumeHash();
      // Check if we need to generate:
      // 1. Cache is invalid (hash mismatch) OR
      // 2. No cached URL exists
      // AND we are not currently generating
      if ((!isCacheValid(currentHash) || !aiData.cachedPdfUrl) && !pdfGenerating) {
        console.log("🔄 Auto-triggering PDF generation on preview entry");
        setPdfRefreshTrigger(prev => prev + 1);
      }
    }
  }, [activeTab, generateResumeHash, isCacheValid, aiData.cachedPdfUrl, pdfGenerating]);


  // Helper functions
  const calculateOverallScore = (resume: Resume): number => {
    let score = 50;
    if (resume.professionalSummary && resume.professionalSummary.length > 100)
      score += 15;
    if (resume.workExperience.length > 0)
      score += Math.min(resume.workExperience.length * 10, 25);
    if (resume.skills.length >= 5) score += 10;
    return Math.min(score, 100);
  };

  const calculateKeywordDensity = (resume: Resume): number => {
    const keywords = [
      "leadership",
      "management",
      "development",
      "strategic",
      "analytical",
    ];
    const text = [
      resume.professionalSummary,
      ...resume.workExperience.flatMap((exp) => exp.achievements),
    ]
      .join(" ")
      .toLowerCase();
    const matches = keywords.filter((keyword) => text.includes(keyword)).length;
    return Math.round((matches / keywords.length) * 100);
  };

  const assessContentQuality = (resume: Resume): number => {
    let score = 0;
    if (resume.professionalSummary && resume.professionalSummary.length > 100)
      score += 25;
    if (
      resume.workExperience.some((exp) =>
        exp.achievements.some((achievement) => /\d+/.test(achievement))
      )
    )
      score += 25;
    if (resume.skills.length >= 8) score += 25;
    if (resume.education.length > 0) score += 25;
    return score;
  };

  const extractStrengths = (resume: Resume): string[] => {
    const strengths = [];
    if (resume.professionalSummary && resume.professionalSummary.length > 100) {
      strengths.push("Comprehensive professional summary");
    }
    if (resume.workExperience.length > 0) {
      strengths.push("Strong work experience documentation");
    }
    if (resume.skills.length >= 5) {
      strengths.push("Diverse skill set coverage");
    }
    if (
      resume.workExperience.some((exp) =>
        exp.achievements.some((achievement) => /\d+/.test(achievement))
      )
    ) {
      strengths.push("Quantified achievements present");
    }
    return strengths.length > 0
      ? strengths
      : ["Professional resume structure", "Complete contact information"];
  };

  const formatImprovements = (
    improvements: any[]
  ): AIAnalysis["improvements"] => {
    if (!improvements || improvements.length === 0) {
      return [
        {
          category: "Professional Summary",
          priority: "high",
          suggestions: [
            "Expand summary to highlight key achievements",
            "Include industry-specific keywords",
          ],
          impact:
            "Significantly improves first impression and ATS compatibility",
        },
        {
          category: "Work Experience",
          priority: "high",
          suggestions: [
            "Add quantified achievements with specific metrics",
            "Use stronger action verbs",
          ],
          impact: "Demonstrates measurable value and impact",
        },
        {
          category: "Skills",
          priority: "medium",
          suggestions: [
            "Include more relevant technical skills",
            "Add soft skills valued in your industry",
          ],
          impact: "Improves keyword matching and skill coverage",
        },
      ];
    }

    // Handle ATS recommendations format (array of strings)
    if (Array.isArray(improvements) && typeof improvements[0] === "string") {
      return improvements.map((recommendation, index) => ({
        category: `ATS Improvement ${index + 1}`,
        priority: "medium" as const,
        suggestions: [recommendation],
        impact: "Improves ATS compatibility and scan rate",
      }));
    }

    // Handle complex improvement objects
    return improvements.map((imp) => ({
      category: imp.category || "General Enhancement",
      priority:
        imp.impact === "high"
          ? "high"
          : imp.impact === "low"
            ? "low"
            : "medium",
      suggestions: Array.isArray(imp.changes)
        ? imp.changes
        : Array.isArray(imp)
          ? imp
          : [imp.changes || imp],
      impact:
        typeof imp.impact === "string"
          ? imp.impact
          : "Improves overall resume effectiveness",
    }));
  };

  const detectIndustry = (resume: Resume): string => {
    const text = [
      resume.professionalSummary || "",
      ...resume.workExperience.flatMap((exp) => [exp.jobTitle, exp.company]),
    ]
      .join(" ")
      .toLowerCase();
    if (
      text.includes("software") ||
      text.includes("developer") ||
      text.includes("engineer")
    )
      return "Technology";
    if (text.includes("marketing") || text.includes("sales"))
      return "Marketing & Sales";
    if (text.includes("finance") || text.includes("accounting"))
      return "Finance";
    return "General Business";
  };

  const calculateAlignment = (aligned: string[], missing: string[]): number => {
    const alignedArray = aligned || [];
    const missingArray = missing || [];
    const total = alignedArray.length + missingArray.length;
    return total > 0 ? Math.round((alignedArray.length / total) * 100) : 0;
  };

  const calculateSkillsMatch = (resume: Resume, jobAnalysis: any): number => {
    const resumeSkills = resume.skills?.map((skill) =>
      (skill.name || skill).toLowerCase()
    ) || [];
    
    // Handle different possible structures from backend
    const jobSkills = [
      ...(jobAnalysis.requiredSkills || []),
      ...(jobAnalysis.preferredSkills || []),
      ...(jobAnalysis.jobDetails?.requirements || []),
      ...(jobAnalysis.qualifications || [])
    ];
    
    const matches = jobSkills.filter((skill: string) =>
      resumeSkills.some((resumeSkill) =>
        resumeSkill.includes(skill.toLowerCase())
      )
    ).length;
    return jobSkills.length > 0
      ? Math.round((matches / jobSkills.length) * 100)
      : 0;
  };

  const calculateExperienceMatch = (
    resume: Resume,
    jobAnalysis: any
  ): number => {
    const totalExperience = resume.workExperience?.length || 0;
    const requiredExperience = jobAnalysis.experienceYears || 
                              jobAnalysis.jobDetails?.experienceYears || 
                              3;
    return Math.min(
      Math.round((totalExperience / requiredExperience) * 100),
      100
    );
  };

  const ScoreCard = ({
    title,
    score,
    icon: Icon,
    color,
  }: {
    title: string;
    score: number;
    icon: any;
    color: string;
  }) => (
    <div className="bg-surface-50 rounded-lg p-4 border border-surface-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-sm font-medium text-text-primary">
            {title}
          </span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            score >= 80
              ? "bg-green-500"
              : score >= 60
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );

  // Generate a hash-based key to detect meaningful resume changes
  const resumeChangeKey = useMemo(() => {
    const key = JSON.stringify({
      personalInfo: resume.personalInfo,
      professionalSummary: resume.professionalSummary,
      workExperience: resume.workExperience,
      education: resume.education,
      skills: resume.skills,
      projects: resume.projects,
      template: resume.template,
      templateId: resume.templateId
    });
    return key;
  }, [resume.personalInfo, resume.professionalSummary, resume.workExperience, resume.education, resume.skills, resume.projects, resume.template, resume.templateId]);

  const memoizedResumeData = useMemo(() => resume, [resumeChangeKey]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Clean Horizontal Scroll */}
      <div className="bg-surface-50 rounded-lg p-1 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {[
            { id: "preview", label: "Preview", icon: EyeIcon, free: true },
            {
              id: "analysis",
              label: "AI Analysis",
              icon: SparklesIcon,
              free: false,
            },
            {
              id: "optimization",
              label: "Job Optimization",
              icon: BriefcaseIcon,
              free: false,
            },
            {
              id: "benchmarking",
              label: "Benchmarking",
              icon: ChartBarIcon,
              free: false,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-lg"
                  : "text-text-secondary hover:text-text-primary hover:bg-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.free && (
                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                  FREE
                </span>
              )}
              {!tab.free && (
                <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          {/* Free Preview Banner */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <EyeIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    Free Preview
                  </h3>
                  <p className="text-sm text-text-secondary">
                    See your resume with professional{" "}
                    {resume.isLatexTemplate ? "LaTeX" : "HTML"} formatting -
                    completely free!
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={handleStartFresh}
                      className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
                      title="Clear all current data and begin with a different template"
                    >
                      Clear everything and go to template selection
                    </button>
                  </div>
                </div>
              </div>
              <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-medium">
                NO SUBSCRIPTION REQUIRED
              </span>
            </div>
          </div>

          {/* Required Fields Warning */}
          {!hasAllRequiredFields && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-amber-400 mt-0.5 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Complete Required Fields
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      Please complete the following required fields before
                      generating your resume preview:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {!requiredFieldsStatus.personalInfoValid && (
                        <li>
                          • <strong>Personal Information:</strong> Add your
                          first name, last name, and contact details (email or
                          phone)
                        </li>
                      )}
                      {!requiredFieldsStatus.summaryValid && (
                        <li>
                          • <strong>Professional Summary:</strong> Write a
                          compelling summary (at least 50 characters)
                        </li>
                      )}
                      {!requiredFieldsStatus.workExperienceValid && (
                        <li>
                          • <strong>Work Experience:</strong> Add at least one
                          job with title, company, and meaningful
                          responsibilities (20+ characters each)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Screen PDF Preview */}
          <div className="w-full h-screen -m-6">
            {loadingTemplate ? (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading template...</p>
                </div>
              </div>
            ) : dynamicTemplate || resume.isLatexTemplate ? (
                <PDFPreview 
                  pdfUrl={pdfUrl}
                  pdfBlob={pdfBlob}
                  pdfBlobBase64={pdfBlobBase64}
                  templateId={resumeData.template || 'template01'}
                  resumeData={resumeData as any}
                  title={resumeData.title || 'Enhanced Resume'}
                  className="h-full"
                  onPdfGenerated={(url, blob) => {
                    setPdfUrl(url);
                    setPdfBlob(blob);
                  }}
                  onGenerationStart={() => setIsGeneratingPDF(true)}
                  refreshTrigger={refreshTrigger}
                />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Template renderer not available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other tabs content - Enhanced for mobile */}
      {activeTab !== "preview" && aiAnalysis && (
        <div className="space-y-4 lg:space-y-6">
          <Card className="card-dark p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-text-primary mb-4 sm:mb-6">
              Quick Scores
            </h3>
            {/* Mobile: Stack vertically, Desktop: Show in grid */}
            <div className="space-y-3 sm:space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
              <ScoreCard
                title="Overall Quality"
                score={aiAnalysis.overallScore}
                icon={SparklesIcon}
                color="text-teal-400"
              />
              <ScoreCard
                title="ATS Compatibility"
                score={aiAnalysis.atsCompatibility}
                icon={ShieldCheckIcon}
                color="text-green-400"
              />
              <ScoreCard
                title="Keyword Density"
                score={aiAnalysis.keywordDensity}
                icon={MagnifyingGlassIcon}
                color="text-emerald-400"
              />
            </div>
            {resume.isLatexTemplate && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-teal-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DocumentTextIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-teal-400">
                    LaTeX Enhanced
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-dark-text-muted">
                  Professional LaTeX formatting with pixel-perfect typography
                </p>
              </div>
            )}
          </Card>

          <Card className="card-dark p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-text-primary mb-3 sm:mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {aiAnalysis ? (
                <>
                  {/* Mobile: Stack buttons, Desktop: Optional flex layout */}
                  <div className="space-y-3 sm:space-y-3">
                    <Button
                      onClick={runComprehensiveAnalysis}
                      disabled={analysisProgress.isLoading}
                      className="w-full bg-teal-600 hover:bg-blue-700 py-3 sm:py-3 text-sm sm:text-base"
                    >
                      {analysisProgress.isLoading
                        ? "Analyzing..."
                        : "Refresh Analysis"}
                    </Button>

                    <Button
                      onClick={startAIEnhancementReview}
                      disabled={
                        analysisProgress.isLoading || aiEnhancementLoading
                      }
                      className="w-full bg-gradient-to-r from-emerald-600 to-pink-600 hover:from-emerald-700 hover:to-pink-700 py-3 sm:py-3 text-sm sm:text-base"
                    >
                      <EyeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {aiEnhancementLoading
                          ? "Getting AI Suggestions..."
                          : "Preview AI Enhancements"}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full py-3 sm:py-3 text-sm sm:text-base"
                      onClick={() => setActiveTab("optimization")}
                    >
                      <BriefcaseIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      Optimize for Job
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {/* Main CTA Card - Mobile Optimized */}
                  <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-teal-500/20 rounded-lg">
                    <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-teal-400 mx-auto mb-3 sm:mb-4" />
                    <h4 className="text-base sm:text-lg font-semibold text-text-primary mb-2 sm:mb-3">
                      Unlock AI-Powered Analysis
                    </h4>
                    <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-5 leading-relaxed">
                      Get comprehensive insights including ATS compatibility,
                      industry benchmarking, and personalized recommendations
                    </p>
                    <Button
                      onClick={runComprehensiveAnalysis}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 sm:py-3 text-sm sm:text-base"
                    >
                      <SparklesIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      Try AI Analysis
                    </Button>
                  </div>

                  {/* Secondary Actions - Mobile Stack */}
                  <div className="space-y-3">
                    <Button
                      onClick={startAIEnhancementReview}
                      disabled={aiEnhancementLoading}
                      variant="outline"
                      className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 py-3 sm:py-3 text-sm sm:text-base"
                    >
                      <EyeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {aiEnhancementLoading
                          ? "Getting AI Suggestions..."
                          : "Preview AI Enhancements"}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 py-3 sm:py-3 text-sm sm:text-base"
                      onClick={() => setActiveTab("optimization")}
                    >
                      <BriefcaseIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      Explore Job Optimization
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "analysis" && (
        <>
          {aiAnalysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card className="card-dark p-6">
                  <h3 className="text-xl font-semibold text-text-primary mb-4">
                    AI Analysis Results
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <ScoreCard
                      title="Overall Score"
                      score={aiAnalysis.overallScore}
                      icon={SparklesIcon}
                      color="text-teal-400"
                    />
                    <ScoreCard
                      title="ATS Score"
                      score={aiAnalysis.atsCompatibility}
                      icon={ShieldCheckIcon}
                      color="text-green-400"
                    />
                    <ScoreCard
                      title="Content Quality"
                      score={aiAnalysis.contentQuality}
                      icon={DocumentTextIcon}
                      color="text-emerald-400"
                    />
                    <ScoreCard
                      title="Industry Alignment"
                      score={aiAnalysis.industryAlignment}
                      icon={BriefcaseIcon}
                      color="text-yellow-400"
                    />
                  </div>

                  <div className="mb-6">
                    <h4 className="font-semibold text-text-primary mb-3">
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {aiAnalysis.strengths.map((strength, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircleIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-text-secondary">
                            {strength}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* AI Recommended Summary Section */}
                  {aiData.optimizedSummary && (
                    <div className="pt-6 border-t border-surface-200/30">
                      <div className="flex items-center gap-2 mb-3">
                        <SparklesIcon className="w-5 h-5 text-teal-400" />
                        <h4 className="font-semibold text-text-primary">
                          AI Recommended Summary
                        </h4>
                      </div>
                      <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl mb-4">
                        <p className="text-sm text-text-secondary leading-relaxed italic">
                          "{aiData.optimizedSummary}"
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          updateResumeData({ professionalSummary: aiData.optimizedSummary });
                          updateAIData({ wasSummaryGenerated: true });
                          setActiveTab("preview");
                          toast.success("AI optimized summary applied! Previewing updates...");
                        }}
                        className="w-full bg-teal-600 hover:bg-teal-700 shadow-glow-sm"
                      >
                        Apply Optimized Summary
                      </Button>
                    </div>
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="card-dark p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-text-primary">
                      AI Recommendations
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {aiAnalysis.improvements.map((improvement, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          improvement.priority === "high"
                            ? "border-red-500/30 bg-red-500/10"
                            : improvement.priority === "medium"
                              ? "border-yellow-500/30 bg-yellow-500/10"
                              : "border-teal-500/30 bg-teal-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-text-primary">
                            {improvement.category}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              improvement.priority === "high"
                                ? "bg-red-500/20 text-red-400"
                                : improvement.priority === "medium"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-teal-500/20 text-teal-400"
                            }`}
                          >
                            {improvement.priority.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm text-dark-text-muted mb-3">
                          {improvement.impact}
                        </p>

                        <ul className="space-y-1">
                          {improvement.suggestions.map(
                            (suggestion, suggestionIndex) => (
                              <li
                                key={suggestionIndex}
                                className="text-sm text-text-secondary"
                              >
                                • {suggestion}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">
                  AI Analysis Ready
                </h3>
                <p className="text-text-secondary mb-6">
                  Get comprehensive AI-powered insights about your resume
                  including ATS compatibility, content quality, and
                  industry-specific recommendations.
                </p>

                {analysisProgress.isLoading ? (
                  <div className="space-y-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${analysisProgress.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-dark-text-muted">
                      {analysisProgress.currentStep ||
                        "Running AI analysis..."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={runComprehensiveAnalysis}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      Start AI Analysis
                    </Button>

                    <Button
                      onClick={startAIEnhancementReview}
                      disabled={aiEnhancementLoading}
                      variant="outline"
                      className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      {aiEnhancementLoading
                        ? "Getting AI Suggestions..."
                        : "Preview AI Enhancements"}
                    </Button>

                    <p className="text-xs text-dark-text-muted text-center">
                      Free preview available • Premium features require
                      subscription
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "optimization" && (
        <div className="space-y-6">
          <Card className="card-dark p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Job-Specific Optimization (Free Preview)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Target Job URL
                </label>
                <Button
                  onClick={() => {
                    // Use the preview-first JobOptimizationModal flow
                    if (onJobOptimizationClick) {
                      onJobOptimizationClick();
                    } else {
                      // Fallback: inform user to use modal
                      toast.info("Please use the job optimization modal for the best experience");
                    }
                  }}
                  className="bg-teal-600 hover:bg-blue-700 flex items-center gap-2 w-full justify-center"
                >
                    {jobOptimizationProgress.isLoading ? (
                      <>
                        <BoltIcon className="w-4 h-4 animate-pulse" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <BoltIcon className="w-4 h-4" />
                        AI Job Optimization
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {jobMatchAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-text-primary">
                      Job Match Analysis
                    </h4>

                    <div className="space-y-3">
                      <ScoreCard
                        title="Overall Match"
                        score={jobMatchAnalysis.matchScore}
                        icon={BriefcaseIcon}
                        color="text-teal-400"
                      />
                      <ScoreCard
                        title="Skills Alignment"
                        score={jobMatchAnalysis.skillsMatch}
                        icon={DocumentTextIcon}
                        color="text-green-400"
                      />
                      <ScoreCard
                        title="Experience Match"
                        score={jobMatchAnalysis.experienceMatch}
                        icon={ChartBarIcon}
                        color="text-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-text-primary mb-3">
                        Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {jobMatchAnalysis.missingKeywords
                          .slice(0, 10)
                          .map((keyword, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-text-primary mb-3">
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {jobMatchAnalysis.recommendedImprovements
                          .slice(0, 5)
                          .map((improvement, index) => (
                            <li
                              key={index}
                              className="text-sm text-text-secondary flex items-start gap-2"
                            >
                              <SparklesIcon className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                              {improvement}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
          </Card>

          {optimizationHistory.length > 0 && (
            <Card className="card-dark p-6">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Optimization History
              </h3>
              <div className="space-y-3">
                {optimizationHistory.slice(0, 5).map((optimization, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-surface-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {optimization.jobTitle}
                      </p>
                      <p className="text-sm text-dark-text-muted">
                        {optimization.company}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-400">
                        +{optimization.scoreImprovement?.improvement || 0}{" "}
                        points
                      </p>
                      <p className="text-xs text-dark-text-muted">
                        {new Date(optimization.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "benchmarking" && (
        <div className="space-y-6">
          {/* Header for all users - Benchmarking is now free to preview */}
          {!aiAnalysis && (
            <div className="card-glass-dark p-8 border border-surface-200 rounded-lg text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-pink-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-3">
                Industry Benchmarking
              </h3>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                Compare your resume against industry standards and see how you rank against other professionals in your field.
              </p>
              <Button 
                onClick={runComprehensiveAnalysis}
                disabled={analysisProgress.isLoading}
                className="bg-gradient-to-r from-emerald-500 to-pink-500 hover:from-emerald-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:shadow-glow-sm disabled:opacity-50"
              >
                {analysisProgress.isLoading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Start AI Analysis
                  </>
                )}
              </Button>
            </div>
          )}

          {aiAnalysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-dark p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-4">
                  Industry Benchmarking
                </h3>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-secondary">
                      Your Position in{" "}
                      {aiAnalysis.competitorComparison.industry}
                    </span>
                    <span className="text-2xl font-bold text-teal-400">
                      {aiAnalysis.competitorComparison.percentile}th percentile
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                      style={{
                        width: `${aiAnalysis.competitorComparison.percentile}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-text-primary mb-3">
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {aiAnalysis.competitorComparison.improvements.map(
                        (improvement, index) => (
                          <li
                            key={index}
                            className="text-sm text-text-secondary flex items-start gap-2"
                          >
                            <ChartBarIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            {improvement}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="card-dark p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-4">
                  Competitive Analysis
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-surface-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {aiAnalysis.overallScore}%
                      </p>
                      <p className="text-xs text-dark-text-muted">Your Score</p>
                    </div>
                    <div className="text-center p-3 bg-surface-50 rounded-lg">
                      <p className="text-2xl font-bold text-teal-400">78%</p>
                      <p className="text-xs text-dark-text-muted">
                        Industry Average
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">
                        ATS Compatibility
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {aiAnalysis.atsCompatibility > 75
                          ? "Above Average"
                          : "Below Average"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">
                        Keyword Optimization
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {aiAnalysis.keywordDensity > 70
                          ? "Excellent"
                          : "Needs Work"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">
                        Content Quality
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {aiAnalysis.contentQuality > 80
                          ? "Outstanding"
                          : "Good"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">
                Start AI analysis to see benchmarking data
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI Loading Overlays */}
      <AILoadingOverlay
        isVisible={analysisProgress.isLoading}
        title="🔍 AI Resume Analysis"
        description="AI is comprehensively analyzing your resume for strengths and improvements"
        progress={analysisProgress.progress}
        currentStep={analysisProgress.currentStep}
        estimatedTime={analysisProgress.estimatedTime}
        onCancel={analysisProgress.cancelProgress}
      />

      <AILoadingOverlay
        isVisible={jobOptimizationProgress.isLoading}
        title="🎯 Job Optimization"
        description="AI is optimizing your resume for the specific job posting"
        progress={jobOptimizationProgress.progress}
        currentStep={jobOptimizationProgress.currentStep}
        estimatedTime={jobOptimizationProgress.estimatedTime}
        onCancel={jobOptimizationProgress.cancelProgress}
      />

      <AILoadingOverlay
        isVisible={atsProgress.isLoading}
        title="🛡️ ATS Analysis"
        description="AI is analyzing your resume's compatibility with ATS systems"
        progress={atsProgress.progress}
        currentStep={atsProgress.currentStep}
        estimatedTime={atsProgress.estimatedTime}
        onCancel={atsProgress.cancelProgress}
      />

      <AILoadingOverlay
        isVisible={jobMatchingProgress.isLoading}
        title="📊 Job Matching Analysis"
        description="AI is calculating how well your resume matches the job requirements"
        progress={jobMatchingProgress.progress}
        currentStep={jobMatchingProgress.currentStep}
        estimatedTime={jobMatchingProgress.estimatedTime}
        onCancel={jobMatchingProgress.cancelProgress}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        featureName={modalProps.featureName}
        title={modalProps.title}
        description={modalProps.description}
      />

      {/* Enhancement Review Modal */}
      {enhancementReviewData && (
        <EnhancementReviewModal
          isOpen={showEnhancementReview}
          onClose={() => setShowEnhancementReview(false)}
          enhancementData={enhancementReviewData}
          onApplySelected={(finalResumeData) => {
            // Apply the enhanced resume data to the form
            updateResumeData(finalResumeData);
            setShowEnhancementReview(false);
            
            // Clear cached PDF to force regeneration
            clearOptimizedContent();
            
            // Trigger PDF refresh
            setPdfRefreshTrigger(prev => prev + 1);
            
            // Switch to preview tab to show updated resume
            setActiveTab("preview");
            
            toast.success('Enhancement applied successfully! Check your updated resume in the preview.');
          }}
        />
      )}
    </div>
  );
}
