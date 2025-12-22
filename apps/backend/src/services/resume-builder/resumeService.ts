import { Resume, IResume } from '../../models/Resume';
import { geminiService } from '../ai/gemini';
import { redisClient } from '../../config/redis';
import { templateRenderer } from './templateRenderer';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';
import fs from 'fs/promises';
import { resumeTemplates, getTemplateById } from '../../data/resumeTemplates';
import { latexService, LaTeXTemplateData } from './latexService';
import { overleafTemplateManager } from './overleafTemplateManager';
import { processCompleteResumeData, processPartialResumeData } from '../../utils/resumeDataProcessor';

export interface CreateResumeData {
  userId: string;
  title: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
  };
  professionalSummary: string;
  workExperience: any[];
  education: any[];
  skills: any[];
  certifications?: string[];
  languages?: string[];
  projects?: any[];
  templateId?: string;
}

export interface OptimizeResumeData {
  jobDescription: string;
  jobTitle: string;
  companyName: string;
}

export class ResumeService {
  /**
   * Get all resumes for a user
   */
  async getAllResumes(userId: string): Promise<IResume[]> {
    try {
      const resumes = await Resume.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 });
      return resumes;
    } catch (error) {
      console.error('Error getting all resumes:', error);
      throw new Error('Failed to get resumes');
    }
  }

  /**
   * Enterprise-grade PDF generation using server-side rendering
   * Now supports both LaTeX (Overleaf-style) and HTML-based generation
   */
  async generateResumeFile(resumeData: any, format: 'pdf' | 'docx' | 'txt', options?: { 
    engine?: 'latex' | 'html';
    templateId?: string;
    optimizedLatexCode?: string;
  }): Promise<Buffer> {
    console.log('🏭 Enterprise PDF Generation starting...', { 
      format, 
      hasData: !!resumeData,
      engine: options?.engine || 'auto',
      templateId: options?.templateId
    });
    
    if (format === 'pdf') {
      return await this.generatePDFFile(resumeData, options);
    } else if (format === 'docx') {
      return await this.generateDOCXFile(resumeData, options);
    } else if (format === 'txt') {
      return await this.generateTXTFile(resumeData);
    } else {
      throw new Error('Unsupported format');
    }
  }

  /**
   * High-quality PDF generation using LaTeX or Puppeteer
   * LaTeX engine provides Overleaf-level precision, HTML fallback for compatibility
   */
  private async generatePDFFile(resumeData: any, options?: { 
    engine?: 'latex' | 'html';
    templateId?: string;
    optimizedLatexCode?: string;
  }): Promise<Buffer> {
    const engine = options?.engine || this.selectOptimalEngine(resumeData, options?.templateId);
    
    console.log(`📄 Using ${engine.toUpperCase()} engine for PDF generation`);
    
    if (engine === 'latex') {
      return await this.generateLatexPDF(resumeData, options?.templateId, options?.optimizedLatexCode);
    } else {
      return await this.generateHtmlPDF(resumeData);
    }
  }

  /**
   * Generate PDF using LaTeX engine (Overleaf-style precision)
   */
  private async generateLatexPDF(resumeData: any, templateId?: string, optimizedLatexCode?: string): Promise<Buffer> {
    try {
      console.log('🔧 Starting LaTeX PDF generation...', {
        hasOptimizedLatex: !!optimizedLatexCode,
        templateId
      });
      
      // If we have optimized LaTeX code, use it directly via the generateLatexResumePDF method
      if (optimizedLatexCode) {
        console.log('🎯 Using optimized LaTeX code for PDF generation');
        return await this.generateLatexResumePDF(resumeData, {
          templateId: templateId || 'template1',
          outputFormat: 'pdf',
          cleanup: true,
          optimizedLatexCode
        });
      }
      
      // Convert resume data to LaTeX format
      const latexData = this.convertToLatexData(resumeData);
      
      // Determine template ID (Overleaf template or fallback)
      const finalTemplateId = templateId || this.selectLatexTemplate(resumeData);
      
      // Compile using LaTeX service
      const pdfBuffer = await latexService.compileResume(latexData, {
        templateId: finalTemplateId,
        outputFormat: 'pdf',
        cleanup: true
      });
      
      console.log('✅ LaTeX PDF generated successfully:', pdfBuffer.length, 'bytes');
      return pdfBuffer;
      
    } catch (error) {
      console.error('❌ LaTeX PDF generation failed, falling back to HTML:', error);
      
      // Fallback to HTML generation if LaTeX fails
      return await this.generateHtmlPDF(resumeData);
    }
  }

  /**
   * Generate PDF using HTML/Puppeteer (legacy method)
   */
  private async generateHtmlPDF(resumeData: any): Promise<Buffer> {
    let browser;
    
    try {
      console.log('🚀 Starting Puppeteer PDF generation...');
      
      // Get template for styling
      const template = getTemplateById(resumeData.templateId || 'modern-creative-1') || resumeTemplates[0];
      console.log(`📋 Using template: ${template.name} (${template.id})`);
      
      // Generate HTML content with enterprise styling
      const htmlContent = this.generateResumeHTML(resumeData, template);
      
      // Launch Puppeteer with optimized settings
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.NODE_ENV === 'production' ? '/usr/bin/google-chrome-stable' : undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        timeout: 30000
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      
      // Set content with wait for network idle
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 15000
      });
      
      // Generate PDF with enterprise settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
          right: '0.5in'
        },
        displayHeaderFooter: false
      });
      
      console.log('✅ PDF generated successfully:', pdfBuffer.length, 'bytes');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn('⚠️ Browser close warning:', closeError);
        }
      }
    }
  }

  /**
   * Generate professional HTML content for PDF conversion
   */
  private generateResumeHTML(resumeData: any, template: any): string {
    const personalInfo = resumeData.personalInfo || {};
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fullName} - Resume</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: ${template.fontStyle === 'serif' ? 'Georgia, "Times New Roman", serif' : 
                        template.fontStyle === 'classic' ? '"Times New Roman", serif' : 
                        'Arial, "Helvetica Neue", sans-serif'};
            line-height: 1.5;
            color: #333;
            background: white;
            font-size: 11px;
            padding: 0;
            margin: 0;
          }
          
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          @media print {
            body { margin: 0; padding: 0; }
            * { print-color-adjust: exact !important; }
          }
          
          .resume-container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
            min-height: 11in;
          }
          
          .resume-header {
            text-align: center;
            padding: 25px 20px;
            background: linear-gradient(135deg, ${template.colors.primary}15, ${template.colors.secondary}10);
            border-bottom: 3px solid ${template.colors.primary};
            margin-bottom: 25px;
          }
          
          .resume-name {
            font-size: 28px;
            font-weight: bold;
            color: ${template.colors.primary};
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .resume-contact {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          
          .resume-links {
            font-size: 10px;
            color: ${template.colors.secondary};
          }
          
          .resume-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: ${template.colors.primary};
            border-bottom: 2px solid ${template.colors.accent || template.colors.secondary};
            padding-bottom: 5px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .summary-text {
            font-size: 11px;
            line-height: 1.6;
            text-align: justify;
            color: #333;
            padding: 15px;
            background: ${template.colors.primary}08;
            border-radius: 6px;
            border: 1px solid ${template.colors.primary}20;
          }
          
          .job-entry {
            margin-bottom: 18px;
            padding-left: 12px;
            border-left: 3px solid ${template.colors.accent || template.colors.secondary};
          }
          
          .job-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          
          .job-title {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
          }
          
          .job-company {
            font-size: 12px;
            font-weight: 600;
            color: ${template.colors.primary};
            margin-bottom: 2px;
          }
          
          .job-location {
            font-size: 10px;
            color: #666;
            font-style: italic;
          }
          
          .job-dates {
            font-size: 10px;
            color: #666;
            font-weight: 500;
            white-space: nowrap;
          }
          
          .job-list {
            margin: 8px 0 0 16px;
            padding: 0;
          }
          
          .job-list li {
            margin-bottom: 4px;
            font-size: 10px;
            line-height: 1.4;
          }
          
          .skills-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .skill-tag {
            background: ${template.colors.primary}20;
            color: ${template.colors.primary};
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 500;
            border: 1px solid ${template.colors.primary}40;
          }
          
          .education-entry {
            margin-bottom: 12px;
            padding: 10px;
            background: ${template.colors.secondary}10;
            border-left: 4px solid ${template.colors.secondary};
          }
          
          .education-degree {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
          }
          
          .education-school {
            font-size: 11px;
            color: ${template.colors.primary};
            font-weight: 600;
            margin-bottom: 2px;
          }
          
          .education-details {
            font-size: 9px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="resume-container">
          <!-- Header -->
          <div class="resume-header">
            <div class="resume-name">${fullName}</div>
            <div class="resume-contact">
              ${personalInfo.email || ''} • ${personalInfo.phone || ''} • ${personalInfo.location || ''}
            </div>
            ${(personalInfo.linkedinUrl || personalInfo.portfolioUrl || personalInfo.githubUrl) ? `
              <div class="resume-links">
                ${personalInfo.linkedinUrl ? `LinkedIn: ${personalInfo.linkedinUrl}` : ''}
                ${personalInfo.portfolioUrl ? ` • Portfolio: ${personalInfo.portfolioUrl}` : ''}
                ${personalInfo.githubUrl ? ` • GitHub: ${personalInfo.githubUrl}` : ''}
              </div>
            ` : ''}
          </div>
          
          <!-- Professional Summary -->
          ${resumeData.professionalSummary ? `
            <div class="resume-section">
              <div class="section-title">Professional Summary</div>
              <div class="summary-text">${resumeData.professionalSummary}</div>
            </div>
          ` : ''}
          
          <!-- Work Experience -->
          ${resumeData.workExperience && resumeData.workExperience.length > 0 ? `
            <div class="resume-section">
              <div class="section-title">Professional Experience</div>
              ${resumeData.workExperience.map((job: any) => `
                <div class="job-entry">
                  <div class="job-header">
                    <div>
                      <div class="job-title">${job.jobTitle || ''}</div>
                      <div class="job-company">${job.company || ''}</div>
                      <div class="job-location">${job.location || ''}</div>
                    </div>
                    <div class="job-dates">
                      ${job.startDate || ''} - ${job.isCurrentJob ? 'Present' : (job.endDate || '')}
                    </div>
                  </div>
                  ${(job.responsibilities && job.responsibilities.length > 0) || (job.achievements && job.achievements.length > 0) ? `
                    <ul class="job-list">
                      ${(job.responsibilities || []).map((resp: string) => `<li>${resp}</li>`).join('')}
                      ${(job.achievements || []).map((ach: string) => `<li><strong>${ach}</strong></li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- Skills -->
          ${resumeData.skills && resumeData.skills.length > 0 ? `
            <div class="resume-section">
              <div class="section-title">Skills</div>
              <div class="skills-container">
                ${resumeData.skills.map((skill: any) => `
                  <span class="skill-tag">${typeof skill === 'string' ? skill : skill.name}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Education -->
          ${resumeData.education && resumeData.education.length > 0 ? `
            <div class="resume-section">
              <div class="section-title">Education</div>
              ${resumeData.education.map((edu: any) => `
                <div class="education-entry">
                  <div class="education-degree">${edu.degree || ''}</div>
                  <div class="education-school">${edu.institution || ''}</div>
                  <div class="education-details">
                    Graduated: ${edu.graduationDate ? new Date(edu.graduationDate).getFullYear() : ''}
                    ${edu.gpa ? ` • GPA: ${edu.gpa}` : ''}
                    ${edu.fieldOfStudy ? ` • ${edu.fieldOfStudy}` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- Projects -->
          ${resumeData.projects && resumeData.projects.length > 0 ? `
            <div class="resume-section">
              <div class="section-title">Projects</div>
              ${resumeData.projects.map((proj: any) => `
                <div class="job-entry">
                  <div class="job-title">${proj.name || ''}</div>
                  <div style="font-size: 10px; color: #666; margin-bottom: 6px;">${proj.description || ''}</div>
                  ${proj.technologies && proj.technologies.length > 0 ? `
                    <div class="skills-container">
                      ${proj.technologies.map((tech: string) => `<span class="skill-tag">${tech}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate DOCX file (placeholder - can be enhanced with docx library)
   */
  private async generateDOCXFile(resumeData: any, options?: { 
    optimizedLatexCode?: string;
    templateId?: string;
  }): Promise<Buffer> {
    console.log('📄 Generating DOCX with dynamic content', {
      hasOptimizedLatex: !!options?.optimizedLatexCode,
      templateId: options?.templateId
    });
    
    // If we have optimized LaTeX content, convert it to structured text
    if (options?.optimizedLatexCode) {
      const structuredContent = this.convertLatexToStructuredText(options.optimizedLatexCode, resumeData);
      return Buffer.from(structuredContent, 'utf-8');
    }
    
    // Otherwise use dynamic resume data (not hardcoded)
    const dynamicContent = this.generateDynamicTextContent(resumeData);
    return Buffer.from(dynamicContent, 'utf-8');
  }

  /**
   * Generate plain text file
   */
  private async generateTXTFile(resumeData: any): Promise<Buffer> {
    const textContent = this.generateTextContent(resumeData);
    return Buffer.from(textContent, 'utf-8');
  }

  /**
   * Generate plain text content
   */
  private generateTextContent(resumeData: any): string {
    const personalInfo = resumeData.personalInfo || {};
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    
    let content = `${fullName}\n`;
    content += `${personalInfo.email || ''} • ${personalInfo.phone || ''} • ${personalInfo.location || ''}\n\n`;
    
    if (resumeData.professionalSummary) {
      content += `PROFESSIONAL SUMMARY\n`;
      content += `${resumeData.professionalSummary}\n\n`;
    }
    
    if (resumeData.workExperience && resumeData.workExperience.length > 0) {
      content += `WORK EXPERIENCE\n`;
      resumeData.workExperience.forEach((job: any) => {
        content += `${job.jobTitle || ''} at ${job.company || ''}\n`;
        content += `${job.startDate || ''} - ${job.isCurrentJob ? 'Present' : (job.endDate || '')}\n`;
        if (job.responsibilities && job.responsibilities.length > 0) {
          job.responsibilities.forEach((resp: string) => {
            content += `• ${resp}\n`;
          });
        }
        content += `\n`;
      });
    }
    
    if (resumeData.education && resumeData.education.length > 0) {
      content += `EDUCATION\n`;
      resumeData.education.forEach((edu: any) => {
        content += `${edu.degree || ''} - ${edu.institution || ''}\n`;
        content += `Graduated: ${edu.graduationDate ? new Date(edu.graduationDate).getFullYear() : ''}\n\n`;
      });
    }
    
    if (resumeData.skills && resumeData.skills.length > 0) {
      content += `SKILLS\n`;
      const skillNames = resumeData.skills.map((skill: any) => 
        typeof skill === 'string' ? skill : skill.name
      ).join(', ');
      content += `${skillNames}\n\n`;
    }
    
    return content;
  }
  async createResume(data: CreateResumeData): Promise<IResume> {
    try {
      console.log('🔧 ResumeService.createResume called with full data:', data);

      // The resumeDataProcessor handles all validation and sanitization,
      // including the userId conversion.
      const resumeData = processCompleteResumeData(data);

      console.log('💾 Creating resume with processed data:', resumeData);

      const resume = new Resume(resumeData);

      console.log('💾 Attempting to save resume...');
      const savedResume = await resume.save();
      console.log('✅ Resume saved successfully with ID:', savedResume._id);
      
      // Clear user's resumes cache (with error handling)
      try {
        await this.clearUserResumesCache(data.userId);
      } catch (cacheError) {
        console.warn('⚠️ Failed to clear cache, but resume was saved:', cacheError);
      }
      
      return savedResume;
    } catch (error) {
      console.error('❌ Error creating resume in service:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        console.error('📋 Mongoose validation errors:', Object.keys(error.errors));
        Object.entries(error.errors).forEach(([field, err]) => {
          console.error(`📋 Field ${field}:`, (err as any).message);
        });
      }
      if (error instanceof mongoose.Error.CastError) {
        console.error('📋 Mongoose cast error:', error.message, 'Path:', (error as any).path, 'Value:', (error as any).value);
      }
      throw new Error(`Failed to create resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserResumes(userId: string): Promise<IResume[]> {
    try {
      console.log('🔍 ResumeService.getUserResumes: Starting fetch for userId:', userId);
      
      const cacheKey = `user:${userId}:resumes`;
      
      // Try to get from cache first
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsedResumes = JSON.parse(cached);
          console.log('💾 ResumeService: Found cached resumes:', parsedResumes.length);
          return parsedResumes;
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache error (will continue with DB):', cacheError);
      }

      console.log('🗄️ ResumeService: Querying database for resumes...');
      const resumes = await Resume.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 });

      console.log('✅ ResumeService: Found', resumes.length, 'resumes in database');
      console.log('📄 ResumeService: Resume titles:', resumes.map(r => r.title));

      // Cache for 15 minutes
      try {
        await redisClient.setEx(cacheKey, 900, JSON.stringify(resumes));
        console.log('💾 ResumeService: Cached resumes successfully');
      } catch (cacheError) {
        console.warn('⚠️ Cache set error (will continue):', cacheError);
      }

      return resumes;
    } catch (error) {
      console.error('❌ ResumeService: Error fetching user resumes:', error);
      throw new Error('Failed to fetch resumes');
    }
  }

  async getResumeById(id: string, userId: string): Promise<IResume | null> {
    try {
      const resume = await Resume.findOne({ 
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      }); // Include all fields including generatedFiles
      
      if (resume?.generatedFiles?.pdf?.data) {
        console.log('✅ Found saved PDF in database:', {
          filename: resume.generatedFiles.pdf.filename,
          size: resume.generatedFiles.pdf.data.length,
          generatedAt: resume.generatedFiles.pdf.generatedAt
        });
      } else {
        console.log('ℹ️ No saved PDF found for resume:', id);
      }
      
      return resume;
    } catch (error) {
      console.error('Error fetching resume:', error);
      throw new Error('Failed to fetch resume');
    }
  }

  async updateResume(id: string, userId: string, updateData: Partial<CreateResumeData>): Promise<IResume | null> {
    try {
      // Validate userId and id format
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid resume ID provided');
      }

      // Validate ObjectId formats
      let userObjectId;
      let resumeObjectId;
      try {
        userObjectId = new mongoose.Types.ObjectId(userId);
        resumeObjectId = new mongoose.Types.ObjectId(id);
      } catch (error) {
        console.error('❌ Invalid ObjectId format:', { userId, id });
        throw new Error('Invalid ID format. Must be valid ObjectIds.');
      }

      // Process partial resume data using the utility function
      const processedUpdateData = processPartialResumeData(updateData);
      
      console.log('🔧 ResumeService.updateResume: Processing update data:', {
        resumeId: id,
        userId,
        fieldsToUpdate: Object.keys(processedUpdateData)
      });

      const resume = await Resume.findOneAndUpdate(
        { 
          _id: resumeObjectId,
          userId: userObjectId
        },
        processedUpdateData,
        { new: true }
      );

      if (resume) {
        // Clear user's resumes cache
        try {
          await this.clearUserResumesCache(userId);
          console.log('✅ Resume updated and cache cleared successfully');
        } catch (cacheError) {
          console.warn('⚠️ Failed to clear cache, but resume was updated:', cacheError);
        }
      } else {
        console.warn('⚠️ Resume not found or user not authorized:', { id, userId });
      }

      return resume;
    } catch (error) {
      console.error('❌ Error updating resume in service:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        console.error('📋 Mongoose validation errors:', Object.keys(error.errors));
        Object.entries(error.errors).forEach(([field, err]) => {
          console.error(`📋 Field ${field}:`, (err as any).message);
        });
      }
      if (error instanceof mongoose.Error.CastError) {
        console.error('📋 Mongoose cast error:', error.message, 'Path:', (error as any).path, 'Value:', (error as any).value);
      }
      throw new Error(`Failed to update resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteResume(id: string, userId: string): Promise<boolean> {
    try {
      const result = await Resume.deleteOne({ 
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (result.deletedCount > 0) {
        // Clear user's resumes cache
        await this.clearUserResumesCache(userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw new Error('Failed to delete resume');
    }
  }

  async optimizeResumeForJob(id: string, userId: string, optimizationData: OptimizeResumeData): Promise<any> {
    try {
      const resume = await this.getResumeById(id, userId);
      if (!resume) {
        throw new Error('Resume not found');
      }

      const optimizedData = await geminiService.optimizeResume({
        resumeData: resume.toObject(),
        jobDescription: optimizationData.jobDescription,
        jobTitle: optimizationData.jobTitle,
        companyName: optimizationData.companyName
      });

      return optimizedData;
    } catch (error) {
      console.error('Error optimizing resume:', error);
      throw new Error('Failed to optimize resume');
    }
  }

  async parseResumeFromText(text: string): Promise<any> {
    try {
      const parsedData = await geminiService.extractResumeFromText(text);
      return parsedData;
    } catch (error) {
      console.error('Error parsing resume text:', error);
      throw new Error('Failed to parse resume');
    }
  }

  // Duplicate function removed - using the first implementation above

  private async generatePDF(resumeData: any): Promise<Buffer> {
    return await templateRenderer.generatePDF(resumeData);
  }

  private async generateDOCX(resumeData: any): Promise<Buffer> {
    return await templateRenderer.generateDOCX(resumeData);
  }

  private async generateTXT(resumeData: any): Promise<Buffer> {
    const textContent = this.generateResumeText(resumeData);
    return Buffer.from(textContent, 'utf8');
  }

  private generateResumeText(resumeData: any): string {
    const lines: string[] = [];
    
    // Header
    if (resumeData.personalInfo) {
      const { firstName, lastName, email, phone, location, linkedinUrl, portfolioUrl, githubUrl } = resumeData.personalInfo;
      lines.push(`${firstName} ${lastName}`);
      lines.push(''.padEnd(30, '='));
      lines.push('');
      
      lines.push('CONTACT INFORMATION');
      lines.push(`Email: ${email}`);
      lines.push(`Phone: ${phone}`);
      lines.push(`Location: ${location}`);
      if (linkedinUrl) lines.push(`LinkedIn: ${linkedinUrl}`);
      if (portfolioUrl) lines.push(`Portfolio: ${portfolioUrl}`);
      if (githubUrl) lines.push(`GitHub: ${githubUrl}`);
      lines.push('');
    }

    // Professional Summary
    if (resumeData.professionalSummary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push(''.padEnd(20, '-'));
      lines.push(resumeData.professionalSummary);
      lines.push('');
    }

    // Work Experience
    if (resumeData.workExperience?.length > 0) {
      lines.push('WORK EXPERIENCE');
      lines.push(''.padEnd(15, '-'));
      resumeData.workExperience.forEach((job: any) => {
        lines.push(`${job.jobTitle} | ${job.company}`);
        lines.push(`${job.location} | ${job.startDate} - ${job.isCurrentJob ? 'Present' : job.endDate}`);
        
        if (job.responsibilities?.length > 0) {
          lines.push('Responsibilities:');
          job.responsibilities.forEach((resp: string) => lines.push(`• ${resp}`));
        }
        
        if (job.achievements?.length > 0) {
          lines.push('Key Achievements:');
          job.achievements.forEach((achievement: string) => lines.push(`• ${achievement}`));
        }
        
        lines.push('');
      });
    }

    // Education
    if (resumeData.education?.length > 0) {
      lines.push('EDUCATION');
      lines.push(''.padEnd(9, '-'));
      resumeData.education.forEach((edu: any) => {
        lines.push(`${edu.degree} in ${edu.fieldOfStudy}`);
        lines.push(`${edu.institution} | ${edu.graduationDate}`);
        if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
        if (edu.honors?.length > 0) lines.push(`Honors: ${edu.honors.join(', ')}`);
        lines.push('');
      });
    }

    // Skills
    if (resumeData.skills?.length > 0) {
      lines.push('SKILLS');
      lines.push(''.padEnd(6, '-'));
      const skillsByCategory = resumeData.skills.reduce((acc: any, skill: any) => {
        if (!acc[skill.category]) acc[skill.category] = [];
        acc[skill.category].push(skill.name);
        return acc;
      }, {});
      
      Object.entries(skillsByCategory).forEach(([category, skills]: [string, any]) => {
        lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${skills.join(', ')}`);
      });
      lines.push('');
    }

    // Projects
    if (resumeData.projects?.length > 0) {
      lines.push('PROJECTS');
      lines.push(''.padEnd(8, '-'));
      resumeData.projects.forEach((project: any) => {
        lines.push(`${project.name}${project.url ? ` | ${project.url}` : ''}`);
        lines.push(project.description);
        if (project.technologies?.length > 0) {
          lines.push(`Technologies: ${project.technologies.join(', ')}`);
        }
        lines.push('');
      });
    }

    // Certifications
    if (resumeData.certifications?.length > 0) {
      lines.push('CERTIFICATIONS');
      lines.push(''.padEnd(13, '-'));
      resumeData.certifications.forEach((cert: string) => lines.push(`• ${cert}`));
      lines.push('');
    }

    // Languages
    if (resumeData.languages?.length > 0) {
      lines.push('LANGUAGES');
      lines.push(''.padEnd(9, '-'));
      resumeData.languages.forEach((lang: any) => {
        lines.push(`• ${lang.name} (${lang.proficiency})`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  private async clearUserResumesCache(userId: string): Promise<void> {
    try {
      await redisClient.del(`user:${userId}:resumes`);
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Don't throw error for cache operations
    }
  }

  /**
   * Select optimal PDF generation engine based on template and data
   */
  private selectOptimalEngine(resumeData: any, templateId?: string): 'latex' | 'html' {
    // Check if it's an Overleaf template
    if (templateId && overleafTemplateManager.getTemplate(templateId)) {
      return 'latex';
    }
    
    // Check if LaTeX is available
    // In production, you'd cache this check
    return 'latex'; // Default to LaTeX for better quality
  }

  /**
   * Convert resume data to LaTeX-compatible format
   */
  private convertToLatexData(resumeData: any): LaTeXTemplateData {
    return {
      personalInfo: {
        firstName: resumeData.personalInfo?.firstName || '',
        lastName: resumeData.personalInfo?.lastName || '',
        email: resumeData.personalInfo?.email || '',
        phone: resumeData.personalInfo?.phone || '',
        location: resumeData.personalInfo?.location || '',
        linkedinUrl: resumeData.personalInfo?.linkedinUrl,
        portfolioUrl: resumeData.personalInfo?.portfolioUrl,
        githubUrl: resumeData.personalInfo?.githubUrl,
        professionalTitle: resumeData.personalInfo?.professionalTitle,
        websiteUrl: resumeData.personalInfo?.websiteUrl
      },
      professionalSummary: resumeData.professionalSummary || '',
      workExperience: resumeData.workExperience || [],
      education: resumeData.education || [],
      skills: resumeData.skills || [],
      certifications: resumeData.certifications || [],
      languages: resumeData.languages?.map((lang: any) => ({ 
        name: lang.name || lang, 
        proficiency: lang.proficiency || 'Fluent' 
      })) || [],
      projects: resumeData.projects || [],
      // CRITICAL FIX: Include missing fields
      publications: resumeData.publications || [],
      references: resumeData.references || [],
      additionalSections: resumeData.additionalSections || [],
      volunteerExperience: resumeData.volunteerExperience || [],
      awards: resumeData.awards || [],
      hobbies: resumeData.hobbies || []
    };
  }

  /**
   * Select appropriate LaTeX template based on resume data or preferences
   */
  private selectLatexTemplate(resumeData: any): string {
    // Check if resume has a preferred template
    if (resumeData.templateId) {
      const overleafTemplate = overleafTemplateManager.getTemplate(resumeData.templateId);
      if (overleafTemplate) {
        return resumeData.templateId;
      }
    }
    
    // Select based on resume content/style
    const availableTemplates = overleafTemplateManager.getAvailableTemplates();
    
    if (availableTemplates.length > 0) {
      // For now, return first available template
      // Later we can add logic to select based on profession, style, etc.
      return availableTemplates[0].id;
    }
    
    // Fallback to basic template
    return 'basic';
  }

  /**
   * Get available LaTeX templates (from public/templates directory)
   */
  async getAvailableLatexTemplates() {
    try {
      // Get templates from public directory via AI generator
      const publicTemplates = await latexService.getAvailableTemplates();
      
      // Also get any manually installed Overleaf templates
      const overleafTemplates = overleafTemplateManager.getAvailableTemplates().map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        screenshotUrl: template.preview.screenshotUrl,
        preview: template.preview
      }));
      
      // Combine both sources
      return [...publicTemplates, ...overleafTemplates];
    } catch (error) {
      console.error('Failed to get LaTeX templates:', error);
      return [];
    }
  }

  /**
   * Install new Overleaf template (for when you provide LaTeX source)
   */
  async installOverleafTemplate(templateData: {
    id: string;
    name: string;
    description: string;
    category: 'modern' | 'professional' | 'creative' | 'academic' | 'minimalist';
    latexSource: string;
    styleFiles?: { [filename: string]: string };
  }) {
    return await overleafTemplateManager.installOverleafTemplate(templateData);
  }

  /**
   * Generate preview for template (for template gallery)
   */
  async generateTemplatePreview(templateId: string) {
    const sampleData = overleafTemplateManager.createSampleData();
    return await overleafTemplateManager.generateTemplatePreview(templateId, sampleData);
  }

  async generateLatexResumePDF(resumeData: any, options: { 
    templateId: string; 
    outputFormat: string; 
    cleanup?: boolean;
    optimizedLatexCode?: string;
  }): Promise<Buffer> {
    console.log(`🔧 Generating LaTeX PDF for template: ${options.templateId}`, {
      hasOptimizedLatex: !!options.optimizedLatexCode
    });
    
    try {
      // If we have optimized LaTeX code, use it directly
      if (options.optimizedLatexCode) {
        console.log('🎯 Using optimized LaTeX code for PDF generation');
        
        // Use LaTeX service to compile the pre-generated LaTeX directly  
        const pdfBuffer = await latexService.compileLatexToPDF(
          options.optimizedLatexCode,
          options.templateId,
          options.outputFormat as "pdf" | "png" | "jpeg"
        );
        
        console.log('✅ PDF generated from optimized LaTeX code');
        return pdfBuffer;
      }
      
      // Fallback to standard template-based generation  
      console.log('📝 Converting resume data to LaTeX format...');
      const latexTemplateData = this.convertToLatexTemplateData(resumeData);
      console.log('✅ Resume data conversion successful');
      
      // Use LaTeX service to compile PDF
      console.log('🏗️ Starting LaTeX compilation...');
      const pdfBuffer = await latexService.compileResume(latexTemplateData, {
        templateId: options.templateId,
        outputFormat: 'pdf',
        cleanup: options.cleanup !== false
      });
      console.log('✅ LaTeX compilation successful');
      
      return pdfBuffer;
    } catch (error) {
      console.error('❌ LaTeX PDF generation failed:', error);
      console.error('Template ID:', options.templateId);
      console.error('Resume data keys:', Object.keys(resumeData));
      throw error;
    }
  }


  private convertToLatexTemplateData(resumeData: any): any {
    // Convert frontend resume format to LaTeX template format
    return {
      personalInfo: {
        firstName: resumeData.personalInfo?.firstName || '',
        lastName: resumeData.personalInfo?.lastName || '',
        email: resumeData.personalInfo?.email || '',
        phone: resumeData.personalInfo?.phone || '',
        location: resumeData.personalInfo?.location || '',
        linkedinUrl: resumeData.personalInfo?.linkedinUrl || '',
        portfolioUrl: resumeData.personalInfo?.portfolioUrl || '',
        githubUrl: resumeData.personalInfo?.githubUrl || ''
      },
      professionalSummary: resumeData.professionalSummary || '',
      workExperience: (resumeData.workExperience || []).map((exp: any) => ({
        jobTitle: exp.jobTitle || '',
        companyName: exp.company || exp.companyName || '',
        location: exp.location || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || (exp.isCurrentJob ? 'Present' : ''),
        achievements: exp.achievements || [],
        responsibilities: exp.responsibilities || []
      })),
      education: (resumeData.education || []).map((edu: any) => ({
        degree: edu.degree || '',
        institution: edu.institution || '',
        location: edu.location || '',
        graduationDate: edu.graduationDate || '',
        gpa: edu.gpa || ''
      })),
      skills: (resumeData.skills || []).map((skill: any) => ({
        name: skill.name || '',
        category: skill.category || 'Technical Skills'
      })),
      certifications: resumeData.certifications || [],
      projects: (resumeData.projects || []).map((project: any) => ({
        name: project.name || '',
        description: project.description || '',
        technologies: project.technologies || [],
        url: project.url || ''
      })),
      languages: (resumeData.languages || []).map((lang: any) => ({
        name: lang.name || '',
        proficiency: lang.proficiency || 'Intermediate'
      }))
    };
  }

  /**
   * Convert LaTeX optimized content to structured text format
   */
  private convertLatexToStructuredText(latexCode: string, resumeData: any): string {
    console.log('🔄 Converting optimized LaTeX to structured text format');
    
    const personalInfo = resumeData.personalInfo || {};
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    
    const lines: string[] = [];
    
    // Header with job-optimized indicator
    lines.push('='.repeat(50));
    lines.push(`${fullName.toUpperCase()}`);
    lines.push('JOB-OPTIMIZED RESUME');
    lines.push('Generated with AI LaTeX Optimization');
    lines.push('='.repeat(50));
    lines.push('');
    
    // Extract sections from LaTeX (basic parsing)
    if (latexCode.includes('\\section') || latexCode.includes('\\textbf')) {
      lines.push('NOTICE: This resume has been optimized with AI-powered LaTeX formatting.');
      lines.push('The content has been tailored for specific job requirements.');
      lines.push('');
    }
    
    // Add dynamic content from resume data
    this.addDynamicSections(lines, resumeData);
    
    return lines.join('\n');
  }

  /**
   * Generate dynamic text content (not hardcoded)
   */
  private generateDynamicTextContent(resumeData: any): string {
    const personalInfo = resumeData.personalInfo || {};
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    
    const lines: string[] = [];
    
    // Header
    lines.push('='.repeat(40));
    lines.push(`${fullName.toUpperCase()}`);
    lines.push('PROFESSIONAL RESUME');
    lines.push('='.repeat(40));
    lines.push('');
    
    this.addDynamicSections(lines, resumeData);
    
    return lines.join('\n');
  }

  /**
   * Add dynamic sections to the document
   */
  private addDynamicSections(lines: string[], resumeData: any): void {
    const personalInfo = resumeData.personalInfo || {};
    
    // Contact Information
    if (personalInfo.email || personalInfo.phone) {
      lines.push('CONTACT INFORMATION');
      lines.push('-'.repeat(20));
      if (personalInfo.email) lines.push(`Email: ${personalInfo.email}`);
      if (personalInfo.phone) lines.push(`Phone: ${personalInfo.phone}`);
      if (personalInfo.location) lines.push(`Location: ${personalInfo.location}`);
      if (personalInfo.linkedinUrl) lines.push(`LinkedIn: ${personalInfo.linkedinUrl}`);
      if (personalInfo.portfolioUrl) lines.push(`Portfolio: ${personalInfo.portfolioUrl}`);
      if (personalInfo.githubUrl) lines.push(`GitHub: ${personalInfo.githubUrl}`);
      lines.push('');
    }

    // Professional Summary
    if (resumeData.professionalSummary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push('-'.repeat(21));
      lines.push(resumeData.professionalSummary);
      lines.push('');
    }

    // Work Experience
    if (resumeData.workExperience && resumeData.workExperience.length > 0) {
      lines.push('WORK EXPERIENCE');
      lines.push('-'.repeat(15));
      resumeData.workExperience.forEach((exp: any, index: number) => {
        lines.push(`${index + 1}. ${exp.jobTitle || exp.title} at ${exp.companyName || exp.company}`);
        lines.push(`   ${exp.location} | ${exp.startDate} - ${exp.endDate || 'Present'}`);
        if (exp.achievements && exp.achievements.length > 0) {
          lines.push('   Key Achievements:');
          exp.achievements.forEach((achievement: string) => {
            lines.push(`   • ${achievement}`);
          });
        }
        lines.push('');
      });
    }

    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      lines.push('EDUCATION');
      lines.push('-'.repeat(9));
      resumeData.education.forEach((edu: any, index: number) => {
        lines.push(`${index + 1}. ${edu.degree} in ${edu.fieldOfStudy || 'N/A'}`);
        lines.push(`   ${edu.institution}`);
        lines.push(`   Graduated: ${edu.graduationDate}`);
        if (edu.gpa) lines.push(`   GPA: ${edu.gpa}`);
        lines.push('');
      });
    }

    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      lines.push('SKILLS');
      lines.push('-'.repeat(6));
      
      const skillsByCategory: { [key: string]: string[] } = {};
      resumeData.skills.forEach((skill: any) => {
        const skillName = typeof skill === 'string' ? skill : skill.name;
        const category = skill.category || 'General';
        if (!skillsByCategory[category]) skillsByCategory[category] = [];
        skillsByCategory[category].push(skillName);
      });
      
      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        lines.push(`${category}: ${skills.join(', ')}`);
      });
      lines.push('');
    }
  }

  /**
   * Save generated PDF to database
   */
  async savePDFToDatabase(
    resumeId: string, 
    userId: string, 
    pdfBuffer: Buffer, 
    options: {
      templateId: string;
      isOptimized: boolean;
      jobOptimized?: {
        jobUrl: string;
        jobTitle: string;
        companyName: string;
      };
    }
  ): Promise<void> {
    try {
      console.log('💾 Saving PDF to database:', {
        resumeId,
        pdfSize: pdfBuffer.length,
        isOptimized: options.isOptimized,
        hasJobData: !!options.jobOptimized
      });

      console.log('🔍 savePDFToDatabase called with:', {
        resumeId: resumeId,
        resumeIdType: typeof resumeId,
        userId: userId,
        userIdType: typeof userId,
        bufferSize: pdfBuffer.length
      });

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new Error(`Invalid resumeId format: ${resumeId}`);
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(`Invalid userId format: ${userId}`);
      }

      const resume = await Resume.findOne(
        { _id: new mongoose.Types.ObjectId(resumeId), userId: new mongoose.Types.ObjectId(userId) },
        { 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 }
      );

      console.log('🔍 Resume found:', !!resume, resume?.personalInfo);

      if (!resume || !resume.personalInfo) {
        throw new Error('Resume or personal info not found');
      }

      const filename = `${resume.personalInfo.firstName}_${resume.personalInfo.lastName}_Resume_${Date.now()}.pdf`;

      const updateResult = await Resume.updateOne(
        { _id: new mongoose.Types.ObjectId(resumeId), userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            'generatedFiles.pdf': {
              data: pdfBuffer,
              filename,
              generatedAt: new Date(),
              templateId: options.templateId,
              isOptimized: options.isOptimized,
              jobOptimized: options.jobOptimized
            },
            'generatedFiles.lastGenerated': new Date()
          }
        }
      );

      console.log('🔍 Update result:', updateResult);

      if (updateResult.matchedCount === 0) {
        throw new Error('Resume not found or user not authorized');
      }

      if (updateResult.modifiedCount === 0) {
        console.warn('⚠️ No documents were modified, but update succeeded');
      }

      console.log('✅ PDF saved to database successfully');
    } catch (error) {
      console.error('❌ Failed to save PDF to database:', error);
      throw error;
    }
  }

  /**
   * Retrieve saved PDF from database
   */
  async getSavedPDF(resumeId: string, userId: string): Promise<{
    pdfBuffer: Buffer;
    filename: string;
    generatedAt: Date;
    isOptimized: boolean;
  } | null> {
    try {
      const resume = await Resume.findOne(
        { _id: new mongoose.Types.ObjectId(resumeId), userId: new mongoose.Types.ObjectId(userId) },
        { 'generatedFiles.pdf': 1 }
      );

      if (!resume?.generatedFiles?.pdf) {
        return null;
      }

      const pdfData = resume.generatedFiles.pdf;
      return {
        pdfBuffer: pdfData.data,
        filename: pdfData.filename,
        generatedAt: pdfData.generatedAt,
        isOptimized: pdfData.isOptimized
      };
    } catch (error) {
      console.error('❌ Failed to retrieve PDF from database:', error);
      return null;
    }
  }

  /**
   * Use pdf-lib to overlay tracking information onto an existing PDF
   * This is much more reliable and faster than regenerating from LaTeX
   * especially for external job applications.
   */
  async attachTrackingToPDF(pdfBuffer: Buffer, trackingUrl: string): Promise<Buffer> {
    try {
      console.log('🔗 [PDF-LIB] Attaching tracking layer to existing PDF...');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      
      const footerText = `INTELLIGENCE TRACKING ACTIVE: ${trackingUrl}`;
      
      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Add a subtle white background rectangle for the footer to ensure readability
        // regardless of resume content background
        page.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: 25,
          color: rgb(1, 1, 1),
          opacity: 0.95,
        });

        // Draw the tracking text in brand blue
        page.drawText(footerText, {
          x: 40,
          y: 10,
          size: 7,
          font: helveticaFont,
          color: rgb(0.1, 0.57, 0.94), // #1a91f0 Brand Blue
        });
        
        // Add a tiny decorative line
        page.drawLine({
          start: { x: 40, y: 20 },
          end: { x: width - 40, y: 20 },
          thickness: 0.5,
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.5
        });
      }
      
      const modifiedPdfBytes = await pdfDoc.save();
      console.log(`✅ [PDF-LIB] Tracking layer synthesized successfully (${modifiedPdfBytes.length} bytes)`);
      return Buffer.from(modifiedPdfBytes);
    } catch (error) {
      console.error('❌ Failed to attach tracking to PDF:', error);
      return pdfBuffer; // Return original if modification fails to prevent total failure
    }
  }

  async getSavedPDFInfo(resumeId: string, userId: string): Promise<any> {
    try {
      const resume = await Resume.findOne(
        { _id: new mongoose.Types.ObjectId(resumeId), userId: new mongoose.Types.ObjectId(userId) },
        { 'generatedFiles.pdf': 1 }
      );

      if (!resume?.generatedFiles?.pdf) {
        return null;
      }

      const { data, ...pdfInfo } = resume.generatedFiles.pdf;
      return pdfInfo;
    } catch (error) {
      console.error('❌ Failed to retrieve PDF info from database:', error);
      return null;
    }
  }

  /**
   * Save optimized LaTeX code to database
   */
  async saveOptimizedLatexCode(
    resumeId: string,
    userId: string,
    latexCode: string,
    jobData: {
      jobUrl: string;
      jobTitle: string;
      companyName: string;
    }
  ): Promise<void> {
    try {
      await Resume.updateOne(
        { _id: new mongoose.Types.ObjectId(resumeId), userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            'aiGenerated.optimizedLatexCode': latexCode,
            'aiGenerated.lastJobOptimization': {
              jobUrl: jobData.jobUrl,
              jobTitle: jobData.jobTitle,
              companyName: jobData.companyName,
              optimizedAt: new Date()
            },
            'aiGenerated.lastOptimized': new Date()
          }
        }
      );
      console.log('✅ Optimized LaTeX code saved to database');
    } catch (error) {
      console.error('❌ Failed to save optimized LaTeX code:', error);
      throw error;
    }
  }

  /**
   * Generate and save PDF with resume data
   */
  async generateAndSavePDF(
    resumeId: string,
    userId: string,
    resumeData: any,
    options: {
      templateId: string;
      optimizedLatexCode?: string;
      jobOptimized?: {
        jobUrl: string;
        jobTitle: string;
        companyName: string;
      };
    }
  ): Promise<Buffer> {
    try {
      console.log('🎯 Generating and saving PDF with resume data');

      // Generate PDF using existing logic
      const pdfBuffer = await this.generateLatexPDF(
        resumeData,
        options.templateId,
        options.optimizedLatexCode
      );

      // Save PDF to database
      await this.savePDFToDatabase(resumeId, userId, pdfBuffer, {
        templateId: options.templateId,
        isOptimized: !!options.optimizedLatexCode,
        jobOptimized: options.jobOptimized
      });

      // Save optimized LaTeX code if provided
      if (options.optimizedLatexCode && options.jobOptimized) {
        await this.saveOptimizedLatexCode(resumeId, userId, options.optimizedLatexCode, options.jobOptimized);
      }

      return pdfBuffer;
    } catch (error) {
      console.error('❌ Failed to generate and save PDF:', error);
      throw error;
    }
  }
}

export const resumeService = new ResumeService();