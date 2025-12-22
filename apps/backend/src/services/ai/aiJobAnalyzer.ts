import { geminiService } from './gemini';
import { redisClient } from '../../config/redis';

export interface JobAnalysisResult {
  jobTitle: string;
  companyName: string;
  location: string;
  jobDescription: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  experienceLevel: string;
  employmentType: string;
  salary?: string;
  benefits: string[];
  companyInfo?: {
    industry: string;
    size: string;
    description: string;
  };
  applicationInstructions?: string;
  postedDate?: string;
  applicationDeadline?: string;
  strategicInsights: string[];
  confidence: number; // 0-100 confidence score
}

export class AIJobAnalyzer {
  
  async analyzeJobFromUrl(url: string): Promise<JobAnalysisResult> {
    // Check cache first
    const cacheKey = `ai-job-analysis:${Buffer.from(url).toString('base64')}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('🎯 Using cached AI job analysis');
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.warn('Cache operation failed, proceeding without cache:', cacheError);
    }

    try {
      // Let the resilient Gemini service handle the scraping and analysis
      console.log('🤖 Sending job URL to resilient AI service for analysis:', url);
      const analysis = await geminiService.scrapeJobFromUrl(url, resumeData);
      
      // Cache the result for 24 hours
      try {
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(analysis));
      } catch (cacheError) {
        console.warn('Failed to cache job analysis:', cacheError);
      }

      return analysis as unknown as JobAnalysisResult;
    } catch (error: any) {
      console.error('Error in AI job analysis:', error);
      
      // Re-throw specific quota error for controller handling
      if (error.message === 'AI_QUOTA_EXCEEDED') {
        throw error;
      }
      
      throw new Error(`Failed to analyze job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Legacy method removed in favor of geminiService.scrapeJobFromUrl
  // private async aiAnalyzeJobFromUrl(url: string) { ... }


  private validateAndCleanAnalysis(analysis: any, url: string): JobAnalysisResult {
    // Provide defaults for missing required fields
    const cleaned: JobAnalysisResult = {
      jobTitle: analysis.jobTitle || 'Job Title Not Found',
      companyName: analysis.companyName || 'Company Not Found', 
      location: analysis.location || 'Location Not Specified',
      jobDescription: analysis.jobDescription || 'Job description not available from this posting.',
      requirements: Array.isArray(analysis.requirements) ? analysis.requirements : [],
      responsibilities: Array.isArray(analysis.responsibilities) ? analysis.responsibilities : [],
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      experienceLevel: analysis.experienceLevel || 'not-specified',
      employmentType: analysis.employmentType || 'not-specified',
      salary: analysis.salary || undefined,
      benefits: Array.isArray(analysis.benefits) ? analysis.benefits : [],
      companyInfo: {
        industry: analysis.companyInfo?.industry || 'Not specified',
        size: analysis.companyInfo?.size || 'Not specified',
        description: analysis.companyInfo?.description || 'Company information not available'
      },
      strategicInsights: Array.isArray(analysis.strategicInsights) ? analysis.strategicInsights : [],
      applicationInstructions: analysis.applicationInstructions || undefined,
      postedDate: analysis.postedDate || undefined,
      applicationDeadline: analysis.applicationDeadline || undefined,
      confidence: Math.max(1, Math.min(100, analysis.confidence || 50))
    };

    // Clean text fields
    cleaned.jobTitle = this.cleanText(cleaned.jobTitle);
    cleaned.companyName = this.cleanText(cleaned.companyName);
    cleaned.location = this.cleanText(cleaned.location);
    cleaned.jobDescription = this.cleanText(cleaned.jobDescription);

    // Validate confidence based on completeness
    let actualConfidence = 0;
    if (cleaned.jobTitle !== 'Job Title Not Found') actualConfidence += 20;
    if (cleaned.companyName !== 'Company Not Found') actualConfidence += 15;
    if (cleaned.requirements.length > 0) actualConfidence += 15;
    if (cleaned.responsibilities.length > 0) actualConfidence += 15;
    if (cleaned.skills.length > 0) actualConfidence += 10;
    if (cleaned.jobDescription.length > 100) actualConfidence += 15;
    if (cleaned.location !== 'Location Not Specified') actualConfidence += 10;

    cleaned.confidence = Math.min(actualConfidence, cleaned.confidence);

    return cleaned;
  }

  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, ''); // Remove leading/trailing non-word characters
  }

  async validateJobUrl(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      
      // Allow most domains, but block obviously problematic ones
      const blockedDomains = ['localhost', '127.0.0.1', 'internal', 'admin'];
      const hostname = urlObj.hostname.toLowerCase();
      
      if (blockedDomains.some(blocked => hostname.includes(blocked))) {
        return false;
      }

      // Basic URL format validation - let AI handle the rest
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

export const aiJobAnalyzer = new AIJobAnalyzer();