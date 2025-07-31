import { Request, Response } from 'express';
import { resumeService } from '../services/resume-builder/resumeService';
import { aiResumeService } from '../services/resume-builder/aiResumeService';
import { notificationService } from '../services/notificationService';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';

export const resumeValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('personalInfo.firstName').notEmpty().withMessage('First name is required'),
  body('personalInfo.lastName').notEmpty().withMessage('Last name is required'),
  body('personalInfo.email').isEmail().withMessage('Valid email is required'),
  body('personalInfo.phone').notEmpty().withMessage('Phone is required'),
  body('personalInfo.location').optional().isString().withMessage('Location must be a string'),
  body('professionalSummary').optional().isString().withMessage('Professional summary must be a string'),
  body('workExperience').optional().isArray().withMessage('Work experience must be an array'),
  body('education').optional().isArray().withMessage('Education must be an array'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('certifications').optional().isArray().withMessage('Certifications must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('projects').optional().isArray().withMessage('Projects must be an array')
];

export const optimizeValidation = [
  body('jobDescription').notEmpty().withMessage('Job description is required'),
  body('jobTitle').notEmpty().withMessage('Job title is required'),
  body('companyName').notEmpty().withMessage('Company name is required')
];

export const jobUrlValidation = [
  body('jobUrl').isURL().withMessage('Valid job URL is required')
];

export const atsValidation = [
  body('jobDescription').optional().isString().withMessage('Job description must be a string')
];

export class ResumeController {
  async createResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('📝 CreateResume request received:', {
        body: req.body,
        bodyKeys: Object.keys(req.body),
        personalInfo: req.body.personalInfo,
        userId: req.user?.id
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id; // Assuming auth middleware sets this
      if (!userId) {
        console.log('❌ No user ID found');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      console.log('✅ Creating resume with data:', {
        ...req.body,
        userId
      });

      const resume = await resumeService.createResume({
        ...req.body,
        userId
      });

      console.log('✅ Resume created successfully:', resume._id);

      // Send notification for resume creation
      try {
        await notificationService.sendResumeNotification(
          userId, 
          'resume_created', 
          resume._id.toString()
        );
      } catch (notificationError) {
        console.warn('⚠️ Failed to send resume creation notification:', notificationError);
      }

      res.status(201).json({
        success: true,
        data: resume
      });
    } catch (error) {
      console.error('❌ Error in createResume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create resume',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createResumeWithoutValidation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('📝 CreateResumeWithoutValidation request received:', {
        body: req.body,
        bodyKeys: Object.keys(req.body),
        personalInfo: req.body.personalInfo,
        userId: req.user?.id
      });

      const userId = req.user?.id;
      if (!userId) {
        console.log('❌ No user ID found');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Test database connection
      try {
        const mongoose = require('mongoose');
        console.log('🔍 MongoDB connection state:', mongoose.connection.readyState);
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Database not connected');
        }
      } catch (dbError) {
        console.error('❌ Database connection error:', dbError);
        res.status(500).json({ 
          success: false, 
          message: 'Database connection error',
          error: dbError instanceof Error ? dbError.message : 'Database unavailable'
        });
        return;
      }

      console.log('✅ Creating resume without validation with data:', {
        ...req.body,
        userId
      });

      const resume = await resumeService.createResume({
        ...req.body,
        userId
      });

      console.log('✅ Resume created successfully:', resume._id);

      res.status(201).json({
        success: true,
        data: resume
      });
    } catch (error) {
      console.error('❌ Error in createResumeWithoutValidation:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create resume',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  }

  async createMinimalResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      
      const mongoose = require('mongoose');
      const { Resume } = require('../../models/Resume');
      
      const minimalResume = new Resume({
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Valid ObjectId
        title: 'Test Resume',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          location: 'Test City'
        },
        professionalSummary: 'Test summary',
        workExperience: [],
        education: [],
        skills: [],
        templateId: 'modern-1'
      });

      const saved = await minimalResume.save();
      console.log('✅ Minimal resume saved:', saved._id);

      res.json({ success: true, data: saved });
    } catch (error) {
      console.error('❌ Minimal resume creation failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getUserResumes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('📥 getUserResumes: Request received', {
        userId: req.user?.id,
        hasAuth: !!req.user,
        headers: req.headers.authorization ? 'Bearer token present' : 'No auth header'
      });

      const userId = req.user?.id;
      if (!userId) {
        console.log('❌ getUserResumes: No user id found, returning 401');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      console.log('🔍 getUserResumes: Fetching resumes for user:', userId);
      const resumes = await resumeService.getUserResumes(userId);
      console.log('✅ getUserResumes: Found', resumes.length, 'resumes');

      res.status(200).json({
        success: true,
        data: resumes
      });
    } catch (error) {
      console.error('❌ Error in getUserResumes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch resumes' 
      });
    }
  }

  async getResumeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const resume = await resumeService.getResumeById(id, userId);
      
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: resume
      });
    } catch (error) {
      console.error('Error in getResumeById:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch resume' 
      });
    }
  }

  async updateResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const resume = await resumeService.updateResume(id, userId, req.body);
      
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: resume
      });
    } catch (error) {
      console.error('Error in updateResume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update resume' 
      });
    }
  }

  async deleteResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const deleted = await resumeService.deleteResume(id, userId);
      
      if (!deleted) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Resume deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteResume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete resume' 
      });
    }
  }

  async optimizeResumeForJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const optimizedResume = await resumeService.optimizeResumeForJob(id, userId, req.body);

      // Send notification for resume optimization completion
      try {
        await notificationService.sendResumeNotification(
          userId, 
          'resume_optimized', 
          id,
          { 
            optimizationType: 'job_matching',
            jobTitle: req.body.jobTitle,
            companyName: req.body.companyName
          }
        );
      } catch (notificationError) {
        console.warn('⚠️ Failed to send resume optimization notification:', notificationError);
      }

      res.status(200).json({
        success: true,
        data: optimizedResume
      });
    } catch (error) {
      console.error('Error in optimizeResumeForJob:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to optimize resume' 
      });
    }
  }

  async parseResumeFromText(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;
      
      if (!text) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume text is required' 
        });
        return;
      }

      const parsedData = await resumeService.parseResumeFromText(text);

      res.status(200).json({
        success: true,
        data: parsedData
      });
    } catch (error) {
      console.error('Error in parseResumeFromText:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to parse resume' 
      });
    }
  }

  async generateProfessionalSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeId, resumeData } = req.body;
      const userId = req.user?.id;

      console.log('🔍 Generate summary request:', {
        hasResumeId: !!resumeId,
        resumeId: resumeId,
        hasResumeData: !!resumeData,
        resumeDataKeys: resumeData ? Object.keys(resumeData) : null,
        userId: userId
      });

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      let dataToProcess;
      if (resumeId && resumeId !== 'undefined' && resumeId !== 'null' && resumeId.length === 24) {
        const resume = await resumeService.getResumeById(resumeId, userId);
        if (!resume) {
          res.status(404).json({ success: false, message: 'Resume not found' });
          return;
        }
        dataToProcess = resume;
      } else if (resumeData) {
        dataToProcess = resumeData;
      } else {
        res.status(400).json({ success: false, message: 'Resume ID or resume data is required' });
        return;
      }

      const summary = await aiResumeService.generateProfessionalSummary(dataToProcess);

      res.status(200).json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      console.error('Error in generateProfessionalSummary:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate professional summary' 
      });
    }
  }

  async analyzeATSCompatibility(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id;
      const { jobDescription } = req.body;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const resume = await resumeService.getResumeById(id, userId);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      const analysis = await aiResumeService.analyzeATSCompatibility(resume, jobDescription);

      // Send notification for ATS analysis completion
      try {
        await notificationService.sendResumeNotification(
          userId, 
          'ai_analysis_complete', 
          id,
          { 
            analysisType: 'ats_compatibility', 
            score: analysis.score,
            totalIssues: analysis.improvementAreas?.length || 0
          }
        );
      } catch (notificationError) {
        console.warn('⚠️ Failed to send ATS analysis notification:', notificationError);
      }

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error in analyzeATSCompatibility:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze ATS compatibility' 
      });
    }
  }

  async analyzeATSCompatibilityUnsaved(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobDescription } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required' 
        });
        return;
      }

      console.log('🛡️ Analyzing ATS compatibility for unsaved resume...');
      const analysis = await aiResumeService.analyzeATSCompatibility(resumeData, jobDescription);

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error in analyzeATSCompatibilityUnsaved:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze ATS compatibility for unsaved resume'
      });
    }
  }

  async optimizeResumeWithJobUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id;
      const { jobUrl, jobTitle, companyName } = req.body;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const resume = await resumeService.getResumeById(id, userId);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      const optimization = await aiResumeService.optimizeResumeForJob(resume, {
        jobUrl,
        jobTitle,
        companyName
      });

      res.status(200).json({
        success: true,
        data: optimization
      });
    } catch (error) {
      console.error('Error in optimizeResumeWithJobUrl:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to optimize resume with job URL' 
      });
    }
  }

  async getJobAlignmentScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { jobDescription } = req.body;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobDescription) {
        res.status(400).json({ 
          success: false, 
          message: 'Job description is required' 
        });
        return;
      }

      const resume = await resumeService.getResumeById(id, userId);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      const alignment = await aiResumeService.getJobAlignmentScore(resume, jobDescription);

      res.status(200).json({
        success: true,
        data: alignment
      });
    } catch (error) {
      console.error('Error in getJobAlignmentScore:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze job alignment' 
      });
    }
  }

  async enhanceResumeComprehensively(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const options = req.body;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      let resumeData;
      if (id) {
        resumeData = await resumeService.getResumeById(id, userId);
        if (!resumeData) {
          res.status(404).json({ 
            success: false, 
            message: 'Resume not found' 
          });
          return;  
        }
      } else {
        resumeData = req.body.resumeData;
        if (!resumeData) {
          res.status(400).json({
            success: false,
            message: 'Resume data is required'
          });
          return;
        }
      }

      const enhancement = await aiResumeService.enhanceResumeComprehensively(resumeData, {
        includeIndustryAnalysis: options.includeIndustryAnalysis || true,
        includeCompetitorBenchmarking: options.includeCompetitorBenchmarking || true,
        includeContentOptimization: options.includeContentOptimization || true,
        includeATSAnalysis: options.includeATSAnalysis || true,
        ...options
      });

      res.status(200).json({
        success: true,
        data: enhancement
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to enhance resume comprehensively' 
      });
    }
  }

  async suggestMissingSections(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const resume = await resumeService.getResumeById(id, userId);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      const suggestions = await aiResumeService.suggestMissingSections(resume);

      res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error in suggestMissingSections:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to suggest missing sections' 
      });
    }
  }

  // New enterprise methods for unsaved resumes and advanced features

  async optimizeUnsavedResumeForJob(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, jobDescription, jobTitle, companyName, jobUrl } = req.body;
      
      if (!resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required' 
        });
        return;
      }

      if (!jobDescription && !jobUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Either job description or job URL is required' 
        });
        return;
      }

      const optimization = await aiResumeService.optimizeResumeForJob(resumeData, {
        jobDescription,
        jobTitle,
        companyName,
        jobUrl
      });

      res.status(200).json({
        success: true,
        data: optimization
      });
    } catch (error) {
      console.error('Error in optimizeUnsavedResumeForJob:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to optimize resume for job',
        code: 'AI_PROCESSING_FAILED'
      });
    }
  }

  async checkJobAlignmentForUnsavedResume(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, jobDescription } = req.body;
      
      if (!resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required' 
        });
        return;
      }

      if (!jobDescription) {
        res.status(400).json({ 
          success: false, 
          message: 'Job description is required' 
        });
        return;
      }

      const alignment = await aiResumeService.getJobAlignmentScore(resumeData, jobDescription);

      res.status(200).json({
        success: true,
        data: alignment
      });
    } catch (error) {
      console.error('Error in checkJobAlignmentForUnsavedResume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze job alignment',
        code: 'AI_PROCESSING_FAILED'
      });
    }
  }

  async analyzeJobFromUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobUrl } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Job URL is required' 
        });
        return;
      }

      const analysis = await aiResumeService.analyzeJobFromUrl(jobUrl);

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error in analyzeJobFromUrl:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze job posting from URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getJobMatchingScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobUrl } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Job URL is required' 
        });
        return;
      }

      const resume = await resumeService.getResumeById(id, userId);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      const matchingScore = await aiResumeService.getJobMatchingScore(resume, jobUrl);

      res.status(200).json({
        success: true,
        data: matchingScore
      });
    } catch (error) {
      console.error('Error in getJobMatchingScore:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze job matching score',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getJobMatchingScoreUnsaved(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobUrl } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobUrl || !resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Job URL and resume data are required' 
        });
        return;
      }

      const matchingScore = await aiResumeService.getJobMatchingScore(resumeData, jobUrl);

      res.status(200).json({
        success: true,
        data: matchingScore
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze job matching score',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async optimizeUnsavedResumeWithJobUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobUrl } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobUrl || !resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Job URL and resume data are required' 
        });
        return;
      }

      const optimizedResume = await aiResumeService.optimizeResumeWithJobUrl(resumeData, jobUrl);

      res.status(200).json({
        success: true,
        data: optimizedResume
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to optimize resume with job URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async optimizeResumeWithJobUrlOnly(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobUrl, resumeData } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!jobUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Job URL is required' 
        });
        return;
      }

      // Try to get saved resume first, if not found use provided resume data
      let resume = await resumeService.getResumeById(id, userId);
      
      if (!resume) {
        // If no saved resume found, check if resume data is provided in request body
        if (resumeData) {
          resume = resumeData;
        } else {
          res.status(404).json({ 
            success: false, 
            message: 'Resume not found and no resume data provided' 
          });
          return;
        }
      }

      const optimization = await aiResumeService.optimizeResumeWithJobUrl(resume, jobUrl);

      res.status(200).json({
        success: true,
        data: optimization
      });
    } catch (error) {
      console.error('Error in optimizeResumeWithJobUrlOnly:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to optimize resume with job URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async downloadResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('📥 Download request received:', {
        format: req.params.format,
        hasResumeData: !!req.body.resumeData,
        userId: req.user?.id,
        bodyKeys: Object.keys(req.body),
        bodyContent: req.body
      });

      const { format } = req.params;
      const { resumeData } = req.body;
      
      if (!resumeData) {
        console.log('❌ No resume data provided. Body:', req.body);
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required',
          debug: {
            receivedBody: req.body,
            bodyKeys: Object.keys(req.body)
          }
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

      // Validate basic resume structure
      if (!resumeData.personalInfo) {
        console.log('❌ Missing personalInfo in resume data');
        res.status(400).json({ 
          success: false, 
          message: 'Resume data must include personalInfo' 
        });
        return;
      }

      console.log('✅ Resume data validation passed, generating file...');

      const fileBuffer = await resumeService.generateResumeFile(resumeData, format as 'pdf' | 'docx' | 'txt');
      
      // Set appropriate headers
      const mimeTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain'
      };

      const fileName = `${resumeData.personalInfo?.firstName || 'Resume'}_${resumeData.personalInfo?.lastName || ''}_Resume.${format}`.replace(/\s+/g, '_');

      res.setHeader('Content-Type', mimeTypes[format as keyof typeof mimeTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      res.send(fileBuffer);
    } catch (error) {
      console.error('Error in downloadResume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate resume file',
        code: 'FILE_PROCESSING_FAILED'
      });
    }
  }

  async generateSummaryForUnsavedResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData } = req.body;
      
      if (!resumeData) {
        res.status(400).json({ success: false, message: 'Resume data is required' });
        return;
      }

      const summary = await aiResumeService.generateProfessionalSummary(resumeData);

      res.status(200).json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      console.error('Error generating summary for unsaved resume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate professional summary' 
      });
    }
  }

  async enhanceUnsavedResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, options } = req.body;
      
      console.log('📝 Enhancing unsaved resume with AI...');
      
      if (!resumeData) {
        res.status(400).json({ success: false, message: 'Resume data is required' });
        return;
      }

      // AI can work with minimal data - just ensure we have something to work with
      const hasAnyData = resumeData.personalInfo?.firstName || 
                        resumeData.personalInfo?.email ||
                        resumeData.workExperience?.length > 0 || 
                        resumeData.skills?.length > 0 ||
                        resumeData.education?.length > 0 ||
                        resumeData.professionalSummary;

      if (!hasAnyData) {
        // Even with no data, AI can create a basic template
        console.log('💡 No existing data found, AI will create from scratch');
      }

      console.log('🤖 Processing AI enhancement...');
      const result = await aiResumeService.enhanceResumeComprehensively(resumeData, {
        generateSummary: true,
        improveATS: true,
        enhanceAchievements: true,
        ...options
      });

      console.log('✅ AI enhancement completed successfully');
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to enhance resume with AI'
      });
    }
  }


}

export const resumeController = new ResumeController();