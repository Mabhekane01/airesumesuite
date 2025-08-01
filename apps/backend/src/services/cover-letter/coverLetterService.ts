import { CoverLetter, ICoverLetter } from '../../models/CoverLetter';
import { Resume, IResume } from '../../models/Resume';
import { geminiService } from '../ai/gemini';
import { jobScrapingService } from '../job-scraper/jobScrapingService';
import { redisClient } from '../../config/redis';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CreateCoverLetterData {
  userId: string;
  resumeId?: string;
  title: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  jobDescription?: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  templateId?: string;
}

export interface GenerateCoverLetterFromJobData {
  userId: string;
  resumeId: string;
  jobUrl: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
}

export interface UpdateCoverLetterData extends Partial<CreateCoverLetterData> {
  content?: string;
}

export class CoverLetterService {
  async createCoverLetter(data: CreateCoverLetterData): Promise<ICoverLetter> {
    try {
      let content = '';
      let jobDescription = data.jobDescription;

      // If job URL is provided, scrape the job posting
      if (data.jobUrl) {
        try {
          const jobData = await jobScrapingService.scrapeJobPosting(data.jobUrl);
          jobDescription = jobData.description;
        } catch (error) {
          console.warn('Failed to scrape job URL, using provided description');
        }
      }

      // Get resume data for context
      let resumeData: IResume | null = null;
      if (data.resumeId) {
        resumeData = await Resume.findOne({
          _id: new mongoose.Types.ObjectId(data.resumeId),
          userId: new mongoose.Types.ObjectId(data.userId)
        });
      }

      // Always attempt AI generation for personalized content
      try {
        content = await geminiService.generateCoverLetter({
          personalInfo: resumeData?.personalInfo || {
            firstName: 'Your',
            lastName: 'Name',
            email: 'your.email@example.com',
            phone: 'Your Phone',
            location: 'Your Location'
          },
          jobDescription: jobDescription || `We are seeking a qualified ${data.jobTitle} to join our team at ${data.companyName}. The ideal candidate will bring relevant experience and skills to contribute to our organization's success.`,
          jobTitle: data.jobTitle,
          companyName: data.companyName,
          tone: data.tone,
          resumeData: resumeData?.toObject(),
          keywordOptimization: true,
          customInstructions: !jobDescription ? 
            `Generate a personalized cover letter based on the candidate's background and the ${data.jobTitle} role at ${data.companyName}. Focus on transferable skills and enthusiasm for the role even without a detailed job description.` : undefined
        });
      } catch (aiError) {
        console.error('AI generation failed, attempting enhanced template generation:', aiError);
        
        // Enhanced fallback that still uses candidate data
        content = await this.generateEnhancedCoverLetter(data, resumeData);
      }

      const coverLetter = new CoverLetter({
        userId: new mongoose.Types.ObjectId(data.userId),
        resumeId: data.resumeId ? new mongoose.Types.ObjectId(data.resumeId) : undefined,
        title: data.title,
        content,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        jobUrl: data.jobUrl,
        jobDescription,
        tone: data.tone,
        templateId: data.templateId || 'classic-1'
      });

      const savedCoverLetter = await coverLetter.save();
      
      // Clear user's cover letters cache
      await this.clearUserCoverLettersCache(data.userId);
      
      return savedCoverLetter;
    } catch (error) {
      console.error('Error creating cover letter:', error);
      throw new Error('Failed to create cover letter');
    }
  }

  async generateCoverLetterFromJob(data: GenerateCoverLetterFromJobData): Promise<ICoverLetter> {
    try {
      // Scrape job posting
      const jobData = await jobScrapingService.scrapeJobPosting(data.jobUrl);
      
      // Create cover letter with scraped data
      const coverLetterData: CreateCoverLetterData = {
        userId: data.userId,
        resumeId: data.resumeId,
        title: `Cover Letter - ${jobData.title} at ${jobData.company}`,
        jobTitle: jobData.title,
        companyName: jobData.company,
        jobUrl: data.jobUrl,
        jobDescription: jobData.description,
        tone: data.tone
      };

      return await this.createCoverLetter(coverLetterData);
    } catch (error) {
      console.error('Error generating cover letter from job:', error);
      throw new Error('Failed to generate cover letter from job posting');
    }
  }

  async getUserCoverLetters(userId: string): Promise<ICoverLetter[]> {
    try {
      const cacheKey = `user:${userId}:coverletters`;
      
      // Try to get from cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const coverLetters = await CoverLetter.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      })
      .sort({ createdAt: -1 })
      .populate('resumeId', 'title');

      // Cache for 15 minutes
      await redisClient.setEx(cacheKey, 900, JSON.stringify(coverLetters));

      return coverLetters;
    } catch (error) {
      console.error('Error fetching user cover letters:', error);
      throw new Error('Failed to fetch cover letters');
    }
  }

  async getCoverLetterById(id: string, userId: string): Promise<ICoverLetter | null> {
    try {
      const coverLetter = await CoverLetter.findOne({ 
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('resumeId', 'title personalInfo');
      
      return coverLetter;
    } catch (error) {
      console.error('Error fetching cover letter:', error);
      throw new Error('Failed to fetch cover letter');
    }
  }

  async updateCoverLetter(id: string, userId: string, updateData: UpdateCoverLetterData): Promise<ICoverLetter | null> {
    try {
      const coverLetter = await CoverLetter.findOneAndUpdate(
        { 
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId)
        },
        updateData,
        { new: true }
      );

      if (coverLetter) {
        // Clear user's cover letters cache
        await this.clearUserCoverLettersCache(userId);
      }

      return coverLetter;
    } catch (error) {
      console.error('Error updating cover letter:', error);
      throw new Error('Failed to update cover letter');
    }
  }

  async intelligentUpdateCoverLetter(id: string, userId: string, updateData: UpdateCoverLetterData & { 
    enhanceWithAI?: boolean;
    focusAreas?: string[];
  }): Promise<ICoverLetter | null> {
    try {
      const { enhanceWithAI, focusAreas, ...basicUpdateData } = updateData;
      
      // If AI enhancement is requested and content is being updated
      if (enhanceWithAI && basicUpdateData.content) {
        const originalCoverLetter = await this.getCoverLetterById(id, userId);
        if (originalCoverLetter) {
          try {
            // Try to enhance the content with AI
            const enhancePrompt = `Improve this cover letter content while maintaining its core message:

${basicUpdateData.content}

Job Context:
- Position: ${originalCoverLetter.jobTitle}
- Company: ${originalCoverLetter.companyName}
- Tone: ${originalCoverLetter.tone}

Enhancement focus: ${focusAreas?.join(', ') || 'Overall improvement'}

Improvements needed:
1. Strengthen language and impact
2. Improve flow and readability
3. Add more specific value propositions
4. Ensure ATS optimization
5. Maintain authentic voice

Return only the enhanced cover letter content.`;

            const enhancedContent = await geminiService.generateText(enhancePrompt);
            if (enhancedContent && enhancedContent.length > 100) {
              basicUpdateData.content = enhancedContent;
              console.log('✅ Content enhanced with AI during update');
            }
          } catch (aiError) {
            console.warn('⚠️ AI enhancement failed during update, using original content:', aiError);
          }
        }
      }
      
      return await this.updateCoverLetter(id, userId, basicUpdateData);
    } catch (error) {
      console.error('Error in intelligent cover letter update:', error);
      throw new Error('Failed to intelligently update cover letter');
    }
  }

  async deleteCoverLetter(id: string, userId: string): Promise<boolean> {
    try {
      const result = await CoverLetter.deleteOne({ 
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (result.deletedCount > 0) {
        // Clear user's cover letters cache
        await this.clearUserCoverLettersCache(userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      throw new Error('Failed to delete cover letter');
    }
  }

  async regenerateCoverLetter(id: string, userId: string, newTone?: 'professional' | 'casual' | 'enthusiastic' | 'conservative'): Promise<ICoverLetter | null> {
    try {
      const coverLetter = await this.getCoverLetterById(id, userId);
      if (!coverLetter) {
        throw new Error('Cover letter not found');
      }

      // Get resume data for context
      let resumeData: IResume | null = null;
      if (coverLetter.resumeId) {
        resumeData = await Resume.findById(coverLetter.resumeId);
      }

      const tone = newTone || coverLetter.tone;

      // Regenerate content with advanced features
      const newContent = await geminiService.generateCoverLetter({
        personalInfo: resumeData?.personalInfo || {
          firstName: 'Your',
          lastName: 'Name',
          email: 'your.email@example.com',
          phone: 'Your Phone',
          location: 'Your Location'
        },
        jobDescription: coverLetter.jobDescription || '',
        jobTitle: coverLetter.jobTitle,
        companyName: coverLetter.companyName,
        tone,
        resumeData: resumeData?.toObject(),
        keywordOptimization: true
      });

      return await this.updateCoverLetter(id, userId, { 
        content: newContent,
        tone 
      });
    } catch (error) {
      console.error('Error regenerating cover letter:', error);
      throw new Error('Failed to regenerate cover letter');
    }
  }

  private async generateEnhancedCoverLetter(data: CreateCoverLetterData, resumeData: IResume | null): Promise<string> {
    const firstName = resumeData?.personalInfo?.firstName || 'Your';
    const lastName = resumeData?.personalInfo?.lastName || 'Name';
    const personalInfo = resumeData?.personalInfo || {};
    
    // Try AI enhancement one more time with a simpler prompt
    try {
      const enhancePrompt = `Create a personalized cover letter for ${firstName} ${lastName} applying for the ${data.jobTitle} position at ${data.companyName}.

Candidate Background:
${resumeData?.professionalSummary || 'Professional seeking new opportunities'}
Skills: ${resumeData?.skills?.map((s: any) => s.name).slice(0, 5).join(', ') || 'Various professional skills'}
Recent Experience: ${resumeData?.workExperience?.[0]?.jobTitle || 'Professional experience'} ${resumeData?.workExperience?.[0]?.company ? `at ${resumeData.workExperience[0].company}` : ''}

Create a compelling, personalized cover letter that:
1. Shows genuine interest in the specific role and company
2. Highlights relevant experience and skills from their background
3. Demonstrates value they can bring to the organization
4. Uses a ${data.tone} tone
5. Includes a strong call to action

Make it feel authentic and personalized, not generic. Return only the cover letter content.`;

      // Try a simple text generation instead of the complex cover letter method
      const result = await geminiService.generateText(enhancePrompt);
      if (result && result.length > 100) {
        return result;
      }
    } catch (error) {
      console.warn('Enhanced AI generation also failed, using intelligent template:', error);
    }
    
    // Intelligent template that uses available data
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const skills = resumeData?.skills?.slice(0, 3).map((s: any) => s.name).join(', ') || 'relevant skills';
    const experience = resumeData?.workExperience?.[0];
    const experienceText = experience ? 
      `In my recent role as ${experience.jobTitle}${experience.company ? ` at ${experience.company}` : ''}, I have developed expertise that directly applies to this position.` :
      'My professional background has equipped me with the skills necessary for this role.';
    
    const achievements = resumeData?.workExperience?.[0]?.achievements?.[0];
    const achievementText = achievements ? 
      ` One of my key accomplishments includes ${achievements.toLowerCase()}, which demonstrates my ability to deliver results.` : '';

    return `${date}

Dear Hiring Manager,

I am excited to submit my application for the ${data.jobTitle} position at ${data.companyName}. Your organization's reputation for excellence and innovation makes this opportunity particularly appealing to me.

${experienceText}${achievementText} My expertise in ${skills} aligns well with the requirements for this ${data.jobTitle} role, and I am confident in my ability to contribute meaningfully to your team's success.

${resumeData?.professionalSummary ? 
  `As outlined in my professional background: ${resumeData.professionalSummary}` : 
  'I bring a commitment to excellence and a passion for delivering quality results in everything I do.'
} I am particularly drawn to ${data.companyName} because of your commitment to ${this.getCompanyValue(data.companyName)}.

I would welcome the opportunity to discuss how my background and enthusiasm can contribute to ${data.companyName}'s continued success. Thank you for your time and consideration, and I look forward to hearing from you.

Sincerely,
${firstName} ${lastName}`;
  }

  private getCompanyValue(companyName: string): string {
    // Simple company type detection for more personalized messaging
    const name = companyName.toLowerCase();
    if (name.includes('tech') || name.includes('software') || name.includes('digital')) {
      return 'innovation and technological advancement';
    } else if (name.includes('health') || name.includes('medical') || name.includes('hospital')) {
      return 'improving patient care and outcomes';
    } else if (name.includes('bank') || name.includes('financial') || name.includes('capital')) {
      return 'financial excellence and client service';
    } else if (name.includes('education') || name.includes('school') || name.includes('university')) {
      return 'educational excellence and student success';
    } else {
      return 'excellence and growth in your industry';
    }
  }

  async generateCoverLetterVariations(data: {
    userId: string;
    resumeId: string;
    jobDescription: string;
    jobTitle: string;
    companyName: string;
  }): Promise<{ tone: string; content: string; strengths: string[]; }[]> {
    try {
      // Get resume data for context
      const resumeData = await Resume.findOne({
        _id: new mongoose.Types.ObjectId(data.resumeId),
        userId: new mongoose.Types.ObjectId(data.userId)
      });

      if (!resumeData) {
        throw new Error('Resume not found');
      }

      // Generate multiple variations using advanced AI
      const variations = await geminiService.generateAdvancedCoverLetterVariations({
        personalInfo: resumeData.personalInfo,
        jobDescription: data.jobDescription,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        resumeData: resumeData.toObject(),
        variationCount: 3
      });

      return variations;
    } catch (error) {
      console.error('Error generating cover letter variations:', error);
      throw new Error('Failed to generate cover letter variations');
    }
  }

  async optimizeCoverLetterForATS(id: string, userId: string, options: {
    jobDescription?: string;
    targetKeywords?: string[];
    optimizationLevel?: 'basic' | 'comprehensive';
  }): Promise<ICoverLetter | null> {
    try {
      const coverLetter = await this.getCoverLetterById(id, userId);
      if (!coverLetter) {
        throw new Error('Cover letter not found');
      }

      // Get resume data for context
      let resumeData: IResume | null = null;
      if (coverLetter.resumeId) {
        resumeData = await Resume.findById(coverLetter.resumeId);
      }

      const jobDescription = options.jobDescription || coverLetter.jobDescription || '';
      
      // Generate ATS-optimized version
      const optimizedContent = await geminiService.generateCoverLetter({
        personalInfo: resumeData?.personalInfo || {
          firstName: 'Your',
          lastName: 'Name',
          email: 'your.email@example.com',
          phone: 'Your Phone',
          location: 'Your Location'
        },
        jobDescription,
        jobTitle: coverLetter.jobTitle,
        companyName: coverLetter.companyName,
        tone: coverLetter.tone,
        resumeData: resumeData?.toObject(),
        keywordOptimization: true,
        customInstructions: `OPTIMIZATION LEVEL: ${options.optimizationLevel || 'comprehensive'}
        
Special Focus:
- Maximum ATS compatibility
- Strategic keyword placement
- Industry-standard formatting
- Quantified achievements emphasis
${options.targetKeywords ? `- Target keywords: ${options.targetKeywords.join(', ')}` : ''}`
      });

      return await this.updateCoverLetter(id, userId, { 
        content: optimizedContent 
      });
    } catch (error) {
      console.error('Error optimizing cover letter for ATS:', error);
      throw new Error('Failed to optimize cover letter for ATS');
    }
  }

  async analyzeCoverLetterMatch(id: string, userId: string, jobDescription: string): Promise<{
    matchScore: number;
    keywordAlignment: string[];
    improvementSuggestions: string[];
    strengths: string[];
    overallAssessment: string;
  }> {
    try {
      const coverLetter = await this.getCoverLetterById(id, userId);
      if (!coverLetter) {
        throw new Error('Cover letter not found');
      }

      // Analyze the match between cover letter and job description
      const content = coverLetter.content;
      const wordCount = content.split(/\s+/).length;
      
      // Extract keywords from job description
      const jobKeywords = this.extractKeywords(jobDescription);
      const contentLower = content.toLowerCase();
      
      // Calculate keyword matches
      const keywordAlignment = jobKeywords.filter(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      
      const matchScore = Math.min(95, Math.max(15, 
        (keywordAlignment.length / jobKeywords.length) * 100 * 0.6 + // Keyword match (60%)
        (wordCount >= 250 && wordCount <= 400 ? 25 : 10) + // Length score (25%)
        (content.includes(coverLetter.companyName) ? 15 : 0) // Company mention (15%)
      ));

      // Generate improvement suggestions
      const improvementSuggestions = [];
      if (keywordAlignment.length < jobKeywords.length * 0.5) {
        improvementSuggestions.push(`Include more job-specific keywords: ${jobKeywords.filter(k => !keywordAlignment.includes(k)).slice(0, 3).join(', ')}`);
      }
      if (wordCount < 250) {
        improvementSuggestions.push('Expand the cover letter to 250-400 words for better impact');
      }
      if (!content.includes('quantif') && !content.includes('metric') && !/\d+%/.test(content)) {
        improvementSuggestions.push('Add quantified achievements and specific metrics');
      }

      // Identify strengths
      const strengths = [];
      if (keywordAlignment.length >= jobKeywords.length * 0.7) {
        strengths.push('Strong keyword alignment with job requirements');
      }
      if (wordCount >= 250 && wordCount <= 400) {
        strengths.push('Optimal length for recruiter attention');
      }
      if (content.includes(coverLetter.companyName)) {
        strengths.push('Demonstrates company-specific interest');
      }
      if (/\d+%/.test(content) || content.includes('achieve') || content.includes('success')) {
        strengths.push('Includes achievement-focused language');
      }

      const overallAssessment = this.generateAssessment(matchScore, strengths, improvementSuggestions);

      return {
        matchScore: Math.round(matchScore),
        keywordAlignment,
        improvementSuggestions,
        strengths,
        overallAssessment
      };
    } catch (error) {
      console.error('Error analyzing cover letter match:', error);
      throw new Error('Failed to analyze cover letter match');
    }
  }

  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'we', 'you', 'our', 'your', 'will', 'be', 'is', 'are', 'have', 'has', 'this', 'that'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 20); // Top 20 keywords
  }

  private generateAssessment(score: number, strengths: string[], improvements: string[]): string {
    let assessment = '';
    
    if (score >= 85) {
      assessment = 'Excellent match! This cover letter strongly aligns with the job requirements and demonstrates clear value proposition.';
    } else if (score >= 70) {
      assessment = 'Good match with room for improvement. The cover letter shows relevant experience but could be enhanced for better alignment.';
    } else if (score >= 55) {
      assessment = 'Moderate match. The cover letter addresses some job requirements but needs significant optimization to stand out.';
    } else {
      assessment = 'Needs substantial improvement. The cover letter requires major revisions to better align with job requirements.';
    }

    if (strengths.length > 0) {
      assessment += ` Key strengths include: ${strengths.slice(0, 2).join(' and ')}.`;
    }

    if (improvements.length > 0) {
      assessment += ` Priority improvements: ${improvements.slice(0, 2).join(' and ')}.`;
    }

    return assessment;
  }

  private async clearUserCoverLettersCache(userId: string): Promise<void> {
    try {
      await redisClient.del(`user:${userId}:coverletters`);
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Don't throw error for cache operations
    }
  }

  /**
   * Enterprise-grade cover letter file generation
   * Generates high-quality PDFs with professional formatting
   */
  async generateCoverLetterFile(coverLetterData: any, format: 'pdf' | 'docx' | 'txt'): Promise<Buffer> {
    console.log('🏢 Enterprise cover letter file generation starting...', { format, hasData: !!coverLetterData });
    
    if (format === 'pdf') {
      return await this.generateCoverLetterPDF(coverLetterData);
    } else if (format === 'docx') {
      return await this.generateCoverLetterDOCX(coverLetterData);
    } else if (format === 'txt') {
      return await this.generateCoverLetterTXT(coverLetterData);
    } else {
      throw new Error('Unsupported format');
    }
  }

  /**
   * High-quality PDF generation for cover letters using Puppeteer
   */
  private async generateCoverLetterPDF(coverLetterData: any): Promise<Buffer> {
    let browser;
    
    try {
      console.log('🚀 Starting Puppeteer cover letter PDF generation...');
      
      // Generate HTML content with professional styling
      const htmlContent = this.generateCoverLetterHTML(coverLetterData);
      
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
          top: '1in',
          bottom: '1in',
          left: '1in',
          right: '1in'
        },
        displayHeaderFooter: false
      });
      
      console.log('✅ Cover letter PDF generated successfully:', pdfBuffer.length, 'bytes');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Cover letter PDF generation failed:', error);
      throw new Error(`Failed to generate cover letter PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Generate professional HTML content for cover letter PDF conversion
   */
  private generateCoverLetterHTML(coverLetterData: any): string {
    const formatDate = (date: string | undefined) => {
      if (!date) return new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    };
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${coverLetterData.title || 'Cover Letter'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #000;
            background: white;
            font-size: 12px;
            padding: 0;
            margin: 0;
          }
          
          @page {
            margin: 1in;
            size: A4;
          }
          
          @media print {
            body { margin: 0; padding: 0; }
            * { print-color-adjust: exact !important; }
          }
          
          .cover-letter-container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
            min-height: 11in;
            padding: 0;
          }
          
          .date-section {
            text-align: right;
            margin-bottom: 40px;
            font-size: 11px;
          }
          
          .employer-section {
            margin-bottom: 40px;
            font-size: 11px;
          }
          
          .employer-name {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .salutation {
            margin-bottom: 20px;
            font-size: 11px;
          }
          
          .content-section {
            margin-bottom: 20px;
            text-align: justify;
            line-height: 1.8;
            font-size: 11px;
          }
          
          .closing-section {
            margin-top: 40px;
            font-size: 11px;
          }
          
          .signature-space {
            margin-bottom: 60px;
          }
          
          .signature-name {
            font-weight: bold;
          }
          
          .subject-line {
            font-weight: bold;
            margin-bottom: 20px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="cover-letter-container">
          <!-- Date -->
          <div class="date-section">
            ${formatDate(coverLetterData.createdAt)}
          </div>
          
          <!-- Employer Information -->
          <div class="employer-section">
            <div class="employer-name">${coverLetterData.companyName}</div>
            <div>Hiring Manager</div>
            <div>Human Resources Department</div>
            <div>[Company Address]</div>
          </div>
          
          <!-- Subject Line -->
          <div class="subject-line">
            Re: Application for ${coverLetterData.jobTitle} Position
          </div>
          
          <!-- Salutation -->
          <div class="salutation">
            Dear Hiring Manager,
          </div>
          
          <!-- Content -->
          <div class="content-section">
            ${coverLetterData.content ? 
              coverLetterData.content.split('\n').map((paragraph: string) => 
                paragraph.trim() ? `<p style="margin-bottom: 15px;">${paragraph}</p>` : ''
              ).join('') 
              : 
              `<p style="margin-bottom: 15px;">I am writing to express my strong interest in the ${coverLetterData.jobTitle} position at ${coverLetterData.companyName}. With my background and experience, I am confident that I would be a valuable addition to your team.</p>
               <p style="margin-bottom: 15px;">My qualifications align well with the requirements outlined in your job posting, and I am excited about the opportunity to contribute to your organization's continued success.</p>
               <p style="margin-bottom: 15px;">Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can contribute to ${coverLetterData.companyName}. I am available for an interview at your convenience.</p>`
            }
          </div>
          
          <!-- Closing -->
          <div class="closing-section">
            <div class="signature-space">Sincerely,</div>
            <div class="signature-name">[Your Name]</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate DOCX file for cover letter (placeholder)
   */
  private async generateCoverLetterDOCX(coverLetterData: any): Promise<Buffer> {
    // For now, return a simple text buffer
    // In production, you'd use a library like 'docx' to create proper Word documents
    const textContent = this.generateCoverLetterTextContent(coverLetterData);
    return Buffer.from(textContent, 'utf-8');
  }

  /**
   * Generate plain text file for cover letter
   */
  private async generateCoverLetterTXT(coverLetterData: any): Promise<Buffer> {
    const textContent = this.generateCoverLetterTextContent(coverLetterData);
    return Buffer.from(textContent, 'utf-8');
  }

  /**
   * Generate plain text content for cover letter
   */
  private generateCoverLetterTextContent(coverLetterData: any): string {
    const formatDate = (date: string | undefined) => {
      if (!date) return new Date().toLocaleDateString();
      return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    };
    
    let content = `${formatDate(coverLetterData.createdAt)}\n\n`;
    content += `${coverLetterData.companyName}\n`;
    content += `Hiring Manager\n`;
    content += `Human Resources Department\n`;
    content += `[Company Address]\n\n`;
    content += `Re: Application for ${coverLetterData.jobTitle} Position\n\n`;
    content += `Dear Hiring Manager,\n\n`;
    
    if (coverLetterData.content) {
      content += `${coverLetterData.content}\n\n`;
    } else {
      content += `I am writing to express my strong interest in the ${coverLetterData.jobTitle} position at ${coverLetterData.companyName}. With my background and experience, I am confident that I would be a valuable addition to your team.\n\n`;
      content += `My qualifications align well with the requirements outlined in your job posting, and I am excited about the opportunity to contribute to your organization's continued success.\n\n`;
      content += `Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can contribute to ${coverLetterData.companyName}. I am available for an interview at your convenience.\n\n`;
    }
    
    content += `Sincerely,\n\n\n`;
    content += `[Your Name]\n`;
    
    return content;
  }
}

export const coverLetterService = new CoverLetterService();