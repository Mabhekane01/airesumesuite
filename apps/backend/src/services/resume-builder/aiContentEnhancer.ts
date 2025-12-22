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
    id?: string;
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
    id?: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationDate: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    gpa?: string;
    coursework?: string[];
  }>;
  skills: Array<{
    id?: string;
    name: string;
    category: 'technical' | 'soft' | 'language' | 'certification';
    proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  projects?: Array<{
    id?: string;
    name: string;
    description: string[];
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    id?: string;
    name: string;
    issuer: string;
    date: string;
    expirationDate?: string;
    credentialId?: string;
    url?: string;
  }>;
  languages?: Array<{
    id?: string;
    name: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  }>;
  volunteerExperience?: Array<{
    id?: string;
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
    id?: string;
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  publications?: Array<{
    id?: string;
    title: string;
    publisher: string;
    publicationDate: string;
    url?: string;
    description?: string;
  }>;
  references?: Array<{
    id?: string;
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  hobbies?: Array<{
    id?: string;
    name: string;
    description?: string;
    category: 'creative' | 'sports' | 'technology' | 'volunteer' | 'other';
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
      const prompt = `
You are an Elite Executive Resume Architect. Your task is to transform a standard professional summary into a high-impact 'Executive Abstract' that commands attention and outranks competitors in ATS systems.

ORIGINAL SUMMARY ASSET:
"${originalSummary}"

STRATEGIC ENHANCEMENT VECTORS:
${options.jobDescription ? `- Alignment Target (Job Description): ${options.jobDescription.substring(0, 500)}` : ''}
${options.targetRole ? `- Leadership/Role Context: ${options.targetRole}` : ''}
${options.industry ? `- Sector Intelligence: ${options.industry}` : ''}
${options.experienceLevel ? `- Seniority Calibration: ${options.experienceLevel}` : ''}
${options.keywords ? `- Critical Semantic Nodes (Keywords): ${options.keywords.join(', ')}` : ''}

REQUIRED EXECUTION:
1. COMPOSITION: Synthesize exactly 3-4 powerful sentences.
2. IMPACT: Start with a definitive statement of expertise and years of mastery.
3. QUANTIFICATION: Integrate specific, high-level achievements or scale of impact.
4. ATS ARCHITECTURE: Seamlessly integrate primary technical and industry keywords.
5. TONE: Maintain an elite, authoritative, and results-driven professional voice.

CRITICAL CONSTRAINTS:
- Use PLAIN TEXT ONLY.
- STREICTLY FORBIDDEN: Markdown bold (**), italics (*), or any special formatting symbols.
- DO NOT provide explanations, headers, or metadata. Return ONLY the enhanced abstract string.

Enhanced Executive Abstract:`;

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
      const responsibilitiesText = experience.responsibilities?.join('\n- ') || '';
      const achievementsText = experience.achievements?.join('\n- ') || '';

      const prompt = `
You are a Principal Talent Strategist. Transform these standard work experience entries into a high-performance 'Professional Impact Node' that highlights technical mastery and leadership value.

NODE CONTEXT: ${experience.jobTitle} at ${experience.company}
CURRENT INPUTS:
- Responsibilities: ${responsibilitiesText}
- Achievements: ${achievementsText}

STRATEGIC ALIGNMENT VECTORS:
${options.jobDescription ? `- Target Role Blueprint: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Critical Semantic Nodes: ${options.keywords.join(', ')}` : ''}

REQUIRED EXECUTION:
1. METHODOLOGY: Use the STAR/CAR (Action-Impact-Result) framework.
2. VERBS: Start every point with an Elite Action Verb (e.g., 'Spearheaded', 'Orchestrated', 'Optimized').
3. QUANTIFICATION: Every point must aim to include a metric, percentage, or specific data yield.
4. ATS COMPATIBILITY: Deeply embed technical keywords from the alignment vectors.
5. CONCISENESS: Limit each point to 1-2 lines of high-density impact.

CRITICAL CONSTRAINTS:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or bullet symbols inside JSON strings.
- Use only standard hyphens (-) for list items if necessary, but preferred as an array of strings.
- Return ONLY the enhanced content in this exact JSON format.

{
  "responsibilities": ["Enhanced responsibility impact statement 1", "item 2"],
  "achievements": ["Quantified, high-impact achievement 1", "item 2"]
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
    try {
      const prompt = `
You are a Senior Technical Portfolio Architect. Enhance this project description to be a 'Technical Mastery Showcase' that highlights high-caliber engineering and problem-solving impact.

PROJECT: ${project.name}
CURRENT INPUT: ${Array.isArray(project.description) ? project.description.join('. ') : project.description || ''}
TECHNICAL STACK: ${project.technologies?.join(', ') || 'Not specified'}

ALIGNMENT VECTORS:
${options.jobDescription ? `- Role Strategic Blueprint: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Required Semantic Nodes: ${options.keywords.join(', ')}` : ''}

REQUIRED EXECUTION:
1. IMPACT: Focus on the 'Why' and the 'Business/Technical Result'.
2. STACK: Seamlessly integrate the provided technologies into the narrative.
3. SENIORITY: Use authoritative, senior-level technical terminology.
4. CONCISENESS: Limit to 2-3 sentences of high-density intelligence.

CRITICAL RULES:
- Use PLAIN TEXT ONLY. NO markdown formatting (**bold**, *italics*, etc).
- Return ONLY the enhanced description string. No headers or explanations.

Enhanced Showcase:`;

      const enhancedDescription = await geminiService.generateText(prompt);

      // Clean any markdown formatting
      const cleanedDescription = this.cleanMarkdownFormatting(enhancedDescription);

      // Convert enhanced description back to array format if original was array
      const processedDescription = Array.isArray(project.description)
        ? cleanedDescription.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
        : cleanedDescription;

      const enhancedProject = {
        ...project,
        description: processedDescription,
      };

      const improvements = [`Enhanced project description for "${project.name}"`];
      const keywords = this.extractKeywords(cleanedDescription, options);

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
    try {
      const prompt = `
You are a Lead ATS Integration Specialist. Perform a strategic semantic audit of this job posting to extract the top 15 most critical 'Target Success Nodes' (Keywords).

STRATEGIC SOURCE:
${jobDescription.substring(0, 2000)}

REQUIRED EXTRACTION NODES:
- Primary Tech Stack (Languages, Frameworks, Infrastructure)
- Required Methodologies (Agile, SDLC, DevOps)
- Strategic Soft Skills (Stakeholder mgmt, Leadership)
- Industry Regulatory/Standard Compliance

CRITICAL RULES:
- Use PLAIN TEXT ONLY.
- Return ONLY a comma-separated list. No explanations.

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