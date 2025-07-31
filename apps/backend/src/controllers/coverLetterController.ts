import { Request, Response } from 'express';
import { coverLetterService } from '../services/cover-letter/coverLetterService';
import { jobScrapingService } from '../services/job-scraper/jobScrapingService';
import { notificationService } from '../services/notificationService';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';

export const coverLetterValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('jobTitle').notEmpty().withMessage('Job title is required'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('tone').isIn(['professional', 'casual', 'enthusiastic', 'conservative']).withMessage('Invalid tone'),
];

export const jobUrlValidation = [
  body('jobUrl').isURL().withMessage('Valid job URL is required'),
  body('resumeId').notEmpty().withMessage('Resume ID is required'),
  body('tone').isIn(['professional', 'casual', 'enthusiastic', 'conservative']).withMessage('Invalid tone'),
];

export class CoverLetterController {
  async createCoverLetter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const coverLetter = await coverLetterService.createCoverLetter({
        ...req.body,
        userId
      });

      // Send cover letter created notification
      try {
        await notificationService.createNotification({
          userId,
          category: 'cover_letter',
          type: 'success',
          title: 'Cover Letter Created!',
          message: `Your cover letter for ${req.body.jobTitle} at ${req.body.companyName} is ready.`,
          priority: 'medium',
          action: {
            label: 'View Cover Letter',
            url: `/dashboard/cover-letter`,
            type: 'internal'
          },
          metadata: {
            source: 'coverLetterController',
            additionalData: { 
              jobTitle: req.body.jobTitle, 
              companyName: req.body.companyName,
              tone: req.body.tone 
            }
          }
        });
      } catch (notificationError) {
        console.warn('⚠️ Failed to send cover letter creation notification:', notificationError);
      }

      res.status(201).json({
        success: true,
        data: coverLetter
      });
    } catch (error) {
      console.error('Error in createCoverLetter:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create cover letter' 
      });
    }
  }

  async generateFromJobUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { jobUrl } = req.body;

      // Validate job URL
      const isValidUrl = await jobScrapingService.validateJobUrl(jobUrl);
      if (!isValidUrl) {
        res.status(400).json({
          success: false,
          message: 'Invalid or unsupported job URL'
        });
        return;
      }

      const coverLetter = await coverLetterService.generateCoverLetterFromJob({
        ...req.body,
        userId
      });

      res.status(201).json({
        success: true,
        data: coverLetter
      });
    } catch (error) {
      console.error('Error in generateFromJobUrl:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate cover letter from job URL' 
      });
    }
  }

  async getUserCoverLetters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const coverLetters = await coverLetterService.getUserCoverLetters(userId);

      res.status(200).json({
        success: true,
        data: coverLetters
      });
    } catch (error) {
      console.error('Error in getUserCoverLetters:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch cover letters' 
      });
    }
  }

  async getCoverLetterById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const coverLetter = await coverLetterService.getCoverLetterById(id, userId);
      
      if (!coverLetter) {
        res.status(404).json({ 
          success: false, 
          message: 'Cover letter not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: coverLetter
      });
    } catch (error) {
      console.error('Error in getCoverLetterById:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch cover letter' 
      });
    }
  }

  async updateCoverLetter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const coverLetter = await coverLetterService.updateCoverLetter(id, userId, req.body);
      
      if (!coverLetter) {
        res.status(404).json({ 
          success: false, 
          message: 'Cover letter not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: coverLetter
      });
    } catch (error) {
      console.error('Error in updateCoverLetter:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update cover letter' 
      });
    }
  }

  async intelligentUpdateCoverLetter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🧠 Intelligent cover letter update request received:', req.body);
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { enhanceWithAI = true, focusAreas, ...updateData } = req.body;

      const coverLetter = await coverLetterService.intelligentUpdateCoverLetter(id, userId, {
        ...updateData,
        enhanceWithAI,
        focusAreas
      });
      
      if (!coverLetter) {
        res.status(404).json({ 
          success: false, 
          message: 'Cover letter not found' 
        });
        return;
      }

      console.log('✅ Intelligent update completed successfully');
      res.status(200).json({
        success: true,
        data: coverLetter,
        message: enhanceWithAI ? 'Cover letter updated with AI enhancements' : 'Cover letter updated successfully'
      });
    } catch (error) {
      console.error('❌ Error in intelligentUpdateCoverLetter:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to intelligently update cover letter' 
      });
    }
  }

  async deleteCoverLetter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const deleted = await coverLetterService.deleteCoverLetter(id, userId);
      
      if (!deleted) {
        res.status(404).json({ 
          success: false, 
          message: 'Cover letter not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Cover letter deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteCoverLetter:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete cover letter' 
      });
    }
  }

  async regenerateCoverLetter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tone } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const coverLetter = await coverLetterService.regenerateCoverLetter(id, userId, tone);
      
      if (!coverLetter) {
        res.status(404).json({ 
          success: false, 
          message: 'Cover letter not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: coverLetter
      });
    } catch (error) {
      console.error('Error in regenerateCoverLetter:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to regenerate cover letter' 
      });
    }
  }

  async scrapeJobPosting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobUrl } = req.body;
      
      if (!jobUrl) {
        res.status(400).json({
          success: false,
          message: 'Job URL is required'
        });
        return;
      }

      // Validate job URL
      const isValidUrl = await jobScrapingService.validateJobUrl(jobUrl);
      if (!isValidUrl) {
        res.status(400).json({
          success: false,
          message: 'Invalid or unsupported job URL'
        });
        return;
      }

      const jobData = await jobScrapingService.scrapeJobPosting(jobUrl);

      res.status(200).json({
        success: true,
        data: jobData
      });
    } catch (error) {
      console.error('Error in scrapeJobPosting:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to scrape job posting' 
      });
    }
  }

  async generateCoverLetterVariations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeId, jobDescription, jobTitle, companyName, customInstructions } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!resumeId || !jobDescription || !jobTitle || !companyName) {
        res.status(400).json({
          success: false,
          message: 'Resume ID, job description, job title, and company name are required'
        });
        return;
      }

      const variations = await coverLetterService.generateCoverLetterVariations({
        userId,
        resumeId,
        jobDescription,
        jobTitle,
        companyName
      });

      res.status(200).json({
        success: true,
        data: variations
      });
    } catch (error) {
      console.error('Error in generateCoverLetterVariations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate cover letter variations'
      });
    }
  }

  async analyzeCoverLetterMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobDescription } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobDescription) {
        res.status(400).json({
          success: false,
          message: 'Job description is required for analysis'
        });
        return;
      }

      const analysis = await coverLetterService.analyzeCoverLetterMatch(id, userId, jobDescription);

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error in analyzeCoverLetterMatch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze cover letter match'
      });
    }
  }

  async optimizeCoverLetterForATS(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, jobDescription, optimizationLevel, targetKeywords } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!content) {
        res.status(400).json({
          success: false,
          message: 'Cover letter content is required'
        });
        return;
      }

      // For direct optimization, we'll use the Gemini service
      const { geminiService } = await import('../services/ai/gemini');
      
      const optimizedContent = await geminiService.generateCoverLetter({
        personalInfo: { firstName: 'User', lastName: '', email: '', location: '' },
        jobDescription: jobDescription || '',
        jobTitle: 'Position',
        companyName: 'Company',
        tone: 'professional',
        keywordOptimization: true,
        customInstructions: `Optimize this existing cover letter for ATS compatibility:

${content}

Optimization Level: ${optimizationLevel || 'comprehensive'}
${targetKeywords ? `Target Keywords: ${targetKeywords.join(', ')}` : ''}

Focus on:
- Maximum ATS compatibility
- Strategic keyword placement
- Industry-standard formatting
- Quantified achievements emphasis`
      });

      res.status(200).json({
        success: true,
        data: {
          content: optimizedContent,
          improvements: [
            'Enhanced keyword density for ATS scanning',
            'Optimized formatting for better parsing',
            'Added industry-specific terminology',
            'Improved achievement quantification'
          ]
        }
      });
    } catch (error) {
      console.error('Error in optimizeCoverLetterForATS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize cover letter for ATS'
      });
    }
  }

  async enhanceCoverLetterWithAI(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('✨ AI Enhancement request received:', { 
        contentLength: req.body.content?.length,
        tone: req.body.tone,
        hasJobDescription: !!req.body.jobDescription,
        focusAreasCount: req.body.focusAreas?.length || 0,
        userId: req.user?.id
      });
      const { content, jobDescription, tone, focusAreas } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        console.log('❌ Unauthorized request');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!content || content.trim().length === 0) {
        console.log('❌ Missing or empty content');
        res.status(400).json({
          success: false,
          message: 'Cover letter content is required'
        });
        return;
      }

      try {
        // For direct enhancement, we'll use the Gemini service with enhanceContent method
        console.log('🔧 Attempting to enhance with Gemini enhanceContent...');
        const { geminiService } = await import('../services/ai/gemini');
        
        // Check if Gemini service is properly configured
        if (!geminiService.model) {
          throw new Error('Gemini API not configured - missing GEMINI_API_KEY');
        }

        const enhancementResult = await geminiService.enhanceContent({
          content,
          jobDescription: jobDescription || '',
          focusAreas: focusAreas || ['strengthen language', 'improve flow', 'add impact'],
          tone: tone || 'professional'
        });

        console.log('✅ Content enhanced successfully using enhanceContent method:', {
          hasEnhancedContent: !!enhancementResult.enhancedContent,
          enhancedLength: enhancementResult.enhancedContent?.length || 0,
          improvementsCount: enhancementResult.improvements?.length || 0
        });

        // Validate the enhancement result
        if (!enhancementResult.enhancedContent || enhancementResult.enhancedContent.trim().length === 0) {
          throw new Error('AI returned empty enhancement result');
        }

        res.status(200).json({
          success: true,
          data: {
            enhancedContent: enhancementResult.enhancedContent,
            improvements: enhancementResult.improvements || [
              'Enhanced language and tone',
              'Improved storytelling and flow',
              'Strengthened value proposition',
              'Added compelling call-to-action'
            ]
          }
        });
      } catch (aiError) {
        console.warn('⚠️ AI enhancement with enhanceContent failed, trying generateText method:', aiError);
        
        try {
          // Try a simpler AI enhancement approach using generateText
          console.log('🔄 Trying simpler generateText approach...');
          const simplePrompt = `Improve this cover letter to make it more compelling and professional:

${content}

Focus on:
- Stronger language and action verbs
- Better flow between paragraphs
- More specific value propositions
- Professional ${tone || 'professional'} tone
- Keep the same general structure and length

Return only the improved cover letter content (no JSON, no explanations).`;

          const { geminiService } = await import('../services/ai/gemini');
          const simpleEnhancement = await geminiService.generateText(simplePrompt);
          
          console.log('📝 Simple enhancement result:', {
            hasResult: !!simpleEnhancement,
            length: simpleEnhancement?.length || 0,
            isValid: simpleEnhancement && simpleEnhancement.length > 100
          });
          
          if (simpleEnhancement && simpleEnhancement.length > 100) {
            console.log('✅ Using simple enhancement result');
            res.status(200).json({
              success: true,
              data: {
                enhancedContent: simpleEnhancement,
                improvements: [
                  'Enhanced language and tone with AI assistance',
                  'Improved professional presentation', 
                  'Strengthened value propositions',
                  'Better paragraph flow and structure'
                ]
              },
              message: 'Enhanced using simplified AI approach'
            });
            return;
          }
        } catch (secondaryError) {
          console.warn('⚠️ Secondary AI enhancement also failed:', secondaryError);
        }
        
        // Fallback to intelligent text improvement
        const enhancedContent = await this.applyIntelligentEnhancement(content, tone);
        
        res.status(200).json({
          success: true,
          data: {
            enhancedContent,
            improvements: [
              'Applied intelligent formatting improvements',
              'Enhanced readability and flow',
              'Improved professional tone',
              'Strengthened language and structure'
            ]
          },
          message: 'Enhanced using intelligent improvements (AI service unavailable)'
        });
      }
    } catch (error) {
      console.error('❌ Error in enhanceCoverLetterWithAI:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enhance cover letter with AI'
      });
    }
  }

  private async applyIntelligentEnhancement(content: string, tone?: string): Promise<string> {
    if (!content) return content;
    
    // Clean up formatting issues
    let enhanced = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    // Intelligent language enhancement
    const languageImprovements = {
      // Replace weak phrases with stronger ones
      'I am writing to': 'I am pleased to submit my application to',
      'I think I would be': 'I am confident I would be',
      'I have some experience': 'I have gained valuable experience',
      'I can do': 'I excel at',
      'I hope to': 'I am eager to',
      'I would like to': 'I am excited to',
      'I believe I can': 'I am confident in my ability to',
      'I have worked': 'I have successfully contributed',
      'I am interested': 'I am particularly drawn to',
      'Thank you for your time': 'Thank you for your consideration of my application'
    };

    // Apply language improvements
    Object.entries(languageImprovements).forEach(([weak, strong]) => {
      const regex = new RegExp(weak, 'gi');
      enhanced = enhanced.replace(regex, strong);
    });

    // Add compelling action verbs where appropriate
    enhanced = enhanced
      .replace(/\bmanaged\b/gi, 'successfully managed')
      .replace(/\bworked on\b/gi, 'contributed to')
      .replace(/\bhelped\b/gi, 'collaborated to')
      .replace(/\bdid\b/gi, 'accomplished')
      .replace(/\bmade\b/gi, 'delivered');

    // Ensure proper structure
    if (!enhanced.includes('Dear ') && !enhanced.includes('Hello ')) {
      enhanced = 'Dear Hiring Manager,\n\n' + enhanced;
    }
    
    // Add appropriate closing based on tone
    const closings = {
      professional: 'Sincerely',
      conservative: 'Respectfully',
      casual: 'Best regards',
      enthusiastic: 'With enthusiasm'
    };
    
    const selectedClosing = closings[tone as keyof typeof closings] || 'Sincerely';
    
    if (!enhanced.includes('Sincerely') && 
        !enhanced.includes('Best regards') && 
        !enhanced.includes('Respectfully') && 
        !enhanced.includes('With enthusiasm')) {
      enhanced += `\n\n${selectedClosing},\n[Your Name]`;
    }
    
    // Add date if missing
    if (!enhanced.includes(new Date().getFullYear().toString())) {
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      enhanced = `${today}\n\n${enhanced}`;
    }
    
    return enhanced;
  }

  async createFromResumeBuilder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobUrl, jobDescription, jobTitle, companyName, tone } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!resumeData || !jobTitle || !companyName) {
        res.status(400).json({
          success: false,
          message: 'Resume data, job title, and company name are required'
        });
        return;
      }

      // Create cover letter using resume data
      const coverLetter = await coverLetterService.createCoverLetter({
        userId,
        title: `Cover Letter - ${jobTitle} at ${companyName}`,
        jobTitle,
        companyName,
        jobUrl,
        jobDescription,
        tone: tone || 'professional'
      });

      res.status(201).json({
        success: true,
        data: coverLetter
      });
    } catch (error) {
      console.error('Error in createFromResumeBuilder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create cover letter from resume builder'
      });
    }
  }

  async downloadCoverLetter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, format } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!['pdf', 'docx', 'txt'].includes(format)) {
        res.status(400).json({
          success: false,
          message: 'Invalid format. Supported formats: pdf, docx, txt'
        });
        return;
      }

      const coverLetter = await coverLetterService.getCoverLetterById(id, userId);
      
      if (!coverLetter) {
        res.status(404).json({
          success: false,
          message: 'Cover letter not found'
        });
        return;
      }

      // For now, return the text content
      // In production, you'd generate actual PDF/DOCX files
      if (format === 'txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${coverLetter.title}.txt"`);
        res.send(coverLetter.content);
        return;
      }

      // For PDF and DOCX, you'd use libraries like puppeteer or docx
      res.status(501).json({
        success: false,
        message: `${format.toUpperCase()} download not implemented yet`
      });
    } catch (error) {
      console.error('Error in downloadCoverLetter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download cover letter'
      });
    }
  }

  async downloadCoverLetterWithData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('📥 Enterprise cover letter download request received:', {
        format: req.params.format,
        hasCoverLetterData: !!req.body.coverLetterData,
        userId: req.user?.id
      });

      const { format } = req.params;
      const { coverLetterData } = req.body;
      
      if (!coverLetterData) {
        console.log('❌ No cover letter data provided');
        res.status(400).json({ 
          success: false, 
          message: 'Cover letter data is required' 
        });
        return;
      }

      const validFormats = ['pdf', 'docx', 'txt'];
      if (!validFormats.includes(format)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid format. Supported formats: pdf, docx, txt' 
        });
        return;
      }

      // Validate basic cover letter structure
      if (!coverLetterData.title || !coverLetterData.companyName || !coverLetterData.jobTitle) {
        console.log('❌ Missing required cover letter fields');
        res.status(400).json({ 
          success: false, 
          message: 'Cover letter data must include title, companyName, and jobTitle' 
        });
        return;
      }

      console.log('✅ Cover letter data validation passed, generating file...');

      const fileBuffer = await coverLetterService.generateCoverLetterFile(coverLetterData, format as 'pdf' | 'docx' | 'txt');
      
      // Set appropriate headers
      const mimeTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain'
      };

      const fileName = `${coverLetterData.title}_Cover_Letter.${format}`.replace(/\s+/g, '_');

      res.setHeader('Content-Type', mimeTypes[format as keyof typeof mimeTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      res.send(fileBuffer);
    } catch (error) {
      console.error('Error in downloadCoverLetterWithData:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate cover letter file',
        code: 'FILE_PROCESSING_FAILED'
      });
    }
  }

  async generateAIContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🤖 AI Content generation request received:', req.body);
      const { jobTitle, companyName, tone, resumeId, jobDescription, existingContent } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobTitle || !companyName) {
        res.status(400).json({
          success: false,
          message: 'Job title and company name are required'
        });
        return;
      }

      try {
        // Use the Gemini service to generate content
        console.log('🔧 Attempting to load Gemini service...');
        const { geminiService } = await import('../services/ai/gemini');
        
        let personalInfo = { firstName: 'User', lastName: '', email: '', location: '' };
        let resumeData = null;

        // Get resume data if provided
        if (resumeId) {
          const { Resume } = await import('../models/Resume');
          const resume = await Resume.findById(resumeId);
          if (resume) {
            personalInfo = resume.personalInfo || personalInfo;
            resumeData = resume.toObject();
          }
        }

        console.log('🎯 Generating content for:', { jobTitle, companyName, tone });
        const content = await geminiService.generateCoverLetter({
          personalInfo,
          jobDescription: jobDescription || '',
          jobTitle,
          companyName,
          tone: tone || 'professional',
          resumeData,
          keywordOptimization: true,
          customInstructions: existingContent ? `Improve this existing cover letter: ${existingContent}` : undefined
        });

        console.log('✅ AI content generated successfully');
        res.status(200).json({
          success: true,
          data: { content }
        });
      } catch (aiError) {
        console.warn('⚠️ AI generation failed, attempting enhanced fallback:', aiError);
        
        try {
          // Try a simpler AI approach first
          const simplePrompt = `Write a personalized cover letter for the ${jobTitle} position at ${companyName} using a ${tone} tone. Make it compelling and specific to the role. Return only the cover letter content.`;
          const { geminiService } = await import('../services/ai/gemini');
          const enhancedContent = await geminiService.generateText(simplePrompt);
          
          if (enhancedContent && enhancedContent.length > 100) {
            res.status(200).json({
              success: true,
              data: { content: enhancedContent },
              message: 'Generated using simplified AI approach'
            });
            return;
          }
        } catch (secondaryError) {
          console.warn('⚠️ Secondary AI attempt also failed:', secondaryError);
        }
        
        // Last resort: enhanced template generation
        const fallbackContent = await this.generateEnhancedFallbackCoverLetter(jobTitle, companyName, tone, existingContent);
        
        res.status(200).json({
          success: true,
          data: { content: fallbackContent },
          message: 'Generated using enhanced template (AI service unavailable)'
        });
      }
    } catch (error) {
      console.error('❌ Error in generateAIContent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate AI content'
      });
    }
  }

  private async generateEnhancedFallbackCoverLetter(jobTitle: string, companyName: string, tone: string, existingContent?: string): Promise<string> {
    if (existingContent) return existingContent;
    
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Tone-specific language variations
    const toneVariations = {
      professional: {
        opening: 'I am pleased to submit my application for',
        interest: 'I am particularly interested in this opportunity because',
        closing: 'I would welcome the opportunity to discuss my qualifications further',
        signature: 'Sincerely'
      },
      enthusiastic: {
        opening: 'I am thrilled to apply for',
        interest: 'I am incredibly excited about this opportunity because',
        closing: 'I would love to discuss how I can contribute to your team',
        signature: 'With enthusiasm'
      },
      conservative: {
        opening: 'I respectfully submit my application for',
        interest: 'I believe this position aligns well with my background because',
        closing: 'I would be honored to discuss this opportunity with you',
        signature: 'Respectfully'
      },
      casual: {
        opening: 'I\'d like to apply for',
        interest: 'This role really appeals to me because',
        closing: 'I\'d love to chat about how I can help your team',
        signature: 'Best regards'
      }
    };

    const selectedTone = toneVariations[tone as keyof typeof toneVariations] || toneVariations.professional;

    // Industry-specific value propositions
    const getIndustryValue = (company: string, role: string) => {
      const companyLower = company.toLowerCase();
      const roleLower = role.toLowerCase();
      
      if (companyLower.includes('tech') || companyLower.includes('software') || roleLower.includes('developer') || roleLower.includes('engineer')) {
        return `${company}'s reputation for innovation and technical excellence aligns perfectly with my passion for developing cutting-edge solutions`;
      } else if (companyLower.includes('health') || companyLower.includes('medical') || roleLower.includes('nurse') || roleLower.includes('doctor')) {
        return `${company}'s commitment to improving patient care and outcomes resonates with my dedication to making a meaningful impact in healthcare`;
      } else if (companyLower.includes('financial') || companyLower.includes('bank') || roleLower.includes('analyst') || roleLower.includes('finance')) {
        return `${company}'s track record of financial excellence and client service matches my commitment to delivering results and building trust`;
      } else if (companyLower.includes('education') || companyLower.includes('school') || roleLower.includes('teacher') || roleLower.includes('instructor')) {
        return `${company}'s focus on educational excellence and student success aligns with my passion for learning and development`;
      } else {
        return `${company}'s reputation for excellence and growth in the industry makes this an ideal opportunity for me to contribute my skills`;
      }
    };

    // Role-specific competencies
    const getRoleCompetencies = (role: string) => {
      const roleLower = role.toLowerCase();
      
      if (roleLower.includes('manager') || roleLower.includes('director') || roleLower.includes('lead')) {
        return 'leadership experience, strategic thinking, and team development';
      } else if (roleLower.includes('analyst') || roleLower.includes('data') || roleLower.includes('research')) {
        return 'analytical skills, attention to detail, and problem-solving abilities';
      } else if (roleLower.includes('sales') || roleLower.includes('marketing') || roleLower.includes('business')) {
        return 'communication skills, relationship building, and results-driven approach';
      } else if (roleLower.includes('developer') || roleLower.includes('engineer') || roleLower.includes('technical')) {
        return 'technical expertise, problem-solving skills, and continuous learning mindset';
      } else {
        return 'relevant experience, professional skills, and dedication to excellence';
      }
    };

    return `${date}

Dear Hiring Manager,

${selectedTone.opening} the ${jobTitle} position at ${companyName}. After researching your organization, I am confident that my background and skills make me a strong candidate for this role.

${selectedTone.interest} ${getIndustryValue(companyName, jobTitle)}. My ${getRoleCompetencies(jobTitle)} position me well to contribute effectively to your team and help achieve your organizational goals.

Throughout my career, I have developed a track record of delivering results and adapting to new challenges. I am particularly drawn to opportunities where I can apply my skills while continuing to grow professionally. The ${jobTitle} role at ${companyName} represents exactly the kind of position where I can make a meaningful impact while advancing my career.

${selectedTone.closing}. Thank you for considering my application, and I look forward to the possibility of contributing to ${companyName}'s continued success.

${selectedTone.signature},
[Your Name]`;
  }

  async handleConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { message, context, step } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Simple conversation handling - in production, you might use a more sophisticated AI service
      const { geminiService } = await import('../services/ai/gemini');
      
      const conversationPrompt = `
        You are an AI assistant helping users create cover letters. 
        Current conversation step: ${step || 'general'}
        User message: ${message}
        Context: ${JSON.stringify(context || {})}
        
        Provide a helpful, conversational response that guides the user through the cover letter creation process.
        Keep responses concise and actionable.
      `;

      // This is a simplified response - you'd implement more sophisticated conversation logic
      const response = await geminiService.generateText(conversationPrompt);

      res.status(200).json({
        success: true,
        response,
        nextStep: this.determineNextStep(step, message),
        suggestions: this.generateSuggestions(step, message)
      });
    } catch (error) {
      console.error('Error in handleConversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process conversation'
      });
    }
  }

  async analyzeRealTime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, jobDescription } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!content) {
        res.status(400).json({
          success: false,
          message: 'Content is required for analysis'
        });
        return;
      }

      // Perform real-time analysis using the existing service method
      const wordCount = content.split(/\s+/).length;
      
      // Extract keywords from job description if provided
      const jobKeywords = jobDescription ? this.extractKeywords(jobDescription) : [];
      const contentLower = content.toLowerCase();
      
      // Calculate keyword matches
      const keywordAlignment = jobKeywords.filter(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      
      const matchScore = Math.min(95, Math.max(15, 
        (keywordAlignment.length / (jobKeywords.length || 1)) * 100 * 0.6 + // Keyword match (60%)
        (wordCount >= 250 && wordCount <= 400 ? 25 : 10) + // Length score (25%)
        15 // Base score (15%)
      ));

      // Generate real-time suggestions
      const suggestions = [];
      if (wordCount < 200) {
        suggestions.push('Consider expanding your cover letter with more specific examples');
      }
      if (keywordAlignment.length < jobKeywords.length * 0.5) {
        suggestions.push('Include more job-specific keywords from the job description');
      }
      if (!content.includes('achieve') && !content.includes('success')) {
        suggestions.push('Add achievement-focused language to demonstrate impact');
      }

      res.status(200).json({
        success: true,
        data: {
          matchScore: Math.round(matchScore),
          wordCount,
          keywordAlignment,
          suggestions: suggestions.slice(0, 3),
          strengths: this.identifyStrengths(content, wordCount, keywordAlignment)
        }
      });
    } catch (error) {
      console.error('Error in analyzeRealTime:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze content'
      });
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
      .slice(0, 20);
  }

  private identifyStrengths(content: string, wordCount: number, keywordAlignment: string[]): string[] {
    const strengths = [];
    
    if (keywordAlignment.length >= 5) {
      strengths.push('Strong keyword alignment');
    }
    if (wordCount >= 250 && wordCount <= 400) {
      strengths.push('Optimal length');
    }
    if (/\d+%/.test(content) || content.includes('achieve') || content.includes('success')) {
      strengths.push('Achievement-focused language');
    }
    
    return strengths;
  }

  private determineNextStep(currentStep: string, message: string): string {
    // Simple logic to determine next conversation step
    if (!currentStep || currentStep === 'welcome') {
      if (message.toLowerCase().includes('job') || message.toLowerCase().includes('position')) {
        return 'job-details';
      }
    }
    if (currentStep === 'job-details') {
      if (message.toLowerCase().includes('resume') || message.toLowerCase().includes('cv')) {
        return 'resume-selection';
      }
    }
    return currentStep;
  }

  private generateSuggestions(step: string, message: string): string[] {
    const suggestions = [];
    
    switch (step) {
      case 'welcome':
        suggestions.push('I want to create a cover letter');
        suggestions.push('I found a job posting I like');
        break;
      case 'job-details':
        suggestions.push('Software Engineer');
        suggestions.push('Product Manager');
        suggestions.push('Data Scientist');
        break;
      case 'resume-selection':
        suggestions.push('Use my latest resume');
        suggestions.push('Continue without resume');
        break;
    }
    
    return suggestions;
  }
}

export const coverLetterController = new CoverLetterController();