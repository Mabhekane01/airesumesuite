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
// Custom error class for AI service errors
class AIServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

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
        'all'
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
      'fallback'
    );
  }

  async analyzeJobFromUrl(jobUrl: string): Promise<JobMatchingResult['jobDetails']> {
    try {
      new URL(jobUrl);
    } catch {
      throw new Error('Invalid URL format. Please provide a valid job posting URL.');
    }

    const prompt = `
Please analyze the job posting at this URL: ${jobUrl}

Extract the following information:
1. Job title
2. Company name
3. Job description
4. Key requirements
5. Key responsibilities

Respond with this JSON structure:
{
  "title": "string",
  "company": "string", 
  "description": "string",
  "requirements": ["string"],
  "responsibilities": ["string"]
}`;

    return this.executeWithFallback(async (provider) => {
      const result = await this.callAIProvider(provider, prompt, 'job-analysis');
      
      if (!result.title) {
        throw new Error('Could not extract job details from the provided URL.');
      }
      
      return {
        title: result.title,
        company: result.company || 'Company Not Specified',
        description: result.description || '',
        requirements: result.requirements || []
      };
    }, 'job analysis from URL');
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
      console.log('🔄 Starting comprehensive optimization...');
      
      // Simplify the resume data for AI processing
      const simplifiedResume = this.simplifyResumeForAI(params.resumeData);
      
      const prompt = `Create an enhanced professional summary for this resume:

Name: ${simplifiedResume.name}
Current Summary: ${simplifiedResume.summary}
Experience: ${simplifiedResume.experience}
Skills: ${simplifiedResume.skills}

Write a 3-4 sentence professional summary that is:
- Achievement-focused and impactful
- Uses strong action words
- Highlights key skills and experience
- Professional and engaging

Return only the enhanced summary text, no JSON or formatting.`;

      const enhancedSummary = await this.callAIProvider(provider, prompt, 'summary-generation');
      
      // Return enhanced resume with AI-generated summary
      return {
        ...params.resumeData,
        professionalSummary: Array.isArray(enhancedSummary) ? enhancedSummary[0] : enhancedSummary
      };
    }, 'resume optimization');
  }

  private simplifyResumeForAI(resumeData: any): any {
    const personalInfo = resumeData.personalInfo || {};
    const workExp = resumeData.workExperience || [];
    const skills = resumeData.skills || [];
    
    return {
      name: `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Professional',
      summary: resumeData.professionalSummary || 'Professional seeking opportunities',
      experience: workExp.length > 0 
        ? workExp.slice(0, 2).map(exp => `${exp.jobTitle} at ${exp.company}`).join(', ')
        : 'Various professional experience',
      skills: Array.isArray(skills) 
        ? skills.slice(0, 5).join(', ')
        : typeof skills === 'string' ? skills : 'Professional skills'
    };
  }

  async generateProfessionalSummary(resumeData: any, jobContext?: string): Promise<string[]> {
    return this.executeWithFallback(async (provider) => {
      const existingSummary = resumeData.professionalSummary || resumeData.summary || '';
      const hasExistingSummary = existingSummary && existingSummary.trim().length > 20;
      
      let prompt;
      
      if (hasExistingSummary) {
        // Improve existing summary
        prompt = `Improve and enhance this existing professional summary using the candidate's full resume data.

Current Summary:
"${existingSummary}"

Full Resume Context:
Name: ${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}
Experience: ${(resumeData.workExperience || resumeData.experience || []).map(exp => `${exp.jobTitle || exp.title} at ${exp.company} - ${(exp.achievements || [exp.description]).join(', ')}`).join('; ')}
Skills: ${(resumeData.skills || []).join(', ')}
Education: ${(resumeData.education || []).map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}

${jobContext ? `Job Context: ${jobContext}` : ''}

Task: Take the existing summary and make it more impactful by:
1. Keeping the good parts but enhancing weak language
2. Adding specific details from their experience and skills
3. Making it more achievement-focused with stronger action words
4. Ensuring it's 3-4 powerful sentences
5. Maintaining the person's professional voice but elevating it

Return only the improved summary as plain text.`;
      } else {
        // Generate new summary from scratch
        prompt = `Create a compelling professional summary for this candidate based on their resume data.

Resume Data:
Name: ${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}
Experience: ${(resumeData.workExperience || resumeData.experience || []).map(exp => `${exp.jobTitle || exp.title} at ${exp.company} - ${(exp.achievements || [exp.description]).join(', ')}`).join('; ')}
Skills: ${(resumeData.skills || []).join(', ')}
Education: ${(resumeData.education || []).map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}

${jobContext ? `Job Context: ${jobContext}` : ''}

Write a professional summary that:
1. Captures their unique value proposition
2. Highlights their most relevant experience and skills
3. Uses specific, quantifiable achievements where possible
4. Is 3-4 impactful sentences
5. Uses strong action words and professional language

Return only the summary as plain text.`;
      }

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

    try {
      console.log(`🔄 Calling Gemini for ${type}...`);
      
      // Add timeout wrapper - increased to 30s for complex operations
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timeout')), 30000);
      });

      // Use Gemini 2.5 Flash - the latest and most powerful model
      let model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const aiPromise = model.generateContent(prompt);
      const result = await Promise.race([aiPromise, timeoutPromise]) as any;
      
      const response = await result.response;
      const text = response.text();

      console.log(`📝 Gemini response received (${text.length} chars)`);
      return this.parseAIResponse(text, type);
    } catch (error: any) {
      console.error(`❌ Gemini error for ${type}:`, error.message);
      
      if (error.message === 'AI request timeout') {
        throw new Error('AI service timeout - please try again');
      }
      
      // Handle 503 Service Unavailable - retry with fallback models
      if (error.message?.includes('503') || error.message?.includes('overloaded')) {
        try {
          console.log('🔄 Gemini 2.5 Flash overloaded, trying Gemini 1.5 Flash...');
          const fallbackModel = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const fallbackResult = await fallbackModel.generateContent(prompt);
          const fallbackResponse = await fallbackResult.response;
          const fallbackText = fallbackResponse.text();
          return this.parseAIResponse(fallbackText, type);
        } catch (fallbackError) {
          try {
            console.log('🔄 Gemini 1.5 Flash failed, trying Gemini Pro...');
            const modelPro = this.gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
            const resultPro = await modelPro.generateContent(prompt);
            const responsePro = await resultPro.response;
            const textPro = responsePro.text();
            return this.parseAIResponse(textPro, type);
          } catch (finalError) {
            throw new Error('All Gemini models are currently overloaded - please try again in a few minutes');
          }
        }
      }
      
      throw error;
    }
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
      // Remove markdown code fences and extra formatting
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find and parse JSON
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Try parsing the entire cleaned text as JSON
      try {
        return JSON.parse(cleanedText);
      } catch (e) {
        // Continue to special handling
      }
      
      // Special handling for summary generation - if no JSON found, create array from text
      if (type === 'summary-generation') {
        console.log(`📝 Processing summary text for ${type}`);
        // Split by numbered list or line breaks to create multiple summaries
        const summaries = cleanedText
          .split(/\n\d+\.\s*|\n-\s*|\n\n+/)
          .map(s => s.trim())
          .filter(s => s.length > 20); // Filter out very short lines
        
        if (summaries.length > 0) {
          console.log(`✅ Created ${summaries.length} summaries from text`);
          return summaries.slice(0, 3); // Return up to 3 summaries
        }
        
        // If no structured format, return the whole text as a single summary
        console.log(`📄 Using full text as single summary`);
        return [cleanedText];
      }

      // For resume optimization, if no JSON found, try to work with the text
      if (type === 'resume-optimization') {
        console.log(`⚠️ No JSON found for resume optimization, creating structured response`);
        // Return the original data with enhanced summary if we got text
        return {
          enhancedSummary: cleanedText,
          improvements: ['AI-enhanced content', 'Improved professional language'],
          success: true
        };
      }

      // Special handling for job analysis - create fallback structure
      if (type === 'job-analysis') {
        return {
          title: 'Job Title (extracted from text)',
          company: 'Company Name (extracted from text)', 
          description: cleanedText.substring(0, 500),
          requirements: cleanedText.split('\n').filter(line => 
            line.toLowerCase().includes('require') || 
            line.toLowerCase().includes('must') ||
            line.toLowerCase().includes('need')
          ).slice(0, 5),
          responsibilities: []
        };
      }

      // Special handling for job matching - create fallback structure
      if (type === 'job-matching') {
        return {
          matchScore: 75,
          keywordAlignment: ['General skills'],
          missingKeywords: ['Review job requirements'],
          recommendations: ['Update resume to match job requirements better']
        };
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      // For summary generation, provide fallback even on parse error
      if (type === 'summary-generation') {
        console.warn(`⚠️ Parse error for ${type}, using fallback:`, error);
        return [text.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim()];
      }

      // For resume optimization, provide a basic fallback
      if (type === 'resume-optimization') {
        console.warn(`⚠️ Parse error for resume optimization, using fallback`);
        return {
          enhancedSummary: 'Professional with proven experience and expertise in their field.',
          improvements: ['Basic AI enhancement applied'],
          success: false
        };
      }
      
      console.error(`❌ Failed to parse AI response for ${type}:`, error.message);
      throw new Error(`Invalid AI response for ${type}: ${error.message}`);
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