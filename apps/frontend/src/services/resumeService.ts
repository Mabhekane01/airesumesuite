import { api } from './api';
import { Certification } from '../types';
import { useAuthStore } from '../stores/authStore';

/**
 * Convert MongoDB ObjectId (including Buffer format) to string
 */
function convertObjectIdToString(id: any): string {
  if (!id) return '';
  
  if (typeof id === 'string') {
    return id;
  }
  
  // Handle MongoDB ObjectId Buffer format
  if (id.buffer && id.buffer.data && Array.isArray(id.buffer.data)) {
    const bytes = Array.from(id.buffer.data);
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Try toString method
  if (id.toString && typeof id.toString === 'function') {
    const result = id.toString();
    if (result !== '[object Object]') {
      return result;
    }
  }
  
  // Fallback - log error and return empty string
  console.error('❌ Cannot convert ObjectId to string:', id);
  return '';
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
}

export interface WorkExperience {
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  isCurrentJob: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  gpa?: string;
  honors?: string[];
}

export interface Skill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'certification';
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ResumeData {
  _id?: string;
  title: string;
  personalInfo: PersonalInfo;
  professionalSummary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  certifications?: Certification[];
  languages?: string[];
  projects?: Project[];
  templateId: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OptimizeResumeRequest {
  jobDescription: string;
  jobTitle: string;
  companyName: string;
}

export class ResumeService {
  private enhancementCache: Map<string, { data: Blob; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private getAccessToken = (): string => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      throw new Error('No access token found. Please log in.');
    }
    return token;
  }

  private getCacheKey(resumeData: any, templateId: string, options?: any): string {
    const resumeHash = JSON.stringify({
      personalInfo: resumeData.personalInfo,
      workExperience: resumeData.workExperience,
      education: resumeData.education,
      skills: resumeData.skills,
      templateId,
      options
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < resumeHash.length; i++) {
      const char = resumeHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private getCachedData(key: string): Blob | null {
    const cached = this.enhancementCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.enhancementCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCachedData(key: string, data: Blob, ttl: number = this.CACHE_TTL): void {
    this.enhancementCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getUserResumes = async (): Promise<ResumeData[]> => {
    try {
      const response = await api.get('/resumes');
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error('Failed to fetch user resumes:', error);
      return [];
    }
  }

  getResumes = async (): Promise<{ success: boolean; data?: ResumeData[]; message?: string }> => {
    try {
      const response = await api.get('/resumes');
      const resumes = response.data.data || response.data || [];
      return { success: true, data: Array.isArray(resumes) ? resumes : [] };
    } catch (error: any) {
      console.error('Get resumes error:', error);
      return { 
        success: false, 
        data: [],
        message: error.response?.data?.message || 'Failed to load resumes' 
      };
    }
  }

  getResume = async (id: string): Promise<{ success: boolean; data?: ResumeData; message?: string }> => {
    try {
      const response = await api.get(`/resumes/${id}`);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      console.error('Get resume error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to load resume' 
      };
    }
  }

  createResume = async (data: Partial<ResumeData>): Promise<{ success: boolean; data?: ResumeData; message?: string }> => {
    try {
      const response = await api.post('/resumes', data);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      console.error('Create resume error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to create resume' 
      };
    }
  }

  getResumeById = async (id: string): Promise<ResumeData> => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Invalid resume ID provided');
    }
    
    const endpoint = `/resumes/${id}`;
    console.log('📤 Getting resume by ID via authenticated endpoint:', endpoint);
    const response = await api.get(endpoint);
    return response.data.data;
  }

  updateResume = async (id: string, data: Partial<ResumeData>): Promise<ResumeData> => {
    const response = await api.put(`/resumes/${id}`, data);
    return response.data.data;
  }

  deleteResume = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/resumes/${id}`);
      return true;
    } catch (error: any) {
      console.error('Delete resume error:', error);
      return false;
    }
  }

  parseResumeFromText = async (text: string): Promise<ResumeData> => {
    const response = await api.post('/resumes/parse', { text });
    return response.data.data;
  }

  generateProfessionalSummary = async (resumeId?: string, resumeData?: any): Promise<any> => {
    try {
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const url = `${baseUrl}/api/v1/resumes/generate-summary`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeId, resumeData }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate professional summary');
      }
      return data.data.summary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw new Error('Failed to generate AI summary. Please try again later.');
    }
  }

  analyzeATSCompatibility = async (resumeData: any, jobDescription?: string): Promise<{
    score: number;
    recommendations: string[];
    keywordMatch: number;
    formatScore: number;
    contentScore: number;
    aiStatus?: string;
  }> => {
    try {
      console.log('🛡️ Analyzing ATS compatibility with resume data...');
      
      let endpoint, payload;
      
      // Only use ID-based endpoint if resume has real database ID (not temp-id)
      if ((resumeData._id || resumeData.id) && !resumeData['temp-id']) {
        // For saved resumes, use the ID-based endpoint  
        const resumeId = resumeData._id || resumeData.id;
        endpoint = `/resumes/${resumeId}/ats-analysis`;
        payload = { jobDescription };
        console.log(`🎯 Using saved resume ATS analysis endpoint: ${endpoint}`);
      } else {
        // For unsaved/temp resumes, use the general ATS analysis endpoint
        endpoint = '/resumes/analyze-ats';
        payload = { resumeData, jobDescription };
        console.log(`🎯 Using unsaved resume ATS analysis endpoint: ${endpoint}`);
      }
      
      const response = await api.post(endpoint, payload);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ ATS compatibility analysis failed:', error);
      return this.generateFallbackATSAnalysis(resumeData, jobDescription);
    }
  }

  private generateFallbackATSAnalysis = (resumeData: any, jobDescription?: string): {
    score: number;
    recommendations: string[];
    keywordMatch: number;
    formatScore: number;
    contentScore: number;
  } => {
    console.log('🔄 Generating fallback ATS analysis...');
    let score = 60;
    const recommendations: string[] = [];
    if (!resumeData.personalInfo?.email) {
      recommendations.push('Add contact email for better ATS parsing');
      score -= 5;
    }
    if (!resumeData.personalInfo?.phone) {
      recommendations.push('Include phone number in contact information');
      score -= 5;
    }
    if (!resumeData.professionalSummary || resumeData.professionalSummary.length < 50) {
      recommendations.push('Add a comprehensive professional summary (50+ words)');
      score -= 10;
    } else {
      score += 5;
    }
    if (!resumeData.workExperience?.length) {
      recommendations.push('Add work experience section with detailed job descriptions');
      score -= 15;
    } else {
      score += 10;
      const hasQuantifiedAchievements = resumeData.workExperience.some((exp: any) =>
        exp.achievements?.some((achievement: string) => /\d+/.test(achievement))
      );
      if (!hasQuantifiedAchievements) {
        recommendations.push('Add quantified achievements (numbers, percentages, metrics) to work experience');
        score -= 5;
      } else {
        score += 5;
      }
    }
    if (!resumeData.skills?.length || resumeData.skills.length < 5) {
      recommendations.push('Add more relevant skills (minimum 5-8 skills recommended)');
      score -= 10;
    } else {
      score += 5;
    }
    if (!resumeData.education?.length) {
      recommendations.push('Include education section for complete professional profile');
      score -= 5;
    }
    let keywordMatch = 50;
    if (jobDescription) {
      const jobKeywords = this.extractKeywords(jobDescription);
      const resumeText = JSON.stringify(resumeData).toLowerCase();
      const matchedKeywords = jobKeywords.filter(keyword => 
        resumeText.includes(keyword.toLowerCase())
      );
      keywordMatch = Math.round((matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100);
      if (keywordMatch < 60) {
        recommendations.push(`Improve keyword matching - currently at ${keywordMatch}% match with job description`);
        score -= 10;
      } else {
        score += 5;
      }
    }
    let formatScore = 85;
    if (resumeData.personalInfo?.firstName && resumeData.personalInfo?.lastName) {
      formatScore += 5;
    }
    const contentScore = Math.min(score + 10, 95);
    if (recommendations.length === 0) {
      recommendations.push(
        'Your resume has good ATS compatibility! Consider adding more quantified achievements.',
        'Include industry-specific keywords relevant to your target positions.',
        'Ensure all contact information is complete and professional.'
      );
    }
    score = Math.max(30, Math.min(score, 95));
    return {
      score,
      recommendations,
      keywordMatch,
      formatScore,
      contentScore
    };
  }

  private extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['that', 'with', 'have', 'will', 'this', 'they', 'from', 'were', 'been'].includes(word));
    return Array.from(new Set(words)).slice(0, 20);
  }

  optimizeResumeForJob = async (resumeData: any, options: {
    jobDescription?: string;
    jobTitle?: string;
    companyName?: string;
    jobUrl?: string;
    optimizationType?: string;
  }): Promise<{
    originalResume: any;
    improvedResume: any;
    improvements: string[];
    atsAnalysis?: any;
    jobAlignment?: any;
  }> => {
    try {
      const response = await api.post('/resumes/optimize-for-job', {
        resumeData,
        ...options
      });
      return response.data.data;
    } catch (error) {
      console.error('Error optimizing resume for job:', error);
      throw error;
    }
  }

  analyzeJobFromUrl = async (options: { jobUrl: string; resumeData?: any }): Promise<{
    jobDetails: any;
    matchAnalysis: any;
    recommendations: string[];
  }> => {
    try {
      const response = await api.post('/resumes/analyze-job-url', options, {
        timeout: 180000 // 3 minutes for job URL analysis
      });
      return response.data.data;
    } catch (error) {
      console.error('Error analyzing job from URL:', error);
      throw error;
    }
  }

  optimizeResumeWithJobUrl = async (resumeData: any, jobUrl: string, options?: {
    templateCode?: string;
    templateId?: string;
  }): Promise<{
    originalResume: any;
    optimizedResume?: any;
    improvedResume?: any;
    enhancedResume?: any;
    optimizedLatexCode?: string;
    improvements: string[];
    keywordsAdded?: string[];
    atsScore?: number;
    jobMatchAnalysis?: any;
    atsAnalysis?: any;
    jobAlignment?: any;
    qualityScore?: any;
    aiStatus?: string;
    jobScrapingSuccess?: boolean;
    scrapedJobDetails?: any;
  }> => {
    try {
      let endpoint = '/resumes/optimize-for-job';
      let payload: { 
        jobUrl: string; 
        resumeData?: any; 
        templateCode?: string;
        templateId?: string;
      } = { 
        jobUrl, 
        resumeData,
        templateCode: options?.templateCode,
        templateId: options?.templateId
      };
      
      // Only use ID-based endpoint if resume has real database ID (not temp-id)
      if ((resumeData._id || resumeData.id) && !resumeData['temp-id']) {
        const resumeId = resumeData._id || resumeData.id;
        endpoint = `/resumes/${resumeId}/optimize-with-url`;
        payload = { 
          jobUrl,
          templateCode: options?.templateCode,
          templateId: options?.templateId
        }; // Don't send resumeData for saved resumes
        console.log(`🎯 Using saved resume job optimization endpoint: ${endpoint}`, {
          hasTemplateCode: !!options?.templateCode,
          templateId: options?.templateId
        });
      } else {
        console.log(`🎯 Using unsaved resume job optimization endpoint: ${endpoint}`, {
          hasTemplateCode: !!options?.templateCode,
          templateId: options?.templateId
        });
      }
      
      // Job optimization with LaTeX compilation can take 3-5 minutes
      const response = await api.post(endpoint, payload, {
        timeout: 300000 // 5 minutes timeout for job optimization with LaTeX
      });
      
      // The backend returns { success: true, data: { optimizedResume: ... } }
      // So we need to extract response.data.data, but handle cases where it might be different
      const result = response.data?.data || response.data;
      
      if (!result) {
        console.error('❌ No data in API response:', response);
        throw new Error('No data received from server');
      }
      
      return result;
    } catch (error) {
      console.error('❌ CRITICAL: Error optimizing resume with job URL:', {
        error,
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error?.stack
      });
      
      // Check if it's a network/timeout error
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        throw new Error('Request timed out. Job optimization is taking longer than expected. Please try again.');
      }
      
      // Check if it's an authentication error
      if (error?.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      // Check if it's a server error
      if (error?.response?.status >= 500) {
        throw new Error('Server error occurred. Please try again later.');
      }
      
      // Re-throw original error with more context
      throw new Error(error?.message || 'Job optimization failed');
    }
  }

  // New method for Job Optimization with PDF generation (like enhanceResumeWithAIPDF)
  optimizeResumeWithJobUrlPDF = async (
    resumeData: any, 
    jobUrl: string, 
    options?: {
      templateCode?: string;
      templateId?: string;
    }
  ): Promise<Blob> => {
    try {
      let endpoint = '/resumes/optimize-for-job-pdf';
      let payload: { 
        jobUrl: string; 
        resumeData?: any; 
        templateCode?: string;
        templateId?: string;
      } = { 
        jobUrl, 
        resumeData,
        templateCode: options?.templateCode,
        templateId: options?.templateId
      };
      
      // Only use ID-based endpoint if resume has real database ID (not temp-id)
      if ((resumeData._id || resumeData.id) && !resumeData['temp-id']) {
        const resumeId = resumeData._id || resumeData.id;
        endpoint = `/resumes/${resumeId}/optimize-with-url`;
        payload = { 
          jobUrl,
          templateCode: options?.templateCode,
          templateId: options?.templateId
        }; // Don't send resumeData for saved resumes
        console.log(`🎯 Using saved resume job optimization PDF endpoint: ${endpoint}`);
      } else {
        console.log(`🎯 Using unsaved resume job optimization PDF endpoint: ${endpoint}`);
      }
      
      // Job optimization with LaTeX compilation can take 3-5 minutes
      const response = await api.post(endpoint, payload, {
        timeout: 300000, // 5 minutes timeout for job optimization with LaTeX
        responseType: 'blob', // Expect PDF blob response like enhance service
        headers: {
          'Accept': 'application/pdf',
          'Response-Type': 'blob'
        }
      });
      
      // Return the PDF blob directly like enhance service
      return response.data;
    } catch (error) {
      console.error('Error optimizing resume with job URL (PDF):', error);
      throw error;
    }
  }

  getJobMatchingScore = async (resumeData: any, jobUrl: string): Promise<{
    matchScore: number;
    keywordAlignment: string[];
    missingKeywords: string[];
    recommendations: string[];
    jobDetails: any;
  }> => {
    try {
      let endpoint = '/resumes/job-alignment';
      let payload: { jobUrl: string, resumeData?: any } = { jobUrl };
      
      // Check for resume ID (both _id from database and id from frontend)
      const resumeId = resumeData._id || resumeData.id;
      if (resumeId && !resumeData['temp-id']) {
        endpoint = `/resumes/${resumeId}/job-match-score`;
        payload = { jobUrl }; // For ID-based endpoint, only send jobUrl
      } else {
        payload.resumeData = resumeData; // For general endpoint, include resume data
      }
      
      const response = await api.post(endpoint, payload, {
        timeout: 180000 // 3 minutes for job alignment analysis
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting job matching score:', error);
      throw error;
    }
  }

  scrapeJobDescription = async (jobUrl: string): Promise<{
    title: string;
    company: string;
    description: string;
    requirements: string[];
    location?: string;
  }> => {
    try {
      const response = await api.post('/job-scraper/scrape', { url: jobUrl });
      return response.data.data;
    } catch (error) {
      console.error('Error scraping job description:', error);
      throw error;
    }
  }

  getJobAlignmentScore = async (resumeData: any, jobDescription: string): Promise<{
    score: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    isGoodMatch: boolean;
  }> => {
    try {
      const response = await api.post('/resumes/job-alignment', { 
        resumeData, 
        jobDescription 
      });
      return response.data.data;
    } catch (error) {
      console.error('Error analyzing job alignment:', error);
      
      // Return fallback response when API fails
      return {
        score: 65,
        strengths: [
          'Professional resume structure',
          'Relevant work experience documented'
        ],
        gaps: [
          'AI analysis service temporarily unavailable',
          'Manual review recommended for detailed job alignment'
        ],
        recommendations: [
          'Include keywords from the job description in your resume',
          'Highlight achievements that match job requirements',
          'Ensure your skills section aligns with job needs'
        ],
        isGoodMatch: false
      };
    }
  }

  private downloadCache = new Map<string, { blob: Blob; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private getDownloadCacheKey = (resumeData: any, format: string): string => {
    const keyData = {
      personalInfo: resumeData?.personalInfo,
      template: resumeData?.template,
      lastModified: resumeData?.updatedAt || Date.now()
    };
    return `${format}_${JSON.stringify(keyData)}`;
  }

  private isValidCacheEntry = (entry: { blob: Blob; timestamp: number }): boolean => {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  downloadResume = async (resumeData: any, format: 'pdf' | 'docx' | 'txt'): Promise<Blob> => {
    try {
      const cacheKey = this.getDownloadCacheKey(resumeData, format);
      const cachedEntry = this.downloadCache.get(cacheKey);
      if (cachedEntry && this.isValidCacheEntry(cachedEntry)) {
        console.log(`💾 Using cached ${format} download`);
        return cachedEntry.blob;
      }
      console.log('📤 Sending download request:', {
        format,
        hasResumeData: !!resumeData,
        cacheKey: cacheKey.substring(0, 50) + '...'
      });
      const optimizedResumeData = {
        personalInfo: resumeData?.personalInfo,
        professionalSummary: resumeData?.professionalSummary,
        workExperience: resumeData?.workExperience,
        education: resumeData?.education,
        skills: resumeData?.skills,
        certifications: resumeData?.certifications,
        languages: resumeData?.languages,
        projects: resumeData?.projects,
        volunteerExperience: resumeData?.volunteerExperience,
        awards: resumeData?.awards,
        hobbies: resumeData?.hobbies,
        // CRITICAL FIX: Include previously missing fields
        publications: resumeData?.publications,
        references: resumeData?.references,
        additionalSections: resumeData?.additionalSections,
        template: resumeData?.template,
        // Also include template-related fields
        templateId: resumeData?.templateId,
        isLatexTemplate: resumeData?.isLatexTemplate
      };
      const response = await api.post(`/resumes/download/${format}`, { 
        resumeData: optimizedResumeData 
      }, {
        responseType: 'blob',
        timeout: 30000,
        headers: {
          'Accept': 'application/octet-stream'
        }
      });
      this.downloadCache.set(cacheKey, {
        blob: response.data,
        timestamp: Date.now()
      });
      if (this.downloadCache.size > 10) {
        this.cleanupCache();
      }
      return response.data;
    } catch (error: any) {
      console.error('Error downloading resume:', error);
      throw error;
    }
  }

  private cleanupCache = (): void => {
    const now = Date.now();
    Array.from(this.downloadCache.entries()).forEach(([key, entry]) => {
      if (!this.isValidCacheEntry(entry)) {
        this.downloadCache.delete(key);
      }
    });
  }


  optimizeResumeForATS = async (resumeData: any, options: {
    jobDescription?: string;
    currentScore: number;
    issues: string[];
    missingKeywords: string[];
  }): Promise<{
    optimizedResume: any;
    newScore: number;
    keywordChanges: string[];
    formatChanges: string[];
    contentChanges: string[];
    keywordsAdded: number;
    issuesFixed: number;
  }> => {
    try {
      console.log('🛡️ Optimizing resume for ATS compatibility...');
      const response = await api.post('/resumes/optimize-for-job', {
        resumeData,
        options
      });
      return response.data.data;
    } catch (error: any) {
      console.error('ATS optimization error:', error);
      const mockOptimizedResume = {
        ...resumeData,
        professionalSummary: this.enhanceSummaryWithKeywords(resumeData.professionalSummary, options.missingKeywords),
        skills: this.addMissingSkills(resumeData.skills, options.missingKeywords),
        workExperience: this.enhanceWorkExperience(resumeData.workExperience, options.missingKeywords)
      };
      return {
        optimizedResume: mockOptimizedResume,
        newScore: Math.min(options.currentScore + 15, 95),
        keywordChanges: ['Added missing industry keywords', 'Improved keyword density in professional summary'],
        formatChanges: ['Standardized section headers', 'Optimized bullet point structure'],
        contentChanges: ['Enhanced technical descriptions', 'Added quantifiable achievements'],
        keywordsAdded: Math.min(options.missingKeywords.length, 5),
        issuesFixed: options.issues.length
      };
    }
  }

  // New method for AI Enhancement with PDF generation and progress updates
  enhanceResumeWithAIPDF = async (
    resumeData: any, 
    templateId: string,
    options?: {
      focusAreas?: string[];
      improvementLevel?: 'basic' | 'comprehensive' | 'expert';
    },
    progressCallback?: (progress: string) => void
  ): Promise<{
    pdfBlob: Blob;
    enhancedData?: {
      enhancedResumeData: any;
      improvements: string[];
      keywordsAdded: string[];
      atsScore: number;
    };
  }> => {
    try {
      console.log('🤖 Enhancing resume with AI and generating PDF...');
      
      // Check cache first
      const cacheKey = this.getCacheKey(resumeData, templateId, options);
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData && !progressCallback) {
        console.log('📦 Using cached enhanced PDF');
        return cachedData;
      }

      progressCallback?.('Checking for optimizations...');
      
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      // Use streaming endpoint if progress callback is provided
      const endpoint = progressCallback ? 'enhance-with-latex-stream' : 'enhance-with-latex';
      const url = `${baseUrl}/api/v1/resumes/${endpoint}`;

      if (progressCallback) {
        const result = await this.enhanceResumeWithStreaming(url, {
          resumeData,
          templateId,
          options
        }, progressCallback);
        
        // Cache the result
        this.setCachedData(cacheKey, result.pdfBlob);
        return result;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeData,
          templateId,
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Extract enhanced data from headers
      const enhancedDataHeader = response.headers.get('X-Enhanced-Data');
      let enhancedData = undefined;
      
      if (enhancedDataHeader) {
        try {
          const decodedHeader = atob(enhancedDataHeader);
          enhancedData = JSON.parse(decodedHeader);
        } catch (error) {
          console.warn('Failed to parse enhanced data from headers:', error);
        }
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      const result = { pdfBlob, enhancedData };
      
      // Cache the PDF blob
      this.setCachedData(cacheKey, pdfBlob);
      return result;
    } catch (error) {
      console.error('❌ AI Enhancement with PDF failed:', error);
      throw error;
    }
  };

  // New method for preview-first AI enhancement (no PDF generation)
  enhanceResumeContentOnly = async (
    resumeData: any,
    templateId: string,
    options?: {
      focusAreas?: string[];
      improvementLevel?: 'basic' | 'comprehensive' | 'expert';
    }
  ): Promise<{
    originalResumeData: any;
    enhancedResumeData: any;
    improvements: string[];
    keywordsAdded: string[];
    atsScore: number;
    enhancementSuggestions: {
      personalInfo: any;
      professionalSummary: any;
      workExperience: any;
      education: any;
      skills: any;
      projects: any;
    };
  }> => {
    try {
      console.log('🤖 Getting AI enhancement suggestions...');
      
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const url = `${baseUrl}/api/v1/resumes/enhance-content-only`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeData,
          templateId,
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ AI enhancement suggestions received');
      
      return result.data;

    } catch (error) {
      console.error('❌ AI enhancement suggestions failed:', error);
      throw error;
    }
  };

  // Method to generate PDF with selected enhancements
  generatePDFWithSelectedEnhancements = async (
    finalResumeData: any,
    templateId: string
  ): Promise<Blob> => {
    try {
      console.log('📄 Generating PDF with selected enhancements...');
      
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const url = `${baseUrl}/api/v1/resumes/generate-preview-pdf`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeData: finalResumeData,
          templateId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const pdfBlob = await response.blob();
      console.log('✅ PDF generated with selected enhancements');
      
      return pdfBlob;

    } catch (error) {
      console.error('❌ PDF generation with selected enhancements failed:', error);
      throw error;
    }
  };

  // NEW: Job optimization preview method
  optimizeForJobPreview = async (
    resumeData: any,
    jobDescription: string,
    jobTitle?: string,
    companyName?: string,
    templateId: string = 'template01'
  ): Promise<{
    originalResumeData: any;
    optimizedResumeData: any;
    jobMatchScore: number;
    keywordAlignment: number;
    skillsMatch: number;
    experienceMatch: number;
    addedKeywords: string[];
    missingKeywords: string[];
    recommendations: string[];
    jobContext: {
      jobTitle: string;
      companyName: string;
      jobDescription: string;
    };
    optimizationSuggestions: {
      personalInfo: any;
      professionalSummary: any;
      workExperience: any;
      education: any;
      skills: any;
      projects: any;
    };
  }> => {
    try {
      console.log('🎯 Getting job optimization suggestions...');
      
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const url = `${baseUrl}/api/v1/resumes/optimize-for-job-preview`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeData,
          jobDescription,
          jobTitle,
          companyName,
          templateId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Job optimization suggestions received');
      
      return result.data;

    } catch (error) {
      console.error('❌ Job optimization suggestions failed:', error);
      throw error;
    }
  };

  // Streaming enhancement method for real-time progress updates
  private enhanceResumeWithStreaming = async (
    url: string,
    payload: any,
    progressCallback: (progress: string) => void
  ): Promise<{
    pdfBlob: Blob;
    enhancedData?: {
      enhancedResumeData: any;
      improvements: string[];
      keywordsAdded: string[];
      atsScore: number;
    };
  }> => {
    const token = this.getAccessToken();
    
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let pdfData: Uint8Array | null = null;
        let isPdfData = false;
        let isEnhancedData = false;
        let enhancedDataBuffer = '';
        let enhancedData: any = undefined;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (isPdfData) {
              // Collect PDF binary data
              if (!pdfData) {
                pdfData = value;
              } else {
                const combined = new Uint8Array(pdfData.length + value.length);
                combined.set(pdfData);
                combined.set(value, pdfData.length);
                pdfData = combined;
              }
              continue;
            }

            const chunk = decoder.decode(value, { stream: true });
            
            if (isEnhancedData) {
              enhancedDataBuffer += chunk;
            } else {
              buffer += chunk;
            }

            // Process enhanced data buffer if we're collecting it
            if (isEnhancedData) {
              const enhancedLines = enhancedDataBuffer.split('\n');
              for (const line of enhancedLines) {
                if (line === 'ENHANCED_DATA_END') {
                  // Parse the collected enhanced data
                  try {
                    const jsonData = enhancedDataBuffer.replace('ENHANCED_DATA_END\n', '').trim();
                    enhancedData = JSON.parse(jsonData);
                  } catch (error) {
                    console.warn('Failed to parse enhanced data:', error);
                  }
                  isEnhancedData = false;
                  enhancedDataBuffer = '';
                  break;
                }
              }
            }

            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;

              if (line === 'ENHANCED_DATA_START') {
                isEnhancedData = true;
                continue;
              }

              if (line === 'PDF_START') {
                isPdfData = true;
                continue;
              }

              if (line.startsWith('PROGRESS:')) {
                const progress = line.replace('PROGRESS:', '').trim();
                progressCallback(progress);
                continue;
              }

              if (line.startsWith('ERROR:')) {
                const error = line.replace('ERROR:', '').trim();
                throw new Error(error);
              }

              if (line.startsWith('PDF_SIZE:')) {
                const size = parseInt(line.split(':')[1]);
                progressCallback(`PDF generated (${(size / 1024).toFixed(1)}KB)`);
                continue;
              }

              if (line.startsWith('ERROR:')) {
                throw new Error(line.substring(6));
              }

              if (line.startsWith('ENHANCEMENT_COMPLETE')) {
                progressCallback('Enhancement completed');
                continue;
              }

              // Regular progress update
              if (line.trim()) {
                progressCallback(line.trim());
              }
            }
          }

          if (pdfData) {
            const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
            resolve({ pdfBlob, enhancedData });
          } else {
            throw new Error('No PDF data received');
          }
        } finally {
          reader.releaseLock();
        }
      }).catch(reject);
    });
  };

  enhanceResumeWithAI = async (resumeData: any, options?: {
    focusAreas?: string[];
    improvementLevel?: 'basic' | 'comprehensive' | 'expert';
  }): Promise<{
    enhancedResume: any;
    improvements: {
      category: string;
      changes: string[];
      impact: 'high' | 'medium' | 'low';
    }[];
    qualityScore: {
      before: number;
      after: number;
      improvement: number;
    };
    aiStatus?: string;
  }> => {
    try {
      console.log('🤖 Enhancing resume with AI...');
      // AI can work with any data - even create from scratch if needed
      if (!resumeData) {
        resumeData = { personalInfo: {} }; // Provide minimal structure
      }
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      // Use the appropriate endpoint based on whether resume has real database ID
      let url, requestBody;
      
      // Only use ID-based endpoint if resume has real database ID (not temp-id)
      if ((resumeData._id || resumeData.id) && !resumeData['temp-id']) {
        // For saved resumes, use the ID-based endpoint
        const resumeId = resumeData._id || resumeData.id;
        url = `${baseUrl}/api/v1/resumes/${resumeId}/enhance`;
        requestBody = JSON.stringify(options || {});
        console.log(`🎯 Using saved resume enhancement endpoint: ${url}`);
      } else {
        // For unsaved/temp resumes, use the general enhancement endpoint
        url = `${baseUrl}/api/v1/resumes/enhance-unsaved`;
        requestBody = JSON.stringify({
          resumeData,
          options
        });
        console.log(`🎯 Using unsaved resume enhancement endpoint: ${url}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to enhance resume with AI');
      }
      
      return data.data;
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      throw new Error('AI enhancement is currently unavailable. Please ensure you have a valid subscription and try again.');
    }
  }

  private enhanceSummaryWithKeywords = (summary: string, keywords: string[]): string => {
    if (!summary || keywords.length === 0) return summary;
    const keywordsToAdd = keywords.slice(0, 3).filter(k => k.length > 3);
    if (keywordsToAdd.length === 0) return summary;
    return summary + ` Experienced professional with expertise in ${keywordsToAdd.join(', ')}.`;
  }

  private addMissingSkills = (currentSkills: any[], keywords: string[]): any[] => {
    const existingSkillNames = currentSkills.map(s => s.name.toLowerCase());
    const newSkills = keywords
      .filter(k => k.length > 3 && !existingSkillNames.includes(k.toLowerCase()))
      .slice(0, 3)
      .map(k => ({ name: k, category: 'technical' }));
    return [...currentSkills, ...newSkills];
  }

  private enhanceWorkExperience = (workExperience: any[], keywords: string[]): any[] => {
    return workExperience.map(exp => ({
      ...exp,
      achievements: [
        ...exp.achievements,
        `Utilized ${keywords[0] || 'industry best practices'} to improve team efficiency and deliver high-quality results`
      ].slice(0, exp.achievements.length + 1)
    }));
  }

  private enhanceProfessionalSummary = (summary: string): string => {
    if (!summary) {
      return 'Experienced professional with a strong track record of delivering results and driving innovation in dynamic environments.';
    }
    
    // Instead of appending to every sentence, create a properly enhanced version
    const sentences = summary.split('.').filter(s => s.trim().length > 0);
    const enhancedSentences = sentences.map((sentence, index) => {
      const trimmed = sentence.trim();
      if (index === 0) {
        // Enhance the first sentence to be more impactful
        return trimmed.replace(/^(\w+)/, 'Results-driven $1');
      }
      return trimmed;
    });
    
    // Add one additional impact statement if the summary is short
    if (enhancedSentences.length < 3) {
      enhancedSentences.push('Proven ability to deliver innovative solutions and exceed performance expectations');
    }
    
    return enhancedSentences.join('. ') + '.';
  }

  private enhanceWorkExperienceAI = (workExperience: any[]): any[] => {
    return workExperience.map(exp => ({
      ...exp,
      achievements: exp.achievements.map((achievement: string) => {
        if (!/\d+/.test(achievement)) {
          return achievement + ' (resulting in measurable improvements)';
        }
        return achievement;
      })
    }));
  }

  private optimizeSkillsList = (skills: any[]): any[] => {
    const priorityOrder = ['technical', 'certification', 'language', 'soft'];
    return [...skills].sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.category);
      const bPriority = priorityOrder.indexOf(b.category);
      return aPriority - bPriority;
    });
  }

  private calculateResumeScore = (resumeData: any): number => {
    let score = 50;
    if (resumeData?.personalInfo?.firstName) score += 10;
    if (resumeData?.personalInfo?.email) score += 10;
    if (resumeData?.professionalSummary) score += 15;
    if (resumeData?.workExperience?.length > 0) score += 20;
    if (resumeData?.education?.length > 0) score += 10;
    if (resumeData?.skills?.length > 0) score += 15;
    return Math.min(score, 95);
  }

  // ===== LaTeX Template Methods =====

  /**
   * Get available LaTeX/Overleaf templates
   */
  async getLatexTemplates() {
    try {
      const response = await api.get('/resumes/latex-templates');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch LaTeX templates:', error);
      return [];
    }
  }

  /**
   * Generate PDF preview using LaTeX engine
   */
  async generateLatexPDFPreview(resumeData: any, templateId: string): Promise<Blob> {
    try {
      const response = await api.post('/resumes/generate-preview-pdf', {
        resumeData,
        templateId,
        engine: 'latex',
        temporary: true
      }, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to generate LaTeX PDF preview:', error);
      throw error;
    }
  }

  /**
   * Download resume with LaTeX engine option and optimized content
   */
  async downloadResumeWithEngine(
    resumeData: any, 
    format: 'pdf' | 'docx' | 'txt' = 'pdf',
    options?: {
      engine?: 'latex' | 'html';
      templateId?: string;
      optimizedLatexCode?: string;
    }
  ): Promise<Blob> {
    try {
      console.log('📥 Downloading resume with engine:', {
        engine: options?.engine,
        hasOptimizedLatex: !!options?.optimizedLatexCode,
        templateId: options?.templateId
      });

      const stringResumeId = convertObjectIdToString(resumeData._id);
      
      // For PDF downloads, use POST to avoid download manager interception
      if (format === 'pdf') {
        const response = await api.post(`/resumes/download/pdf`, {
          resumeId: stringResumeId,
          resumeData,
          engine: options?.engine,
          templateId: options?.templateId,
          optimizedLatexCode: options?.optimizedLatexCode
        });
        
        // Handle JSON response format
        if (response.data?.success && response.data?.data?.pdfData) {
          const base64Data = response.data.data.pdfData;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return new Blob([bytes], { type: 'application/pdf' });
        } else {
          throw new Error('Invalid PDF response format');
        }
      } else {
        // For other formats (docx, etc.), use traditional blob response
        const response = await api.post(`/resumes/download/${format}`, {
          resumeId: stringResumeId,
          resumeData,
          engine: options?.engine,
          templateId: options?.templateId,
          optimizedLatexCode: options?.optimizedLatexCode
        }, {
          responseType: 'blob'
        });

        return response.data;
      }
    } catch (error) {
      console.error('❌ Resume download failed:', error);
      throw error;
    }
  }

  /**
   * Save PDF to database
   */
  async savePDFToDatabase(
    resumeId: string,
    options: {
      templateId: string;
      optimizedLatexCode?: string;
      jobOptimized?: {
        jobUrl: string;
        jobTitle: string;
        companyName: string;
      };
      resumeData?: any;
      pdfBlob?: Blob;
    }
  ): Promise<{ success: boolean; size?: number }> {
    try {
      console.log('🔍 savePDFToDatabase called with resumeId:', resumeId, 'type:', typeof resumeId);
      
      // Convert resumeId using helper function
      const safeResumeId = convertObjectIdToString(resumeId);
      if (!safeResumeId) {
        throw new Error('Invalid resume ID format');
      }
      console.log('🔍 safeResumeId:', safeResumeId);
      let pdfBlobBase64 = null;
      
      // Convert PDF blob to base64 if provided
      if (options.pdfBlob) {
        pdfBlobBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(options.pdfBlob!);
        });
      }

      const response = await api.post(`/resumes/${safeResumeId}/save-pdf`, {
        templateId: options.templateId,
        optimizedLatexCode: options.optimizedLatexCode,
        jobOptimized: options.jobOptimized,
        resumeData: options.resumeData,
        pdfBlob: pdfBlobBase64
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save PDF to database:', error);
      throw error;
    }
  }

  /**
   * Get saved PDF from database
   */
  async getSavedPDF(resumeId: any): Promise<Blob> {
    try {
      const stringResumeId = convertObjectIdToString(resumeId);
      if (!stringResumeId) {
        throw new Error('Invalid resume ID');
      }
      
      // Use the download/pdf endpoint with JSON response to avoid download manager interception
      const response = await api.post(`/resumes/download/pdf`, {
        resumeId: stringResumeId
      });
      
      // Convert base64 response back to Blob
      if (response.data?.success && response.data?.data?.pdfData) {
        const base64Data = response.data.data.pdfData;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'application/pdf' });
      } else {
        throw new Error('Invalid PDF response format');
      }
    } catch (error) {
      console.error('❌ Failed to get saved PDF:', error);
      throw error;
    }
  }

  /**
   * Get saved PDF information
   */
  async getSavedPDFInfo(resumeId: any): Promise<{
    hasSavedPDF: boolean;
    filename?: string;
    generatedAt?: string;
    isOptimized?: boolean;
    size?: number;
  }> {
    try {
      const stringResumeId = convertObjectIdToString(resumeId);
      if (!stringResumeId) {
        throw new Error('Invalid resume ID');
      }
      const response = await api.get(`/resumes/${stringResumeId}/pdf-info`);
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get saved PDF info:', error);
      return { hasSavedPDF: false };
    }
  }

  /**
   * Generate template preview image
   */
  async generateTemplatePreview(templateId: string): Promise<{
    screenshot: string;
    thumbnail: string;
  }> {
    try {
      const response = await api.get(`/resumes/latex-templates/${templateId}/preview`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate template preview:', error);
      throw error;
    }
  }

  /**
   * Validate if resume data is ready for LaTeX PDF generation
   */
  validateForLatexGeneration(resumeData: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!resumeData.personalInfo?.firstName) errors.push('First name is required');
    if (!resumeData.personalInfo?.lastName) errors.push('Last name is required');
    if (!resumeData.personalInfo?.email) errors.push('Email is required');
    if (!resumeData.personalInfo?.phone) errors.push('Phone number is required');
    if (!resumeData.professionalSummary?.trim()) errors.push('Professional summary is required');
    
    if (!resumeData.workExperience || resumeData.workExperience.length === 0) {
      errors.push('At least one work experience is required');
    }
    
    if (!resumeData.education || resumeData.education.length === 0) {
      errors.push('At least one education entry is required');
    }
    
    if (!resumeData.skills || resumeData.skills.length === 0) {
      errors.push('At least one skill is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async getAvailableLatexTemplates() {
    try {
      const response = await api.get('/resumes/latex-templates');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to load LaTeX templates:', error);
      throw error;
    }
  }
}

export const resumeService = new ResumeService();