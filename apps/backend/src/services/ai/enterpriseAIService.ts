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
  
  // Model resilience tracking
  private modelCooldowns = new Map<string, number>();
  private readonly QUOTA_COOLDOWN = 5 * 1000; // 5 second retry for 429s

  constructor() {
    this.initializeProviders();
  }

  private getSmartModelSelection(type: string): string {
    const now = Date.now();
    const g3pro = 'gemini-3-pro-preview';
    const g3flash = 'gemini-3-flash-preview';
    const g25pro = 'gemini-2.5-pro';
    const g25flash = 'gemini-2.5-flash';
    const legacy = 'gemini-1.5-flash';

    // 1. Determine preferred starting model
    const preferred = (type === 'resume-optimization' || type === 'job-matching') ? g3pro : g3flash;

    // 2. Build the fallback chain based on the preferred entry point
    const chain = preferred === g3pro 
      ? [g3pro, g3flash, g25pro, g25flash, legacy]
      : [g3flash, g25flash, legacy];

    // 3. Find the first model in the chain that is NOT on cooldown
    for (const model of chain) {
      if (!this.isModelOnCooldown(model)) {
        if (model !== preferred) {
          console.log(`📡 [RESILIENCE] ${preferred} restricted, falling back to ${model}`);
        }
        return model;
      }
    }

    return preferred; // Final default
  }

  private isModelOnCooldown(model: string): boolean {
    const cooldown = this.modelCooldowns.get(model);
    if (!cooldown) return false;
    if (Date.now() > cooldown) {
      this.modelCooldowns.delete(model);
      return false;
    }
    return true;
  }

  private markModelAsExhausted(model: string): void {
    console.warn(`🚨 [QUOTA] Model ${model} exhausted. Cooling down for ${this.QUOTA_COOLDOWN/1000}s`);
    this.modelCooldowns.set(model, Date.now() + this.QUOTA_COOLDOWN);
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

  async optimizeForJobPosting(resumeData: any, jobUrl: string): Promise<JobMatchingResult> {
    return this.executeWithFallback(async (provider) => {
      console.log(`🎯 Optimizing for job URL: ${jobUrl}`);
      
      const prompt = `
You are a Senior Technical Recruiter. Analyze this resume against the job posting at the provided URL.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

JOB URL: ${jobUrl}

REQUIRED EXECUTION:
1. Infer the role and requirements from the URL context and general industry knowledge for such positions.
2. Evaluate the match between the resume and the inferred job requirements.
3. Identify keyword alignment and gaps.

REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "matchScore": number (0-100),
  "keywordAlignment": ["keyword 1", "keyword 2"],
  "missingKeywords": ["missing 1", "missing 2"],
  "recommendations": ["rec 1", "rec 2"],
  "jobDetails": {
    "title": "inferred title",
    "company": "inferred company",
    "description": "brief inferred summary",
    "requirements": ["req 1", "req 2"]
  }
}

CRITICAL RULES:
- Return ONLY the JSON object.
`;

      return this.callAIProvider(provider, prompt, 'job-matching');
    }, 'job posting optimization');
  }

  async analyzeATSCompatibility(resumeData: any, jobDescription?: string): Promise<ATSAnalysisResult> {
    return this.executeWithFallback(async (provider) => {
      const prompt = `
You are a Lead ATS Integration Architect and Senior Recruitment Technical Lead. Perform a high-fidelity, critical audit of this resume for Applicant Tracking System (ATS) optimization and strategic market positioning.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

${jobDescription ? `TARGET ROLE BLUEPRINT:
${jobDescription}` : 'Note: No specific blueprint provided. Analyze for global executive standards and high-performance industry norms.'}

REQUIRED STRATEGIC AUDIT VECTORS:
1. SEMANTIC ALIGNMENT: Identify matching and missing critical success nodes (keywords).
2. PARSING INTEGRITY: Detect any elements that risk parsing failure (complex layouts, symbols).
3. ACHIEVEMENT DENSITY: Evaluate quantified impact statements and high-value technical mastery.
4. HIERARCHICAL STRUCTURE: Audit section logic and chronological authority.

Provide a comprehensive, high-fidelity audit report.

REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "score": number (0-100 - be critical),
  "keywordMatch": number (0-100),
  "formatScore": number (0-100),
  "contentScore": number (0-100),
  "recommendations": ["Strategic, actionable advice 1", "item 2"],
  "strengths": ["High-impact evidence-backed strengths"],
  "improvementAreas": ["Critical misalignments needing immediate correction"]
}

CRITICAL RULES:
- Use PLAIN TEXT ONLY. NO markdown formatting (**bold**, *italics*, etc) in strings.
- Be realistic and critical. Do NOT inflate scores.
- Return ONLY the JSON object.
`;

      return this.callAIProvider(provider, prompt, 'ats-analysis');
    }, 'ATS analysis');
  }

  async optimizeResumeComprehensively(params: EnhancedResumeOptimizationParams): Promise<any> {
    return this.executeWithFallback(async (provider) => {
      console.log('🔄 Starting comprehensive executive optimization...');
      
      const prompt = `
You are an Elite Executive Talent Architect. Your mission is to transform this professional narrative into a high-performance career asset.

CANDIDATE INPUTS:
Name: ${params.resumeData.personalInfo?.firstName} ${params.resumeData.personalInfo?.lastName}
Current Summary: ${params.resumeData.professionalSummary}
Tech Stack: ${JSON.stringify(params.resumeData.skills)}

REQUIRED EXECUTION:
Synthesize an 'Executive Abstract' (3-4 sentences) that captures institutional authority, technical mastery, and a proven track record of impact.

CRITICAL RULES:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or symbols.
- Focus on quantifiable impact and seniority.
- Return ONLY a JSON array with exactly 1 enhanced abstract string.

["The enhanced executive abstract string here"]
`;

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
      
      const prompt = `
You are a Principal Talent Branding Specialist. Synthesize exactly 3 high-impact, elite-tier professional summaries based on the candidate architecture provided.

CANDIDATE DATA:
Name: ${resumeData.personalInfo?.firstName} ${resumeData.personalInfo?.lastName}
Work Nodes: ${(resumeData.workExperience || []).map((exp: any) => `${exp.jobTitle} at ${exp.company}`).join('; ')}
Tech Stack: ${(resumeData.skills || []).map((skill: any) => skill.name || skill).join(', ')}

${jobContext ? `STRATEGIC ALIGNMENT TARGET: ${jobContext}` : ''}

REQUIRED EXECUTION:
Synthesize 3 distinct variations:
1. THE IMPACT LEADER: Focus on quantified achievements and leadership authority.
2. THE TECHNICAL ARCHITECT: Focus on technical mastery and specialized problem-solving.
3. THE STRATEGIC GENERALIST: Focus on versatile impact across business units.

CRITICAL RULES:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or symbols.
- Each summary must be exactly 3-4 powerful sentences.
- Return ONLY a JSON array with exactly 3 strings.

["Elite summary 1", "Elite summary 2", "Elite summary 3"]
`;

      const result = await this.callAIProvider(provider, prompt, 'summary-generation');
      return Array.isArray(result) ? result : [result];
    }, 'professional summary generation');
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

    // Model selection with intelligent fallback
    const selectedModel = this.getSmartModelSelection(type);

    try {
      console.log(`🔄 Calling Gemini (${selectedModel}) for ${type}...`);
      
      // Add timeout wrapper - increased to 60s for complex operations
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timeout')), 60000);
      });

      const config: any = {
        model: selectedModel,
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
      
      // ... existing text extraction logic ...
      let text = '';
      try {
        if (result.candidates && result.candidates[0]) {
          const candidate = result.candidates[0];
          if (candidate.content && candidate.content.parts) {
            text = candidate.content.parts.map(part => part.text || '').join('');
            
            if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'LENGTH') {
              console.warn(`⚠️ Response truncated due to ${candidate.finishReason}`);
              throw new Error(`AI response was truncated (${candidate.finishReason}).`);
            }
          }
        } else if (result.response && typeof result.response.text === 'function') {
          text = await result.response.text();
        } else if (result.response && result.response.text) {
          text = result.response.text;
        } else if (result.text) {
          text = result.text;
        }
      } catch (textError) {
        console.error(`❌ Error extracting text from response:`, textError);
        throw new Error(`Failed to extract text from Gemini response: ${textError.message}`);
      }
      
      if (!text) {
        throw new Error('Empty response text from Gemini API');
      }
      
      const parsed = this.parseAIResponse(text, type);
      
      // Attach resilience metadata if the response is an object
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsed._resilience = {
          model: selectedModel,
          isFallback: selectedModel !== (type === 'resume-optimization' || type === 'job-matching' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview')
        };
      }
      
      return parsed;
    } catch (error: any) {
      console.error(`❌ Gemini error for ${type} using ${selectedModel}:`, error.message);
      
      // Handle 429 Quota Exceeded errors - Trigger sophisticated fallback
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        this.markModelAsExhausted(selectedModel);
        
        // If we haven't reached the ultimate fallback yet, try one more time immediately
        if (selectedModel !== 'gemini-1.5-flash') {
          console.log('🔄 [RESILIENCE] Retrying with secondary model after quota hit...');
          return this.callGemini(prompt, type);
        }

        const quotaError = new Error('AI service quota exceeded across all available Gemini models.');
        (quotaError as any).code = 'AI_QUOTA_EXCEEDED';
        (quotaError as any).status = 429;
        throw quotaError;
      }
      
      // Handle 503 Service Unavailable - mark model as exhausted and retry
      if (error.message?.includes('503') || error.message?.includes('overloaded')) {
        this.markModelAsExhausted(selectedModel);
        if (selectedModel !== 'gemini-1.5-flash') {
          return this.callGemini(prompt, type);
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

  private cleanMarkdownFromParsedContent(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
        .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
        .replace(/^\*\s*/g, '')           // Remove leading bullet points
        .replace(/^•\s*/g, '')            // Remove bullet point symbols
        .trim();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.cleanMarkdownFromParsedContent(item));
    }
    
    if (data && typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        cleaned[key] = this.cleanMarkdownFromParsedContent(value);
      }
      return cleaned;
    }
    
    return data;
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
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting everywhere
        .replace(/\*(.*?)\*/g, '$1') // Remove *italic* formatting everywhere
        .replace(/^\*\*.*?\*\*\s*/gi, '') // Legacy: **Bold text** at start
        .replace(/^\d+\.\s*/gm, '') // Numbered list items
        .replace(/^[-•]\s*/gm, '') // Bullet points
        .trim();
      
      // DON'T remove valid JSON arrays that start with ["
      
      console.log(`🧹 [${type}] After cleaning (${cleanedText.length} chars):`, cleanedText.substring(0, 200));
      
      // PRIORITY: Try parsing cleaned text directly first (for perfect JSON responses)
      try {
        const directParsed = JSON.parse(cleanedText);
        console.log(`✅ [${type}] Direct parse succeeded!`);
        return this.cleanMarkdownFromParsedContent(directParsed);
      } catch (e) {
        console.log(`❌ [${type}] Direct parse failed:`, e.message);
      }
      
      // ENHANCED JSON EXTRACTION - multiple strategies
      let extractedJson = null;
      
      // Strategy 1: Look for complete JSON object/array with proper nesting support
      const jsonPattern = /(\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}|\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\])/;
      const match = cleanedText.match(jsonPattern);
      
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
          return this.cleanMarkdownFromParsedContent(parsed);
        } catch (parseError) {
          console.warn(`❌ [${type}] JSON parse failed:`, parseError.message);
        }
      }
      
      // Strategy 3: Try parsing the entire cleaned text
      try {
        const parsed = JSON.parse(cleanedText);
        console.log(`✅ [${type}] Direct parse succeeded!`);
        return this.cleanMarkdownFromParsedContent(parsed);
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