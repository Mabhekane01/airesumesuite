import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { resumeController } from '../../controllers/resumeController';
import { aiResumeService } from '../../services/resume-builder/aiResumeService';
import { resumeService } from '../../services/resume-builder/resumeService';

// Mock the services
jest.mock('../../services/resume-builder/aiResumeService');
jest.mock('../../services/resume-builder/resumeService');

describe('Resume API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    });

    // Resume routes
    app.post('/api/resume/generate-summary', resumeController.generateSummaryForUnsavedResume.bind(resumeController));
    app.post('/api/resume/optimize-for-job', resumeController.optimizeUnsavedResumeForJob.bind(resumeController));
    app.post('/api/resume/job-alignment', resumeController.checkJobAlignmentForUnsavedResume.bind(resumeController));
    app.post('/api/resume/download/:format', resumeController.downloadResume.bind(resumeController));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/resume/generate-summary', () => {
    const validResumeData = {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      },
      workExperience: [
        {
          jobTitle: 'Software Engineer',
          company: 'TechCorp',
          responsibilities: ['Developed applications', 'Led team']
        }
      ],
      skills: [
        { name: 'JavaScript', category: 'technical' },
        { name: 'React', category: 'technical' }
      ]
    };

    it('should generate professional summary successfully', async () => {
      const mockSummaries = [
        'Results-driven software engineer with 5+ years...',
        'Innovative developer specializing in JavaScript...',
        'Technical leader with expertise in React...'
      ];

      (aiResumeService.generateMultipleSummaryOptions as jest.Mock)
        .mockResolvedValue(mockSummaries);

      const response = await request(app)
        .post('/api/resume/generate-summary')
        .send({ resumeData: validResumeData })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSummaries
      });

      expect(aiResumeService.generateMultipleSummaryOptions)
        .toHaveBeenCalledWith(validResumeData);
    });

    it('should return 400 for invalid request', async () => {
      const response = await request(app)
        .post('/api/resume/generate-summary')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Resume data is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return 500 on service error', async () => {
      (aiResumeService.generateMultipleSummaryOptions as jest.Mock)
        .mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/resume/generate-summary')
        .send({ resumeData: validResumeData })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to generate professional summary',
        code: 'AI_PROCESSING_FAILED'
      });
    });
  });

  describe('POST /api/resume/optimize-for-job', () => {
    const optimizationRequest = {
      resumeData: {
        personalInfo: { firstName: 'John', lastName: 'Doe' },
        workExperience: [{ jobTitle: 'Developer', company: 'TechCorp' }]
      },
      jobDescription: 'We need a senior React developer...',
      jobTitle: 'Senior React Developer',
      companyName: 'InnovateCorp'
    };

    it('should optimize resume for job successfully', async () => {
      const mockOptimizationResult = {
        originalResume: optimizationRequest.resumeData,
        improvedResume: {
          ...optimizationRequest.resumeData,
          professionalSummary: 'Optimized summary for React role...'
        },
        improvements: [
          'Enhanced React-specific keywords',
          'Improved technical achievements',
          'Optimized for ATS compatibility'
        ],
        atsAnalysis: {
          score: 92,
          recommendations: ['Excellent optimization'],
          keywordMatch: 95,
          formatScore: 90,
          contentScore: 88
        }
      };

      (aiResumeService.optimizeResumeForJob as jest.Mock)
        .mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .post('/api/resume/optimize-for-job')
        .send(optimizationRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOptimizationResult
      });

      expect(aiResumeService.optimizeResumeForJob).toHaveBeenCalledWith(
        optimizationRequest.resumeData,
        {
          jobDescription: optimizationRequest.jobDescription,
          jobTitle: optimizationRequest.jobTitle,
          companyName: optimizationRequest.companyName,
          jobUrl: undefined
        }
      );
    });

    it('should handle job URL optimization', async () => {
      const urlOptimizationRequest = {
        resumeData: optimizationRequest.resumeData,
        jobUrl: 'https://linkedin.com/jobs/123456',
        jobTitle: 'React Developer',
        companyName: 'StartupCorp'
      };

      const mockResult = {
        originalResume: urlOptimizationRequest.resumeData,
        improvedResume: urlOptimizationRequest.resumeData,
        improvements: ['URL-based optimization'],
        atsAnalysis: { score: 85 }
      };

      (aiResumeService.optimizeResumeForJob as jest.Mock)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/resume/optimize-for-job')
        .send(urlOptimizationRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(aiResumeService.optimizeResumeForJob).toHaveBeenCalledWith(
        urlOptimizationRequest.resumeData,
        {
          jobDescription: undefined,
          jobTitle: urlOptimizationRequest.jobTitle,
          companyName: urlOptimizationRequest.companyName,
          jobUrl: urlOptimizationRequest.jobUrl
        }
      );
    });

    it('should return 400 when neither job description nor URL provided', async () => {
      const incompleteRequest = {
        resumeData: optimizationRequest.resumeData,
        jobTitle: 'Developer'
      };

      const response = await request(app)
        .post('/api/resume/optimize-for-job')
        .send(incompleteRequest)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Either job description or job URL is required',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('POST /api/resume/job-alignment', () => {
    const alignmentRequest = {
      resumeData: {
        personalInfo: { firstName: 'John', lastName: 'Doe' },
        workExperience: [{ jobTitle: 'Full Stack Developer' }],
        skills: [{ name: 'React', category: 'technical' }]
      },
      jobDescription: 'We are looking for a React developer with full-stack experience...'
    };

    it('should analyze job alignment successfully', async () => {
      const mockAlignment = {
        score: 87,
        strengths: [
          'Strong React experience matches job requirements',
          'Full-stack background is valuable',
          'Technical skills align well'
        ],
        gaps: [
          'Missing specific backend framework experience',
          'No cloud platform experience mentioned'
        ],
        recommendations: [
          'Highlight any Node.js or Python experience',
          'Consider adding AWS or Azure certifications',
          'Emphasize full-stack project achievements'
        ],
        isGoodMatch: true
      };

      (aiResumeService.getJobAlignmentScore as jest.Mock)
        .mockResolvedValue(mockAlignment);

      const response = await request(app)
        .post('/api/resume/job-alignment')
        .send(alignmentRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAlignment
      });

      expect(aiResumeService.getJobAlignmentScore).toHaveBeenCalledWith(
        alignmentRequest.resumeData,
        alignmentRequest.jobDescription
      );
    });

    it('should return 400 when job description is missing', async () => {
      const response = await request(app)
        .post('/api/resume/job-alignment')
        .send({ resumeData: alignmentRequest.resumeData })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Job description is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when resume data is missing', async () => {
      const response = await request(app)
        .post('/api/resume/job-alignment')
        .send({ jobDescription: alignmentRequest.jobDescription })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Resume data is required',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('POST /api/resume/download/:format', () => {
    const downloadRequest = {
      resumeData: {
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        workExperience: [
          {
            jobTitle: 'Software Engineer',
            company: 'TechCorp',
            description: 'Developed web applications'
          }
        ]
      }
    };

    it('should download PDF successfully', async () => {
      const mockPdfBuffer = Buffer.from('mock pdf content');
      (resumeService.generateResumeFile as jest.Mock)
        .mockResolvedValue(mockPdfBuffer);

      const response = await request(app)
        .post('/api/resume/download/pdf')
        .send(downloadRequest)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition'])
        .toContain('attachment; filename="John_Doe_Resume.pdf"');

      expect(resumeService.generateResumeFile).toHaveBeenCalledWith(
        downloadRequest.resumeData,
        'pdf'
      );
    });

    it('should download DOCX successfully', async () => {
      const mockDocxBuffer = Buffer.from('mock docx content');
      (resumeService.generateResumeFile as jest.Mock)
        .mockResolvedValue(mockDocxBuffer);

      const response = await request(app)
        .post('/api/resume/download/docx')
        .send(downloadRequest)
        .expect(200);

      expect(response.headers['content-type'])
        .toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers['content-disposition'])
        .toContain('attachment; filename="John_Doe_Resume.docx"');
    });

    it('should download TXT successfully', async () => {
      const mockTxtBuffer = Buffer.from('mock txt content');
      (resumeService.generateResumeFile as jest.Mock)
        .mockResolvedValue(mockTxtBuffer);

      const response = await request(app)
        .post('/api/resume/download/txt')
        .send(downloadRequest)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition'])
        .toContain('attachment; filename="John_Doe_Resume.txt"');
    });

    it('should return 400 for invalid format', async () => {
      const response = await request(app)
        .post('/api/resume/download/invalid')
        .send(downloadRequest)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid format. Supported formats: pdf, docx, txt',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 when resume data is missing', async () => {
      const response = await request(app)
        .post('/api/resume/download/pdf')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Resume data is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should handle file generation errors', async () => {
      (resumeService.generateResumeFile as jest.Mock)
        .mockRejectedValue(new Error('File generation failed'));

      const response = await request(app)
        .post('/api/resume/download/pdf')
        .send(downloadRequest)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to generate resume file',
        code: 'FILE_PROCESSING_FAILED'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/resume/generate-summary')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/resume/generate-summary')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle authentication errors', async () => {
      // Test with app without auth middleware
      const noAuthApp = express();
      noAuthApp.use(express.json());
      noAuthApp.post('/test', (req, res) => {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_ERROR'
          });
        }
        res.json({ success: true });
      });

      const response = await request(noAuthApp)
        .post('/test')
        .send({})
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_ERROR'
      });
    });
  });
});