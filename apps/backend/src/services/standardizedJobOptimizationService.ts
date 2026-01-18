/**
 * Standardized Job Optimization Service
 * 
 * This service optimizes resume content for specific job postings using the
 * standardized template system and AI content enhancement.
 */

import { aiContentEnhancer, type ResumeData } from './resume-builder/aiContentEnhancer';
import { templateService } from './resume-builder/templateService';
import { geminiService } from './ai/gemini';
import { aiJobAnalyzer, JobAnalysisResult } from './ai/aiJobAnalyzer';

export interface JobOptimizationRequest {
  resumeData: ResumeData;
  jobDescription?: string; // Optional if jobUrl is provided
  jobUrl?: string;
  jobTitle?: string;
  companyName?: string;
  templateId: string;
  targetRole?: string;
  industry?: string;
  templateCode?: string;
}

export interface JobOptimizationResult {
  originalResume: ResumeData;
  optimizedResume: ResumeData;
  optimizedLatex: string;
  improvements: string[];
  keywordsAdded: string[];
  atsScore: number;
  optimizationSuggestions: OptimizationSuggestion[];
  jobMatchAnalysis: JobMatchAnalysis;
  scrapedJobDetails?: JobAnalysisResult;
}

export interface OptimizationSuggestion {
  section: 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'general';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  reasoning: string;
  impact: 'increase_match' | 'improve_ats' | 'enhance_readability' | 'boost_ranking';
  applied: boolean;
}

export interface JobMatchAnalysis {
  overallMatch: number; // 0-100
  overallScore: number; // alias for overallMatch
  skillsMatch: number;
  experienceMatch: number;
  missingSkills: string[];
  missingKeywords: string[];
  addedKeywords: string[];
  strongPoints: string[];
  recommendations: string[];
  atsCompatibility: number;
  competitiveAdvantage: string[];
  keywordAlignment: string[];
  strategicInsights: string[];
  mode?: 'ai' | 'fallback';
  confidence?: 'high' | 'medium' | 'low';
  failureReason?: string;
  providerFailures?: string[];
}

export class StandardizedJobOptimizationService {
  
  /**
   * Optimize resume for a specific job posting using standardized templates
   */
  async optimizeResumeForJob(request: JobOptimizationRequest): Promise<JobOptimizationResult> {
    console.log(`🎯 Optimizing resume for job: ${request.jobTitle || 'Unnamed Position'}`);
    
    try {
      let jobDetails: JobAnalysisResult | null = null;
      let finalJobDescription = request.jobDescription || '';

      // 1. Extract and analyze job details
      if (request.jobUrl) {
        console.log(`🔍 Scraping job details from URL: ${request.jobUrl}`);
        jobDetails = await aiJobAnalyzer.analyzeJobFromUrl(request.jobUrl);
        if (!finalJobDescription) {
          finalJobDescription = jobDetails.jobDescription;
        }
      }

      // 2. Perform deep analysis if we don't have full structured details yet
      const jobAnalysis = jobDetails ? {
        requiredSkills: jobDetails.skills,
        preferredSkills: [], // Could be further separated
        experienceLevel: jobDetails.experienceLevel,
        industries: jobDetails.companyInfo?.industry ? [jobDetails.companyInfo.industry] : [],
        responsibilities: jobDetails.responsibilities,
        qualifications: jobDetails.requirements,
        keywords: [] // Will be extracted by AI
      } : await this.analyzeJobPosting(finalJobDescription, request.jobTitle);
      
      // 3. Optimize content using AI Content Enhancer
      const contentOptimization = await aiContentEnhancer.optimizeForJob(
        request.resumeData,
        finalJobDescription,
        request.targetRole || request.jobTitle || jobDetails?.jobTitle
      );

      // 4. Generate optimized suggestions
      const optimizationSuggestions = await this.generateOptimizationSuggestions(
        request.resumeData,
        contentOptimization.enhancedContent,
        finalJobDescription,
        jobAnalysis
      );

      // 5. Generate LaTeX using template service
      const optimizedLatex = await templateService.generateLatex(
        request.templateId,
        contentOptimization.enhancedContent
      );

      // 6. Calculate job match analysis
      const jobMatchAnalysis = await this.calculateJobMatch(
        contentOptimization.enhancedContent,
        finalJobDescription,
        jobAnalysis
      );

      console.log(`✅ Resume optimization complete. ATS Score: ${contentOptimization.atsScore}%, Job Match: ${jobMatchAnalysis.overallMatch}%`);

      return {
        originalResume: request.resumeData,
        optimizedResume: contentOptimization.enhancedContent,
        optimizedLatex,
        improvements: contentOptimization.improvements,
        keywordsAdded: contentOptimization.keywordsAdded || [],
        atsScore: contentOptimization.atsScore || 0,
        optimizationSuggestions,
        jobMatchAnalysis,
        scrapedJobDetails: jobDetails || undefined
      };

    } catch (error) {
      console.error('❌ Job optimization failed:', error);
      throw new Error(`Job optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze job posting to extract requirements and keywords
   */
  private async analyzeJobPosting(
    jobDescription: string,
    jobTitle?: string
  ): Promise<{
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: string;
    industries: string[];
    responsibilities: string[];
    qualifications: string[];
    keywords: string[];
  }> {
    if (!geminiService) {
      return {
        requiredSkills: [],
        preferredSkills: [],
        experienceLevel: 'mid',
        industries: [],
        responsibilities: [],
        qualifications: [],
        keywords: [],
      };
    }

    try {
      const prompt = `Analyze this job posting and extract key information for resume optimization.

JOB TITLE: ${jobTitle || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.substring(0, 3000)}

Extract and return the following information in JSON format:
{
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1", "skill2"],
  "experienceLevel": "entry|mid|senior|executive",
  "industries": ["industry1", "industry2"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "qualifications": ["qualification1", "qualification2"],
  "keywords": ["keyword1", "keyword2"]
}

Focus on:
- Technical skills and technologies mentioned
- Years of experience required
- Industry-specific terms
- Key responsibilities and requirements
- Educational qualifications
- Certifications mentioned

Return only valid JSON:`;

      const result = await geminiService.generateText(prompt);
      
      try {
        // Clean and parse JSON response
        let cleanedText = result.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }

        return JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn('Failed to parse job analysis, using fallback');
        return {
          requiredSkills: [],
          preferredSkills: [],
          experienceLevel: 'mid',
          industries: [],
          responsibilities: [],
          qualifications: [],
          keywords: [],
        };
      }
    } catch (error) {
      console.error('Job analysis failed:', error);
      return {
        requiredSkills: [],
        preferredSkills: [],
        experienceLevel: 'mid',
        industries: [],
        responsibilities: [],
        qualifications: [],
        keywords: [],
      };
    }
  }

  /**
   * Generate optimization suggestions comparing original and optimized content
   */
  private async generateOptimizationSuggestions(
    originalResume: ResumeData,
    optimizedResume: ResumeData,
    jobDescription: string,
    jobAnalysis: any
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Professional Summary suggestions
    if (originalResume.professionalSummary !== optimizedResume.professionalSummary) {
      suggestions.push({
        section: 'summary',
        priority: 'high',
        suggestion: 'Enhanced professional summary with job-relevant keywords and quantifiable achievements',
        reasoning: 'AI optimization improved summary to better match job requirements and include industry keywords',
        impact: 'increase_match',
        applied: true,
      });
    }

    // Work Experience suggestions
    if (JSON.stringify(originalResume.workExperience) !== JSON.stringify(optimizedResume.workExperience)) {
      suggestions.push({
        section: 'experience',
        priority: 'high',
        suggestion: 'Optimized work experience bullet points with stronger action verbs and quantified results',
        reasoning: 'Enhanced achievements to better align with job requirements and demonstrate impact',
        impact: 'boost_ranking',
        applied: true,
      });
    }

    // Skills matching suggestions
    const jobSkills = [...(jobAnalysis.requiredSkills || []), ...(jobAnalysis.preferredSkills || [])];
    const resumeSkills = optimizedResume.skills?.map(s => s.name.toLowerCase()) || [];
    const missingSkills = jobSkills.filter(skill => 
      !resumeSkills.some(resumeSkill => resumeSkill.includes(skill.toLowerCase()))
    );

    if (missingSkills.length > 0) {
      suggestions.push({
        section: 'skills',
        priority: 'medium',
        suggestion: `Consider adding these relevant skills: ${missingSkills.slice(0, 5).join(', ')}`,
        reasoning: 'These skills are mentioned in the job posting but not prominently featured in your resume',
        impact: 'improve_ats',
        applied: false,
      });
    }

    // Projects optimization
    if (JSON.stringify(originalResume.projects) !== JSON.stringify(optimizedResume.projects)) {
      suggestions.push({
        section: 'projects',
        priority: 'medium',
        suggestion: 'Enhanced project descriptions to highlight relevant technologies and outcomes',
        reasoning: 'Project descriptions were optimized to better showcase skills relevant to the target role',
        impact: 'increase_match',
        applied: true,
      });
    }

    // ATS optimization suggestions
    suggestions.push({
      section: 'general',
      priority: 'high',
      suggestion: 'Applied ATS optimization techniques including keyword integration and formatting improvements',
      reasoning: 'Standardized template ensures ATS compatibility while AI enhancement adds relevant keywords',
      impact: 'improve_ats',
      applied: true,
    });

    return suggestions;
  }

  /**
   * Calculate how well the resume matches the job posting
   */
  private async calculateJobMatch(
    resumeData: ResumeData,
    jobDescription: string,
    jobAnalysis: any
  ): Promise<JobMatchAnalysis> {
    // First, assess resume content quality to prevent inflated scores
    const contentQuality = this.assessResumeContentQuality(resumeData);
    
    // Use AI to analyze how well the resume matches the job with strict scoring criteria
    const aiMatchPrompt = `You are a professional resume evaluator. Analyze this resume against job requirements with STRICT STANDARDS.

IMPORTANT SCORING GUIDELINES:
- Minimal content = LOW scores (10-30%)
- Missing experience = MAJOR penalty
- Generic content = PENALTY
- Strong content + perfect match = High scores (70-90%)
- Be harsh but fair - this is for production use

RESUME CONTENT:
${JSON.stringify(resumeData, null, 2)}

JOB REQUIREMENTS:
${jobDescription}

REQUIRED SKILLS: ${(jobAnalysis.requiredSkills || []).join(', ')}
EXPERIENCE LEVEL: ${jobAnalysis.experienceLevel || 'Not specified'}

CONTENT QUALITY ASSESSMENT:
- Work Experience Entries: ${resumeData.workExperience?.length || 0}
- Skills Listed: ${resumeData.skills?.length || 0}  
- Education Entries: ${resumeData.education?.length || 0}
- Total Responsibility/Achievement Items: ${this.countContentItems(resumeData)}

EVALUATE STRICTLY:
1. If content is minimal (few experiences, generic descriptions) = LOW scores
2. If skills don't match job requirements = PENALTY
3. If experience level is insufficient = MAJOR penalty
4. If resume looks incomplete/template-like = VERY LOW scores

Return ONLY valid JSON (no text before/after):
{
  "overallMatch": [SCORE 0-100 - BE STRICT],
  "skillsMatch": [SCORE 0-100 - COUNT ACTUAL SKILL MATCHES],
  "experienceMatch": [SCORE 0-100 - ASSESS REAL EXPERIENCE RELEVANCE],
  "matchingSkills": ["only skills that ACTUALLY match"],
  "missingSkills": ["critical skills the resume lacks"],
  "strongPoints": ["genuine strengths found"],
  "improvements": ["specific improvements needed"],
  "keywordAlignment": ["keywords that align"],
  "atsCompatibility": [SCORE 0-100 - BASED ON REAL CONTENT]
}`;

    try {
      const aiResult = await geminiService.generateText(aiMatchPrompt);
      console.log('🔍 AI job match raw response:', aiResult.substring(0, 200) + '...');
      
      // More robust JSON extraction and parsing
      let cleanedText = aiResult.trim();
      
      // Remove markdown code blocks
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
      }

      // Find JSON object more carefully
      const jsonMatch = cleanedText.match(/\{[\s\S]*?\}(?=\s*$)/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      } else {
        // If no complete JSON found, try to extract from first { to last }
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
        }
      }

      console.log('🔍 Cleaned JSON for parsing:', cleanedText.substring(0, 200));
      console.log('🔍 Full response length:', aiResult.length, 'Cleaned length:', cleanedText.length);
      
      let aiAnalysis;
      try {
        aiAnalysis = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('JSON parse failed, attempting to fix common issues:', parseError.message);
        console.error('Failing text:', cleanedText);
        
        // Try to fix common JSON issues and handle incomplete responses
        let fixedJson = cleanedText
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/[\n\r\t]/g, ' ')  // Replace newlines with spaces
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();
        
        // If JSON is incomplete (doesn't end with }), try to complete it
        if (!fixedJson.endsWith('}') && fixedJson.includes('{')) {
          console.log('🔧 Attempting to complete incomplete JSON...');
          // Count open braces vs close braces
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          if (missingBraces > 0) {
            // Remove trailing comma if exists and add missing braces
            fixedJson = fixedJson.replace(/,\s*$/, '') + '}'.repeat(missingBraces);
          }
        }
        
        console.log('🔧 Fixed JSON:', fixedJson);
        
        try {
          aiAnalysis = JSON.parse(fixedJson);
        } catch (secondParseError) {
          console.error('Second JSON parse also failed:', secondParseError.message);
          throw secondParseError; // This will trigger fallback
        }
      }

      // Apply quality-based score capping to prevent inflated scores
      const qualityMultiplier = Math.min(1, contentQuality.score / 70); // Cap based on content quality
      const cappedOverallMatch = Math.round((aiAnalysis.overallMatch || 0) * qualityMultiplier);
      const cappedSkillsMatch = Math.round((aiAnalysis.skillsMatch || 0) * qualityMultiplier);
      const cappedExperienceMatch = Math.round((aiAnalysis.experienceMatch || 0) * qualityMultiplier);
      const cappedAtsCompatibility = Math.round((aiAnalysis.atsCompatibility || 85) * qualityMultiplier);

      console.log(`🎯 Content quality: ${contentQuality.score}%, multiplier: ${qualityMultiplier.toFixed(2)}`);
      console.log(`🎯 Score adjustments - Overall: ${aiAnalysis.overallMatch} → ${cappedOverallMatch}, Skills: ${aiAnalysis.skillsMatch} → ${cappedSkillsMatch}`);
      
      if (contentQuality.issues.length > 0) {
        console.log(`⚠️ Content quality issues: ${contentQuality.issues.join(', ')}`);
      }

      // Deep clean all strings in the analysis
      const clean = (val: any): any => {
        if (typeof val === 'string') return val.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
        if (Array.isArray(val)) return val.map(clean);
        if (val && typeof val === 'object') {
          const res: any = {};
          for (const k in val) res[k] = clean(val[k]);
          return res;
        }
        return val;
      };

      const cleanedAnalysis = clean(aiAnalysis);

      return {
        overallMatch: cappedOverallMatch,
        overallScore: cappedOverallMatch, // alias for overallMatch
        skillsMatch: cappedSkillsMatch,
        experienceMatch: cappedExperienceMatch,
        missingSkills: cleanedAnalysis.missingSkills || [],
        missingKeywords: cleanedAnalysis.missingSkills || [],
        addedKeywords: cleanedAnalysis.keywordAlignment || [],
        strongPoints: cleanedAnalysis.strongPoints || [],
        recommendations: [
          ...(cleanedAnalysis.improvements || []),
          ...contentQuality.issues.map(issue => `Improve: ${issue}`)
        ],
        atsCompatibility: cappedAtsCompatibility,
        competitiveAdvantage: cleanedAnalysis.strongPoints || [],
        keywordAlignment: cleanedAnalysis.keywordAlignment || [],
        strategicInsights: cleanedAnalysis.strategicInsights || cleanedAnalysis.improvements || cleanedAnalysis.recommendations || [],
        mode: 'ai',
        confidence: contentQuality.score >= 70 ? 'high' : 'medium'
      };

    } catch (error) {
      console.error('AI job matching failed, using quality-based fallback analysis:', error);
      
      const failureMessage = error instanceof Error ? error.message : String(error);
      const failureLower = failureMessage.toLowerCase();
      const providerFailures: string[] = [];
      let failureReason = 'ai_unavailable';

      if (
        failureLower.includes('quota') ||
        failureLower.includes('resource_exhausted') ||
        failureLower.includes('ai_quota_exceeded')
      ) {
        failureReason = 'ai_quota';
        providerFailures.push('gemini_quota');
      } else if (
        failureLower.includes('invalid api key') ||
        failureLower.includes('invalid x-api-key') ||
        failureLower.includes('authentication')
      ) {
        failureReason = 'ai_invalid_key';
        providerFailures.push('gemini_invalid_key');
      } else if (failureLower.includes('rate limit') || failureLower.includes('429')) {
        failureReason = 'ai_rate_limit';
        providerFailures.push('gemini_rate_limit');
      }

      // Fallback to basic keyword matching with quality assessment
      const jobSkills = [...(jobAnalysis.requiredSkills || []), ...(jobAnalysis.preferredSkills || [])];
      const resumeSkills = resumeData.skills?.map(s => s.name.toLowerCase()) || [];
      const matchingSkills = jobSkills.filter(skill =>
        resumeSkills.some(resumeSkill => resumeSkill.includes(skill.toLowerCase()))
      );
      const baseSkillsMatch = jobSkills.length > 0 ? Math.round((matchingSkills.length / jobSkills.length) * 100) : 0;
      const baseExperienceMatch = this.calculateExperienceMatch(resumeData, jobAnalysis);
      const missingSkills = jobSkills.filter(skill =>
        !resumeSkills.some(resumeSkill => resumeSkill.includes(skill.toLowerCase()))
      );
      const strongPoints = this.identifyStrengths(resumeData, jobAnalysis);
      const baseOverallMatch = Math.round((baseSkillsMatch + baseExperienceMatch) / 2);

      // Apply same quality-based capping to fallback scores
      const qualityMultiplier = Math.min(1, contentQuality.score / 70);
      const cappedOverallMatch = Math.round(baseOverallMatch * qualityMultiplier);
      const cappedSkillsMatch = Math.round(baseSkillsMatch * qualityMultiplier);
      const cappedExperienceMatch = Math.round(baseExperienceMatch * qualityMultiplier);

      console.log(`🎯 Fallback scores with quality cap - Overall: ${baseOverallMatch} → ${cappedOverallMatch}`);

      return {
        overallMatch: cappedOverallMatch,
        overallScore: cappedOverallMatch, // alias for overallMatch
        skillsMatch: cappedSkillsMatch,
        experienceMatch: cappedExperienceMatch,
        missingSkills: missingSkills.slice(0, 10),
        missingKeywords: missingSkills.slice(0, 10),
        addedKeywords: matchingSkills,
        strongPoints,
        recommendations: [
          ...this.generateRecommendations(cappedOverallMatch, missingSkills, strongPoints),
          ...contentQuality.issues.map(issue => `Improve: ${issue}`)
        ],
        atsCompatibility: Math.round(65 * qualityMultiplier), // More realistic fallback
        competitiveAdvantage: this.identifyCompetitiveAdvantages(resumeData, jobAnalysis),
        keywordAlignment: matchingSkills,
        strategicInsights: [
          'Optimize technical keywords for better ATS visibility',
          'Highlight specific metrics in recent work experience',
          'Align project descriptions with role-specific requirements'
        ],
        mode: 'fallback',
        confidence: 'low',
        failureReason,
        providerFailures
      };
    }
  }

  /**
   * Calculate experience match based on job requirements
   */
  private calculateExperienceMatch(resumeData: ResumeData, jobAnalysis: any): number {
    const workExperience = resumeData.workExperience || [];
    const totalYears = workExperience.reduce((total, exp) => {
      const startYear = new Date(exp.startDate).getFullYear();
      const endYear = exp.isCurrentJob ? new Date().getFullYear() : new Date(exp.endDate || exp.startDate).getFullYear();
      return total + (endYear - startYear);
    }, 0);

    // Simple experience level matching
    const requiredExperience = {
      'entry': 0,
      'mid': 3,
      'senior': 7,
      'executive': 12
    };

    const required = requiredExperience[jobAnalysis.experienceLevel] || 3;
    if (totalYears >= required) {
      return Math.min(100, 80 + ((totalYears - required) * 2)); // Bonus for extra experience
    } else {
      return Math.max(40, (totalYears / required) * 80); // Partial credit
    }
  }

  /**
   * Identify candidate's strengths relative to job requirements
   */
  private identifyStrengths(resumeData: ResumeData, jobAnalysis: any): string[] {
    const strengths: string[] = [];

    // Check for leadership experience
    const hasLeadership = resumeData.workExperience?.some(exp =>
      exp.responsibilities.some(resp => 
        /lead|manage|supervise|direct|coordinate/i.test(resp)
      )
    );
    if (hasLeadership) strengths.push('Leadership experience');

    // Check for quantified achievements
    const hasQuantifiedResults = resumeData.workExperience?.some(exp =>
      exp.achievements.some(ach => /\d+[\%\+\-\$]/.test(ach))
    );
    if (hasQuantifiedResults) strengths.push('Quantified achievements');

    // Check for relevant certifications
    if (resumeData.certifications?.length > 0) {
      strengths.push('Professional certifications');
    }

    // Check for project experience
    if (resumeData.projects?.length > 0) {
      strengths.push('Hands-on project experience');
    }

    // Check for education alignment
    if (resumeData.education?.length > 0) {
      strengths.push('Relevant educational background');
    }

    return strengths;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    overallMatch: number,
    missingSkills: string[],
    strongPoints: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (overallMatch < 60) {
      recommendations.push('Consider gaining experience in the missing skills through projects or training');
    }

    if (missingSkills.length > 5) {
      recommendations.push(`Focus on acquiring these high-priority skills: ${missingSkills.slice(0, 3).join(', ')}`);
    }

    if (strongPoints.length > 0) {
      recommendations.push(`Emphasize your strong points: ${strongPoints.join(', ')}`);
    }

    recommendations.push('Apply to similar roles to increase your chances of success');

    return recommendations;
  }

  /**
   * Identify competitive advantages
   */
  private identifyCompetitiveAdvantages(resumeData: ResumeData, jobAnalysis: any): string[] {
    const advantages: string[] = [];

    // Unique skill combinations
    const skillCount = resumeData.skills?.length || 0;
    if (skillCount > 10) {
      advantages.push('Diverse skill set');
    }

    // Multiple languages
    if (resumeData.languages?.length > 1) {
      advantages.push('Multilingual capabilities');
    }

    // Volunteer experience
    if (resumeData.volunteerExperience?.length > 0) {
      advantages.push('Community involvement');
    }

    // Publications or awards
    if (resumeData.publications?.length > 0 || resumeData.awards?.length > 0) {
      advantages.push('Thought leadership and recognition');
    }

    return advantages;
  }

  /**
   * Assess resume content quality to prevent inflated scores
   */
  private assessResumeContentQuality(resumeData: ResumeData): {
    score: number;
    issues: string[];
    strengths: string[];
  } {
    const issues: string[] = [];
    const strengths: string[] = [];
    let qualityScore = 100;

    // Check work experience
    const workExp = resumeData.workExperience?.length || 0;
    if (workExp === 0) {
      issues.push('No work experience provided');
      qualityScore -= 40;
    } else if (workExp < 2) {
      issues.push('Very limited work experience');
      qualityScore -= 20;
    } else {
      strengths.push(`${workExp} work experiences documented`);
    }

    // Check skills
    const skillsCount = resumeData.skills?.length || 0;
    if (skillsCount === 0) {
      issues.push('No skills listed');
      qualityScore -= 30;
    } else if (skillsCount < 5) {
      issues.push('Limited skills listed');
      qualityScore -= 15;
    } else {
      strengths.push(`${skillsCount} skills listed`);
    }

    // Check content depth (responsibilities/achievements)
    const contentItems = this.countContentItems(resumeData);
    if (contentItems === 0) {
      issues.push('No detailed responsibilities or achievements');
      qualityScore -= 35;
    } else if (contentItems < 5) {
      issues.push('Very limited detail in experience descriptions');
      qualityScore -= 20;
    } else {
      strengths.push(`${contentItems} detailed content items`);
    }

    // Check professional summary
    if (!resumeData.professionalSummary || resumeData.professionalSummary.length < 50) {
      issues.push('Missing or very brief professional summary');
      qualityScore -= 15;
    } else {
      strengths.push('Professional summary provided');
    }

    // Check education
    if (!resumeData.education?.length) {
      issues.push('No education information');
      qualityScore -= 10;
    }

    return {
      score: Math.max(0, qualityScore),
      issues,
      strengths
    };
  }

  /**
   * Count detailed content items in resume
   */
  private countContentItems(resumeData: ResumeData): number {
    let count = 0;
    
    // Count responsibilities and achievements
    resumeData.workExperience?.forEach(exp => {
      count += (exp.responsibilities?.length || 0);
      count += (exp.achievements?.length || 0);
    });

    // Count project details
    resumeData.projects?.forEach(proj => {
      if (proj.description && proj.description.length > 20) count += 1;
      count += (proj.technologies?.length || 0);
    });

    return count;
  }

  /**
   * Get quick job match score without full optimization
   */
  async getJobMatchScore(
    resumeData: ResumeData,
    jobDescription: string
  ): Promise<{
    matchScore: number;
    keyFindings: string[];
    keywordAlignment: string[];
    missingKeywords: string[];
    recommendations: string[];
    skillsMatch: number;
    experienceMatch: number;
  }> {
    try {
      const jobAnalysis = await this.analyzeJobPosting(jobDescription);
      const jobMatch = await this.calculateJobMatch(resumeData, jobDescription, jobAnalysis);
      
      return {
        matchScore: jobMatch.overallMatch,
        keyFindings: [
          `Skills match: ${jobMatch.skillsMatch}%`,
          `Experience match: ${jobMatch.experienceMatch}%`,
          `Missing ${jobMatch.missingSkills.length} key skills`,
          `${jobMatch.strongPoints.length} competitive advantages identified`
        ],
        keywordAlignment: jobMatch.keywordAlignment || [],
        missingKeywords: jobMatch.missingSkills || [],
        recommendations: jobMatch.recommendations || [],
        skillsMatch: jobMatch.skillsMatch || 0,
        experienceMatch: jobMatch.experienceMatch || 0
      };
    } catch (error) {
      console.error('Failed to calculate job match score:', error);
      return {
        matchScore: 0,
        keyFindings: ['Analysis failed - please try again'],
        keywordAlignment: [],
        missingKeywords: [],
        recommendations: [],
        skillsMatch: 0,
        experienceMatch: 0
      };
    }
  }

  /**
   * Analyze job posting from URL using AI directly with personalized recommendations
   */
  async analyzeJobFromUrl(jobUrl: string, resumeData?: any): Promise<any> {
    try {
      console.log('🤖 Using AI to analyze job from URL:', jobUrl);
      
      // Use Gemini AI to scrape and analyze the job posting directly
      const jobAnalysis = await geminiService.scrapeJobFromUrl(jobUrl, resumeData);
      
      // AI handles everything - scraping, extraction, and analysis
      return {
        jobDescription: jobAnalysis.jobDescription || '',
        jobTitle: jobAnalysis.jobTitle || 'Job Title Not Available',
        companyName: jobAnalysis.companyName || 'Company Not Available',
        requirements: jobAnalysis.requirements || jobAnalysis.requiredSkills || [],
        location: jobAnalysis.location || '',
        salary: jobAnalysis.salary || '',
        benefits: jobAnalysis.benefits || [],
        responsibilities: jobAnalysis.responsibilities || [],
        qualifications: jobAnalysis.qualifications || [],
        experienceLevel: jobAnalysis.experienceLevel || 'mid',
        requiredSkills: jobAnalysis.requiredSkills || [],
        preferredSkills: jobAnalysis.preferredSkills || [],
        skills: [...(jobAnalysis.requiredSkills || []), ...(jobAnalysis.preferredSkills || [])],
        keywords: jobAnalysis.keywords || [],
        matchAnalysis: jobAnalysis,
        recommendations: jobAnalysis.recommendations || [
          'Review the job requirements and align your resume accordingly',
          'Highlight relevant skills and technologies mentioned in the posting',
          'Quantify your achievements to demonstrate impact',
          'Use keywords from the job description throughout your resume'
        ]
      };
    } catch (error) {
      console.error('AI job analysis failed:', error);
      
      // Return fallback data with helpful message
      return {
        jobDescription: `AI could not analyze the job posting at ${jobUrl}. This may be due to site restrictions or temporary access issues. Please try again or paste the job description manually for better optimization results.`,
        jobTitle: 'Job Title Not Available',
        companyName: 'Company Not Available',
        requirements: [],
        location: '',
        salary: '',
        benefits: [],
        responsibilities: [],
        qualifications: [],
        experienceLevel: 'mid',
        requiredSkills: [],
        preferredSkills: [],
        keywords: [],
        matchAnalysis: {},
        recommendations: [
          'Try the URL again - AI access may vary by site',
          'Consider pasting the job description manually',
          'Ensure your resume includes relevant keywords',
          'Highlight achievements with quantifiable results'
        ]
      };
    }
  }
}

// Export singleton instance
export const standardizedJobOptimizationService = new StandardizedJobOptimizationService();
