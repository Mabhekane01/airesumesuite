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
      // Let AI handle the URL directly
      console.log('🤖 Sending job URL directly to AI for analysis:', url);
      const analysis = await this.aiAnalyzeJobFromUrl(url);
      
      // Cache the result for 24 hours
      try {
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(analysis));
      } catch (cacheError) {
        console.warn('Failed to cache job analysis:', cacheError);
      }

      return analysis;
    } catch (error) {
      console.error('Error in AI job analysis:', error);
      throw new Error(`Failed to analyze job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async aiAnalyzeJobFromUrl(url: string): Promise<JobAnalysisResult> {
    const prompt = `
You are an expert AI job posting analyzer with comprehensive web access capabilities. Your task is to thoroughly analyze a job posting URL and extract detailed, accurate information.

🎯 JOB POSTING URL TO ANALYZE:
${url}

📋 ANALYSIS REQUIREMENTS:
1. Visit the URL and carefully read the entire job posting
2. Extract comprehensive information about the role, company, and requirements
3. Provide detailed, specific information rather than generic statements
4. Ensure all arrays contain at least 5-8 items when information is available
5. Write a comprehensive job description (3-4 detailed paragraphs)

🔍 REQUIRED OUTPUT FORMAT (VALID JSON ONLY):
{
  "jobTitle": "exact job title from the posting",
  "companyName": "full company name",
  "location": "complete location (city, state, country) or Remote",
  "jobDescription": "Comprehensive 3-4 paragraph description covering: role overview, main responsibilities, team context, growth opportunities, and impact of the role. Make this detailed and compelling.",
  "requirements": [
    "Education: specific degree requirements",
    "Experience: X years in relevant field",
    "Technical requirement 3",
    "Technical requirement 4",
    "Certification or qualification 5",
    "Professional skill 6",
    "Industry experience 7",
    "Additional requirement 8"
  ],
  "responsibilities": [
    "Primary daily responsibility 1",
    "Key project responsibility 2", 
    "Collaboration responsibility 3",
    "Technical delivery responsibility 4",
    "Leadership or mentoring responsibility 5",
    "Process improvement responsibility 6",
    "Client or stakeholder interaction 7",
    "Innovation or research responsibility 8"
  ],
  "skills": [
    "Programming language 1",
    "Programming language 2",
    "Framework or library 3",
    "Database technology 4",
    "Cloud platform 5",
    "Development tool 6",
    "Soft skill 7",
    "Technical methodology 8"
  ],
  "experienceLevel": "entry-level|mid-level|senior-level|executive|lead",
  "employmentType": "full-time|part-time|contract|remote|hybrid|on-site",
  "salary": "specific salary range or compensation details if mentioned",
  "benefits": [
    "Health insurance details",
    "Retirement benefits",
    "Paid time off policy",
    "Professional development",
    "Flexible working arrangements",
    "Stock options or equity",
    "Additional perks",
    "Wellness programs"
  ],
  "companyInfo": {
    "industry": "specific industry sector",
    "size": "startup|small (50-200)|medium (200-1000)|large (1000-5000)|enterprise (5000+)",
    "description": "Detailed 2-3 sentence company description including what they do, their mission, and market position"
  },
  "applicationInstructions": "specific instructions on how to apply",
  "postedDate": "posting date if available",
  "applicationDeadline": "application deadline if mentioned",
  "confidence": 90
}

🚨 CRITICAL INSTRUCTIONS:
- Extract REAL, SPECIFIC information from the actual job posting
- Make the jobDescription compelling and detailed (minimum 200 words)
- Provide 6-10 items for requirements, responsibilities, and skills arrays
- Use specific technical terms and tools mentioned in the posting
- If salary/benefits aren't mentioned, use empty string or empty array
- Confidence should reflect completeness: 90+ for complete info, 70-89 for mostly complete, 50-69 for partial
- Return ONLY the JSON object, no markdown formatting or explanations
- Ensure all text is professional and properly formatted

ANALYZE THE JOB POSTING NOW:
`;

    try {
      const response = await geminiService.generateText(prompt);
      
      // Clean up the response to ensure it's valid JSON
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/```$/, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      const analysis = JSON.parse(cleanedResponse);
      
      // Validate and set default confidence
      if (!analysis.confidence || analysis.confidence < 1) {
        analysis.confidence = 75; // Default confidence if not provided
      }
      
      console.log(`✅ AI successfully analyzed job URL with ${analysis.confidence}% confidence`);
      return analysis;
      
    } catch (error) {
      console.error('AI job URL analysis failed:', error);
      throw new Error(`AI failed to analyze job URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


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