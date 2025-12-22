import { Request, Response } from 'express';
import { jobApplicationService, CreateJobApplicationData, UpdateJobApplicationData, JobApplicationFilters } from '../services/jobApplicationService';
import { notificationService } from '../services/notificationService';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';

export class JobApplicationController {
  async createApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const applicationData: CreateJobApplicationData = req.body;

      console.log(`📝 BACKEND RECEIVED JOB APPLICATION:`);
      console.log(`   - User: ${userId}`);
      console.log(`   - Job: ${applicationData.jobTitle} at ${applicationData.companyName}`);
      console.log(`   - Resume ID: ${applicationData.documentsUsed?.resumeId || 'MISSING!!!'}`);
      console.log(`   - Resume Content: ${applicationData.documentsUsed?.resumeContent ? 'YES (' + applicationData.documentsUsed.resumeContent.length + ' chars)' : 'NO'}`);
      console.log(`   - documentsUsed:`, JSON.stringify(applicationData.documentsUsed, null, 2));

      const application = await jobApplicationService.createApplication(userId, applicationData);

      console.log(`✅ Job application created with ID: ${application._id}`);
      console.log(`   - Saved Resume ID: ${application.documentsUsed?.resumeId || 'NOT SAVED!!!'}`);
      console.log(`   - Saved Resume Content: ${application.documentsUsed?.resumeContent ? 'YES (' + application.documentsUsed.resumeContent.length + ' chars)' : 'NO'}`);
      console.log(`   - Final match score: ${application.metrics?.applicationScore || 0}%`);

      // Send application created notification
      try {
        await notificationService.sendApplicationNotification(
          userId,
          'application_created',
          application._id.toString(),
          {
            jobTitle: application.jobTitle,
            companyName: application.companyName,
            matchScore: application.metrics?.applicationScore || 0
          }
        );
      } catch (notificationError) {
        console.warn('⚠️ Failed to send application creation notification:', notificationError);
      }

      return res.status(201).json({
        success: true,
        message: 'Job application created successfully',
        data: { application }
      });
    } catch (error) {
      console.error('❌ Create application error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to create job application'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getApplications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const {
        status,
        priority,
        companyName,
        jobTitle,
        startDate,
        endDate,
        minSalary,
        maxSalary,
        tags,
        archived = false,
        page = 1,
        limit = 20,
        sortBy = 'applicationDate',
        sortOrder = 'desc'
      } = req.query;

      // Build filters
      const filters: JobApplicationFilters = {};

      if (status) {
        filters.status = Array.isArray(status) ? status as string[] : [status as string];
      }

      if (priority) {
        filters.priority = Array.isArray(priority) ? priority as string[] : [priority as string];
      }

      if (companyName) {
        filters.companyName = companyName as string;
      }

      if (jobTitle) {
        filters.jobTitle = jobTitle as string;
      }

      if (startDate || endDate) {
        filters.dateRange = {
          start: startDate ? new Date(startDate as string) : new Date(0),
          end: endDate ? new Date(endDate as string) : new Date()
        };
      }

      if (minSalary || maxSalary) {
        filters.salaryRange = {
          min: minSalary ? parseInt(minSalary as string) : 0,
          max: maxSalary ? parseInt(maxSalary as string) : 1000000
        };
      }

      if (tags) {
        filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
      }

      filters.archived = archived === 'true';

      const pagination = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await jobApplicationService.getApplications(userId, filters, pagination);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get applications error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get job applications'
      });
    }
  }

  async getApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;

      const application = await jobApplicationService.getApplication(userId, applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Job application not found'
        });
      }

      return res.json({
        success: true,
        data: { application }
      });
    } catch (error) {
      console.error('Get application error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get job application'
      });
    }
  }

  async updateApplication(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🔄 UPDATE APPLICATION REQUEST RECEIVED:');
      console.log('   Application ID:', req.params.applicationId);
      console.log('   User ID:', req.user?.id);
      console.log('   Request body keys:', Object.keys(req.body || {}));
      console.log('   Request body:', JSON.stringify(req.body, null, 2));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors in updateApplication:');
        console.error('   Errors:', JSON.stringify(errors.array(), null, 2));
        console.error('   Request URL:', req.url);
        console.error('   Request method:', req.method);
        console.error('   Application ID:', req.params.applicationId);
        console.error('   User ID:', req.user?.id);
        console.error('   Request body keys:', Object.keys(req.body));
        console.error('   Full request body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;
      const updates: UpdateJobApplicationData = req.body;

      const application = await jobApplicationService.updateApplication(userId, applicationId, updates);

      return res.json({
        success: true,
        message: 'Job application updated successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Update application error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to update job application'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async deleteApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;

      await jobApplicationService.deleteApplication(userId, applicationId);

      return res.json({
        success: true,
        message: 'Job application deleted successfully'
      });
    } catch (error) {
      console.error('Delete application error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to delete job application'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async addInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;
      const interviewData = req.body;

      const application = await jobApplicationService.addInterview(userId, applicationId, interviewData);

      // Send interview scheduled notification
      try {
        await notificationService.sendApplicationNotification(
          userId,
          'interview_scheduled',
          applicationId,
          {
            jobTitle: application.jobTitle,
            companyName: application.companyName,
            interviewType: interviewData.type,
            scheduledDate: interviewData.scheduledDate
          }
        );
      } catch (notificationError) {
        console.warn('⚠️ Failed to send interview scheduled notification:', notificationError);
      }

      return res.status(201).json({
        success: true,
        message: 'Interview added successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Add interview error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to add interview'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async updateInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId, interviewId } = req.params;
      const updates = req.body;

      const application = await jobApplicationService.updateInterview(userId, applicationId, interviewId, updates);

      return res.json({
        success: true,
        message: 'Interview updated successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Update interview error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to update interview'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async addCommunication(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;
      const communicationData = req.body;

      const application = await jobApplicationService.addCommunication(userId, applicationId, communicationData);

      return res.status(201).json({
        success: true,
        message: 'Communication added successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Add communication error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to add communication'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async addTask(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;
      const taskData = req.body;

      const application = await jobApplicationService.addTask(userId, applicationId, taskData);

      return res.status(201).json({
        success: true,
        message: 'Task added successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Add task error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to add task'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async completeTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId, taskId } = req.params;
      const { notes } = req.body;

      const application = await jobApplicationService.completeTask(userId, applicationId, taskId, notes);

      return res.json({
        success: true,
        message: 'Task completed successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Complete task error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to complete task'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async calculateMatchScore(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;

      console.log(`🔄 Calculating match score for application ${applicationId} by user ${userId}`);

      const matchAnalysis = await jobApplicationService.calculateMatchScore(userId, applicationId);

      console.log(`✅ Match score calculation completed: ${matchAnalysis.matchScore}%`);

      return res.json({
        success: true,
        data: { matchAnalysis }
      });
    } catch (error) {
      console.error('❌ Calculate match score error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to calculate match score'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async batchCalculateMatchScores(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      console.log(`🔄 Starting batch match score calculation for user ${userId} (limit: ${limit})`);
      
      const result = await jobApplicationService.batchCalculateMatchScores(userId, limit);
      
      return res.json({
        success: true,
        message: `Batch calculation complete: ${result.updated} applications updated`,
        data: result
      });
    } catch (error) {
      console.error('❌ Batch calculate match scores error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to batch calculate match scores'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async debugMatchScore(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;

      const { JobApplication } = await import('../models/JobApplication');
      const mongoose = await import('mongoose');
      
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      const debugInfo = {
        applicationId: applicationId,
        jobTitle: application.jobTitle,
        companyName: application.companyName,
        hasJobDescription: !!application.jobDescription,
        jobDescriptionLength: application.jobDescription?.length || 0,
        hasResumeContent: !!application.documentsUsed?.resumeContent,
        resumeContentLength: application.documentsUsed?.resumeContent?.length || 0,
        currentMatchScore: application.metrics?.applicationScore || 0,
        lastAnalysisDate: application.metrics?.lastAnalysisDate,
        analysisVersion: application.metrics?.analysisVersion,
        geminiApiKeyConfigured: !!process.env.GEMINI_API_KEY,
        geminiApiKeyLength: process.env.GEMINI_API_KEY?.length || 0
      };

      console.log('🔍 DEBUG INFO:', debugInfo);

      return res.json({
        success: true,
        debug: debugInfo,
        message: 'Debug information collected'
      });
    } catch (error) {
      console.error('❌ Debug error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Debug failed'
      });
    }
  }

  async resetMatchScores(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { resetAllMatchScores, cleanupStaticScores } = await import('../utils/resetMatchScores');
      
      // Clean up static 78% scores first
      const cleanupResult = await cleanupStaticScores(78);
      
      // Then reset all match scores for fresh analysis
      const resetResult = await resetAllMatchScores();
      
      console.log('🔄 Match score reset completed:', { cleanupResult, resetResult });
      
      return res.json({
        success: true,
        message: 'Match scores reset successfully',
        data: {
          cleanup: cleanupResult,
          reset: resetResult,
          nextSteps: 'All applications will get fresh AI analysis on next match score calculation'
        }
      });
    } catch (error) {
      console.error('❌ Reset match scores error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset match scores'
      });
    }
  }

  async testGeminiConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const { geminiService } = await import('../services/ai/gemini');
      
      // Create multiple test scenarios to verify uniqueness
      const testScenarios = [
        {
          jobDescription: "We are looking for a Senior Software Engineer with 5+ years of experience in React, Node.js, and TypeScript. Must have experience with AWS, PostgreSQL, and agile development.",
          resumeContent: JSON.stringify({
            personalInfo: { firstName: "John", lastName: "Doe" },
            workExperience: [
              { 
                jobTitle: "Senior Software Engineer", 
                company: "Tech Corp", 
                duration: "3 years",
                responsibilities: ["Built React applications", "Worked with Node.js APIs", "Managed PostgreSQL databases"] 
              }
            ],
            skills: [
              { name: "React", category: "technical", experience: "5 years" }, 
              { name: "TypeScript", category: "technical", experience: "3 years" },
              { name: "Node.js", category: "technical", experience: "4 years" }
            ]
          }),
          jobTitle: "Senior Software Engineer",
          companyName: "Test Company A"
        },
        {
          jobDescription: "Looking for a Frontend Developer with experience in Vue.js, CSS, and JavaScript. Entry level position, 1-2 years experience preferred.",
          resumeContent: JSON.stringify({
            personalInfo: { firstName: "Jane", lastName: "Smith" },
            workExperience: [
              { 
                jobTitle: "Junior Developer", 
                company: "Startup Inc", 
                duration: "1 year",
                responsibilities: ["Developed Vue.js components", "Styled with CSS", "Fixed JavaScript bugs"] 
              }
            ],
            skills: [
              { name: "Vue.js", category: "technical", experience: "1 year" }, 
              { name: "CSS", category: "technical", experience: "2 years" },
              { name: "JavaScript", category: "technical", experience: "1.5 years" }
            ]
          }),
          jobTitle: "Frontend Developer",
          companyName: "Test Company B"
        }
      ];

      console.log('🧪 Testing Gemini with multiple scenarios for uniqueness...');
      
      const results = [];
      
      for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        console.log(`\n🔬 Running test scenario ${i + 1}/${testScenarios.length}`);
        
        const matchAnalysis = await geminiService.calculateJobMatchScore(
          scenario.jobDescription,
          scenario.resumeContent,
          scenario.jobTitle,
          scenario.companyName
        );
        
        results.push({
          scenario: i + 1,
          jobTitle: scenario.jobTitle,
          matchScore: matchAnalysis.matchScore,
          analysisId: (matchAnalysis as any)._metadata?.analysisId,
          timestamp: (matchAnalysis as any)._metadata?.timestamp
        });
        
        console.log(`✅ Scenario ${i + 1} completed with score: ${matchAnalysis.matchScore}%`);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('🎯 All test scenarios completed:');
      results.forEach(result => {
        console.log(`  Scenario ${result.scenario} (${result.jobTitle}): ${result.matchScore}% [${result.analysisId}]`);
      });

      return res.json({
        success: true,
        message: 'Gemini uniqueness test completed',
        data: { 
          testResults: results,
          uniqueScores: [...new Set(results.map(r => r.matchScore))].length,
          totalTests: results.length
        }
      });
    } catch (error) {
      console.error('❌ Gemini test failed:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Gemini test failed'
      });
    }
  }

  async getJobMatchAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;

      const analysis = await jobApplicationService.getJobMatchAnalysis(userId, applicationId);

      return res.json({
        success: true,
        data: { analysis }
      });
    } catch (error) {
      console.error('Get job match analysis error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get job match analysis'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async generateCoverLetter(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;
      const { template } = req.body;

      const coverLetter = await jobApplicationService.generateCoverLetter(userId, applicationId, template);

      return res.json({
        success: true,
        data: { coverLetter }
      });
    } catch (error) {
      console.error('Generate cover letter error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to generate cover letter'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getInterviewPrep(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;
      const { interviewType = 'general' } = req.query;

      const interviewPrep = await jobApplicationService.getInterviewPrep(userId, applicationId, interviewType as string);

      return res.json({
        success: true,
        data: { interviewPrep }
      });
    } catch (error) {
      console.error('Get interview prep error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get interview prep'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async archiveApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationId } = req.params;

      const application = await jobApplicationService.archiveApplication(userId, applicationId);

      return res.json({
        success: true,
        message: 'Application archived successfully',
        data: { application }
      });
    } catch (error) {
      console.error('Archive application error:', error);
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to archive application'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getApplicationStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const stats = await jobApplicationService.getApplicationStats(userId);

      return res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get application stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get application stats'
      });
    }
  }

  async exportApplications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { format = 'json', includeArchived = false } = req.query;

      const filters: JobApplicationFilters = {
        archived: includeArchived === 'true'
      };

      const result = await jobApplicationService.getApplications(userId, filters, { page: 1, limit: 1000 });

      if (format === 'json') {
        return res.json({
          success: true,
          data: {
            applications: result.applications,
            summary: result.summary,
            exportedAt: new Date(),
            version: '1.0'
          }
        });
      } else {
        // For CSV/PDF formats, implement specific exporters
        return res.status(400).json({
          success: false,
          message: `Export format ${format} not yet supported`
        });
      }
    } catch (error) {
      console.error('Export applications error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export applications'
      });
    }
  }

  async bulkUpdateApplications(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { applicationIds, updates } = req.body;

      const results = [];
      for (const applicationId of applicationIds) {
        try {
          const application = await jobApplicationService.updateApplication(userId, applicationId, updates);
          results.push({ applicationId, success: true, application });
        } catch (error) {
          if (error instanceof Error) {
            results.push({ applicationId, success: false, error: error.message });
          }
        }
      }

      return res.json({
        success: true,
        message: 'Bulk update completed',
        data: { results }
      });
    } catch (error) {
      console.error('Bulk update applications error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk update applications'
      });
    }
  }

  async getUpcomingInterviews(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { days = 7 } = req.query;

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(days as string));

      const applications = await jobApplicationService.getApplications(
        userId,
        {},
        { page: 1, limit: 1000 }
      );

      const upcomingInterviews = applications.applications
        .flatMap(app => 
          app.interviews
            .filter(interview => 
              interview.status === 'scheduled' &&
              interview.scheduledDate >= new Date() &&
              interview.scheduledDate <= endDate
            )
            .map(interview => ({
              ...interview,
              applicationId: app._id,
              jobTitle: app.jobTitle,
              companyName: app.companyName
            }))
        )
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

      return res.json({
        success: true,
        data: { upcomingInterviews }
      });
    } catch (error) {
      console.error('Get upcoming interviews error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get upcoming interviews'
      });
    }
  }

  async getPendingTasks(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { priority, overdue = false } = req.query;

      const applications = await jobApplicationService.getApplications(
        userId,
        { archived: false },
        { page: 1, limit: 1000 }
      );

      const now = new Date();
      let pendingTasks = applications.applications
        .flatMap(app => 
          app.tasks
            .filter(task => !task.completed)
            .map(task => ({
              ...task,
              applicationId: app._id,
              jobTitle: app.jobTitle,
              companyName: app.companyName,
              isOverdue: task.dueDate < now
            }))
        );

      // Apply filters
      if (priority) {
        pendingTasks = pendingTasks.filter(task => task.priority === priority);
      }

      if (overdue === 'true') {
        pendingTasks = pendingTasks.filter(task => task.isOverdue);
      }

      // Sort by due date
      pendingTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      return res.json({
        success: true,
        data: { pendingTasks }
      });
    } catch (error) {
      console.error('Get pending tasks error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get pending tasks'
      });
    }
  }
}

export const jobApplicationController = new JobApplicationController();