import { aiResumeService, AIResumeService } from '../../services/resume-builder/aiResumeService';
import { geminiService } from '../../services/ai/gemini';
import { jobScrapingService } from '../../services/job-scraper/jobScrapingService';
import { Resume } from '../../models/Resume';

// Mock the dependencies
jest.mock('../../services/ai/gemini');
jest.mock('../../services/job-scraper/jobScrapingService');
jest.mock('../../models/Resume');

describe('AIResumeService', () => {
  let service: AIResumeService;
  const mockResumeData = {
    id: 'mock-resume-id',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    },
    workExperience: [
      {
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        responsibilities: ['Developed web applications', 'Led team of 3 developers']
      }
    ],
    skills: [
      { name: 'JavaScript', category: 'technical' },
      { name: 'React', category: 'technical' },
      { name: 'Leadership', category: 'soft' }
    ],
    education: [
      {
        degree: 'Bachelor of Computer Science',
        school: 'University of Technology',
        graduationDate: '2019-05-01'
      }
    ]
  };

  beforeEach(() => {
    service = new AIResumeService();
    jest.clearAllMocks();
  });

  describe('generateProfessionalSummary', () => {
    it('should generate a professional summary and update database if ID exists', async () => {
      const mockSummary = 'Experienced software engineer with 4+ years of experience...';
      (geminiService.generateProfessionalSummary as jest.Mock).mockResolvedValue(mockSummary);
      (Resume.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await service.generateProfessionalSummary(mockResumeData);

      expect(result).toBe(mockSummary);
      expect(geminiService.generateProfessionalSummary).toHaveBeenCalledWith(mockResumeData);
      expect(Resume.findByIdAndUpdate).toHaveBeenCalledWith(mockResumeData.id, {
        professionalSummary: mockSummary,
        'aiGenerated.summary': true
      });
    });

    it('should generate summary without updating database if no ID', async () => {
      const mockSummary = 'Experienced software engineer...';
      const resumeWithoutId = { ...mockResumeData };
      delete resumeWithoutId.id;

      (geminiService.generateProfessionalSummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await service.generateProfessionalSummary(resumeWithoutId);

      expect(result).toBe(mockSummary);
      expect(Resume.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (geminiService.generateProfessionalSummary as jest.Mock).mockRejectedValue(
        new Error('AI service error')
      );

      await expect(service.generateProfessionalSummary(mockResumeData))
        .rejects.toThrow('Failed to generate professional summary');
    });
  });

  describe('generateMultipleSummaryOptions', () => {
    it('should generate multiple summary options', async () => {
      const mockSummaries = [
        'Summary option 1...',
        'Summary option 2...',
        'Summary option 3...'
      ];
      (geminiService.generateMultipleProfessionalSummaries as jest.Mock).mockResolvedValue(mockSummaries);

      const result = await service.generateMultipleSummaryOptions(mockResumeData);

      expect(result).toEqual(mockSummaries);
      expect(geminiService.generateMultipleProfessionalSummaries).toHaveBeenCalledWith(mockResumeData);
    });

    it('should handle errors gracefully', async () => {
      (geminiService.generateMultipleProfessionalSummaries as jest.Mock).mockRejectedValue(
        new Error('AI service error')
      );

      await expect(service.generateMultipleSummaryOptions(mockResumeData))
        .rejects.toThrow('Failed to generate professional summary options');
    });
  });

  describe('analyzeATSCompatibility', () => {
    const mockATSAnalysis = {
      score: 85,
      recommendations: ['Use more keywords', 'Improve formatting'],
      keywordMatch: 75,
      formatScore: 90,
      contentScore: 80
    };

    it('should analyze ATS compatibility and update database', async () => {
      (geminiService.scoreATSCompatibility as jest.Mock).mockResolvedValue(mockATSAnalysis);
      (Resume.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await service.analyzeATSCompatibility(mockResumeData, 'Job description');

      expect(result).toEqual(mockATSAnalysis);
      expect(geminiService.scoreATSCompatibility).toHaveBeenCalledWith(mockResumeData, 'Job description');
      expect(Resume.findByIdAndUpdate).toHaveBeenCalledWith(mockResumeData.id, {
        'aiGenerated.atsScore': mockATSAnalysis.score,
        'aiGenerated.improvements': mockATSAnalysis.recommendations
      });
    });

    it('should analyze without job description', async () => {
      (geminiService.scoreATSCompatibility as jest.Mock).mockResolvedValue(mockATSAnalysis);

      const result = await service.analyzeATSCompatibility(mockResumeData);

      expect(result).toEqual(mockATSAnalysis);
      expect(geminiService.scoreATSCompatibility).toHaveBeenCalledWith(mockResumeData, undefined);
    });

    it('should handle errors gracefully', async () => {
      (geminiService.scoreATSCompatibility as jest.Mock).mockRejectedValue(
        new Error('Analysis failed')
      );

      await expect(service.analyzeATSCompatibility(mockResumeData))
        .rejects.toThrow('Failed to analyze ATS compatibility');
    });
  });

  describe('optimizeResumeForJob', () => {
    const mockOptimizedResume = {
      ...mockResumeData,
      professionalSummary: 'Optimized summary for the role...'
    };

    const mockATSAnalysis = {
      score: 90,
      recommendations: ['Great optimization'],
      keywordMatch: 85,
      formatScore: 95,
      contentScore: 90
    };

    it('should optimize resume with job description', async () => {
      (geminiService.optimizeResume as jest.Mock).mockResolvedValue(mockOptimizedResume);
      (geminiService.scoreATSCompatibility as jest.Mock).mockResolvedValue(mockATSAnalysis);
      (Resume.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await service.optimizeResumeForJob(mockResumeData, {
        jobDescription: 'We need a senior developer...',
        jobTitle: 'Senior Developer',
        companyName: 'TechCorp'
      });

      expect(result.originalResume).toEqual(mockResumeData);
      expect(result.improvedResume).toEqual(mockOptimizedResume);
      expect(result.atsAnalysis).toEqual(mockATSAnalysis);
      expect(result.improvements).toHaveLength(5);
      expect(geminiService.optimizeResume).toHaveBeenCalledWith({
        resumeData: mockResumeData,
        jobDescription: 'We need a senior developer...',
        jobTitle: 'Senior Developer',
        companyName: 'TechCorp'
      });
    });

    it('should scrape job URL when provided', async () => {
      const mockScrapedJob = {
        title: 'Software Engineer',
        company: 'ScrapedCorp',
        description: 'Scraped job description...'
      };

      (jobScrapingService.scrapeJobDetails as jest.Mock).mockResolvedValue(mockScrapedJob);
      (geminiService.optimizeResume as jest.Mock).mockResolvedValue(mockOptimizedResume);
      (geminiService.scoreATSCompatibility as jest.Mock).mockResolvedValue(mockATSAnalysis);

      const result = await service.optimizeResumeForJob(mockResumeData, {
        jobUrl: 'https://example.com/job/123'
      });

      expect(jobScrapingService.scrapeJobDetails).toHaveBeenCalledWith('https://example.com/job/123');
      expect(geminiService.optimizeResume).toHaveBeenCalledWith({
        resumeData: mockResumeData,
        jobDescription: mockScrapedJob.description,
        jobTitle: mockScrapedJob.title,
        companyName: mockScrapedJob.company
      });
    });

    it('should handle scraping errors gracefully', async () => {
      (jobScrapingService.scrapeJobDetails as jest.Mock).mockRejectedValue(
        new Error('Scraping failed')
      );

      await expect(service.optimizeResumeForJob(mockResumeData, {
        jobUrl: 'https://example.com/job/123'
      })).rejects.toThrow('Job description is required for optimization');
    });

    it('should throw error if no job description provided', async () => {
      await expect(service.optimizeResumeForJob(mockResumeData, {}))
        .rejects.toThrow('Job description is required for optimization');
    });
  });

  describe('getJobAlignmentScore', () => {
    const mockAlignmentResult = {
      score: 85,
      strengths: ['Strong technical skills', 'Relevant experience'],
      gaps: ['Missing leadership experience'],
      recommendations: ['Highlight management projects'],
      isGoodMatch: true
    };

    it('should analyze job alignment successfully', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockAlignmentResult)
        }
      });

      (geminiService.model as any) = {
        generateContent: mockGenerateContent
      };

      const result = await service.getJobAlignmentScore(
        mockResumeData,
        'Job description requiring software engineering skills...'
      );

      expect(result).toEqual(mockAlignmentResult);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle AI service unavailable', async () => {
      (geminiService.model as any) = null;

      await expect(service.getJobAlignmentScore(mockResumeData, 'Job description'))
        .rejects.toThrow('Failed to analyze job alignment');
    });

    it('should handle JSON parsing errors', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => 'Invalid JSON response'
        }
      });

      (geminiService.model as any) = {
        generateContent: mockGenerateContent
      };

      await expect(service.getJobAlignmentScore(mockResumeData, 'Job description'))
        .rejects.toThrow('Failed to analyze job alignment');
    });
  });

  describe('suggestMissingSections', () => {
    const mockSuggestions = {
      missingSections: ['Projects', 'Certifications', 'Volunteer Experience'],
      suggestions: {
        'Projects': 'Consider adding personal or open-source projects',
        'Certifications': 'AWS or Google Cloud certifications would strengthen your profile',
        'Volunteer Experience': 'Tech mentoring or community involvement'
      },
      priority: 'medium' as const
    };

    it('should suggest missing sections successfully', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSuggestions)
        }
      });

      (geminiService.model as any) = {
        generateContent: mockGenerateContent
      };

      const result = await service.suggestMissingSections(mockResumeData);

      expect(result).toEqual(mockSuggestions);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle AI service errors', async () => {
      (geminiService.model as any) = null;

      await expect(service.suggestMissingSections(mockResumeData))
        .rejects.toThrow('Failed to suggest missing sections');
    });
  });

  describe('enhanceResumeComprehensively', () => {
    it('should enhance resume with all options enabled', async () => {
      const mockSummary = 'Enhanced summary...';
      const mockOptimizedResume = { ...mockResumeData, professionalSummary: mockSummary };
      const mockATSAnalysis = { score: 90, recommendations: ['Good'], keywordMatch: 85, formatScore: 95, contentScore: 90 };

      (geminiService.generateProfessionalSummary as jest.Mock).mockResolvedValue(mockSummary);
      (geminiService.optimizeResume as jest.Mock).mockResolvedValue(mockOptimizedResume);
      (geminiService.scoreATSCompatibility as jest.Mock).mockResolvedValue(mockATSAnalysis);
      (geminiService.improveResumeWithFeedback as jest.Mock).mockResolvedValue(mockOptimizedResume);

      const result = await service.enhanceResumeComprehensively(mockResumeData, {
        generateSummary: true,
        optimizeForJob: {
          jobDescription: 'Job description...',
          jobTitle: 'Developer'
        },
        improveATS: true,
        enhanceAchievements: true
      });

      expect(result.originalResume).toEqual(mockResumeData);
      expect(result.improvedResume).toEqual(mockOptimizedResume);
      expect(result.improvements).toContain('Generated AI-powered professional summary');
      expect(result.improvements).toContain('Enhanced achievement statements with stronger language');
      expect(result.atsAnalysis).toEqual(mockATSAnalysis);
    });

    it('should handle partial enhancement options', async () => {
      const mockSummary = 'Basic summary...';
      (geminiService.generateProfessionalSummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await service.enhanceResumeComprehensively(mockResumeData, {
        generateSummary: true
      });

      expect(result.improvements).toContain('Generated AI-powered professional summary');
      expect(result.improvements).toHaveLength(1);
    });

    it('should handle errors during enhancement', async () => {
      (geminiService.generateProfessionalSummary as jest.Mock).mockRejectedValue(
        new Error('Enhancement failed')
      );

      await expect(service.enhanceResumeComprehensively(mockResumeData, {
        generateSummary: true
      })).rejects.toThrow('Failed to enhance resume');
    });
  });
});