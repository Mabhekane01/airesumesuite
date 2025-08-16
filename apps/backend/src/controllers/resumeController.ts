import { Request, Response } from 'express';
import { resumeService, CreateResumeData } from '../services/resume-builder/resumeService';
import { ResumeData } from '../services/resume-builder/templateService';
import { standardizedJobOptimizationService } from '../services/standardizedJobOptimizationService';
import { aiContentEnhancer } from '../services/resume-builder/aiContentEnhancer';
import { aiLatexGenerator } from '../services/resume-builder/aiLatexGenerator';
import { notificationService } from '../services/notificationService';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { IResume } from '../models/Resume';
import { convertDatesForFrontend } from '../utils/dateHandler';

// Helper function to convert IResume to StandardizedResumeData
function convertToStandardizedData(resume: IResume): ResumeData {
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
      startDate: (edu as any).startDate instanceof Date ? (edu as any).startDate.toISOString().split('T')[0] : (edu as any).startDate,
      endDate: (edu as any).endDate instanceof Date ? (edu as any).endDate.toISOString().split('T')[0] : (edu as any).endDate,
      gpa: edu.gpa,
      coursework: (edu as any).coursework
    })) || [],
    skills: resume.skills?.map(skill => ({
      name: skill.name,
      category: skill.category,
      proficiencyLevel: skill.proficiencyLevel
    })) || [],
    projects: resume.projects?.map(proj => ({
      name: proj.name,
      description: Array.isArray(proj.description) 
        ? proj.description 
        : (proj.description && typeof proj.description === 'string' 
            ? proj.description.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0)
            : []),
      technologies: proj.technologies,
      url: proj.url,
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

      // Use template service for PDF generation
      const standardizedData = convertToStandardizedData(resume);
      const { templateService } = await import('../services/resume-builder/templateService');
      const latex = await templateService.generateLatex(
        templateId,
        standardizedData
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

      // Use template service
      const { templateService } = await import('../services/resume-builder/templateService');
      const latex = await templateService.generateLatex(
        templateId,
        resumeData
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

      // Use template service with AI enhancement
      const standardizedData = convertToStandardizedData(resume);
      
      // First enhance content with AI if requested
      let finalData = standardizedData;
      if (jobDescription) {
        const contentEnhancement = await aiContentEnhancer.optimizeForJob(standardizedData, jobDescription);
        finalData = contentEnhancement.enhancedContent;
      } else {
        const contentEnhancement = await aiContentEnhancer.enhanceResumeContent(standardizedData);
        finalData = contentEnhancement.enhancedContent;
      }
      
      const { templateService } = await import('../services/resume-builder/templateService');
      const enhancedLatex = await templateService.generateLatex(
        templateId,
        finalData
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
      const { templateService } = await import('../services/resume-builder/templateService');
      const enhancedLatex = await templateService.generateLatex(
        templateId,
        contentEnhancement.enhancedContent
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
      const { templateService } = await import('../services/resume-builder/templateService');
      const templates = await templateService.getAvailableTemplates();
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
      const { templateService } = await import('../services/resume-builder/templateService');
      const templates = await templateService.getAvailableTemplates();
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

      // Process the resume data to ensure proper formatting (arrays for bullet points, etc.)
      console.log('🔍 Starting PDF preview generation with data processing...');
      console.log('🔍 Raw project data:', JSON.stringify(resumeData.projects?.slice(0, 1), null, 2));
      
      let processedResumeData;
      try {
        const { processCompleteResumeData } = await import('../utils/resumeDataProcessor');
        
        // Add required fields for processing if missing (for preview requests)
        const dataToProcess = {
          ...resumeData,
          userId: resumeData.userId || 'preview-user-id', // Temporary ID for preview
          title: resumeData.title || `${resumeData.personalInfo?.firstName || 'My'} ${resumeData.personalInfo?.lastName || 'Resume'}`
        };
        
        processedResumeData = processCompleteResumeData(dataToProcess);
        console.log('✅ Resume data processed successfully for preview');
        console.log('🔍 Processed project data:', JSON.stringify(processedResumeData.projects?.slice(0, 1), null, 2));
        
        // Debug: Check if description is array or string
        if (processedResumeData.projects && processedResumeData.projects.length > 0) {
          const firstProject = processedResumeData.projects[0];
          console.log('🔍 First project description type:', typeof firstProject.description);
          console.log('🔍 First project description is array:', Array.isArray(firstProject.description));
          if (Array.isArray(firstProject.description)) {
            console.log('🔍 Description array length:', firstProject.description.length);
            console.log('🔍 Description array items:', firstProject.description);
          }
        }
      } catch (processingError) {
        console.error('⚠️ Data processing failed, using raw data:', processingError);
        // Fallback to raw data if processing fails
        processedResumeData = resumeData;
      }

      // Import the new template service
      const { templateService } = await import('../services/resume-builder/templateService');
      
      const latex = await templateService.generateLatex(
        templateId,
        processedResumeData
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

      // Use standardized job optimization service for job analysis
      const analysis = await standardizedJobOptimizationService.analyzeJobFromUrl(jobUrl, resumeData);

      // Transform the response to match frontend expectations
      const transformedAnalysis = {
        jobDetails: {
          title: analysis.jobTitle || 'Job Title Not Available',
          company: analysis.companyName || 'Company Not Available',
          description: analysis.jobDescription || '',
          requirements: analysis.requirements || analysis.requiredSkills || [],
          location: analysis.location || '',
          salary: analysis.salary || '',
          benefits: analysis.benefits || [],
          responsibilities: analysis.responsibilities || [],
          qualifications: analysis.qualifications || [],
          experienceLevel: analysis.experienceLevel || 'mid'
        },
        matchAnalysis: analysis.matchAnalysis || {},
        recommendations: analysis.recommendations || [
          'Review job requirements and align your resume accordingly',
          'Highlight relevant skills and experience',
          'Quantify your achievements where possible'
        ]
      };

      res.json({
        success: true,
        data: transformedAnalysis
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
        const standardizedData: ResumeData = {
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

        // Generate PDF using template service
        const { templateService } = await import('../services/resume-builder/templateService');
        const { latexService } = await import('../services/resume-builder/latexService');
        
        const latex = await templateService.generateLatex(
          templateId || 'template01',
          standardizedData
        );
        
        pdfBuffer = await latexService.compileLatexToPDF(
          latex,
          templateId || 'template01',
          'pdf'
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
        
        // Generate PDF using template service
        const { templateService } = await import('../services/resume-builder/templateService');
        const { latexService } = await import('../services/resume-builder/latexService');
        
        const latex = await templateService.generateLatex(
          templateId || savedResume.templateId || 'template01',
          standardizedData
        );
        
        pdfBuffer = await latexService.compileLatexToPDF(
          latex,
          templateId || savedResume.templateId || 'template01',
          'pdf'
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

  // New methods for AI enhancement with direct PDF generation
  async enhanceResumeWithLatexPDF(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, templateId = 'template01', options } = req.body;
      
      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
        return;
      }

      console.log('🤖 [AI-PDF] Enhancing resume and generating PDF...');

      // Enhance content with AI
      const contentEnhancement = await aiContentEnhancer.enhanceResumeContent(resumeData);

      // Generate LaTeX with enhanced content
      const { templateService } = await import('../services/resume-builder/templateService');
      const enhancedLatex = await templateService.generateLatex(
        templateId,
        contentEnhancement.enhancedContent
      );

      // Generate PDF from LaTeX
      const { latexService } = await import('../services/resume-builder/latexService');
      const pdfBuffer = await latexService.compileLatexToPDF(
        enhancedLatex,
        templateId,
        'pdf'
      );

      // Also include enhanced data in response headers (JSON encoded)
      const enhancedDataHeader = JSON.stringify({
        enhancedResumeData: contentEnhancement.enhancedContent,
        improvements: contentEnhancement.improvements,
        keywordsAdded: contentEnhancement.keywordsAdded || [],
        atsScore: contentEnhancement.atsScore || 0
      });
      
      res.setHeader('X-Enhanced-Data', Buffer.from(enhancedDataHeader).toString('base64'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="enhanced-resume.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      res.send(pdfBuffer);
      console.log('✅ AI-enhanced PDF generated successfully:', pdfBuffer.length, 'bytes');

    } catch (error) {
      console.error('❌ AI-enhanced PDF generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'AI enhancement with PDF generation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async enhanceResumeWithLatexStreamPDF(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, templateId = 'template01', options } = req.body;
      
      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
        return;
      }

      console.log('🤖 [AI-PDF-STREAM] Enhancing resume with streaming updates...');

      // Set headers for streaming response
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Send initial progress update
      const sendProgress = (message: string) => {
        res.write(`PROGRESS: ${message}\n`);
      };

      sendProgress('Starting AI content enhancement...');

      // Enhance content with AI
      const contentEnhancement = await aiContentEnhancer.enhanceResumeContent(resumeData);
      sendProgress('Content enhancement complete. Generating LaTeX...');

      // Generate LaTeX with enhanced content
      const { templateService } = await import('../services/resume-builder/templateService');
      const enhancedLatex = await templateService.generateLatex(
        templateId,
        contentEnhancement.enhancedContent
      );
      sendProgress('LaTeX generation complete. Compiling PDF...');

      // Generate PDF from LaTeX
      const { latexService } = await import('../services/resume-builder/latexService');
      const pdfBuffer = await latexService.compileLatexToPDF(
        enhancedLatex,
        templateId,
        'pdf'
      );
      sendProgress('PDF compilation complete. Preparing enhanced data...');

      // Send enhanced data first
      const enhancedDataResponse = JSON.stringify({
        enhancedResumeData: contentEnhancement.enhancedContent,
        improvements: contentEnhancement.improvements,
        keywordsAdded: contentEnhancement.keywordsAdded || [],
        atsScore: contentEnhancement.atsScore || 0
      });
      
      res.write(`ENHANCED_DATA_START\n`);
      res.write(enhancedDataResponse);
      res.write(`\nENHANCED_DATA_END\n`);

      // Send PDF marker and data
      res.write(`PDF_START\n`);
      res.write(pdfBuffer);
      res.end();

      console.log('✅ AI-enhanced streaming PDF generated successfully:', pdfBuffer.length, 'bytes');

    } catch (error) {
      console.error('❌ AI-enhanced streaming PDF generation failed:', error);
      
      // Send error through stream
      res.write(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      res.end();
    }
  }

  // New method for AI enhancement without PDF generation (preview-first flow)
  async enhanceResumeContentOnly(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, templateId = 'template01', options } = req.body;
      
      if (!resumeData) {
        res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
        return;
      }

      console.log('🤖 [AI-PREVIEW] Generating AI enhancement suggestions...');

      // Enhance content with AI (but don't generate PDF yet)
      const contentEnhancement = await aiContentEnhancer.enhanceResumeContent(resumeData);

      // Return enhancement data for user review
      res.status(200).json({
        success: true,
        data: {
          originalResumeData: resumeData,
          enhancedResumeData: contentEnhancement.enhancedContent,
          improvements: contentEnhancement.improvements,
          keywordsAdded: contentEnhancement.keywordsAdded || [],
          atsScore: contentEnhancement.atsScore || 0,
          enhancementSuggestions: {
            // Create detailed suggestions for each section
            personalInfo: this.createPersonalInfoSuggestions(resumeData.personalInfo, contentEnhancement.enhancedContent.personalInfo),
            professionalSummary: this.createSummarySuggestions(resumeData.professionalSummary, contentEnhancement.enhancedContent.professionalSummary),
            workExperience: this.createWorkExperienceSuggestions(resumeData.workExperience, contentEnhancement.enhancedContent.workExperience),
            education: this.createEducationSuggestions(resumeData.education, contentEnhancement.enhancedContent.education),
            skills: this.createSkillsSuggestions(resumeData.skills, contentEnhancement.enhancedContent.skills),
            projects: this.createProjectsSuggestions(resumeData.projects, contentEnhancement.enhancedContent.projects)
          }
        }
      });

      console.log('✅ AI enhancement suggestions generated successfully');

    } catch (error) {
      console.error('❌ AI enhancement preview failed:', error);
      res.status(500).json({
        success: false,
        message: 'AI enhancement preview failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper methods for creating detailed suggestions
  private createPersonalInfoSuggestions(original: any, enhanced: any): any {
    const suggestions = [];
    
    if (original?.professionalTitle !== enhanced?.professionalTitle && enhanced?.professionalTitle) {
      suggestions.push({
        field: 'professionalTitle',
        type: 'improvement',
        original: original?.professionalTitle || 'Not specified',
        suggested: enhanced.professionalTitle,
        reason: 'Enhanced professional title for better visibility'
      });
    }
    
    return { suggestions, hasChanges: suggestions.length > 0 };
  }

  private createSummarySuggestions(original: string, enhanced: string): any {
    return {
      suggestions: [{
        field: 'professionalSummary',
        type: 'improvement',
        original: original || 'No summary',
        suggested: enhanced || 'No enhanced summary',
        reason: 'Improved summary with better keywords and impact statements',
        hasChanges: original !== enhanced
      }],
      hasChanges: original !== enhanced
    };
  }

  private createWorkExperienceSuggestions(original: any[], enhanced: any[]): any {
    const suggestions = [];
    
    if (original && enhanced && original.length === enhanced.length) {
      for (let i = 0; i < original.length; i++) {
        const origExp = original[i];
        const enhExp = enhanced[i];
        
        // Check for responsibility improvements
        if (JSON.stringify(origExp.responsibilities) !== JSON.stringify(enhExp.responsibilities)) {
          suggestions.push({
            field: `workExperience[${i}].responsibilities`,
            type: 'improvement',
            original: origExp.responsibilities,
            suggested: enhExp.responsibilities,
            reason: 'Enhanced responsibilities with stronger action verbs and quantifiable results'
          });
        }
        
        // Check for achievement improvements
        if (JSON.stringify(origExp.achievements) !== JSON.stringify(enhExp.achievements)) {
          suggestions.push({
            field: `workExperience[${i}].achievements`,
            type: 'improvement', 
            original: origExp.achievements,
            suggested: enhExp.achievements,
            reason: 'Enhanced achievements with measurable impact and industry keywords'
          });
        }
      }
    }
    
    return { suggestions, hasChanges: suggestions.length > 0 };
  }

  private createEducationSuggestions(original: any[], enhanced: any[]): any {
    const suggestions = [];
    // Basic comparison - can be enhanced based on specific needs
    if (JSON.stringify(original) !== JSON.stringify(enhanced)) {
      suggestions.push({
        field: 'education',
        type: 'improvement',
        original: original,
        suggested: enhanced,
        reason: 'Enhanced education section formatting and relevant coursework'
      });
    }
    
    return { suggestions, hasChanges: suggestions.length > 0 };
  }

  private createSkillsSuggestions(original: any[], enhanced: any[]): any {
    const suggestions = [];
    if (JSON.stringify(original) !== JSON.stringify(enhanced)) {
      suggestions.push({
        field: 'skills',
        type: 'improvement',
        original: original,
        suggested: enhanced,
        reason: 'Enhanced skills with industry-relevant technologies and better categorization'
      });
    }
    
    return { suggestions, hasChanges: suggestions.length > 0 };
  }

  private createProjectsSuggestions(original: any[], enhanced: any[]): any {
    const suggestions = [];
    if (JSON.stringify(original) !== JSON.stringify(enhanced)) {
      suggestions.push({
        field: 'projects',
        type: 'improvement',
        original: original,
        suggested: enhanced,
        reason: 'Enhanced project descriptions with technical details and measurable outcomes'
      });
    }
    
    return { suggestions, hasChanges: suggestions.length > 0 };
  }

  // NEW: Job optimization preview-first method
  async optimizeForJobPreview(req: Request, res: Response): Promise<void> {
    try {
      const { resumeData, jobDescription, jobTitle, companyName, templateId = 'template01' } = req.body;
      
      if (!resumeData || !jobDescription) {
        res.status(400).json({
          success: false,
          message: 'Resume data and job description are required'
        });
        return;
      }

      console.log('🎯 [JOB-OPTIMIZATION-PREVIEW] Generating job optimization suggestions...');

      // Use standardized job optimization service for preview
      const optimizationResult = await standardizedJobOptimizationService.optimizeResumeForJob({
        resumeData,
        jobDescription,
        jobTitle,
        companyName,
        templateId
      });

      // Extract detailed suggestions by comparing original vs optimized data
      const optimizationSuggestions = {
        personalInfo: this.createJobOptimizationSuggestions(
          'personalInfo', 
          resumeData.personalInfo, 
          optimizationResult.optimizedResume?.personalInfo
        ),
        professionalSummary: this.createJobOptimizationSuggestions(
          'professionalSummary', 
          resumeData.professionalSummary, 
          optimizationResult.optimizedResume?.professionalSummary
        ),
        workExperience: this.createJobOptimizationSuggestions(
          'workExperience', 
          resumeData.workExperience, 
          optimizationResult.optimizedResume?.workExperience
        ),
        education: this.createJobOptimizationSuggestions(
          'education', 
          resumeData.education, 
          optimizationResult.optimizedResume?.education
        ),
        skills: this.createJobOptimizationSuggestions(
          'skills', 
          resumeData.skills, 
          optimizationResult.optimizedResume?.skills
        ),
        projects: this.createJobOptimizationSuggestions(
          'projects', 
          resumeData.projects, 
          optimizationResult.optimizedResume?.projects
        )
      };

      // Return job optimization preview data
      res.status(200).json({
        success: true,
        data: {
          originalResumeData: resumeData,
          optimizedResumeData: optimizationResult.optimizedResume,
          jobMatchScore: optimizationResult.jobMatchAnalysis?.overallScore || 0,
          keywordAlignment: optimizationResult.jobMatchAnalysis?.keywordAlignment || 0,
          skillsMatch: optimizationResult.jobMatchAnalysis?.skillsMatch || 0,
          experienceMatch: optimizationResult.jobMatchAnalysis?.experienceMatch || 0,
          addedKeywords: optimizationResult.jobMatchAnalysis?.addedKeywords || [],
          missingKeywords: optimizationResult.jobMatchAnalysis?.missingKeywords || [],
          recommendations: optimizationResult.jobMatchAnalysis?.recommendations || [],
          jobContext: {
            jobTitle: jobTitle || 'Target Position',
            companyName: companyName || 'Target Company',
            jobDescription: jobDescription.substring(0, 500) + '...'
          },
          optimizationSuggestions
        }
      });

      console.log('✅ Job optimization suggestions generated successfully');

    } catch (error) {
      console.error('❌ Job optimization preview failed:', error);
      res.status(500).json({
        success: false,
        message: 'Job optimization preview failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper method for creating job optimization suggestions
  private createJobOptimizationSuggestions(sectionName: string, original: any, optimized: any): any {
    const suggestions = [];
    
    if (JSON.stringify(original) !== JSON.stringify(optimized)) {
      if (sectionName === 'professionalSummary') {
        suggestions.push({
          field: 'professionalSummary',
          type: 'job_optimization',
          original: original || 'No summary',
          suggested: optimized || 'No optimized summary',
          reason: 'Optimized summary to align with job requirements and include relevant keywords'
        });
      } else if (sectionName === 'skills') {
        // Compare skill arrays
        const originalSkills = Array.isArray(original) ? original.map(s => s.name || s).join(', ') : '';
        const optimizedSkills = Array.isArray(optimized) ? optimized.map(s => s.name || s).join(', ') : '';
        
        if (originalSkills !== optimizedSkills) {
          suggestions.push({
            field: 'skills',
            type: 'job_optimization',
            original: originalSkills || 'No skills listed',
            suggested: optimizedSkills || 'No optimized skills',
            reason: 'Added job-relevant skills and prioritized skills mentioned in the job posting'
          });
        }
      } else if (sectionName === 'workExperience') {
        // Compare work experience - focus on responsibilities and achievements
        if (Array.isArray(original) && Array.isArray(optimized) && original.length === optimized.length) {
          for (let i = 0; i < original.length; i++) {
            const origExp = original[i];
            const optExp = optimized[i];
            
            if (JSON.stringify(origExp.responsibilities) !== JSON.stringify(optExp.responsibilities)) {
              suggestions.push({
                field: `workExperience[${i}].responsibilities`,
                type: 'job_optimization',
                original: origExp.responsibilities || [],
                suggested: optExp.responsibilities || [],
                reason: `Enhanced responsibilities to highlight relevant experience for ${sectionName}`
              });
            }
            
            if (JSON.stringify(origExp.achievements) !== JSON.stringify(optExp.achievements)) {
              suggestions.push({
                field: `workExperience[${i}].achievements`,
                type: 'job_optimization',
                original: origExp.achievements || [],
                suggested: optExp.achievements || [],
                reason: `Optimized achievements to demonstrate value proposition for target role`
              });
            }
          }
        }
      } else {
        // Generic comparison for other sections
        suggestions.push({
          field: sectionName,
          type: 'job_optimization',
          original: original,
          suggested: optimized,
          reason: `Optimized ${sectionName} section to better align with job requirements`
        });
      }
    }
    
    return { suggestions, hasChanges: suggestions.length > 0 };
  }
}

export const resumeController = new StandardizedResumeController();