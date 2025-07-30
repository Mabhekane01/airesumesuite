import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

// Optional Anthropic SDK - gracefully handle missing dependency
let Anthropic: any;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (error) {
  console.warn('Anthropic SDK not available - some AI features will be limited');
  Anthropic = null;
}
import { jobScrapingService } from '../job-scraper/jobScrapingService';
import { AIServiceError, JobScrapingError } from '../../middleware/enterpriseErrorHandler';

export interface AIProvider {
  name: string;
  isAvailable: boolean;
  priority: number;
}

export interface EnhancedResumeOptimizationParams {
  resumeData: any;
  jobDescription?: string;
  jobTitle?: string;
  companyName?: string;
  jobUrl?: string;
  optimizationType: 'ats' | 'content' | 'comprehensive' | 'job-specific';
}

export interface ATSAnalysisResult {
  score: number;
  recommendations: string[];
  keywordMatch: number;
  formatScore: number;
  contentScore: number;
  improvementAreas: string[];
  strengths: string[];
}

export interface JobMatchingResult {
  matchScore: number;
  keywordAlignment: string[];
  missingKeywords: string[];
  recommendations: string[];
  jobDetails: {
    title: string;
    company: string;
    description: string;
    requirements?: string[];
  };
}

export class EnterpriseAIService {
  private gemini: GoogleGenerativeAI | null = null;
  private claude: InstanceType<typeof Anthropic> | null = null;
  private openai: OpenAI | null = null;
  private providers: AIProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.providers.push({ name: 'gemini', isAvailable: true, priority: 1 });
      } catch (error) {
        console.warn('Failed to initialize Gemini:', error);
      }
    }

    // Initialize Claude
    if (process.env.ANTHROPIC_API_KEY && Anthropic) {
      try {
        this.claude = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.providers.push({ name: 'claude', isAvailable: true, priority: 2 });
      } catch (error) {
        console.warn('Failed to initialize Claude:', error);
      }
    } else if (process.env.ANTHROPIC_API_KEY && !Anthropic) {
      console.warn('Anthropic API key provided but SDK not available');
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.providers.push({ name: 'openai', isAvailable: true, priority: 3 });
      } catch (error) {
        console.warn('Failed to initialize OpenAI:', error);
      }
    }

    // Sort providers by priority
    this.providers.sort((a, b) => a.priority - b.priority);
    console.log('🤖 Available AI providers:', this.providers.map(p => p.name));
  }

  private async executeWithFallback<T>(
    operation: (provider: string) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const availableProviders = this.providers.filter(p => p.isAvailable);
    
    if (availableProviders.length === 0) {
      throw new AIServiceError(
        'No AI providers are currently available',
        'all',
        { operationName, availableProviders: this.providers.map(p => ({ name: p.name, available: p.isAvailable })) }
      );
    }

    let lastError: Error | null = null;
    const attemptResults: Array<{ provider: string; error: string }> = [];

    for (const provider of availableProviders) {
      try {
        console.log(`🤖 Attempting ${operationName} with ${provider.name}`);
        const result = await operation(provider.name);
        console.log(`✅ Successfully completed ${operationName} with ${provider.name}`);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ ${provider.name} failed for ${operationName}:`, errorMessage);
        lastError = error as Error;
        attemptResults.push({ provider: provider.name, error: errorMessage });
        
        // Mark provider as temporarily unavailable if it's a rate limit or auth error
        if (error instanceof Error && (
          error.message.includes('rate limit') ||
          error.message.includes('quota') ||
          error.message.includes('unauthorized') ||
          error.message.includes('429')
        )) {
          console.log(`🚫 Temporarily disabling ${provider.name} due to rate limiting`);
          provider.isAvailable = false;
          setTimeout(() => {
            console.log(`✅ Re-enabling ${provider.name}`);
            provider.isAvailable = true;
          }, 60000); // Re-enable after 1 minute
        }
      }
    }

    throw new AIServiceError(
      `All AI providers failed for ${operationName}`,
      'fallback',
      { 
        operationName, 
        attempts: attemptResults,
        lastError: lastError?.message 
      }
    );
  }

  async analyzeJobFromUrl(jobUrl: string): Promise<JobMatchingResult['jobDetails']> {
    try {
      // Validate URL format
      try {
        new URL(jobUrl);
      } catch {
        throw new JobScrapingError('Invalid URL format. Please provide a valid job posting URL.', jobUrl);
      }

      console.log(`🔍 Analyzing job from URL: ${jobUrl}`);
      const jobDetails = await jobScrapingService.scrapeJobDetails(jobUrl);
      
      if (!jobDetails || !jobDetails.title) {
        throw new JobScrapingError('Could not extract job details from the provided URL. The page may not be accessible or may not be a job posting.', jobUrl);
      }
      
      return {
        title: jobDetails.title,
        company: jobDetails.company || 'Unknown Company',
        description: jobDetails.description || '',
        requirements: (jobDetails as any).requirements || []
      };
    } catch (error) {
      if (error instanceof JobScrapingError) {
        throw error;
      }
      
      console.error('Failed to analyze job from URL:', error);
      throw new JobScrapingError(
        'Failed to analyze job posting. The URL may not be accessible or may require authentication.',
        jobUrl
      );
    }
  }

  async analyzeATSCompatibility(resumeData: any, jobDescription?: string): Promise<ATSAnalysisResult> {
    return this.executeWithFallback(async (provider) => {
      const prompt = `
Analyze this resume for ATS (Applicant Tracking System) compatibility and provide a detailed assessment.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

${jobDescription ? `Job Description for context: ${jobDescription}` : ''}

Provide a comprehensive ATS analysis with:
1. Overall ATS compatibility score (0-100)
2. Keyword match percentage (0-100)
3. Format score (0-100)
4. Content score (0-100)
5. Specific recommendations for improvement
6. Identified strengths
7. Areas needing improvement

Respond with a JSON object in this exact format:
{
  "score": number,
  "keywordMatch": number,
  "formatScore": number,
  "contentScore": number,
  "recommendations": ["string"],
  "strengths": ["string"],
  "improvementAreas": ["string"]
}`;

      return this.callAIProvider(provider, prompt, 'ats-analysis');
    }, 'ATS analysis');
  }

  async optimizeResumeComprehensively(params: EnhancedResumeOptimizationParams): Promise<any> {
    return this.executeWithFallback(async (provider) => {
      let jobContext = '';
      
      if (params.jobUrl) {
        try {
          const jobDetails = await this.analyzeJobFromUrl(params.jobUrl);
          jobContext = `
Job Title: ${jobDetails.title}
Company: ${jobDetails.company}
Job Description: ${jobDetails.description}
Requirements: ${jobDetails.requirements?.join(', ') || 'Not specified'}`;
        } catch (error) {
          console.warn('Failed to fetch job details, using provided info');
        }
      } else if (params.jobDescription) {
        jobContext = `
Job Title: ${params.jobTitle || 'Position'}
Company: ${params.companyName || 'Company'}
Job Description: ${params.jobDescription}`;
      }

      const optimizationFocus = this.getOptimizationFocus(params.optimizationType);

      const prompt = `
You are an expert resume optimization specialist. Optimize this resume to be enterprise-grade and highly effective.

Current Resume:
${JSON.stringify(params.resumeData, null, 2)}

${jobContext ? `Job Context:\n${jobContext}` : ''}

Optimization Type: ${params.optimizationType}
Focus Areas: ${optimizationFocus}

Provide an optimized resume that:
1. Maintains all truthful information
2. Uses powerful action verbs and quantified achievements
3. Optimizes for ATS compatibility
4. Aligns with the job requirements (if provided)
5. Uses industry-standard formatting and terminology
6. Incorporates relevant keywords naturally

Return ONLY the optimized resume JSON with the same structure as the input.`;

      return this.callAIProvider(provider, prompt, 'resume-optimization');
    }, 'resume optimization');
  }

  async generateProfessionalSummary(resumeData: any, jobContext?: string): Promise<string[]> {
    return this.executeWithFallback(async (provider) => {
      const prompt = `
Generate 3 different professional summary options for this resume. Each should be unique in style and approach.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

${jobContext ? `Job Context: ${jobContext}` : ''}

Create summaries that are:
1. Concise (3-4 sentences each)
2. Achievement-focused
3. Tailored to the individual's experience level
4. Professional and impactful

Return a JSON array of 3 summary strings:
["summary1", "summary2", "summary3"]`;

      const result = await this.callAIProvider(provider, prompt, 'summary-generation');
      return Array.isArray(result) ? result : [result];
    }, 'professional summary generation');
  }

  async optimizeForJobPosting(resumeData: any, jobUrl: string): Promise<JobMatchingResult> {
    return this.executeWithFallback(async (provider) => {
      const jobDetails = await this.analyzeJobFromUrl(jobUrl);
      
      const prompt = `
Analyze how well this resume matches the job posting and provide optimization recommendations.

Resume:
${JSON.stringify(resumeData, null, 2)}

Job Posting:
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Description: ${jobDetails.description}
Requirements: ${jobDetails.requirements?.join(', ') || 'Not specified'}

Provide a detailed matching analysis with:
1. Overall match score (0-100)
2. Keywords that align well
3. Missing keywords that should be added
4. Specific recommendations for improvement

Respond with this JSON structure:
{
  "matchScore": number,
  "keywordAlignment": ["string"],
  "missingKeywords": ["string"],
  "recommendations": ["string"]
}`;

      const analysis = await this.callAIProvider(provider, prompt, 'job-matching');
      
      return {
        ...analysis,
        jobDetails
      };
    }, 'job posting optimization');
  }

  private async callAIProvider(provider: string, prompt: string, type: string): Promise<any> {
    switch (provider) {
      case 'gemini':
        return this.callGemini(prompt, type);
      case 'claude':
        return this.callClaude(prompt, type);
      case 'openai':
        return this.callOpenAI(prompt, type);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async callGemini(prompt: string, type: string): Promise<any> {
    if (!this.gemini) {
      throw new Error('Gemini not available');
    }

    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return this.parseAIResponse(text, type);
  }

  private async callClaude(prompt: string, type: string): Promise<any> {
    if (!this.claude) {
      throw new Error('Claude not available');
    }

    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAIResponse(text, type);
  }

  private async callOpenAI(prompt: string, type: string): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI not available');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
    });

    const text = response.choices[0]?.message?.content || '';
    return this.parseAIResponse(text, type);
  }

  private parseAIResponse(text: string, type: string): any {
    try {
      // Remove markdown code fences if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      
      // Try to find JSON in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return the text for summary generation
      if (type === 'summary-generation') {
        return [text];
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error(`Failed to parse AI response for ${type}:`, text, error);
      throw new Error(`Invalid AI response for ${type}`);
    }
  }

  private getOptimizationFocus(type: string): string {
    switch (type) {
      case 'ats':
        return 'ATS compatibility, keyword optimization, formatting';
      case 'content':
        return 'Writing quality, achievement quantification, impact statements';
      case 'comprehensive':
        return 'All aspects: ATS, content, keywords, formatting, achievements';
      case 'job-specific':
        return 'Job alignment, relevant skills highlighting, targeted keywords';
      default:
        return 'General improvement and professional presentation';
    }
  }

  getProviderStatus(): AIProvider[] {
    return [...this.providers];
  }
}

export const enterpriseAIService = new EnterpriseAIService();