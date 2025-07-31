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
   * Enterprise-grade PDF generation using server-side rendering
   * Generates high-quality PDFs with proper fonts and styling
   */
  async generateResumeFile(resumeData: any, format: 'pdf' | 'docx' | 'txt'): Promise<Buffer> {
    console.log('🏭 Enterprise PDF Generation starting...', { format, hasData: !!resumeData });
    
    if (format === 'pdf') {
      return await this.generatePDFFile(resumeData);
    } else if (format === 'docx') {
      return await this.generateDOCXFile(resumeData);
    } else if (format === 'txt') {
      return await this.generateTXTFile(resumeData);
    } else {
      throw new Error('Unsupported format');
    }
  }

  /**
   * High-quality PDF generation using Puppeteer
   * Enterprise-ready with proper error handling and optimization
   */
  private async generatePDFFile(resumeData: any): Promise<Buffer> {
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
        executablePath: process.env.NODE_ENV === 'production' ? '/usr/bin/chromium-browser' : undefined,
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
  private async generateDOCXFile(resumeData: any): Promise<Buffer> {
    // For now, return a simple text buffer
    // In production, you'd use a library like 'docx' to create proper Word documents
    const textContent = this.generateTextContent(resumeData);
    return Buffer.from(textContent, 'utf-8');
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

      // Validate userId format
      if (!data.userId || typeof data.userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      // Validate ObjectId format
      let userObjectId;
      try {
        userObjectId = new mongoose.Types.ObjectId(data.userId);
      } catch (error) {
        console.error('❌ Invalid ObjectId format for userId:', data.userId);
        throw new Error(`Invalid userId format: ${data.userId}. Must be a valid ObjectId.`);
      }

      // Sanitize education data to match schema
      const sanitizedEducation = Array.isArray(data.education) ? data.education.map((edu: any) => ({
        institution: edu.institution || '',
        degree: edu.degree || '',
        fieldOfStudy: edu.fieldOfStudy || '',
        graduationDate: edu.endDate || edu.graduationDate || new Date(),
        gpa: edu.gpa || undefined,
        honors: Array.isArray(edu.honors) ? edu.honors : []
      })) : [];

      // Sanitize skills data to match schema
      const sanitizedSkills = Array.isArray(data.skills) ? data.skills.map((skill: any) => ({
        name: skill.name || '',
        category: skill.category || 'technical',
        proficiencyLevel: skill.proficiencyLevel || undefined
      })) : [];

      // Sanitize work experience data
      const sanitizedWorkExperience = Array.isArray(data.workExperience) ? data.workExperience.map((work: any) => ({
        jobTitle: work.jobTitle || work.position || '',
        company: work.company || '',
        location: work.location || '',
        startDate: work.startDate ? new Date(work.startDate) : new Date(),
        endDate: work.endDate && !work.isCurrentJob ? new Date(work.endDate) : undefined,
        isCurrentJob: work.isCurrentJob || false,
        responsibilities: Array.isArray(work.responsibilities) ? work.responsibilities : [],
        achievements: Array.isArray(work.achievements) ? work.achievements : []
      })) : [];

      // Validate required personal info fields
      if (!data.personalInfo?.firstName?.trim()) {
        throw new Error('First name is required');
      }
      if (!data.personalInfo?.lastName?.trim()) {
        throw new Error('Last name is required');
      }
      if (!data.personalInfo?.email?.trim()) {
        throw new Error('Email is required');
      }
      if (!data.personalInfo?.phone?.trim()) {
        throw new Error('Phone number is required');
      }

      // Ensure required fields have defaults
      const resumeData = {
        userId: userObjectId,
        title: data.title || 'Untitled Resume',
        personalInfo: {
          firstName: data.personalInfo.firstName.trim(),
          lastName: data.personalInfo.lastName.trim(),
          email: data.personalInfo.email.trim(),
          phone: data.personalInfo.phone.trim(),
          location: data.personalInfo?.location?.trim() || '',
          linkedinUrl: data.personalInfo?.linkedinUrl || undefined,
          portfolioUrl: data.personalInfo?.portfolioUrl || undefined,
          githubUrl: data.personalInfo?.githubUrl || undefined,
          websiteUrl: (data.personalInfo as any)?.websiteUrl || undefined,
          professionalTitle: (data.personalInfo as any)?.professionalTitle || undefined
        },
        professionalSummary: (data.professionalSummary && data.professionalSummary.trim()) || 'Professional seeking new opportunities.',
        workExperience: sanitizedWorkExperience,
        education: sanitizedEducation,
        skills: sanitizedSkills,
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        templateId: data.templateId || 'modern-1'
      };

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
          console.error(`📋 Field ${field}:`, err.message);
        });
      }
      if (error instanceof mongoose.Error.CastError) {
        console.error('📋 Mongoose cast error:', error.message, 'Path:', error.path, 'Value:', error.value);
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
      });
      
      return resume;
    } catch (error) {
      console.error('Error fetching resume:', error);
      throw new Error('Failed to fetch resume');
    }
  }

  async updateResume(id: string, userId: string, updateData: Partial<CreateResumeData>): Promise<IResume | null> {
    try {
      const resume = await Resume.findOneAndUpdate(
        { 
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId)
        },
        updateData,
        { new: true }
      );

      if (resume) {
        // Clear user's resumes cache
        await this.clearUserResumesCache(userId);
      }

      return resume;
    } catch (error) {
      console.error('Error updating resume:', error);
      throw new Error('Failed to update resume');
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
}

export const resumeService = new ResumeService();