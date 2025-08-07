import { Request, Response } from 'express';
import { resumeService, CreateResumeData } from '../services/resume-builder/resumeService';
import { standardizedTemplateService, StandardizedResumeData } from '../services/resume-builder/standardizedTemplateService';
import { standardizedJobOptimizationService } from '../services/standardizedJobOptimizationService';
import { aiContentEnhancer } from '../services/resume-builder/aiContentEnhancer';
import { aiLatexGenerator } from '../services/resume-builder/aiLatexGenerator';
import { notificationService } from '../services/notificationService';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { IResume } from '../models/Resume';
import { convertDatesForFrontend } from '../utils/dateHandler';

// Helper function to convert IResume to StandardizedResumeData
function convertToStandardizedData(resume: IResume): StandardizedResumeData {
  return {
    personalInfo: resume.personalInfo,
    professionalSummary: resume.professionalSummary || '',
    workExperience: resume.workExperience?.map(exp => ({
      jobTitle: exp.jobTitle,
      company: exp.company,
      location: exp.location,
      startDate: exp.startDate instanceof Date ? exp.startDate.toISOString().split('T')[0] : String(exp.startDate),
      endDate: exp.endDate instanceof Date ? exp.endDate.toISOString().split('T')[0] : exp.endDate ? String(exp.endDate) : undefined,
      isCurrentJob: exp.isCurrentJob,
      responsibilities: exp.responsibilities || [],
      achievements: exp.achievements || []
    })) || [],
    education: resume.education?.map(edu => ({
      degree: edu.degree,
      institution: edu.institution,
      fieldOfStudy: edu.fieldOfStudy,
      location: (edu as any).location,
      graduationDate: edu.graduationDate instanceof Date ? edu.graduationDate.toISOString().split('T')[0] : String(edu.graduationDate || ''),
      gpa: edu.gpa,
      honors: edu.honors
    })) || [],
    skills: resume.skills?.map(skill => ({
      name: skill.name,
      category: skill.category,
      proficiencyLevel: skill.proficiencyLevel
    })) || [],
    projects: resume.projects?.map(proj => ({
      ...proj,
      startDate: proj.startDate instanceof Date ? proj.startDate.toISOString().split('T')[0] : proj.startDate,
      endDate: proj.endDate instanceof Date ? proj.endDate.toISOString().split('T')[0] : proj.endDate
    })) || [],
    certifications: resume.certifications?.map(cert => ({
      ...cert,
      date: cert.date instanceof Date ? cert.date.toISOString().split('T')[0] : cert.date,
      expirationDate: cert.expirationDate instanceof Date ? cert.expirationDate.toISOString().split('T')[0] : cert.expirationDate
    })) || [],
    languages: resume.languages || [],
    volunteerExperience: resume.volunteerExperience?.map(vol => ({
      ...vol,
      startDate: vol.startDate instanceof Date ? vol.startDate.toISOString().split('T')[0] : vol.startDate,
      endDate: vol.endDate instanceof Date ? vol.endDate.toISOString().split('T')[0] : vol.endDate
    })) || [],
    awards: resume.awards?.map(award => ({
      ...award,
      date: award.date instanceof Date ? award.date.toISOString().split('T')[0] : award.date
    })) || [],
    publications: resume.publications?.map(pub => ({
      ...pub,
      publicationDate: pub.publicationDate instanceof Date ? pub.publicationDate.toISOString().split('T')[0] : pub.publicationDate
    })) || [],
    references: resume.references || [],
    hobbies: resume.hobbies || [],
    additionalSections: resume.additionalSections || []
  };
}

export const resumeValidation = [
  // Basic info validation
  body('title').notEmpty().trim().withMessage('Title is required'),
  
  // Personal info validation
  body('personalInfo.firstName').notEmpty().trim().withMessage('First name is required'),
  body('personalInfo.lastName').notEmpty().trim().withMessage('Last name is required'),
  body('personalInfo.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('personalInfo.phone').notEmpty().withMessage('Phone is required'),
  body('personalInfo.location').notEmpty().trim().withMessage('Location is required'),
  body('personalInfo.linkedinUrl').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('personalInfo.portfolioUrl').optional().isURL().withMessage('Portfolio URL must be valid'),
  body('personalInfo.githubUrl').optional().isURL().withMessage('GitHub URL must be valid'),
  body('personalInfo.websiteUrl').optional().isURL().withMessage('Website URL must be valid'),
  body('personalInfo.professionalTitle').optional().isString().trim(),
  
  // Professional summary
  body('professionalSummary').optional().isString().trim().withMessage('Professional summary must be a string'),
  
  // Array validations
  body('workExperience').optional().isArray().withMessage('Work experience must be an array'),
  body('workExperience.*.jobTitle').optional().notEmpty().withMessage('Job title is required for work experience'),
  body('workExperience.*.company').optional().notEmpty().withMessage('Company is required for work experience'),
  body('workExperience.*.location').optional().notEmpty().withMessage('Location is required for work experience'),
  body('workExperience.*.startDate').optional().isString().withMessage('Start date must be a valid date string'),
  body('workExperience.*.responsibilities').optional().isArray().withMessage('Responsibilities must be an array'),
  body('workExperience.*.achievements').optional().isArray().withMessage('Achievements must be an array'),
  
  // Education validation
  body('education').optional().isArray().withMessage('Education must be an array'),
  body('education.*.institution').optional().notEmpty().withMessage('Institution is required for education'),
  body('education.*.degree').optional().notEmpty().withMessage('Degree is required for education'),
  body('education.*.fieldOfStudy').optional().notEmpty().withMessage('Field of study is required for education'),
  
  // Skills validation
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('skills.*.name').optional().notEmpty().withMessage('Skill name is required'),
  body('skills.*.category').optional().isIn(['technical', 'soft', 'language', 'certification']).withMessage('Invalid skill category'),
  
  // Other sections
  body('projects').optional().isArray().withMessage('Projects must be an array'),
  body('certifications').optional().isArray().withMessage('Certifications must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('volunteerExperience').optional().isArray().withMessage('Volunteer experience must be an array'),
  body('awards').optional().isArray().withMessage('Awards must be an array'),
  body('hobbies').optional().isArray().withMessage('Hobbies must be an array'),
  
  // Template validation
  body('templateId').optional().isString().withMessage('Template ID must be a string'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
];

export const resumeUpdateValidation = [
  // Partial validation for updates - only validate fields that are present
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  
  // Personal info - only validate if present
  body('personalInfo.firstName').optional().notEmpty().trim().withMessage('First name cannot be empty'),
  body('personalInfo.lastName').optional().notEmpty().trim().withMessage('Last name cannot be empty'), 
  body('personalInfo.email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('personalInfo.phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('personalInfo.location').optional().notEmpty().trim().withMessage('Location cannot be empty'),
  body('personalInfo.linkedinUrl').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('personalInfo.portfolioUrl').optional().isURL().withMessage('Portfolio URL must be valid'),
  body('personalInfo.githubUrl').optional().isURL().withMessage('GitHub URL must be valid'),
  body('personalInfo.websiteUrl').optional().isURL().withMessage('Website URL must be valid'),
  
  body('professionalSummary').optional().isString().trim(),
  body('workExperience').optional().isArray().withMessage('Work experience must be an array'),
  body('education').optional().isArray().withMessage('Education must be an array'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('projects').optional().isArray().withMessage('Projects must be an array'),
  body('certifications').optional().isArray().withMessage('Certifications must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('volunteerExperience').optional().isArray().withMessage('Volunteer experience must be an array'),
  body('awards').optional().isArray().withMessage('Awards must be an array'),
  body('hobbies').optional().isArray().withMessage('Hobbies must be an array'),
  body('templateId').optional().isString().withMessage('Template ID must be a string'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
];

export const optimizeValidation = [
  body('templateId').optional().isString().withMessage('Template ID must be a string'),
];

export const jobUrlValidation = [
  body('jobUrl').isURL().withMessage('Valid job URL is required'),
  body('templateId').optional().isString().withMessage('Template ID must be a string'),
];

/**
 * Standardized Resume Controller
 * Uses only the new standardized template system and AI content enhancement
 * NO MORE OLD AI LATEX GENERATION
 */
export class StandardizedResumeController {

  // ===== CORE RESUME MANAGEMENT =====

  async getAllResumes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const resumes = await resumeService.getAllResumes(userId);
      const convertedResumes = resumes.map(resume => convertDatesForFrontend(resume));
      res.status(200).json({
        success: true,
        data: convertedResumes
      });
    } catch (error) {
      console.error('Error getting all resumes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get resumes' 
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
        data: convertDatesForFrontend(resume)
      });
    } catch (error) {
      console.error('Error getting resume by ID:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get resume' 
      });
    }
  }

  async createResume(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const resumeData = {
        ...req.body,
        userId
      };

      const resume = await resumeService.createResume(resumeData);
      res.status(201).json({
        success: true,
        data: convertDatesForFrontend(resume)
      });
    } catch (error) {
      console.error('Error creating resume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create resume' 
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

      const resume = await resumeService.updateResume(id, userId, req.body as Partial<CreateResumeData>);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found or unauthorized' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: convertDatesForFrontend(resume)
      });
    } catch (error) {
      console.error('Error updating resume:', error);
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

      await resumeService.deleteResume(id, userId);
      res.status(200).json({
        success: true,
        message: 'Resume deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting resume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete resume' 
      });
    }
  }

  // ===== PDF GENERATION WITH STANDARDIZED TEMPLATES =====

  async generateResumePreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { templateId = 'template01', outputFormat = 'pdf' } = req.body;
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

      console.log('📄 [STANDARDIZED] Generating PDF using standardized template system');

      // Use standardized template service for PDF generation
      const standardizedData = convertToStandardizedData(resume);
      const latex = await standardizedTemplateService.generateLatex(
        templateId,
        standardizedData,
        { enhanceWithAI: false }
      );

      const pdfBuffer = await resumeService.generateLatexResumePDF(standardizedData, {
        templateId,
        outputFormat,
        cleanup: true,
        optimizedLatexCode: latex
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Standardized PDF generation failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate PDF with standardized templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateUnsavedResumePreview(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, templateId = 'template01', outputFormat = 'pdf' } = req.body;

      if (!resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required' 
        });
        return;
      }

      console.log('📄 [STANDARDIZED] Generating unsaved resume PDF using standardized templates');

      // Use standardized template service
      const latex = await standardizedTemplateService.generateLatex(
        templateId,
        resumeData,
        { enhanceWithAI: false }
      );

      const pdfBuffer = await resumeService.generateLatexResumePDF(resumeData, {
        templateId,
        outputFormat,
        cleanup: true,
        optimizedLatexCode: latex
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Unsaved resume PDF generation failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate PDF for unsaved resume' 
      });
    }
  }

  // ===== AI CONTENT ENHANCEMENT =====

  async enhanceResumeComprehensively(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { templateId = 'template01', jobDescription } = req.body;
      
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

      console.log('🤖 [STANDARDIZED] Enhancing resume with AI content enhancer + standardized templates');

      // Use standardized template service with AI enhancement
      const standardizedData = convertToStandardizedData(resume);
      const enhancedLatex = await standardizedTemplateService.generateLatex(
        templateId,
        standardizedData,
        {
          enhanceWithAI: true,
          jobDescription
        }
      );

      // Get detailed enhancement info
      const contentEnhancement = jobDescription 
        ? await aiContentEnhancer.optimizeForJob(standardizedData, jobDescription)
        : await aiContentEnhancer.enhanceResumeContent(standardizedData);

      res.status(200).json({
        success: true,
        data: {
          originalResume: convertDatesForFrontend(resume),
          improvedResume: convertDatesForFrontend(contentEnhancement.enhancedContent),
          optimizedLatexCode: enhancedLatex,
          improvements: contentEnhancement.improvements,
          keywordsAdded: contentEnhancement.keywordsAdded || [],
          atsScore: contentEnhancement.atsScore || 0,
          templateUsed: templateId,
          generationMethod: 'standardized',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Standardized resume enhancement failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to enhance resume with standardized system',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async enhanceUnsavedResume(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, templateId = 'template01', jobDescription } = req.body;
      
      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
        return;
      }

      console.log('🤖 [STANDARDIZED] Enhancing unsaved resume');

      // Use AI content enhancer
      const contentEnhancement = jobDescription 
        ? await aiContentEnhancer.optimizeForJob(resumeData, jobDescription)
        : await aiContentEnhancer.enhanceResumeContent(resumeData);

      // Generate LaTeX with enhanced content
      const enhancedLatex = await standardizedTemplateService.generateLatex(
        templateId,
        contentEnhancement.enhancedContent,
        { enhanceWithAI: false } // Already enhanced
      );

      res.status(200).json({
        success: true,
        data: {
          originalResume: convertDatesForFrontend(resumeData),
          improvedResume: convertDatesForFrontend(contentEnhancement.enhancedContent),
          optimizedLatexCode: enhancedLatex,
          improvements: contentEnhancement.improvements,
          keywordsAdded: contentEnhancement.keywordsAdded || [],
          atsScore: contentEnhancement.atsScore || 0,
          templateUsed: templateId,
          generationMethod: 'standardized'
        }
      });
    } catch (error) {
      console.error('❌ Unsaved resume enhancement failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to enhance unsaved resume' 
      });
    }
  }

  // ===== JOB OPTIMIZATION =====

  async optimizeResumeWithStandardizedTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobDescription, jobTitle, companyName, templateId = 'template01', targetRole, industry } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Job description is now optional - will be extracted from URL if not provided

      const resume = await resumeService.getResumeById(id, userId);
      if (!resume) {
        res.status(404).json({ 
          success: false, 
          message: 'Resume not found' 
        });
        return;
      }

      console.log(`🎯 [STANDARDIZED] Optimizing resume for job using template ${templateId}`);

      const standardizedData = convertToStandardizedData(resume);
      const optimizationResult = await standardizedJobOptimizationService.optimizeResumeForJob({
        resumeData: standardizedData,
        jobDescription,
        jobTitle,
        companyName,
        templateId,
        targetRole,
        industry,
      });

      res.json({
        success: true,
        data: {
          originalResume: convertDatesForFrontend(optimizationResult.originalResume),
          optimizedResume: convertDatesForFrontend(optimizationResult.optimizedResume),
          optimizedLatexCode: optimizationResult.optimizedLatex,
          improvements: optimizationResult.improvements,
          keywordsAdded: optimizationResult.keywordsAdded,
          atsScore: optimizationResult.atsScore,
          jobMatchAnalysis: optimizationResult.jobMatchAnalysis,
          optimizationSuggestions: optimizationResult.optimizationSuggestions,
          templateUsed: templateId,
          generationMethod: 'standardized-job-optimization',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Standardized job optimization failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize resume using standardized templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async optimizeUnsavedResumeForJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobUrl, templateId = 'template01', templateCode } = req.body;
      
      if (!resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required' 
        });
        return;
      }

      if (!jobUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Job URL is required' 
        });
        return;
      }

      console.log('🎯 [STANDARDIZED] Optimizing unsaved resume for job');

      // Extract job description from URL
      console.log('🔍 Extracting job details from URL:', jobUrl);
      const jobAnalysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl);
      const finalJobDescription = jobAnalysis.jobDescription;
      const finalJobTitle = jobAnalysis.jobTitle;
      const finalCompanyName = jobAnalysis.companyName;

      const optimization = await standardizedJobOptimizationService.optimizeResumeForJob({
        resumeData,
        jobDescription: finalJobDescription,
        jobTitle: finalJobTitle,
        companyName: finalCompanyName,
        templateId,
        templateCode
      });

      // This endpoint returns JSON only - PDF generation moved to separate endpoint

      res.status(200).json({
        success: true,
        data: {
          originalResume: convertDatesForFrontend(optimization.originalResume),
          optimizedResume: convertDatesForFrontend(optimization.optimizedResume),
          optimizedLatexCode: optimization.optimizedLatex,
          improvements: optimization.improvements,
          keywordsAdded: optimization.keywordsAdded,
          atsScore: optimization.atsScore,
          jobMatchAnalysis: optimization.jobMatchAnalysis,
          templateUsed: templateId,
          generationMethod: 'standardized-job-optimization'
        }
      });
    } catch (error) {
      console.error('❌ Unsaved resume job optimization failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to optimize unsaved resume for job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async optimizeUnsavedResumeForJobPDF(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobUrl, templateId = 'template01', templateCode } = req.body;
      
      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
        return;
      }

      if (!jobUrl) {
        res.status(400).json({
          success: false,
          message: 'Job URL is required' 
        });
        return;
      }

      console.log('🎯 [PDF] Generating job-optimized PDF for unsaved resume');

      // Extract job description from URL
      console.log('🔍 Extracting job details from URL:', jobUrl);
      const jobAnalysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl);
      const finalJobDescription = jobAnalysis.jobDescription;
      const finalJobTitle = jobAnalysis.jobTitle;
      const finalCompanyName = jobAnalysis.companyName;

      const optimization = await standardizedJobOptimizationService.optimizeResumeForJob({
        resumeData,
        jobDescription: finalJobDescription,
        jobTitle: finalJobTitle,
        companyName: finalCompanyName,
        templateId,
        templateCode
      });

      // Generate PDF directly (like generateResumePreviewPDF)
      const pdfBuffer = await resumeService.generateLatexResumePDF(optimization.optimizedResume, {
        templateId: templateId,
        outputFormat: 'pdf',
        cleanup: true,
        optimizedLatexCode: templateCode || optimization.optimizedLatex
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Job optimization PDF generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate job-optimized PDF',
        error: error instanceof Error ? error.message : 'PDF generation error'
      });
    }
  }

  async optimizeResumeWithJobUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobUrl, templateId = 'template01', templateCode } = req.body;
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

      console.log(`🎯 [STANDARDIZED] Optimizing resume for job from URL using template ${templateId}`);

      // Extract job description from URL first
      const jobAnalysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl);
      const jobDescription = jobAnalysis.jobDescription || jobAnalysis.description || '';
      
      if (!jobDescription) {
        res.status(400).json({
          success: false,
          message: 'Could not extract job description from the provided URL'
        });
        return;
      }

      const standardizedData = convertToStandardizedData(resume);
      const optimization = await standardizedJobOptimizationService.optimizeResumeForJob({
        resumeData: standardizedData,
        jobDescription: jobDescription,
        jobTitle: jobAnalysis.jobTitle,
        companyName: jobAnalysis.companyName,
        templateId,
        templateCode
      });

      // If templateCode is provided, generate PDF with custom template
      if (templateCode) {
        try {
          const pdfBuffer = await resumeService.generateLatexResumePDF(optimization.optimizedResume, {
            templateId: templateId,
            outputFormat: 'pdf',
            cleanup: true,
            optimizedLatexCode: templateCode // Use custom template code
          });

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', pdfBuffer.length);
          res.setHeader('Cache-Control', 'no-cache');
          res.send(pdfBuffer);
          return;
        } catch (pdfError) {
          console.warn('⚠️ PDF compilation with custom template failed:', pdfError);
          // Fall through to return JSON response
        }
      }

      res.status(200).json({
        success: true,
        data: {
          originalResume: convertDatesForFrontend(optimization.originalResume),
          optimizedResume: convertDatesForFrontend(optimization.optimizedResume),
          optimizedLatexCode: optimization.optimizedLatex,
          improvements: optimization.improvements,
          keywordsAdded: optimization.keywordsAdded,
          atsScore: optimization.atsScore,
          jobMatchAnalysis: optimization.jobMatchAnalysis,
          optimizationSuggestions: optimization.optimizationSuggestions,
          templateUsed: templateId,
          generationMethod: 'standardized-job-optimization'
        }
      });
    } catch (error) {
      console.error('Error in optimizeResumeWithJobUrl:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize resume with job URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getJobMatchScoreStandardized(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobDescription, jobUrl } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
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

      const standardizedData = convertToStandardizedData(resume);
      
      // Extract job description from URL
      const jobAnalysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl);
      const finalJobDescription = jobAnalysis.jobDescription || jobAnalysis.description || '';
      
      if (!finalJobDescription) {
        res.status(400).json({
          success: false,
          message: 'Could not extract job description from the provided URL'
        });
        return;
      }
      
      const matchResult = await standardizedJobOptimizationService.getJobMatchScore(
        standardizedData,
        finalJobDescription
      );

      res.json({
        success: true,
        data: {
          matchScore: matchResult.matchScore,
          keyFindings: matchResult.keyFindings,
          timestamp: new Date().toISOString(),
        }
      });

    } catch (error) {
      console.error('❌ Job match score calculation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate job match score',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ===== ATS ANALYSIS =====

  async analyzeATSCompatibility(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobDescription } = req.body;
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

      console.log('🎯 [STANDARDIZED] Analyzing ATS compatibility');

      // Use AI content enhancer for ATS analysis
      const standardizedData = convertToStandardizedData(resume);
      const enhancementResult = await aiContentEnhancer.enhanceResumeContent(
        standardizedData,
        { jobDescription }
      );

      res.status(200).json({
        success: true,
        data: {
          atsScore: enhancementResult.atsScore || 0,
          improvements: enhancementResult.improvements,
          keywordsAdded: enhancementResult.keywordsAdded || [],
          recommendations: enhancementResult.improvements,
          generationMethod: 'standardized-ats-analysis'
        }
      });
    } catch (error) {
      console.error('❌ ATS analysis failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze ATS compatibility' 
      });
    }
  }

  async analyzeATSCompatibilityUnsaved(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, jobDescription } = req.body;

      if (!resumeData) {
        res.status(400).json({ 
          success: false, 
          message: 'Resume data is required' 
        });
        return;
      }

      console.log('🎯 [STANDARDIZED] Analyzing ATS compatibility for unsaved resume');

      const enhancementResult = await aiContentEnhancer.enhanceResumeContent(
        resumeData,
        { jobDescription }
      );

      res.status(200).json({
        success: true,
        data: {
          atsScore: enhancementResult.atsScore || 0,
          improvements: enhancementResult.improvements,
          keywordsAdded: enhancementResult.keywordsAdded || [],
          recommendations: enhancementResult.improvements,
          generationMethod: 'standardized-ats-analysis'
        }
      });
    } catch (error) {
      console.error('❌ Unsaved resume ATS analysis failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze ATS compatibility for unsaved resume' 
      });
    }
  }

  // ===== TEMPLATE MANAGEMENT =====

  async getAvailableTemplates(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 [STANDARDIZED] Getting available templates');
      
      // Use the updated AI LaTeX generator that prioritizes standardized templates
      const templates = await aiLatexGenerator.getTemplateMetadata();
      
      res.status(200).json({
        success: true,
        data: templates,
        metadata: {
          totalTemplates: templates.length,
          standardizedCount: templates.filter(t => t.id.includes('standardized')).length,
          generationMethod: 'standardized'
        }
      });
    } catch (error) {
      console.error('❌ Failed to get templates:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get available templates' 
      });
    }
  }

  async getLatexTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templates = await standardizedTemplateService.getAvailableTemplates();
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting LaTeX templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get LaTeX templates'
      });
    }
  }

  async getLatexTemplatesWithCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templates = await standardizedTemplateService.getAvailableTemplates();
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting LaTeX templates with code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get LaTeX templates with code'
      });
    }
  }

  async generateResumePreviewPDF(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, templateId = 'template01' } = req.body;
      
      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
        return;
      }

      const latex = await standardizedTemplateService.generateLatex(
        templateId,
        resumeData,
        { enhanceWithAI: false }
      );

      // Import the LaTeX service
      const { latexService } = await import('../services/resume-builder/latexService');
      
      // Use the direct LaTeX compilation method to avoid double generation
      const pdfBuffer = await latexService.compileLatexToPDF(
        latex,
        templateId,
        'pdf'
      );

      // Validate the PDF buffer before sending
      if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error('❌ PDF generation returned empty buffer');
        res.status(500).json({
          success: false,
          message: 'PDF generation failed - empty file created'
        });
        return;
      }

      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating preview PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate preview PDF'
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

      // Use standardized job optimization service for job analysis
      const analysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing job from URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze job from URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async checkJobAlignment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeData, jobUrl, jobDescription } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!resumeData || (!jobUrl && !jobDescription)) {
        res.status(400).json({
          success: false,
          message: 'Resume data and either job URL or job description are required'
        });
        return;
      }

      // Use standardized job optimization service for alignment check
      let finalJobDescription = jobDescription;
      
      if (jobUrl && !jobDescription) {
        // URL-based matching - first analyze the job, then get match score
        console.log('🔍 Using job URL for alignment analysis');
        const jobAnalysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl);
        finalJobDescription = jobAnalysis.jobDescription || jobAnalysis.description || '';
        
        if (!finalJobDescription) {
          res.status(400).json({
            success: false,
            message: 'Could not extract job description from the provided URL'
          });
          return;
        }
      } else if (jobDescription) {
        console.log('🔍 Using provided job description for alignment analysis');
        finalJobDescription = jobDescription;
      }
      
      const matchResult = await standardizedJobOptimizationService.getJobMatchScore(
        resumeData,
        finalJobDescription
      );

      res.json({
        success: true,
        data: matchResult
      });
    } catch (error) {
      console.error('Error checking job alignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check job alignment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate professional summary for unsaved resume data
   * POST /api/v1/resumes/generate-summary
   */
  async generateSummaryForUnsavedResume(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData } = req.body;

      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required',
          code: 'AI_INVALID_INPUT'
        });
        return;
      }

      // Validate that we have enough data to generate a summary
      const hasWorkExperience = resumeData.workExperience && resumeData.workExperience.length > 0;
      const hasSkills = resumeData.skills && resumeData.skills.length > 0;
      const hasEducation = resumeData.education && resumeData.education.length > 0;

      if (!hasWorkExperience && !hasSkills && !hasEducation) {
        res.status(400).json({
          success: false,
          message: 'Work experience, skills, or education are required to generate a professional summary',
          code: 'AI_INVALID_INPUT'
        });
        return;
      }

      // Import AIResumeService here to avoid circular dependencies
      const { AIResumeService } = await import('../services/resume-builder/aiResumeService');
      const aiResumeService = new AIResumeService();

      // Generate multiple summary options
      const summaries = await aiResumeService.generateMultipleSummaryOptions(resumeData);

      res.status(200).json({
        success: true,
        data: { 
          summaries,
          summary: summaries[0] // For backward compatibility
        }
      });
    } catch (error: any) {
      console.error('Generate summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate professional summary',
        code: 'AI_PROCESSING_FAILED'
      });
    }
  }

  /**
   * Save PDF to database with current resume data
   */
  async savePDFToDatabase(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: resumeId } = req.params;
      const userId = req.user?.id!;
      const { 
        templateId, 
        optimizedLatexCode, 
        jobOptimized, 
        resumeData, 
        pdfBlob 
      } = req.body;

      console.log('💾 Saving PDF to database:', {
        resumeId,
        userId,
        templateId,
        hasOptimizedLatex: !!optimizedLatexCode,
        hasJobData: !!jobOptimized,
        hasResumeData: !!resumeData,
        hasPdfBlob: !!pdfBlob
      });

      // If pdfBlob is provided (base64 encoded), use it directly
      let pdfBuffer: Buffer;
      
      if (pdfBlob) {
        // Convert base64 pdfBlob to buffer
        console.log('🔍 pdfBlob type:', typeof pdfBlob, 'length:', pdfBlob?.length);
        console.log('🔍 pdfBlob preview:', pdfBlob?.substring(0, 100));
        
        try {
          const base64Data = pdfBlob.replace(/^data:application\/pdf;base64,/, '');
          console.log('🔍 base64Data length after prefix removal:', base64Data.length);
          
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Empty base64 data after prefix removal');
          }
          
          pdfBuffer = Buffer.from(base64Data, 'base64');
          console.log('📄 Using provided PDF blob, buffer size:', pdfBuffer.length);
          
          if (pdfBuffer.length === 0) {
            throw new Error('Generated PDF buffer is empty');
          }
        } catch (bufferError) {
          console.error('❌ Error converting base64 to buffer:', bufferError);
          throw new Error(`Invalid PDF data: ${bufferError.message}`);
        }
      } else if (resumeData) {
        // Generate PDF from resume data
        console.log('🔄 Generating PDF from resume data...');
        
        // Convert resume data to standardized format
        const standardizedData: StandardizedResumeData = {
          personalInfo: resumeData.personalInfo,
          professionalSummary: resumeData.professionalSummary || '',
          workExperience: resumeData.workExperience?.map((exp: any) => ({
            jobTitle: exp.jobTitle,
            company: exp.company,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrentJob: exp.isCurrentJob,
            responsibilities: exp.responsibilities || [],
            achievements: exp.achievements || []
          })) || [],
          education: resumeData.education?.map((edu: any) => ({
            degree: edu.degree,
            institution: edu.institution,
            fieldOfStudy: edu.fieldOfStudy,
            graduationDate: edu.graduationDate,
            gpa: edu.gpa,
            honors: edu.honors || []
          })) || [],
          skills: resumeData.skills?.map((skill: any) => ({
            name: skill.name,
            category: skill.category,
            proficiencyLevel: skill.proficiencyLevel
          })) || [],
          projects: resumeData.projects || [],
          certifications: resumeData.certifications || [],
          languages: resumeData.languages || [],
          volunteerExperience: resumeData.volunteerExperience || [],
          awards: resumeData.awards || [],
          publications: resumeData.publications || [],
          references: resumeData.references || [],
          hobbies: resumeData.hobbies || [],
          additionalSections: resumeData.additionalSections || []
        };

        // Generate PDF using standardized template service
        pdfBuffer = await standardizedTemplateService.generatePDF(
          standardizedData,
          templateId || 'modern-1'
        );
        
        console.log('✅ PDF generated from resume data, size:', pdfBuffer.length);
      } else {
        // Generate PDF from saved resume in database
        console.log('🔄 Generating PDF from saved resume...');
        const savedResume = await resumeService.getResumeById(resumeId, userId);
        
        if (!savedResume) {
          return res.status(404).json({
            success: false,
            message: 'Resume not found'
          });
        }

        const standardizedData = convertToStandardizedData(savedResume);
        
        // Generate PDF using standardized template service
        pdfBuffer = await standardizedTemplateService.generatePDF(
          standardizedData,
          templateId || savedResume.templateId || 'modern-1'
        );
        
        console.log('✅ PDF generated from saved resume, size:', pdfBuffer.length);
      }

      // Save PDF to database using resume service
      await resumeService.savePDFToDatabase(resumeId, userId, pdfBuffer, {
        templateId: templateId || 'modern-1',
        isOptimized: !!optimizedLatexCode || !!jobOptimized,
        jobOptimized: jobOptimized
      });

      res.json({
        success: true,
        message: 'PDF saved to database successfully',
        size: pdfBuffer.length
      });

    } catch (error) {
      console.error('❌ Error saving PDF to database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save PDF to database',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSavedPDFInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const pdfInfo = await resumeService.getSavedPDFInfo(id, userId);

      if (!pdfInfo) {
        res.status(404).json({ success: false, message: 'PDF info not found' });
        return;
      }

      res.status(200).json({ success: true, data: pdfInfo });
    } catch (error) {
      console.error('Error getting saved PDF info:', error);
      res.status(500).json({ success: false, message: 'Failed to get PDF info' });
    }
  }

  async downloadSavedPDF(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!resumeId) {
        res.status(400).json({ message: 'resumeId is required' });
        return;
      }

      const pdf = await resumeService.getSavedPDF(resumeId, userId);

      if (!pdf) {
        res.status(404).json({ success: false, message: 'Saved PDF not found' });
        return;
      }

      // Return PDF data as base64 JSON to avoid download manager interception
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Download-Options', 'noopen');
      res.json({
        success: true,
        data: {
          filename: pdf.filename,
          pdfData: pdf.pdfBuffer.toString('base64'),
          contentType: 'application/pdf'
        }
      });
    } catch (error) {
      console.error('Error downloading saved PDF:', error);
      res.status(500).json({ success: false, message: 'Failed to download PDF' });
    }
  }
}

export const resumeController = new StandardizedResumeController();