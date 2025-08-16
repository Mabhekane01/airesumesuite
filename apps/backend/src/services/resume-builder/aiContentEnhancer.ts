/**
 * AI Content Enhancer for Standardized Templates
 * 
 * This service enhances resume content without generating LaTeX code.
 * It works with the standardized template system by improving text content
 * that gets inserted into template placeholders.
 */

import { geminiService } from "../ai/gemini";

export interface EnhancementOptions {
  jobDescription?: string;
  targetRole?: string;
  industry?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'academic' | 'creative';
}

export interface ContentEnhancementResult {
  originalContent: any;
  enhancedContent: any;
  improvements: string[];
  atsScore?: number;
  keywordsAdded?: string[];
}

export interface ResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    professionalTitle?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    websiteUrl?: string;
  };
  professionalSummary: string;
  workExperience: Array<{
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    isCurrentJob: boolean;
    responsibilities: string[];
    achievements: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    location?: string;
    graduationDate: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills: Array<{
    name: string;
    category: string;
    proficiencyLevel?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string[];
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expirationDate?: string;
  }>;
  languages?: Array<{
    name: string;
    proficiency: string;
  }>;
  volunteerExperience?: Array<{
    organization: string;
    role: string;
    location: string;
    startDate: string;
    endDate?: string;
    isCurrentRole: boolean;
    description: string;
    achievements: string[];
  }>;
  awards?: Array<{
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  publications?: Array<{
    title: string;
    publisher: string;
    publicationDate: string;
    url?: string;
    description?: string;
  }>;
  references?: Array<{
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  hobbies?: Array<{
    name: string;
    description?: string;
    category: string;
  }>;
  additionalSections?: Array<{
    title: string;
    content: string;
  }>;
}

export class AIContentEnhancer {
  constructor() {
    // Use the existing geminiService
  }

  /**
   * Enhance entire resume content for standardized templates
   */
  async enhanceResumeContent(
    resumeData: ResumeData,
    options: EnhancementOptions = {}
  ): Promise<ContentEnhancementResult> {
    // Use geminiService directly

    try {
      console.log('🤖 Enhancing resume content with AI...');
      
      const enhancedContent = { ...resumeData };
      const improvements: string[] = [];
      const keywordsAdded: string[] = [];

      // 1. Enhance Professional Summary
      if (resumeData.professionalSummary) {
        const enhancedSummary = await this.enhanceProfessionalSummary(
          resumeData.professionalSummary,
          options
        );
        enhancedContent.professionalSummary = enhancedSummary.content;
        improvements.push(...enhancedSummary.improvements);
        keywordsAdded.push(...enhancedSummary.keywords);
      }

      // 2. Enhance Work Experience
      if (resumeData.workExperience && resumeData.workExperience.length > 0) {
        const enhancedWork = await this.enhanceWorkExperience(
          resumeData.workExperience,
          options
        );
        enhancedContent.workExperience = enhancedWork.content;
        improvements.push(...enhancedWork.improvements);
        keywordsAdded.push(...enhancedWork.keywords);
      }

      // 3. Enhance Project Descriptions
      if (resumeData.projects && resumeData.projects.length > 0) {
        const enhancedProjects = await this.enhanceProjects(
          resumeData.projects,
          options
        );
        enhancedContent.projects = enhancedProjects.content;
        improvements.push(...enhancedProjects.improvements);
        keywordsAdded.push(...enhancedProjects.keywords);
      }

      // 4. Calculate ATS Score
      const atsScore = this.calculateATSScore(enhancedContent, options);

      console.log(`✅ Content enhancement complete. ATS Score: ${atsScore}%`);
      
      return {
        originalContent: resumeData,
        enhancedContent,
        improvements,
        atsScore,
        keywordsAdded,
      };

    } catch (error) {
      console.error('❌ AI content enhancement failed:', error);
      return {
        originalContent: resumeData,
        enhancedContent: resumeData,
        improvements: [`Enhancement failed: ${error.message}`],
        atsScore: 0,
      };
    }
  }

  /**
   * Enhance professional summary for better impact and ATS compatibility
   */
  private async enhanceProfessionalSummary(
    originalSummary: string,
    options: EnhancementOptions
  ): Promise<{ content: string; improvements: string[]; keywords: string[] }> {
    if (!originalSummary) {
      return { content: originalSummary, improvements: [], keywords: [] };
    }

    try {
      // Use the client.models.generateContent API instead

      const prompt = `You are an expert resume writer. Enhance this professional summary to be more impactful and ATS-friendly.

ORIGINAL SUMMARY:
"${originalSummary}"

ENHANCEMENT REQUIREMENTS:
${options.jobDescription ? `- Target this job: ${options.jobDescription.substring(0, 500)}` : ''}
${options.targetRole ? `- Target role: ${options.targetRole}` : ''}
${options.industry ? `- Industry: ${options.industry}` : ''}
${options.experienceLevel ? `- Experience level: ${options.experienceLevel}` : ''}
${options.keywords ? `- Include keywords: ${options.keywords.join(', ')}` : ''}

GUIDELINES:
1. Keep the enhanced summary between 2-4 sentences
2. Start with years of experience and key expertise
3. Include quantifiable achievements where possible
4. Use strong action words and industry keywords
5. Maintain the original tone and personality
6. Make it ATS-friendly with relevant keywords
7. Use PLAIN TEXT ONLY - NO markdown formatting (no **bold**, no *italic*, no special characters)
8. Return ONLY the enhanced summary, no explanations

Enhanced Summary:`;

      const enhancedSummary = await geminiService.generateText(prompt);

      // Clean any markdown formatting that might have slipped through
      const cleanedSummary = this.cleanMarkdownFormatting(enhancedSummary);

      // Extract improvements and keywords
      const improvements = this.identifyImprovements(originalSummary, cleanedSummary);
      const keywords = this.extractKeywords(cleanedSummary, options);

      return {
        content: cleanedSummary,
        improvements,
        keywords,
      };

    } catch (error) {
      console.error('Failed to enhance professional summary:', error);
      return { content: originalSummary, improvements: [], keywords: [] };
    }
  }

  /**
   * Enhance work experience entries for better impact
   */
  private async enhanceWorkExperience(
    workExperience: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!workExperience.length) {
      return { content: workExperience, improvements: [], keywords: [] };
    }

    try {
      const enhancedExperience = [];
      const allImprovements: string[] = [];
      const allKeywords: string[] = [];

      for (const experience of workExperience) {
        const enhanced = await this.enhanceSingleWorkExperience(experience, options);
        enhancedExperience.push(enhanced.content);
        allImprovements.push(...enhanced.improvements);
        allKeywords.push(...enhanced.keywords);
      }

      return {
        content: enhancedExperience,
        improvements: allImprovements,
        keywords: allKeywords,
      };

    } catch (error) {
      console.error('Failed to enhance work experience:', error);
      return { content: workExperience, improvements: [], keywords: [] };
    }
  }

  /**
   * Enhance a single work experience entry
   */
  private async enhanceSingleWorkExperience(
    experience: any,
    options: EnhancementOptions
  ): Promise<{ content: any; improvements: string[]; keywords: string[] }> {
    // Use geminiService directly

    try {
      // Use the client.models.generateContent API instead

      const responsibilitiesText = experience.responsibilities?.join('\n• ') || '';
      const achievementsText = experience.achievements?.join('\n• ') || '';

      const prompt = `Enhance this work experience entry to be more impactful and ATS-friendly.

POSITION: ${experience.jobTitle} at ${experience.company}
CURRENT RESPONSIBILITIES:
• ${responsibilitiesText}

CURRENT ACHIEVEMENTS:
• ${achievementsText}

ENHANCEMENT REQUIREMENTS:
${options.jobDescription ? `- Align with this target job: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Include relevant keywords: ${options.keywords.join(', ')}` : ''}

GUIDELINES:
1. Start bullet points with strong action verbs
2. Include quantifiable results where possible (numbers, percentages, metrics)
3. Use industry-specific keywords and terminology
4. Focus on achievements over responsibilities
5. Keep each bullet point to 1-2 lines
6. Make them ATS-friendly
7. Use PLAIN TEXT ONLY - NO markdown formatting (no **bold**, no *italic*, no special characters)

Return the enhanced content in this exact JSON format:
{
  "responsibilities": ["enhanced responsibility 1", "enhanced responsibility 2"],
  "achievements": ["enhanced achievement 1", "enhanced achievement 2"]
}`;

      const responseText = await geminiService.generateText(prompt);
      
      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhancedData = JSON.parse(jsonMatch[0]);
        
        // Clean markdown formatting from all text arrays
        const cleanedResponsibilities = (enhancedData.responsibilities || experience.responsibilities || [])
          .map((item: string) => this.cleanMarkdownFormatting(item));
        const cleanedAchievements = (enhancedData.achievements || experience.achievements || [])
          .map((item: string) => this.cleanMarkdownFormatting(item));
        
        const enhancedExperience = {
          ...experience,
          responsibilities: cleanedResponsibilities,
          achievements: cleanedAchievements,
        };

        const improvements = this.identifyWorkExperienceImprovements(experience, enhancedExperience);
        const keywords = this.extractKeywords(JSON.stringify(enhancedData), options);

        return {
          content: enhancedExperience,
          improvements,
          keywords,
        };
      }

    } catch (error) {
      console.error('Failed to enhance single work experience:', error);
    }

    return { content: experience, improvements: [], keywords: [] };
  }

  /**
   * Enhance project descriptions
   */
  private async enhanceProjects(
    projects: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!projects.length) {
      return { content: projects, improvements: [], keywords: [] };
    }

    try {
      const enhancedProjects = [];
      const allImprovements: string[] = [];
      const allKeywords: string[] = [];

      for (const project of projects) {
        const enhanced = await this.enhanceSingleProject(project, options);
        enhancedProjects.push(enhanced.content);
        allImprovements.push(...enhanced.improvements);
        allKeywords.push(...enhanced.keywords);
      }

      return {
        content: enhancedProjects,
        improvements: allImprovements,
        keywords: allKeywords,
      };

    } catch (error) {
      console.error('Failed to enhance projects:', error);
      return { content: projects, improvements: [], keywords: [] };
    }
  }

  /**
   * Enhance a single project
   */
  private async enhanceSingleProject(
    project: any,
    options: EnhancementOptions
  ): Promise<{ content: any; improvements: string[]; keywords: string[] }> {
    // Use geminiService directly

    try {
      // Use the client.models.generateContent API instead

      const prompt = `Enhance this project description to be more impactful and professional.

PROJECT: ${project.name}
CURRENT DESCRIPTION: ${Array.isArray(project.description) ? project.description.join('. ') : project.description || ''}
TECHNOLOGIES: ${project.technologies?.join(', ') || 'Not specified'}

ENHANCEMENT REQUIREMENTS:
${options.jobDescription ? `- Align with this target role: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Include relevant keywords: ${options.keywords.join(', ')}` : ''}

GUIDELINES:
1. Make the description more compelling and results-focused
2. Include technical keywords and technologies
3. Highlight the impact or outcome if possible
4. Keep it concise but informative (2-3 sentences max)
5. Use professional language

Return only the enhanced description, no other text:`;

      const enhancedDescription = await geminiService.generateText(prompt);

      // Convert enhanced description back to array format if original was array
      const processedDescription = Array.isArray(project.description)
        ? enhancedDescription.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
        : enhancedDescription;

      const enhancedProject = {
        ...project,
        description: processedDescription,
      };

      const improvements = [`Enhanced project description for "${project.name}"`];
      const keywords = this.extractKeywords(enhancedDescription, options);

      return {
        content: enhancedProject,
        improvements,
        keywords,
      };

    } catch (error) {
      console.error('Failed to enhance project:', error);
      return { content: project, improvements: [], keywords: [] };
    }
  }

  /**
   * Calculate ATS compatibility score
   */
  private calculateATSScore(resumeData: any, options: EnhancementOptions): number {
    let score = 0;
    let maxScore = 0;

    // Professional summary (20%)
    maxScore += 20;
    if (resumeData.professionalSummary) {
      score += 20;
      if (options.keywords) {
        const summaryLower = resumeData.professionalSummary.toLowerCase();
        const keywordMatches = options.keywords.filter(keyword => 
          summaryLower.includes(keyword.toLowerCase())
        ).length;
        score += Math.min(keywordMatches * 2, 10);
        maxScore += 10;
      }
    }

    // Work experience (30%)
    maxScore += 30;
    if (resumeData.workExperience?.length > 0) {
      score += 30;
      // Check for quantifiable achievements
      const hasNumbers = resumeData.workExperience.some((exp: any) =>
        exp.achievements?.some((ach: string) => /\d+/.test(ach))
      );
      if (hasNumbers) score += 10;
      maxScore += 10;
    }

    // Skills section (20%)
    maxScore += 20;
    if (resumeData.skills?.length > 0) {
      score += 20;
    }

    // Education (10%)
    maxScore += 10;
    if (resumeData.education?.length > 0) {
      score += 10;
    }

    // Additional sections (10%)
    maxScore += 10;
    if (resumeData.projects?.length > 0) score += 5;
    if (resumeData.certifications?.length > 0) score += 5;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Identify improvements made to content
   */
  private identifyImprovements(original: string, enhanced: string): string[] {
    const improvements: string[] = [];
    
    if (enhanced.length > original.length * 1.1) {
      improvements.push('Added more detailed content');
    }
    if (/\d+[\%\+\-\$]/.test(enhanced) && !/\d+[\%\+\-\$]/.test(original)) {
      improvements.push('Added quantifiable metrics');
    }
    if (enhanced !== original) {
      improvements.push('Enhanced language and impact');
    }
    
    return improvements;
  }

  /**
   * Identify work experience improvements
   */
  private identifyWorkExperienceImprovements(original: any, enhanced: any): string[] {
    const improvements: string[] = [];
    
    if (enhanced.achievements?.length > original.achievements?.length) {
      improvements.push('Added more achievements');
    }
    if (enhanced.responsibilities?.length > original.responsibilities?.length) {
      improvements.push('Enhanced responsibility descriptions');
    }
    
    const enhancedText = JSON.stringify(enhanced);
    const originalText = JSON.stringify(original);
    
    if (/\d+[\%\+\-\$]/.test(enhancedText) && !/\d+[\%\+\-\$]/.test(originalText)) {
      improvements.push('Added quantifiable results');
    }
    
    return improvements;
  }

  /**
   * Clean markdown formatting from AI-generated content
   */
  private cleanMarkdownFormatting(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
      .replace(/^\*\s*/gm, '')          // Remove leading bullet points
      .replace(/^•\s*/gm, '')           // Remove bullet point symbols
      .replace(/`(.*?)`/g, '$1')        // Remove `code` formatting
      .replace(/_{2,}(.*?)_{2,}/g, '$1') // Remove __underline__
      .trim();
  }

  /**
   * Extract keywords from enhanced content
   */
  private extractKeywords(content: string, options: EnhancementOptions): string[] {
    const keywords: string[] = [];
    
    if (options.keywords) {
      const contentLower = content.toLowerCase();
      options.keywords.forEach(keyword => {
        if (contentLower.includes(keyword.toLowerCase())) {
          keywords.push(keyword);
        }
      });
    }
    
    return keywords;
  }

  /**
   * Optimize content for specific job posting
   */
  async optimizeForJob(
    resumeData: ResumeData,
    jobDescription: string,
    targetRole?: string
  ): Promise<ContentEnhancementResult> {
    // Extract keywords from job description
    const extractedKeywords = await this.extractJobKeywords(jobDescription);
    
    const options: EnhancementOptions = {
      jobDescription,
      targetRole,
      keywords: extractedKeywords,
      tone: 'professional',
    };

    return this.enhanceResumeContent(resumeData, options);
  }

  /**
   * Extract relevant keywords from job description
   */
  private async extractJobKeywords(jobDescription: string): Promise<string[]> {
    // Use geminiService directly

    try {
      // Use the client.models.generateContent API instead

      const prompt = `Extract the most important keywords and skills from this job description that should be included in a resume.

JOB DESCRIPTION:
${jobDescription.substring(0, 2000)}

Return only a comma-separated list of the top 15 most important keywords, skills, and technologies mentioned. Focus on:
- Technical skills and technologies
- Required qualifications
- Key responsibilities
- Industry terms
- Soft skills mentioned

Keywords:`;

      const keywordsText = await geminiService.generateText(prompt);
      
      return keywordsText
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 2 && k.length < 30)
        .slice(0, 15);

    } catch (error) {
      console.error('Failed to extract job keywords:', error);
      return [];
    }
  }
}

// Export singleton instance
export const aiContentEnhancer = new AIContentEnhancer();