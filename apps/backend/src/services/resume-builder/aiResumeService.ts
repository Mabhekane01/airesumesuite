import { enterpriseAIService, ATSAnalysisResult as EnterpriseATSResult } from '../ai/enterpriseAIService';
import { geminiService } from '../ai/gemini';
import { Resume } from '../../models/Resume';
import mongoose from 'mongoose';

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
}

export interface ResumeImprovementResult {
  originalResume: any;
  improvedResume: any;
  improvements: string[];
  atsAnalysis?: ATSAnalysisResult;
  summary?: string;
}

export class AIResumeService {
  async generateProfessionalSummary(resumeData: any): Promise<string> {
    try {
      const summaries = await enterpriseAIService.generateProfessionalSummary(resumeData);
      const summary = summaries[0]; // Return the first generated summary
      
      // Update the resume in database if it has an ID
      if (resumeData.id) {
        await Resume.findByIdAndUpdate(resumeData.id, {
          professionalSummary: summary,
          'aiGenerated.summary': true,
          'aiGenerated.lastEnhanced': new Date()
        });
      }
      
      return summary;
    } catch (error) {
      console.error('Error generating professional summary:', error);
      throw new Error('Failed to generate professional summary');
    }
  }

  async generateMultipleSummaryOptions(resumeData: any): Promise<string[]> {
    try {
      const summaries = await enterpriseAIService.generateProfessionalSummary(resumeData);
      return summaries;
    } catch (error) {
      console.error('Error generating multiple professional summaries:', error);
      throw new Error('Failed to generate professional summary options');
    }
  }

  async analyzeATSCompatibility(
    resumeData: any, 
    jobDescription?: string
  ): Promise<ATSAnalysisResult> {
    try {
      const analysis = await enterpriseAIService.analyzeATSCompatibility(resumeData, jobDescription);
      
      // Update the resume in database if it has an ID
      if (resumeData.id) {
        await Resume.findByIdAndUpdate(resumeData.id, {
          'aiGenerated.atsScore': analysis.score,
          'aiGenerated.improvements': analysis.recommendations,
          'aiGenerated.lastAnalyzed': new Date()
        });
      }
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing ATS compatibility:', error);
      throw new Error('Failed to analyze ATS compatibility');
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
  ): Promise<ResumeImprovementResult> {
    try {
      // Use enterprise AI service for job-specific optimization
      const optimizedResume = await enterpriseAIService.optimizeResumeComprehensively({
        resumeData,
        jobDescription: jobOptions.jobDescription,
        jobTitle: jobOptions.jobTitle,
        companyName: jobOptions.companyName,
        jobUrl: jobOptions.jobUrl,
        optimizationType: 'job-specific'
      });

      // Analyze ATS compatibility with job context
      const atsAnalysis = await this.analyzeATSCompatibility(
        optimizedResume, 
        jobOptions.jobDescription
      );

      // Update the resume in database if it has an ID
      if (resumeData.id) {
        await Resume.findByIdAndUpdate(resumeData.id, {
          ...optimizedResume,
          'aiGenerated.lastOptimized': new Date(),
          'aiGenerated.optimizedFor': `${jobOptions.jobTitle || 'Position'} at ${jobOptions.companyName || 'Company'}`,
          'aiGenerated.atsScore': atsAnalysis.score,
          'aiGenerated.improvements': atsAnalysis.recommendations
        });
      }

      return {
        originalResume: resumeData,
        improvedResume: optimizedResume,
        improvements: [
          'Optimized professional summary for job alignment',
          'Enhanced work experience descriptions with relevant keywords',
          'Prioritized skills based on job requirements',
          'Improved achievement statements with quantifiable results',
          'Optimized for ATS compatibility',
          'Aligned content with job posting requirements'
        ],
        atsAnalysis,
        summary: optimizedResume.professionalSummary
      };
    } catch (error) {
      console.error('Error optimizing resume for job:', error);
      throw new Error('Failed to optimize resume for job posting');
    }
  }

  async optimizeResumeWithJobUrl(resumeData: any, jobUrl: string): Promise<ResumeImprovementResult> {
    try {
      // Get job matching analysis
      const jobAnalysis = await enterpriseAIService.optimizeForJobPosting(resumeData, jobUrl);
      
      // Optimize resume based on job analysis
      const optimizedResume = await enterpriseAIService.optimizeResumeComprehensively({
        resumeData,
        jobUrl,
        optimizationType: 'job-specific'
      });

      // Analyze ATS compatibility
      const atsAnalysis = await this.analyzeATSCompatibility(
        optimizedResume, 
        jobAnalysis.jobDetails.description
      );

      return {
        originalResume: resumeData,
        improvedResume: optimizedResume,
        improvements: [
          ...jobAnalysis.recommendations,
          'Optimized for ATS compatibility',
          'Enhanced keyword alignment',
          'Improved job posting match score'
        ],
        atsAnalysis,
        summary: optimizedResume.professionalSummary
      };
    } catch (error) {
      console.error('Error optimizing resume with job URL:', error);
      throw new Error('Failed to optimize resume using job URL');
    }
  }

  async enhanceResumeComprehensively(
    resumeData: any,
    options: AIResumeEnhancementOptions = {}
  ): Promise<ResumeImprovementResult> {
    try {
      // Use enterprise AI service for comprehensive enhancement
      const improvedResume = await enterpriseAIService.optimizeResumeComprehensively({
        resumeData,
        jobDescription: options.optimizeForJob?.jobDescription,
        jobTitle: options.optimizeForJob?.jobTitle,
        companyName: options.optimizeForJob?.companyName,
        jobUrl: options.optimizeForJob?.jobUrl,
        optimizationType: 'comprehensive'
      });

      const improvements: string[] = [
        'Applied comprehensive AI enhancement',
        'Optimized professional summary and content',
        'Enhanced achievement statements with quantifiable results',
        'Improved keyword density and ATS compatibility',
        'Strengthened action verbs and impact language',
        'Optimized formatting and structure'
      ];

      // Generate multiple summary options if requested
      if (options.generateSummary) {
        const summaries = await this.generateMultipleSummaryOptions(improvedResume);
        improvedResume.professionalSummary = summaries[0]; // Use the first summary
        improvements.push('Generated multiple AI-powered professional summary options');
      }

      // Analyze ATS compatibility
      let atsAnalysis: ATSAnalysisResult | undefined;
      if (options.improveATS !== false) { // Default to true for comprehensive enhancement
        atsAnalysis = await this.analyzeATSCompatibility(
          improvedResume,
          options.optimizeForJob?.jobDescription
        );
        improvements.push('Analyzed and optimized ATS compatibility');
      }

      // Update the resume in database if it has an ID
      if (resumeData.id) {
        await Resume.findByIdAndUpdate(resumeData.id, {
          ...improvedResume,
          'aiGenerated.lastEnhanced': new Date(),
          'aiGenerated.comprehensivelyEnhanced': true,
          'aiGenerated.atsScore': atsAnalysis?.score,
          'aiGenerated.improvements': atsAnalysis?.recommendations
        });
      }

      return {
        originalResume: resumeData,
        improvedResume,
        improvements,
        atsAnalysis,
        summary: improvedResume.professionalSummary
      };
    } catch (error) {
      console.error('Error enhancing resume comprehensively:', error);
      throw new Error('Failed to enhance resume');
    }
  }

  async analyzeJobFromUrl(jobUrl: string): Promise<{
    jobDetails: any;
    matchAnalysis: any;
    recommendations: string[];
  }> {
    try {
      console.log(`🔍 Analyzing job from URL: ${jobUrl}`);
      
      // Get job details using enterprise AI service
      const jobDetails = await enterpriseAIService.analyzeJobFromUrl(jobUrl);
      
      return {
        jobDetails,
        matchAnalysis: {
          title: jobDetails.title,
          company: jobDetails.company,
          description: jobDetails.description,
          requirements: jobDetails.requirements
        },
        recommendations: [
          'Job posting successfully analyzed',
          'Use the optimize function to align your resume with this job',
          'Review the job requirements and update your skills accordingly'
        ]
      };
    } catch (error) {
      console.error('Error analyzing job from URL:', error);
      throw new Error('Failed to analyze job posting from URL. Please ensure the URL is accessible.');
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

      const result = await geminiService.model?.generateContent(prompt);
      if (!result) {
        throw new Error('AI service not available');
      }
      
      const response = await result.response;
      const text = response.text();
      
      const alignment = JSON.parse(text);
      return alignment;
    } catch (error) {
      console.error('Error analyzing job alignment:', error);
      throw new Error('Failed to analyze job alignment');
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

Base priority on how much these sections would improve the resume's competitiveness.

Respond only with the JSON data, no additional text.
`;

      const result = await geminiService.model?.generateContent(prompt);
      if (!result) {
        throw new Error('AI service not available');
      }
      
      const response = await result.response;
      const text = response.text();
      
      const suggestions = JSON.parse(text);
      return suggestions;
    } catch (error) {
      console.error('Error suggesting missing sections:', error);
      throw new Error('Failed to suggest missing sections');
    }
  }
}

export const aiResumeService = new AIResumeService();