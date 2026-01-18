import { enterpriseAIService, ATSAnalysisResult as EnterpriseATSResult } from '../ai/enterpriseAIService';
import { geminiService } from '../ai/gemini';
import { Resume } from '../../models/Resume';
import mongoose from 'mongoose';
import { aiLatexGenerator } from './aiLatexGenerator';
import { templateService } from './templateService';
import { standardizedJobOptimizationService } from '../standardizedJobOptimizationService';
import { overleafTemplateManager } from './overleafTemplateManager';

export interface AIResumeEnhancementOptions {
  generateSummary?: boolean;
  optimizeForJob?: {
    jobUrl?: string;
    jobDescription?: string;
    jobTitle?: string;
    companyName?: string;
  };
  improveATS?: boolean;
  enhanceAchievements?: boolean;
}

export interface ATSAnalysisResult {
  score: number;
  recommendations: string[];
  keywordMatch: number;
  formatScore: number;
  contentScore: number;
  improvementAreas?: string[];
  strengths?: string[];
  aiStatus?: string;
}

export interface ResumeImprovementResult {
  originalResume: any;
  improvedResume: any;
  enhancedResume?: any;
  improvements: string[];
  atsAnalysis?: ATSAnalysisResult;
  summary?: string;
  // LaTeX-related properties
  optimizedLatexCode?: string;
  templateUsed?: string;
  // PDF generation properties  
  pdfGenerationError?: string;
  // Job optimization properties
  jobScrapingSuccess?: boolean;
  scrapedJobDetails?: any;
  // AI status
  aiStatus?: string;
  // Generation metadata
  generationMethod?: string;
  // Additional recommendations
  recommendations?: string[];
  // ATS Score
  atsScore?: number;
  // Job Match Analysis
  jobMatchAnalysis?: any;
}

export class AIResumeService {
  async generateProfessionalSummary(resumeData: any): Promise<string> {
    try {
      const summaries = await enterpriseAIService.generateProfessionalSummary(resumeData);
      const summary = summaries[0]; // Return the first generated summary
      
      // Update the resume in database if it has an ID
      const resumeId = resumeData.id || resumeData._id;
      if (resumeId) {
        await Resume.findByIdAndUpdate(resumeId, {
          professionalSummary: summary,
          'aiGenerated.summary': true,
          'aiGenerated.lastEnhanced': new Date()
        });
      }
      
      return summary;
    } catch (error) {
      console.error('❌ Error generating professional summary:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      
      if (error?.code) {
        console.error('❌ Error code:', error.code);
      }
      
      if (error?.response) {
        console.error('❌ Error response:', error.response);
      }
      
      throw new Error(`AI service failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async analyzeATSCompatibility(
    resumeData: any, 
    jobDescription?: string
  ): Promise<ATSAnalysisResult & { aiStatus?: string }> {
    try {
      console.log('🤖 PRIORITY: Starting AI-powered ATS compatibility analysis...');
      
      console.log('🛡️ AI: Analyzing ATS compatibility...');
      const analysis = await enterpriseAIService.analyzeATSCompatibility(resumeData, jobDescription);
      console.log('✅ AI: ATS analysis completed successfully');
      
      // Update the resume in database if it has an ID
      if (resumeData.id || resumeData._id) {
        try {
          await Resume.findByIdAndUpdate(resumeData.id || resumeData._id, {
            'aiGenerated.atsScore': analysis.score,
            'aiGenerated.improvements': analysis.recommendations,
            'aiGenerated.lastAnalyzed': new Date()
          });
        } catch (dbError) {
          console.warn('⚠️ Database update failed:', dbError);
        }
      }
      return analysis;
    } catch (error) {
      console.error('❌ CRITICAL: ATS analysis failure:', error);
      throw error;
    }
  }

  async optimizeResumeForJob(
    resumeData: any,
    jobOptions: {
      jobUrl?: string;
      jobDescription?: string;
      jobTitle?: string;
      companyName?: string;
    }
  ): Promise<ResumeImprovementResult & { aiStatus?: string }> {
    try {
      console.log('🤖 PRIORITY: Using AI-powered job optimization...');
      
      // Create job context for AI
      const jobContext = `Job Title: ${jobOptions.jobTitle || 'Position'}, Company: ${jobOptions.companyName || 'Company'}, Description: ${jobOptions.jobDescription || 'No description provided'}`;
      
      // PRIORITY 1: AI-powered professional summary
      console.log('?? AI: Generating enhanced professional summary...');
      const summaries = await enterpriseAIService.generateProfessionalSummary(workingResumeData);
      const enhancedSummary = summaries[0];
      console.log('? AI: Professional summary generated successfully');

// PRIORITY 1: AI comprehensive optimization
      console.log('?? AI: Performing comprehensive resume optimization...');
      const improvedResume = await enterpriseAIService.optimizeResumeComprehensively({
        resumeData: {
          ...workingResumeData,
          professionalSummary: enhancedSummary
        },
        optimizationType: 'comprehensive'
      });
      console.log('? AI: Comprehensive optimization completed successfully');

// PRIORITY 1: AI-powered quality and change analysis
      console.log('?? AI: Analyzing quality improvements and changes...');
      const [qualityAnalysis, actualChanges] = await Promise.all([
        this.getAIQualityAssessment(workingResumeData, improvedResume),
        this.getAIChangeAnalysis(workingResumeData, improvedResume)
      ]);
      console.log('? AI: Quality and change analysis completed successfully');

// PRIORITY 1: AI enterprise-level analysis
      let industryAlignment, benchmarking, atsAnalysis;

      if (options.includeIndustryAnalysis) {
        console.log('?? AI: Analyzing industry alignment...');
        industryAlignment = await this.getAIIndustryAlignment(improvedResume);
        console.log('? AI: Industry alignment analysis completed');
      }

      if (options.includeCompetitorBenchmarking) {
        console.log('?? AI: Performing competitor benchmarking...');
        benchmarking = await this.getAIBenchmarkingData(improvedResume);
        console.log('? AI: Competitor benchmarking completed');
      }

      if (options.includeATSAnalysis) {
        console.log('??? AI: Analyzing ATS compatibility...');
        atsAnalysis = await this.analyzeATSCompatibility(improvedResume);
        console.log('? AI: ATS analysis completed');
      }

const result: any = {
        originalResume: resumeData,
        improvedResume: improvedResume,
        enhancedResume: improvedResume,
        improvements: actualChanges,
        qualityScore: qualityAnalysis,
        industryAlignment,
        benchmarking,
        atsAnalysis,
        aiStatus: undefined
      };

      // NEW: Add LaTeX-specific recommendations if applicable
      return result;
    } catch (error) {
      console.error('❌ CRITICAL: Comprehensive enhancement failure:', error);
      throw error;
    }
  }

  async applySpecificImprovements(resumeData: any, improvementIds: string[]): Promise<{
    enhancedResume: any;
    appliedImprovements: string[];
  }> {
    try {
      throw new Error('AI-specific improvements require the AI enhancement pipeline.');
    } catch (error) {
      throw error;
    }
  }

  async getJobMatchingScore(resumeData: any, jobUrl: string): Promise<{
    matchScore: number;
    keywordAlignment: string[];
    missingKeywords: string[];
    recommendations: string[];
    jobDetails: any;
  }> {
    try {
      console.log(`🎯 Getting job matching score for URL: ${jobUrl}`);
      
      // Use enterprise AI service for job matching
      const matchingResult = await enterpriseAIService.optimizeForJobPosting(resumeData, jobUrl);
      
      return matchingResult;
    } catch (error) {
      console.error('Error getting job matching score:', error);
      throw new Error('Failed to analyze job matching. Please ensure the job URL is accessible.');
    }
  }

  private async enhanceAchievements(resumeData: any): Promise<any> {
    try {
      // Use enterprise AI service for achievement enhancement
      const enhancedResume = await enterpriseAIService.optimizeResumeComprehensively({
        resumeData,
        optimizationType: 'content' // Focus on content improvement
      });
      
      return enhancedResume;
    } catch (error) {
      console.error('Error enhancing achievements:', error);
      return resumeData; // Return original if enhancement fails
    }
  }

  async getJobAlignmentScore(resumeData: any, jobDescription: string): Promise<{
    score: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    isGoodMatch: boolean;
  }> {
    try {
      console.log('🤖 DEBUG: Starting job alignment analysis...');
      console.log('📊 DEBUG: Resume data provided:', !!resumeData);
      console.log('📄 DEBUG: Job description length:', jobDescription?.length || 0);
      
      // Check if geminiService is available
      console.log('🔍 DEBUG: Checking geminiService availability...');
      console.log('🔍 DEBUG: geminiService exists:', !!geminiService);
      console.log('🔍 DEBUG: geminiService.client exists:', !!geminiService?.client);
      
      if (!geminiService) {
        console.error('❌ DEBUG: geminiService is not initialized');
        throw new Error('Gemini service not initialized');
      }
      
      if (!geminiService.client) {
        console.error('❌ DEBUG: geminiService.client is not available');
        throw new Error('Gemini model not available');
      }

      const prompt = `
You are an expert recruiter and career counselor. Analyze how well this resume aligns with the job description and provide a detailed assessment.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Job Description:
${jobDescription}

Analyze the alignment and provide a score (0-100) along with detailed feedback.

Consider:
1. Skills match (technical and soft skills)
2. Experience relevance and level
3. Education requirements
4. Industry experience
5. Career progression alignment
6. Cultural fit indicators

CRITICAL: DO NOT use markdown formatting like **bold** or *italics* in your response. All text in strings must be plain text only.

Return a JSON object with this structure:
{
  "score": number (0-100),
  "strengths": ["strength 1", "strength 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "isGoodMatch": boolean (true if score >= 70)
}

Be honest and constructive in your assessment.

Respond only with the JSON data, no additional text.
`;

      console.log('📝 DEBUG: Prompt created, length:', prompt.length);
      console.log('🚀 DEBUG: Calling geminiService.client.generateContent...');
      
      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      console.log('✅ DEBUG: generateContent completed');
      console.log('📦 DEBUG: Result exists:', !!result);
      
      if (!result) {
        console.error('❌ DEBUG: No result returned from generateContent');
        throw new Error('AI service returned no result');
      }
      
      console.log('📖 DEBUG: Getting text from result...');
      const text = result?.text || '';
      console.log('📝 DEBUG: Text received, length:', text?.length || 0);
      console.log('📝 DEBUG: Raw AI response:', text);
      
      console.log('🔄 DEBUG: Parsing JSON response...');
      // Remove markdown code block formatting if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const alignment = JSON.parse(cleanText);
      console.log('✅ DEBUG: JSON parsed successfully:', alignment);
      
      return alignment;
    } catch (error) {
      console.error('❌ DEBUG: Error analyzing job alignment:', error);
      console.error('❌ DEBUG: Error type:', typeof error);
      console.error('❌ DEBUG: Error constructor:', error?.constructor?.name);
      console.error('❌ DEBUG: Error message:', error?.message);
      console.error('❌ DEBUG: Error stack:', error?.stack);
      
      if (error?.code) {
        console.error('❌ DEBUG: Error code:', error.code);
      }
      
      if (error?.response) {
        console.error('❌ DEBUG: Error response:', error.response);
      }
      
      if (error?.details) {
        console.error('❌ DEBUG: Error details:', error.details);
      }
      
      throw error;
    }
  }

  async suggestMissingSections(resumeData: any): Promise<{
    missingSections: string[];
    suggestions: { [key: string]: string };
    priority: 'high' | 'medium' | 'low';
  }> {
    try {
      const prompt = `
You are a resume expert. Analyze this resume and suggest missing sections that could strengthen it.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Consider the candidate's level and industry to suggest relevant sections they might be missing:

Common sections to consider:
- Volunteer Experience
- Awards & Honors
- Publications
- Projects
- Certifications
- Languages
- Hobbies & Interests
- References
- Professional Associations
- Patents
- Speaking Engagements
- Additional Training

Return a JSON object:
{
  "missingSections": ["section name 1", "section name 2", ...],
  "suggestions": {
    "section name": "specific suggestion for this candidate"
  },
  "priority": "high|medium|low"
}

CRITICAL: DO NOT use markdown formatting like **bold** or *italics* in your response. All text in strings must be plain text only.

Base priority on how much these sections would improve the resume's competitiveness.

Respond only with the JSON data, no additional text.
`;

      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      if (!result) {
        throw new Error('AI service not available');
      }
      
      const text = result?.text || '';
      
      const suggestions = JSON.parse(text);
      return suggestions;
    } catch (error) {
      console.error('Error suggesting missing sections:', error);
      throw new Error('Failed to suggest missing sections');
    }
  }

  async generateMultipleSummaryOptions(resumeData: any): Promise<string[]> {
    try {
      // Generate 3 different summary options using the enterprise AI service
      const summaries = await enterpriseAIService.generateProfessionalSummary(resumeData);
      return Array.isArray(summaries) ? summaries : [summaries];
    } catch (error) {
      console.error('Error generating multiple summary options:', error);
      throw error;
    }
  }

  // NEW AI-POWERED METHODS - PRIORITY 1
  private async getAIQualityAssessment(originalResume: any, enhancedResume: any): Promise<{
    before: number;
    after: number;
    improvement: number;
  }> {
    try {
      console.log('🤖 AI: Performing quality assessment...');
      
      const prompt = `
You are an expert resume analyst. Analyze these two versions of a resume and provide quality scores.

ORIGINAL RESUME:
${JSON.stringify(originalResume, null, 2)}

ENHANCED RESUME:
${JSON.stringify(enhancedResume, null, 2)}

Provide a JSON response with quality scores (0-100) based on:
1. Professional summary strength
2. Work experience impact
3. Skills relevance
4. Overall ATS compatibility
5. Achievement quantification
6. Professional presentation

Return ONLY this JSON format:
{
  "before": number,
  "after": number,
  "improvement": number
}`;

      // Use Gemini service directly for better reliability
      const result = await geminiService.generateText(prompt);

      // Try to parse the JSON response
      let parsedResult;
      try {
        // Clean the response first
        let cleanedResult = result.trim();
        if (cleanedResult.startsWith('```json')) {
          cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResult.startsWith('```')) {
          cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Extract JSON object
        const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          parsedResult = JSON.parse(cleanedResult);
        }
      } catch (parseError) {
        console.warn('Failed to parse AI quality assessment response:', parseError);
        throw new Error('Invalid AI response format');
      }

      // Validate the parsed result
      if (parsedResult && typeof parsedResult === 'object' && 
          typeof parsedResult.before === 'number' && 
          typeof parsedResult.after === 'number') {
        return {
          before: Math.max(0, Math.min(100, parsedResult.before)),
          after: Math.max(0, Math.min(100, parsedResult.after)),
          improvement: Math.max(0, parsedResult.after - parsedResult.before)
        };
      }
      
      throw new Error('Invalid AI response format');
    } catch (error: any) {
      console.error('AI quality assessment failed:', error);
      throw error;
    }
  }

  private async getAIChangeAnalysis(originalResume: any, enhancedResume: any): Promise<Array<{
    category: string;
    changes: string[];
    impact: 'high' | 'medium' | 'low';
  }>> {
    try {
      console.log('🤖 AI: Analyzing resume changes...');
      
      const prompt = `
You are an expert resume improvement analyst. Compare these two resume versions and identify specific changes made.

ORIGINAL RESUME:
${JSON.stringify(originalResume, null, 2)}

ENHANCED RESUME:
${JSON.stringify(enhancedResume, null, 2)}

Analyze the changes and provide specific improvements made. Focus on:
1. Professional summary enhancements
2. Work experience improvements
3. Skills optimization
4. Format and structure changes
5. ATS compatibility improvements

Return ONLY a JSON array in this format:
[
  {
    "category": "Professional Summary",
    "changes": ["specific change 1", "specific change 2"],
    "impact": "high"
  }
]

Impact levels: "high" for major improvements, "medium" for moderate changes, "low" for minor adjustments.`;

      const result = await enterpriseAIService.generateProfessionalSummary({ prompt });
      
      // Try to parse AI response
      if (Array.isArray(result) && result.length > 0) {
        return result.map(item => {
          if (typeof item === 'string') {
            return {
              category: 'AI Enhancement',
              changes: [item],
              impact: 'medium'
            };
          }
          return {
            category: (item as any).category || 'AI Enhancement',
            changes: Array.isArray((item as any).changes) ? (item as any).changes : [(item as any).changes || 'AI optimization applied'],
            impact: ['high', 'medium', 'low'].includes((item as any).impact) ? (item as any).impact : 'medium'
          };
        });
      }
      
      throw new Error('Invalid AI response format');
    } catch (error) {
      throw error;
    }
  }

  private async getAIIndustryAlignment(resumeData: any): Promise<number> {
    try {
      console.log('🤖 AI: Analyzing industry alignment...');
      
      const prompt = `
You are an industry expert and career counselor. Analyze this resume for industry alignment.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

Determine the primary industry and calculate how well this resume aligns with industry standards and expectations.

Consider:
1. Industry-specific keywords
2. Relevant skills and technologies
3. Career progression patterns
4. Professional terminology usage
5. Achievement types and metrics

Return ONLY a JSON object:
{
  "alignmentScore": number (0-100),
  "primaryIndustry": "string",
  "reasoning": "brief explanation"
}`;

      const result = await enterpriseAIService.generateProfessionalSummary({ prompt });
      
      if (result && typeof result === 'object' && !Array.isArray(result) && typeof (result as any).alignmentScore === 'number') {
        return Math.max(0, Math.min(100, (result as any).alignmentScore));
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      throw error;
    }
  }

  private async getAIBenchmarkingData(resumeData: any): Promise<{ percentile: number; improvements: string[] }> {
    try {
      console.log('🤖 AI: Performing competitive benchmarking...');
      
      const prompt = `
You are a recruitment expert with access to industry benchmarking data. Analyze this resume against industry standards.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

Compare this resume to industry benchmarks and provide:
1. Percentile ranking (0-100)
2. Specific areas for improvement
3. Competitive positioning insights

Return ONLY a JSON object:
{
  "percentile": number (0-100),
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "competitivePosition": "string"
}`;

      const result = await enterpriseAIService.generateProfessionalSummary({ prompt });
      
      if (result && typeof result === 'object' && !Array.isArray(result) && typeof (result as any).percentile === 'number' && Array.isArray((result as any).improvements)) {
        return {
          percentile: Math.max(0, Math.min(100, (result as any).percentile)),
          improvements: (result as any).improvements.slice(0, 5) // Limit to 5 improvements
        };
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      throw error;
    }
  }
}

export const aiResumeService = new AIResumeService();
