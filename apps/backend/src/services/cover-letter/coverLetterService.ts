import { CoverLetter, ICoverLetter } from '../../models/CoverLetter';
import { Resume, IResume } from '../../models/Resume';
import { geminiService } from '../ai/gemini';
import { aiJobAnalyzer, JobAnalysisResult } from '../ai/aiJobAnalyzer';
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
  content?: string;
}

export interface GenerateCoverLetterFromJobData {
  userId: string;
  resumeId: string;
  jobUrl: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
}

export interface AIGenerateCoverLetterData {
  userId: string;
  resumeId?: string;
  jobUrl: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  customInstructions?: string;
}

export interface UpdateCoverLetterData extends Partial<CreateCoverLetterData> {
  content?: string;
}

export class CoverLetterService {
  async createCoverLetter(data: CreateCoverLetterData): Promise<ICoverLetter> {
    try {
      // Use provided content if available, otherwise generate it
      let content = data.content || '';
      let jobDescription = data.jobDescription;
      
      if (content) {
        console.log('💾 Using provided content for cover letter');
      } else {

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
      if (data.resumeId && mongoose.Types.ObjectId.isValid(data.resumeId)) {
        resumeData = await Resume.findOne({
          _id: new mongoose.Types.ObjectId(data.resumeId),
          userId: new mongoose.Types.ObjectId(data.userId)
        });
      }

      // Always attempt AI generation for personalized content
      try {
        content = await geminiService.generateCoverLetter({
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
      }

      const coverLetter = new CoverLetter({
        userId: new mongoose.Types.ObjectId(data.userId),
        resumeId: (data.resumeId && mongoose.Types.ObjectId.isValid(data.resumeId)) ? new mongoose.Types.ObjectId(data.resumeId) : undefined,
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
      // Clean the update data to handle empty resumeId
      const cleanUpdateData = { ...updateData };
      
      // If resumeId is an empty string or invalid, remove it from update
      if (cleanUpdateData.resumeId !== undefined) {
        if (!cleanUpdateData.resumeId || cleanUpdateData.resumeId.trim() === '') {
          delete cleanUpdateData.resumeId;
        } else if (!mongoose.Types.ObjectId.isValid(cleanUpdateData.resumeId)) {
          console.warn('Invalid resumeId provided, removing from update:', cleanUpdateData.resumeId);
          delete cleanUpdateData.resumeId;
        }
      }

      // IMPORTANT: Preserve content formatting exactly as provided
      // Do not trim or modify the content field as it may contain intentional whitespace and formatting
      if (cleanUpdateData.content !== undefined) {
        // Ensure we preserve the exact content without any modifications
        console.log('📝 Preserving exact content formatting for cover letter:', id);
      }

      const coverLetter = await CoverLetter.findOneAndUpdate(
        { 
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId)
        },
        cleanUpdateData,
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

  async getPublicCoverLetter(id: string): Promise<ICoverLetter | null> {
    try {
      const coverLetter = await CoverLetter.findOne({ 
        _id: new mongoose.Types.ObjectId(id),
        isPublic: true
      }).populate('userId', 'firstName lastName email');
      
      return coverLetter;
    } catch (error) {
      console.error('Error fetching public cover letter:', error);
      throw new Error('Failed to fetch public cover letter');
    }
  }

  async toggleCoverLetterVisibility(id: string, userId: string, isPublic: boolean): Promise<ICoverLetter | null> {
    try {
      const coverLetter = await CoverLetter.findOneAndUpdate(
        { 
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId)
        },
        { isPublic },
        { new: true }
      );

      if (coverLetter) {
        // Clear user's cover letters cache
        await this.clearUserCoverLettersCache(userId);
      }

      return coverLetter;
    } catch (error) {
      console.error('Error updating cover letter visibility:', error);
      throw new Error('Failed to update cover letter visibility');
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
          top: '0.5in',
          bottom: '0.5in',
          left: '0.75in',
          right: '0.75in'
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
    // Preserve the exact structure and formatting of the content
    const content = coverLetterData.content || 'Content not available.';
    
    // Convert content to HTML while preserving line breaks and structure
    const htmlContent = content
      .split('\n\n')  // Split by double line breaks (paragraphs)
      .map((paragraph: string) => {
        if (paragraph.trim() === '') return '';
        // Preserve single line breaks within paragraphs
        const formattedParagraph = paragraph
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join('<br>');
        return `<p>${formattedParagraph}</p>`;
      })
      .filter((p: string) => p.length > 0)
      .join('\n');

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
            font-size: 12pt;
            padding: 0;
            margin: 0;
          }
          
          @page {
            margin: 0.5in 0.75in;
            size: A4;
          }
          
          @media print {
            body { margin: 0; padding: 0; }
            * { print-color-adjust: exact !important; }
          }
          
          .cover-letter-container {
            width: 100%;
            max-width: none;
            margin: 0;
            background: white;
            padding: 0;
          }
          
          .content-section {
            line-height: 1.8;
            font-size: 12pt;
            white-space: pre-wrap; /* Preserve whitespace and line breaks */
            padding-top: 0;
            margin-top: 0;
          }
          
          .content-section p {
            margin-bottom: 1em;
            margin-top: 0;
            text-align: justify;
          }
          
          .content-section p:first-child {
            margin-top: 0;
            padding-top: 0;
          }
          
          .content-section p:last-child {
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="cover-letter-container">
          <div class="content-section">
            ${htmlContent || '<p>Content not available.</p>'}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate DOCX file for cover letter using proper Word document structure
   */
  private async generateCoverLetterDOCX(coverLetterData: any): Promise<Buffer> {
    try {
      console.log('📄 Generating simplified DOCX file...');
      
      // Import the docx library
      const { Document, Paragraph, TextRun, Packer } = require('docx');

      // Create document with just the content
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 720,    // 0.5 inch
                right: 720,  // 0.5 inch
                bottom: 720, // 0.5 inch
                left: 720,   // 0.5 inch
              },
            },
          },
          children: [
            // Only include content paragraphs
            ...this.createContentParagraphs(coverLetterData),
          ],
        }],
      });

      // Convert to buffer
      const buffer = await Packer.toBuffer(doc);
      console.log('✅ DOCX file generated successfully');
      return buffer;
      
    } catch (error) {
      console.error('❌ Error generating DOCX:', error);
      // Fallback to plain text if DOCX generation fails
      console.log('🔄 Falling back to simplified plain text format...');
      const textContent = coverLetterData.content || 'Content not available.';
      return Buffer.from(textContent, 'utf-8');
    }
  }

  /**
   * Helper method to create content paragraphs from cover letter text
   */
  private createContentParagraphs(coverLetterData: any): any[] {
    const { Paragraph, TextRun } = require('docx');
    
    const content = coverLetterData.content || 'Content not available.';

    // Preserve exact structure: split by double line breaks first (paragraphs)
    const paragraphs: any[] = [];
    const sections = content.split('\n\n');
    
    sections.forEach((section: string) => {
      if (section.trim() === '') {
        // Add empty paragraph for spacing
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '', size: 24 })],
          spacing: { after: 240 }
        }));
        return;
      }
      
      // Split by single line breaks within the section
      const lines = section.split('\n');
      
      if (lines.length === 1) {
        // Single line paragraph
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: lines[0].trim(),
              size: 24, // 12pt
            }),
          ],
          spacing: { after: 240 },
        }));
      } else {
        // Multiple lines - create paragraph with line breaks
        const textRuns: any[] = [];
        lines.forEach((line: string, index: number) => {
          if (line.trim()) {
            textRuns.push(new TextRun({
              text: line.trim(),
              size: 24,
            }));
            // Add line break if not the last line
            if (index < lines.length - 1) {
              textRuns.push(new TextRun({
                text: '',
                break: 1, // Line break
                size: 24,
              }));
            }
          }
        });
        
        if (textRuns.length > 0) {
          paragraphs.push(new Paragraph({
            children: textRuns,
            spacing: { after: 240 },
          }));
        }
      }
    });

    return paragraphs.length > 0 ? paragraphs : [
      new Paragraph({
        children: [new TextRun({ text: 'Content not available.', size: 24 })],
        spacing: { after: 240 }
      })
    ];
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
    // Return the content exactly as it was typed, preserving all formatting
    const content = coverLetterData.content || 'Content not available.';
    
    // Ensure consistent line endings and preserve the exact structure
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * New AI-powered method that analyzes job URL and generates cover letter in one step
   */
  async aiGenerateCoverLetterFromUrl(data: AIGenerateCoverLetterData): Promise<{
    coverLetterContent: string;
    jobAnalysis: JobAnalysisResult;
  }> {
    try {
      console.log('🤖 Starting AI-powered cover letter generation from URL:', data.jobUrl);
      
      // Step 1: AI analyzes the job URL
      console.log('📊 Analyzing job posting with AI...');
      const jobAnalysis = await aiJobAnalyzer.analyzeJobFromUrl(data.jobUrl);
      
      console.log('✅ Job analysis completed:', {
        title: jobAnalysis.jobTitle,
        company: jobAnalysis.companyName,
        confidence: jobAnalysis.confidence
      });

      // Step 2: Get resume data for personalization
      let resumeData: IResume | null = null;
      if (data.resumeId && mongoose.Types.ObjectId.isValid(data.resumeId)) {
        resumeData = await Resume.findOne({
          _id: new mongoose.Types.ObjectId(data.resumeId),
          userId: new mongoose.Types.ObjectId(data.userId)
        });
      }

      // Step 3: Generate enhanced cover letter with full job context
      console.log('✍️ Generating personalized cover letter...');
      const coverLetterContent = await this.aiGenerateEnhancedCoverLetter({
        jobAnalysis,
        resumeData,
        tone: data.tone,
        customInstructions: data.customInstructions
      });

      console.log('🎉 AI cover letter generation completed successfully');
      
      // Return content and analysis without saving to DB
      return {
        coverLetterContent,
        jobAnalysis
      };
    } catch (error) {
      console.error('❌ Error in AI cover letter generation:', error);
      throw new Error(`Failed to generate AI-powered cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate cover letter preview without saving to database
   */
  async generateCoverLetterPreview(data: {
    jobUrl: string;
    resumeId?: string;
    tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    customInstructions?: string;
    userId: string;
  }): Promise<{ jobAnalysis: JobAnalysisResult; coverLetterContent: string }> {
    try {
      // Step 1: Get job analysis (cached)
      console.log('🔍 Analyzing job from URL for preview...');
      const jobAnalysis = await aiJobAnalyzer.analyzeJobFromUrl(data.jobUrl);
      
      // Step 2: Get resume data if provided
      let resumeData: IResume | null = null;
      if (data.resumeId && mongoose.Types.ObjectId.isValid(data.resumeId)) {
        resumeData = await Resume.findOne({
          _id: new mongoose.Types.ObjectId(data.resumeId),
          userId: new mongoose.Types.ObjectId(data.userId)
        });
      }

      // Step 3: Generate cover letter content (don't save to DB)
      console.log('✍️ Generating cover letter preview...');
      const coverLetterContent = await this.aiGenerateEnhancedCoverLetter({
        jobAnalysis,
        resumeData,
        tone: data.tone,
        customInstructions: data.customInstructions
      });

      console.log('🎉 Cover letter preview generated successfully');
      
      return {
        jobAnalysis,
        coverLetterContent
      };
    } catch (error) {
      console.error('❌ Error generating cover letter preview:', error);
      throw new Error(`Failed to generate cover letter preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save generated cover letter content to database
   */
  async saveCoverLetterToAccount(data: {
    content: string;
    jobAnalysis: JobAnalysisResult;
    resumeId?: string;
    tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    userId: string;
  }): Promise<ICoverLetter> {
    try {
      console.log('💾 Saving cover letter to user account...');
      
      const coverLetter = new CoverLetter({
        userId: new mongoose.Types.ObjectId(data.userId),
        resumeId: (data.resumeId && mongoose.Types.ObjectId.isValid(data.resumeId)) ? new mongoose.Types.ObjectId(data.resumeId) : undefined,
        title: `Cover Letter - ${data.jobAnalysis.jobTitle} at ${data.jobAnalysis.companyName}`,
        content: data.content, // Save the full generated content
        jobTitle: data.jobAnalysis.jobTitle,
        companyName: data.jobAnalysis.companyName,
        jobUrl: data.jobAnalysis.applicationInstructions || '', // Store original job URL if available
        jobDescription: data.jobAnalysis.jobDescription,
        tone: data.tone,
        templateId: 'ai-generated'
      });

      const savedCoverLetter = await coverLetter.save();
      
      // Clear cache
      await this.clearUserCoverLettersCache(data.userId);

      console.log('✅ Cover letter saved to account successfully');
      
      return savedCoverLetter;
    } catch (error) {
      console.error('❌ Error saving cover letter:', error);
      throw new Error(`Failed to save cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AI-powered enhanced cover letter generation with job analysis context
   */
  private async aiGenerateEnhancedCoverLetter(options: {
    jobAnalysis: JobAnalysisResult;
    resumeData: IResume | null;
    tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    customInstructions?: string;
  }): Promise<string> {
    const { jobAnalysis, resumeData, tone, customInstructions } = options;

    const personalInfo = resumeData?.personalInfo || {
      firstName: 'Your',
      lastName: 'Name',
      email: 'your.email@example.com',
      location: 'Your Location'
    };

    // Enhanced prompt that uses the complete job analysis
    const prompt = `
You are an award-winning professional cover letter writer with 15+ years of experience. Create an exceptional, highly personalized cover letter using the comprehensive job analysis provided.

🎯 CANDIDATE PROFILE:
Name: ${personalInfo.firstName} ${personalInfo.lastName}
Email: ${personalInfo.email}
Location: ${personalInfo.location}

📋 PROFESSIONAL BACKGROUND:
${resumeData?.professionalSummary ? `Summary: ${resumeData.professionalSummary}` : ''}

Work Experience:
${resumeData?.workExperience?.map((exp: any) => `
• ${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${exp.isCurrentJob ? 'Present' : exp.endDate})
  Key Responsibilities: ${exp.responsibilities?.slice(0, 3).join(', ')}
  Achievements: ${exp.achievements?.slice(0, 2).join(', ')}`).join('') || 'Experience details not provided'}

Key Skills: ${resumeData?.skills?.map((s: any) => s.name).slice(0, 10).join(', ') || 'Skills not provided'}
Education: ${resumeData?.education?.map((edu: any) => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution}`).join(', ') || 'Education not provided'}

🔍 COMPREHENSIVE JOB ANALYSIS:
Job Title: ${jobAnalysis.jobTitle}
Company: ${jobAnalysis.companyName}
Location: ${jobAnalysis.location}
Experience Level: ${jobAnalysis.experienceLevel}
Employment Type: ${jobAnalysis.employmentType}

Job Description:
${jobAnalysis.jobDescription}

Key Requirements:
${jobAnalysis.requirements.map(req => `• ${req}`).join('\n')}

Key Responsibilities:
${jobAnalysis.responsibilities.map(resp => `• ${resp}`).join('\n')}

Required Skills:
${jobAnalysis.skills.map(skill => `• ${skill}`).join('\n')}

${jobAnalysis.salary ? `Compensation: ${jobAnalysis.salary}` : ''}

Company Information:
Industry: ${jobAnalysis.companyInfo?.industry}
Company Size: ${jobAnalysis.companyInfo?.size}
About Company: ${jobAnalysis.companyInfo?.description}

🎨 TONE & STYLE: ${tone}
${customInstructions ? `\n✨ CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

📝 COVER LETTER REQUIREMENTS:

Create a compelling cover letter that:

1. INTELLIGENT MATCHING: Analyze the job requirements and match them with the candidate's background
2. COMPANY RESEARCH: Use the company information to show genuine interest and knowledge
3. SKILLS ALIGNMENT: Highlight skills that directly match the job requirements  
4. QUANTIFIED ACHIEVEMENTS: Include specific metrics and accomplishments from the resume
5. ROLE-SPECIFIC LANGUAGE: Use industry terms and keywords from the job posting
6. COMPELLING NARRATIVE: Tell a story that shows progression and fit for this specific role

STRUCTURE:
- Opening: Hook that shows immediate value and knowledge of the company
- Body 1: Match top 2-3 qualifications with specific examples from resume
- Body 2: Show knowledge of company/industry and explain why this role fits career goals  
- Closing: Confident call to action with specific next steps

FORMAT REQUIREMENTS:
- Professional business letter format with proper date and salutation
- MINIMUM 400-600 words (this is critical - DO NOT make it shorter)
- Include specific details and examples, not generic statements
- Use active voice and compelling language throughout
- Include quantified achievements when possible
- ${tone === 'professional' ? 'Formal tone with "Dear Hiring Manager"' : ''}
${tone === 'casual' ? 'Conversational but professional tone' : ''}
${tone === 'enthusiastic' ? 'Energetic and passionate language' : ''}
${tone === 'conservative' ? 'Traditional business language' : ''}

🚨 CRITICAL REQUIREMENTS:
- The cover letter MUST be detailed and comprehensive (400-600 words minimum)
- Include specific examples that demonstrate relevant experience
- Show deep understanding of the role and company
- Make compelling arguments for why the candidate is the perfect fit
- Use keywords and phrases from the job description naturally
- End with a confident, specific call to action

Generate the complete, detailed cover letter now. Return ONLY the cover letter content with proper formatting - no explanations or additional text.
`;

    try {
      const response = await geminiService.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.4, // Slightly higher for more creative and detailed output
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 4000, // Increased to allow for longer, detailed cover letters
          candidateCount: 1,
        }
      });

      let coverLetterContent = response.text.trim();
      
      // Clean up the response
      coverLetterContent = coverLetterContent
        .replace(/```.*$/gm, '') // Remove any code block markers
        .replace(/^\s*\n/gm, '') // Remove empty lines at start
        .trim();

      return coverLetterContent;
    } catch (error) {
      console.error('Error generating AI-enhanced cover letter:', error);
      
      // Fallback to basic generation if AI fails
      return this.generateBasicCoverLetter(jobAnalysis, personalInfo, tone);
    }
  }

  /**
   * Fallback method for basic cover letter generation
   */
  private generateBasicCoverLetter(
    jobAnalysis: JobAnalysisResult, 
    personalInfo: any, 
    tone: string
  ): string {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const salutation = tone === 'casual' ? 'Hello,' : 'Dear Hiring Manager,';
    const closing = tone === 'enthusiastic' ? 'With excitement,' : 
                   tone === 'casual' ? 'Best regards,' : 'Sincerely,';

    return `${date}

${salutation}

I am writing to express my strong interest in the ${jobAnalysis.jobTitle} position at ${jobAnalysis.companyName}. Based on your job posting, I believe my background and skills make me an excellent candidate for this role.

Your requirements for ${jobAnalysis.skills.slice(0, 3).join(', ')} align perfectly with my experience. I am particularly drawn to this opportunity because of ${jobAnalysis.companyInfo?.description || 'your company\'s reputation in the industry'}.

I would welcome the opportunity to discuss how my qualifications can contribute to ${jobAnalysis.companyName}'s continued success. Thank you for your consideration, and I look forward to hearing from you.

${closing}
${personalInfo.firstName} ${personalInfo.lastName}`;
  }
}

export const coverLetterService = new CoverLetterService();