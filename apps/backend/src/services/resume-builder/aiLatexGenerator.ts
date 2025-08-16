/**
 * AI Content Generator (formerly AI LaTeX Generator)
 * 
 * UPDATED FOR STANDARDIZED TEMPLATE SYSTEM:
 * - No longer generates LaTeX code
 * - Focuses on content enhancement only
 * - Works with standardized templates for LaTeX generation
 */

import { aiContentEnhancer, type ResumeData } from "./aiContentEnhancer";
import { templateService } from "./templateService";
import fs from "fs/promises";
import path from "path";

// Legacy interface - maintained for backward compatibility
export interface ResumeInput {
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
    achievements: string[];
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
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
    description: string;
    technologies: string[];
    url?: string;
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

export interface TemplateData {
  id: string;
  name: string;
  latexCode: string;
  screenshotPath: string;
}

/**
 * Updated AI service that works with standardized templates
 * NO LONGER GENERATES LATEX - Only enhances content
 */
export class AILatexGenerator {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(
      process.cwd(),
      "..",
      "..",
      "apps",
      "frontend",
      "public",
      "templates"
    );
  }

  /**
   * UPDATED: Now uses standardized template system instead of generating LaTeX
   * This method now enhances content and uses standardized templates for LaTeX generation
   */
  async generateLatexFromTemplate(
    templateId: string,
    resumeData: ResumeInput
  ): Promise<string> {
    console.log(`🔄 [UPDATED] Using standardized template system for ${templateId}`);
    
    try {
      // Convert legacy ResumeInput to new ResumeData format
      const standardizedResumeData: ResumeData = this.convertToStandardizedFormat(resumeData);
      
      // Use template service (AI enhancement should be done separately)
      const latex = await templateService.generateLatex(
        templateId,
        standardizedResumeData
      );
      
      console.log(`✅ Generated LaTeX using standardized template system. Length: ${latex.length}`);
      return latex;
      
    } catch (error) {
      console.error(`❌ Standardized template generation failed for ${templateId}:`, error);
      throw new Error(`Failed to generate resume using standardized templates: ${error.message}`);
    }
  }

  /**
   * UPDATED: Job optimization now uses standardized job optimization service
   * No longer generates LaTeX - focuses on content optimization
   */
  async optimizeTemplateForJob(
    templateId: string,
    resumeData: ResumeInput,
    jobUrl: string,
    templateCode: string // Ignored - no longer used
  ): Promise<string> {
    console.log(`🎯 [UPDATED] Using standardized job optimization for ${templateId}`);
    
    try {
      // Extract job description from URL (simplified - you may need to implement job scraping)
      const jobDescription = await this.extractJobDescription(jobUrl);
      
      // Convert to standardized format
      const standardizedResumeData: ResumeData = this.convertToStandardizedFormat(resumeData);
      
      // Use standardized job optimization service
      const { standardizedJobOptimizationService } = await import('../standardizedJobOptimizationService');
      
      const optimizationResult = await standardizedJobOptimizationService.optimizeResumeForJob({
        resumeData: standardizedResumeData,
        jobDescription,
        templateId,
      });
      
      console.log(`✅ Job optimization complete using standardized system. ATS Score: ${optimizationResult.atsScore}%`);
      return optimizationResult.optimizedLatex;
      
    } catch (error) {
      console.error(`❌ Standardized job optimization failed:`, error);
      throw new Error(`Failed to optimize resume for job: ${error.message}`);
    }
  }

  /**
   * UPDATED: Content enhancement only - no LaTeX generation
   */
  async enhanceResumeContent(
    resumeData: ResumeInput,
    jobDescription?: string
  ): Promise<ResumeInput> {
    console.log('🤖 [UPDATED] Enhancing content using AI Content Enhancer...');
    
    try {
      // Convert to standardized format
      const standardizedData: ResumeData = this.convertToStandardizedFormat(resumeData);
      
      // Use AI content enhancer
      const enhancementResult = jobDescription
        ? await aiContentEnhancer.optimizeForJob(standardizedData, jobDescription)
        : await aiContentEnhancer.enhanceResumeContent(standardizedData);
      
      // Convert back to legacy format
      const enhancedResumeData = this.convertFromStandardizedFormat(enhancementResult.enhancedContent);
      
      console.log(`✅ Content enhanced. ATS Score: ${enhancementResult.atsScore}%, Improvements: ${enhancementResult.improvements.length}`);
      return enhancedResumeData;
      
    } catch (error) {
      console.error('❌ Content enhancement failed:', error);
      return resumeData; // Return original data if enhancement fails
    }
  }

  /**
   * Get available templates metadata (unchanged)
   */
  async getTemplateMetadata(): Promise<TemplateData[]> {
    try {
      const templates = await this.loadAvailableTemplates();
      return templates;
    } catch (error) {
      console.error('Failed to load template metadata:', error);
      return [];
    }
  }

  /**
   * Load available templates from file system
   */
  async loadAvailableTemplates(): Promise<TemplateData[]> {
    try {
      const templateDirs = await fs.readdir(this.templatesPath);
      const templates: TemplateData[] = [];

      for (const dir of templateDirs) {
        if (dir.startsWith('template')) {
          const templatePath = path.join(this.templatesPath, dir);
          const stat = await fs.stat(templatePath);
          
          if (stat.isDirectory()) {
            // Try to load standardized template first, then fall back to original
            const standardizedPath = path.join(templatePath, `${dir}-standardized.tex`);
            const originalPath = path.join(templatePath, 'templatecode.txt');
            
            let latexCode = '';
            try {
              latexCode = await fs.readFile(standardizedPath, 'utf8');
              console.log(`✅ Loaded standardized template: ${dir}`);
            } catch {
              try {
                latexCode = await fs.readFile(originalPath, 'utf8');
                console.log(`⚠️ Using original template: ${dir} (standardized version not found)`);
              } catch {
                console.log(`❌ No template file found for: ${dir}`);
                continue;
              }
            }

            // Find screenshot
            const files = await fs.readdir(templatePath);
            const screenshotFile = files.find(f => f.match(/\.(jpg|jpeg|png)$/i));
            
            templates.push({
              id: dir,
              name: this.formatTemplateName(dir),
              latexCode,
              screenshotPath: screenshotFile ? `/templates/${dir}/${screenshotFile}` : ''
            });
          }
        }
      }

      return templates;
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  /**
   * Convert legacy ResumeInput to standardized ResumeData format
   */
  private convertToStandardizedFormat(resumeData: ResumeInput): ResumeData {
    return {
      personalInfo: resumeData.personalInfo,
      professionalSummary: resumeData.professionalSummary,
      workExperience: (resumeData.workExperience || []).map(exp => ({
        jobTitle: exp.jobTitle,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrentJob: exp.isCurrentJob,
        responsibilities: exp.responsibilities || [],
        achievements: exp.achievements || []
      })),
      education: (resumeData.education || []).map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        fieldOfStudy: edu.fieldOfStudy,
        location: edu.location,
        graduationDate: edu.graduationDate || edu.endDate,
        gpa: edu.gpa,
        honors: edu.honors || []
      })),
      skills: resumeData.skills || [],
      projects: resumeData.projects || [],
      certifications: resumeData.certifications || [],
      languages: resumeData.languages || [],
      volunteerExperience: resumeData.volunteerExperience || [],
      awards: resumeData.awards || [],
      publications: resumeData.publications || [],
      references: resumeData.references || [],
      hobbies: [], // Not in legacy format
      additionalSections: resumeData.additionalSections || []
    };
  }

  /**
   * Convert standardized ResumeData back to legacy ResumeInput format
   */
  private convertFromStandardizedFormat(resumeData: ResumeData): ResumeInput {
    return {
      personalInfo: resumeData.personalInfo,
      professionalSummary: resumeData.professionalSummary,
      workExperience: (resumeData.workExperience || []).map(exp => ({
        jobTitle: exp.jobTitle,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrentJob: exp.isCurrentJob,
        responsibilities: exp.responsibilities || [],
        achievements: exp.achievements || []
      })),
      education: (resumeData.education || []).map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        fieldOfStudy: edu.fieldOfStudy,
        location: edu.location,
        graduationDate: edu.graduationDate,
        gpa: edu.gpa,
        honors: edu.honors || []
      })),
      skills: resumeData.skills || [],
      projects: resumeData.projects || [],
      certifications: resumeData.certifications || [],
      languages: resumeData.languages || [],
      volunteerExperience: resumeData.volunteerExperience || [],
      awards: resumeData.awards || [],
      publications: resumeData.publications || [],
      references: resumeData.references || [],
      additionalSections: resumeData.additionalSections || []
    };
  }

  /**
   * Extract job description from URL - simplified implementation
   * In production, you'd want to implement proper job scraping
   */
  private async extractJobDescription(jobUrl: string): Promise<string> {
    // This is a simplified implementation
    // In production, you'd implement actual job scraping
    console.log(`📝 Extracting job description from: ${jobUrl}`);
    
    // For now, return a placeholder that indicates the job URL was provided
    return `Job posting from: ${jobUrl}\n\nPlease provide the job description directly for better optimization results.`;
  }

  /**
   * Format template name for display
   */
  private formatTemplateName(templateId: string): string {
    return templateId
      .replace(/template\s*(\d+)/i, 'Template $1')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }
}

// Export singleton instance
export const aiLatexGenerator = new AILatexGenerator();