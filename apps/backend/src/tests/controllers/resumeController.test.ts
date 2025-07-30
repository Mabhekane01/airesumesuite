import request from 'supertest';
import express from 'express';
import { resumeController } from '../../controllers/resumeController';
import { aiResumeService } from '../../services/resume-builder/aiResumeService';
import { resumeService } from '../../services/resume-builder/resumeService';

// Mock the services
jest.mock('../../services/resume-builder/aiResumeService');
jest.mock('../../services/resume-builder/resumeService');

const app = express();
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  req.user = { id: 'mock-user-id' };
  next();
});

// Test routes
app.post('/generate-summary', resumeController.generateSummaryForUnsavedResume.bind(resumeController));
app.post('/optimize-for-job', resumeController.optimizeUnsavedResumeForJob.bind(resumeController));
app.post('/job-alignment', resumeController.checkJobAlignmentForUnsavedResume.bind(resumeController));
app.post('/download/:format', resumeController.downloadResume.bind(resumeController));

describe('Resume Controller - Enterprise Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSummaryForUnsavedResume', () => {
    const mockResumeData = {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      },
      workExperience: [
        {
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
          responsibilities: ['Developed applications']
        }
      ],
      skills: [
        { name: 'JavaScript', category: 'technical' }
      ]
    };

    it('should generate multiple summary options successfully', async () => {
      const mockSummaries = [
        'Results-driven software engineer with 5+ years of experience...',
        'Innovative developer specializing in JavaScript applications...',
        'Technical leader with expertise in full-stack development...'
      ];

      (aiResumeService.generateMultipleSummaryOptions as jest.Mock).mockResolvedValue(mockSummaries);

      const response = await request(app)
        .post('/generate-summary')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSummaries);
      expect(aiResumeService.generateMultipleSummaryOptions).toHaveBeenCalledWith(mockResumeData);
    });

    it('should return 400 if resume data is missing', async () => {
      const response = await request(app)
        .post('/generate-summary')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Resume data is required');
    });

    it('should return 400 if work experience and skills are missing', async () => {
      const incompleteResumeData = {
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      const response = await request(app)
        .post('/generate-summary')
        .send({ resumeData: incompleteResumeData });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Work experience or skills are required to generate a professional summary');
      expect(response.body.code).toBe('AI_INVALID_INPUT');
    });

    it('should handle AI service errors gracefully', async () => {
      (aiResumeService.generateMultipleSummaryOptions as jest.Mock).mockRejectedValue(
        new Error('AI service unavailable')
      );

      const response = await request(app)
        .post('/generate-summary')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to generate professional summary');
      expect(response.body.code).toBe('AI_PROCESSING_FAILED');
    });
  });

  describe('optimizeUnsavedResumeForJob', () => {
    const mockResumeData = {
      personalInfo: { firstName: 'John', lastName: 'Doe' },
      workExperience: [{ jobTitle: 'Developer', company: 'TechCorp' }]
    };

    const mockOptimizationResult = {
      originalResume: mockResumeData,
      improvedResume: { ...mockResumeData, professionalSummary: 'Optimized summary' },
      improvements: ['Enhanced summary', 'Added keywords'],
      atsAnalysis: { score: 85 }
    };

    it('should optimize resume successfully with job description', async () => {
      (aiResumeService.optimizeResumeForJob as jest.Mock).mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .post('/optimize-for-job')
        .send({
          resumeData: mockResumeData,
          jobDescription: 'We need a skilled developer...',
          jobTitle: 'Senior Developer',
          companyName: 'TechCorp'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOptimizationResult);
    });

    it('should optimize resume successfully with job URL', async () => {
      (aiResumeService.optimizeResumeForJob as jest.Mock).mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .post('/optimize-for-job')
        .send({
          resumeData: mockResumeData,
          jobUrl: 'https://linkedin.com/jobs/123',
          jobTitle: 'Senior Developer',
          companyName: 'TechCorp'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(aiResumeService.optimizeResumeForJob).toHaveBeenCalledWith(mockResumeData, {
        jobDescription: undefined,
        jobTitle: 'Senior Developer',
        companyName: 'TechCorp',
        jobUrl: 'https://linkedin.com/jobs/123'
      });
    });

    it('should return 400 if neither job description nor URL provided', async () => {
      const response = await request(app)
        .post('/optimize-for-job')
        .send({
          resumeData: mockResumeData,
          jobTitle: 'Developer'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Either job description or job URL is required');
    });
  });

  describe('downloadResume', () => {
    const mockResumeData = {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }
    };

    it('should download PDF successfully', async () => {
      const mockPdfBuffer = Buffer.from('mock pdf content');
      (resumeService.generateResumeFile as jest.Mock).mockResolvedValue(mockPdfBuffer);

      const response = await request(app)
        .post('/download/pdf')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('John_Doe_Resume.pdf');
      expect(resumeService.generateResumeFile).toHaveBeenCalledWith(mockResumeData, 'pdf');
    });

    it('should download DOCX successfully', async () => {
      const mockDocxBuffer = Buffer.from('mock docx content');
      (resumeService.generateResumeFile as jest.Mock).mockResolvedValue(mockDocxBuffer);

      const response = await request(app)
        .post('/download/docx')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers['content-disposition']).toContain('John_Doe_Resume.docx');
    });

    it('should download TXT successfully', async () => {
      const mockTxtBuffer = Buffer.from('mock txt content');
      (resumeService.generateResumeFile as jest.Mock).mockResolvedValue(mockTxtBuffer);

      const response = await request(app)
        .post('/download/txt')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition']).toContain('John_Doe_Resume.txt');
    });

    it('should return 400 for invalid format', async () => {
      const response = await request(app)
        .post('/download/invalid')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid format. Supported formats: pdf, docx, txt');
    });

    it('should return 400 if resume data is missing', async () => {
      const response = await request(app)
        .post('/download/pdf')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Resume data is required');
    });

    it('should handle file generation errors', async () => {
      (resumeService.generateResumeFile as jest.Mock).mockRejectedValue(
        new Error('File generation failed')
      );

      const response = await request(app)
        .post('/download/pdf')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to generate resume file');
      expect(response.body.code).toBe('FILE_PROCESSING_FAILED');
    });
  });

  describe('checkJobAlignmentForUnsavedResume', () => {
    const mockResumeData = {
      personalInfo: { firstName: 'John', lastName: 'Doe' },
      workExperience: [{ jobTitle: 'Developer' }]
    };

    const mockAlignmentResult = {
      score: 85,
      strengths: ['Strong technical skills', 'Relevant experience'],
      gaps: ['Missing leadership experience'],
      recommendations: ['Highlight project management skills'],
      isGoodMatch: true
    };

    it('should analyze job alignment successfully', async () => {
      (aiResumeService.getJobAlignmentScore as jest.Mock).mockResolvedValue(mockAlignmentResult);

      const response = await request(app)
        .post('/job-alignment')
        .send({
          resumeData: mockResumeData,
          jobDescription: 'We need a senior developer...'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAlignmentResult);
      expect(aiResumeService.getJobAlignmentScore).toHaveBeenCalledWith(
        mockResumeData,
        'We need a senior developer...'
      );
    });

    it('should return 400 if job description is missing', async () => {
      const response = await request(app)
        .post('/job-alignment')
        .send({ resumeData: mockResumeData });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job description is required');
    });

    it('should return 400 if resume data is missing', async () => {
      const response = await request(app)
        .post('/job-alignment')
        .send({ jobDescription: 'Job description here' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Resume data is required');
    });
  });
});