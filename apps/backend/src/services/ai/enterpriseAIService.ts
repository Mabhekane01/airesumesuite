import { GoogleGenAI } from '@google/genai';
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
  private gemini: GoogleGenAI | null = null;
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
        this.gemini = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
        });
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

    const prompt = `Extract job info from: ${jobUrl}

Return ONLY this JSON format (no markdown, no text before/after):
{
  "title": "job title",
  "company": "company name", 
  "description": "brief job description (max 300 chars)",
  "requirements": ["req1", "req2", "req3"],
  "responsibilities": ["resp1", "resp2", "resp3"]
}

Keep description under 300 characters. Limit arrays to max 5 items each. Ensure valid JSON syntax.`;

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

You must return a JSON array with exactly 1 professional summary.

RETURN ONLY THIS FORMAT (no explanations, no markdown, no other text):
["Professional summary here"]

Generate exactly 1 enhanced professional summary.`;

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
    const workExp = resumeData.workExperience || resumeData.experience || [];
    const skills = resumeData.skills || [];
    
    return {
      name: `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Professional',
      summary: resumeData.professionalSummary || 'Professional seeking opportunities',
      experience: workExp.length > 0 
        ? workExp.slice(0, 3).map(exp => `${exp.jobTitle} at ${exp.company || exp.companyName} (${exp.startDate || 'Previous'} - ${exp.endDate || (exp.isCurrentJob ? 'Present' : 'N/A')})`).join(', ')
        : 'Various professional experience',
      skills: Array.isArray(skills) 
        ? skills.slice(0, 8).map(skill => typeof skill === 'string' ? skill : skill.name).join(', ')
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
Experience: ${(resumeData.workExperience || resumeData.experience || []).map(exp => `${exp.jobTitle} at ${exp.company || exp.companyName} - ${(exp.achievements || exp.responsibilities || []).join(', ')}`).join('; ')}
Skills: ${(resumeData.skills || []).map(skill => typeof skill === 'string' ? skill : skill.name).join(', ')}
Education: ${(resumeData.education || []).map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}

${jobContext ? `Job Context: ${jobContext}` : ''}

Task: Take the existing summary and make it more impactful by:
1. Keeping the good parts but enhancing weak language
2. Adding specific details from their experience and skills
3. Making it more achievement-focused with stronger action words
4. Ensuring it's 3-4 powerful sentences
5. Maintaining the person's professional voice but elevating it

You must return a JSON array with exactly 3 enhanced professional summaries.

RETURN ONLY THIS FORMAT (no explanations, no markdown, no other text):
["Enhanced summary 1", "Enhanced summary 2", "Enhanced summary 3"]

Generate exactly 3 enhanced versions of this summary. Each should be a complete professional summary (3-4 sentences) that improves upon the original.`;
      } else {
        // Generate new summary from scratch
        prompt = `Create a compelling professional summary for this candidate based on their resume data.

Resume Data:
Name: ${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}
Experience: ${(resumeData.workExperience || resumeData.experience || []).map(exp => `${exp.jobTitle} at ${exp.company || exp.companyName} - ${(exp.achievements || exp.responsibilities || []).join(', ')}`).join('; ')}
Skills: ${(resumeData.skills || []).map(skill => typeof skill === 'string' ? skill : skill.name).join(', ')}
Education: ${(resumeData.education || []).map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}

${jobContext ? `Job Context: ${jobContext}` : ''}

Write a professional summary that:
1. Captures their unique value proposition
2. Highlights their most relevant experience and skills
3. Uses specific, quantifiable achievements where possible
4. Is 3-4 impactful sentences
5. Uses strong action words and professional language

You must return a JSON array with exactly 3 professional summaries.

RETURN ONLY THIS FORMAT (no explanations, no markdown, no other text):
["Professional summary 1", "Professional summary 2", "Professional summary 3"]

Generate exactly 3 professional summary variations. Each should be a complete professional summary (3-4 sentences) that captures their unique value proposition.`;
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
      
      // Add timeout wrapper - increased to 60s for complex operations
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timeout')), 60000);
      });

      // Use Gemini 2.5 Flash with high token limits for resume operations
      const config: any = {
        model: 'gemini-2.5-flash',
        contents: prompt,
      };
      
      // Resume and job analysis operations need very high token limits
      const resumeOperations = ['job-analysis', 'job-matching', 'ats-analysis', 'summary-generation', 'resume-optimization'];
      if (resumeOperations.includes(type)) {
        // For job-analysis specifically, use more conservative settings to prevent truncation
        if (type === 'job-analysis') {
          config.generationConfig = {
            maxOutputTokens: 2048, // Much smaller limit to ensure complete JSON responses
            temperature: 0.1, // Lower temperature for more consistent output
            topK: 10,  // More focused to ensure JSON format
            topP: 0.6, // More conservative to avoid creative formatting
            candidateCount: 1, // Ensure single response
          };
          console.log(`🔧 Using job-analysis optimized config with maxOutputTokens: 2048`);
        } else {
          config.generationConfig = {
            maxOutputTokens: 50000, // Very high limit for other operations
            temperature: 0.2,
            topK: 40,
            topP: 0.9,
          };
          console.log(`🔧 Using enhanced config for ${type} with maxOutputTokens: 50000`);
        }
      }
      
      const aiPromise = this.gemini.models.generateContent(config);
      
      const result = await Promise.race([aiPromise, timeoutPromise]) as any;
      
      // Try different methods to get the full response text - prioritize candidates array
      let text = '';
      try {
        if (result.candidates && result.candidates[0]) {
          // Method 3: From candidates array
          const candidate = result.candidates[0];
          if (candidate.content && candidate.content.parts) {
            console.log(`🔧 Found ${candidate.content.parts.length} parts in response`);
            const parts = candidate.content.parts.map((part, index) => {
              console.log(`🔧 Part ${index}: ${part.text ? part.text.length : 0} chars`);
              return part.text || '';
            });
            text = parts.join('');
            console.log(`🔧 Total extracted text from candidates array: ${text.length} chars`);
            
            // Check for truncation indicators
            if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'LENGTH') {
              console.warn(`⚠️ Response truncated due to ${candidate.finishReason}, retrying with smaller token limit`);
              
              // Retry with even smaller token limit for job-analysis
              if (type === 'job-analysis') {
                console.log('🔄 Retrying job-analysis with reduced token limit...');
                const retryConfig = {
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                  generationConfig: {
                    maxOutputTokens: 1024, // Very small limit to ensure completion
                    temperature: 0.05, // Even more deterministic
                    topK: 5,
                    topP: 0.5,
                    candidateCount: 1,
                  }
                };
                
                const retryResult = await this.gemini.models.generateContent(retryConfig);
                if (retryResult.candidates && retryResult.candidates[0]) {
                  const retryCandidate = retryResult.candidates[0];
                  if (retryCandidate.content && retryCandidate.content.parts) {
                    const retryText = retryCandidate.content.parts.map(part => part.text || '').join('');
                    console.log(`🔄 Retry successful, got ${retryText.length} chars`);
                    return this.parseAIResponse(retryText, type);
                  }
                }
              }
              
              throw new Error(`AI response was truncated (${candidate.finishReason}). Unable to get complete response.`);
            }
            
            // Check if the response looks truncated by examining the end
            if (text && !text.trim().endsWith('}') && !text.trim().endsWith(']') && !text.trim().endsWith('"')) {
              console.warn('⚠️ Response appears truncated - doesn\'t end with proper JSON closure');
              // Try to complete basic JSON structure
              const trimmed = text.trim();
              if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
                console.log('🔧 Attempting to close truncated JSON object');
                text = trimmed + '}';
              } else if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
                console.log('🔧 Attempting to close truncated JSON array');
                text = trimmed + ']';
              }
            }
          }
        } else if (result.response && typeof result.response.text === 'function') {
          // Method 1: Try response.text() as function
          text = await result.response.text();
        } else if (result.response && result.response.text) {
          // Method 1b: Try response.text as property
          text = result.response.text;
        } else if (result.text) {
          // Method 2: Direct text property
          text = result.text;
        }
        
        console.log(`📝 Gemini response received (${text.length} chars)`);
        console.log(`🔍 Response object keys:`, Object.keys(result));
        console.log(`🔍 Response structure sample:`, JSON.stringify(result, null, 2).substring(0, 500));
        
      } catch (textError) {
        console.error(`❌ Error extracting text from response:`, textError);
        throw new Error(`Failed to extract text from Gemini response: ${textError.message}`);
      }
      
      if (!text) {
        throw new Error('Empty response text from Gemini API');
      }
      
      return this.parseAIResponse(text, type);
    } catch (error: any) {
      console.error(`❌ Gemini error for ${type}:`, error.message);
      
      if (error.message === 'AI request timeout') {
        console.warn(`⚠️ gemini failed for ${type}: AI service timeout - please try again`);
        console.warn(`⚠️ AI FALLBACK: ${type} failed, using manual assessment`);
        console.warn(`⚠️ NOTIFICATION: AI ${type} had issues, user will be informed`);
        throw new Error('AI service timeout - please try again');
      }

      // Handle 429 Quota Exceeded errors
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('⚠️ Gemini API quota exceeded - consider upgrading your plan');
        const quotaError = new Error('AI service quota exceeded. Please check your Gemini API billing and quota limits at https://aistudio.google.com/');
        (quotaError as any).code = 'AI_QUOTA_EXCEEDED';
        (quotaError as any).status = 429;
        throw quotaError;
      }
      
      // Handle 503 Service Unavailable - retry with fallback models
      if (error.message?.includes('503') || error.message?.includes('overloaded')) {
        try {
          console.log('🔄 Gemini 2.5 Pro overloaded, trying Gemini 2.5 Flash...');
          const fallbackResult = await this.gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          const fallbackText = fallbackResult.text;
          return this.parseAIResponse(fallbackText, type);
        } catch (fallbackError) {
          try {
            console.log('🔄 Gemini 2.5 Flash failed, trying Gemini 2.5 Flash as final fallback...');
            const resultPro = await this.gemini.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            const textPro = resultPro.text;
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
    console.log(`🔧 [${type}] Raw AI response (${text.length} chars):`, text.substring(0, 200));
    
    try {
      // COMPREHENSIVE TEXT CLEANING - handles ALL problematic patterns
      let cleanedText = text.trim();
      
      // Remove all markdown variations
      cleanedText = cleanedText
        .replace(/```json\n?/gi, '')
        .replace(/```javascript\n?/gi, '')
        .replace(/```\n?/g, '')
        .replace(/`{3,}/g, '')
        .replace(/^`+|`+$/g, '');
      
      // Remove ONLY specific problematic prefixes, NOT valid JSON arrays
      cleanedText = cleanedText
        .replace(/^\[Candidate[^\]]*\]\s*/gi, '') // [Candidate...] but not JSON arrays
        .replace(/^\[Your Job[^\]]*\]\s*/gi, '') // [Your Job...]
        .replace(/^\[Your Profe[^\]]*\]\s*/gi, '') // [Your Profe...]
        .replace(/^\[Job Title[^\]]*\]\s*/gi, '') // [Job Title...]
        .replace(/^\[Professional[^\]]*\]\s*/gi, '') // [Professional...]
        .replace(/^\[Summary[^\]]*\]\s*/gi, '') // [Summary...]
        .replace(/^Here's.*?:\s*/gi, '') // "Here's the..."
        .replace(/^The.*?:\s*/gi, '') // "The JSON response..."
        .replace(/^Response.*?:\s*/gi, '') // "Response:"
        .replace(/^Based on.*?:\s*/gi, '') // "Based on..."
        .replace(/^\*\*.*?\*\*\s*/gi, '') // **Bold text**
        .replace(/^\d+\.\s*/gm, '') // Numbered list items
        .replace(/^[-•]\s*/gm, '') // Bullet points
        .trim();
      
      // DON'T remove valid JSON arrays that start with ["
      
      console.log(`🧹 [${type}] After cleaning (${cleanedText.length} chars):`, cleanedText.substring(0, 200));
      
      // PRIORITY: Try parsing cleaned text directly first (for perfect JSON responses)
      try {
        const directParsed = JSON.parse(cleanedText);
        console.log(`✅ [${type}] Direct parse succeeded!`);
        return directParsed;
      } catch (e) {
        console.log(`❌ [${type}] Direct parse failed:`, e.message);
      }
      
      // ENHANCED JSON EXTRACTION - multiple strategies
      let extractedJson = null;
      
      // Strategy 1: Look for complete JSON object/array with proper nesting support
      let jsonPattern = /(\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}|\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\])/;
      let match = cleanedText.match(jsonPattern);
      
      if (match) {
        extractedJson = match[0];
        console.log(`✂️ [${type}] Strategy 1 - Found JSON pattern`);
      } else {
        // Strategy 2: Find content between first { and last }
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        const firstBracket = cleanedText.indexOf('[');
        const lastBracket = cleanedText.lastIndexOf(']');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          extractedJson = cleanedText.substring(firstBrace, lastBrace + 1);
          console.log(`✂️ [${type}] Strategy 2 - Extracted between braces`);
        } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          extractedJson = cleanedText.substring(firstBracket, lastBracket + 1);
          console.log(`✂️ [${type}] Strategy 2 - Extracted between brackets`);
        }
      }
      
      // If we found potential JSON, clean it further
      if (extractedJson) {
        extractedJson = extractedJson
          .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/\n/g, ' ')     // Replace newlines with spaces
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .replace(/"\/"/g, '"/"') // Fix quote escaping issues
          // Fix missing commas in arrays - common issue from logs
          .replace(/"\s*\n\s*"/g, '", "')  // Fix line-broken string arrays
          .replace(/"\s+"/g, '", "')       // Fix space-separated string arrays
          // Fix missing commas in object properties
          .replace(/"\s*\n\s*"[^:]/g, (match) => match.replace(/"\s*\n\s*"/, '", "'))
          .trim();
        
        console.log(`🔧 [${type}] Final JSON candidate:`, extractedJson.substring(0, 200));
        
        try {
          const parsed = JSON.parse(extractedJson);
          console.log(`✅ [${type}] JSON parsed successfully!`);
          return parsed;
        } catch (parseError) {
          console.warn(`❌ [${type}] JSON parse failed:`, parseError.message);
        }
      }
      
      // Strategy 3: Try parsing the entire cleaned text
      try {
        const parsed = JSON.parse(cleanedText);
        console.log(`✅ [${type}] Direct parse succeeded!`);
        return parsed;
      } catch (e) {
        console.warn(`❌ [${type}] Direct parse failed:`, e.message);
      }
      
      // If all JSON parsing fails, throw error - NO FALLBACKS for production
      throw new Error(`Failed to parse JSON response for ${type}. Raw response: ${text.substring(0, 200)}...`);
    } catch (error: any) {
      console.error(`❌ [${type}] CRITICAL: JSON parsing failed - this must be fixed for production!`);
      console.error(`Raw response (${text.length} chars):`, text);
      throw new Error(`AI service returned invalid JSON for ${type}: ${error.message}`);
    }
  }
  
  // NO FALLBACK HANDLING - Production system must get proper JSON responses

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