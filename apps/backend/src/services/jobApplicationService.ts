import { JobApplication, IJobApplication } from '../models/JobApplication';
import { User, IUser } from '../models/User';
import { JobPosting } from '../models/JobPosting';
import { IUserProfile } from '../models';
import { Resume } from '../models/Resume';
import { ResumeShare } from '../models/ResumeShare';
import { aiOptimizationService } from './aiOptimizationService';
import { resumeService as builderResumeService } from './resume-builder/resumeService';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert IUser to IUserProfile
function userToProfile(user: IUser): IUserProfile {
  return {
    preferredRoles: user.profile?.preferredRoles || [],
    yearsOfExperience: user.profile?.yearsOfExperience || 0,
    technicalSkills: user.technicalSkills || [],
    industries: user.profile?.industries || [],
    salaryExpectation: user.profile?.salaryExpectation,
    workPreferences: user.profile?.workPreferences,
    openToRemote: user.profile?.openToRemote,
    currentLocation: user.lastKnownLocation,
    preferredLocations: user.profile?.preferredLocations,
    openToRelocation: user.profile?.openToRelocation,
    expectedSalary: user.profile?.expectedSalary,
    workType: user.profile?.workType,
    preferredIndustries: user.profile?.preferredIndustries
  };
}

export interface CreateJobApplicationData {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobUrl?: string;
  jobSource?: string;
  jobPostingId?: string;
  enableTracking?: boolean;
  trackingSettings?: {
    showQrCode?: boolean;
    showWatermark?: boolean;
  };
  jobLocation: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  compensation?: {
    salaryRange?: {
      min: number;
      max: number;
      currency?: string;
      period?: string;
    };
    equity?: {
      min: number;
      max: number;
      type: string;
    };
    benefits?: string[];
    bonusStructure?: string;
    totalCompensation?: number;
  };
  applicationMethod?: string;
  documentsUsed?: {
    resumeId?: string;
    resumeContent?: string;
    trackedResumeUrl?: string;
    trackingShareId?: string;
  };
  referralContact?: {
    name: string;
    email?: string;
    phone?: string;
    relationship: string;
    company?: string;
    linkedinUrl?: string;
    notes?: string;
  };
}

export interface UpdateJobApplicationData {
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  jobUrl?: string;
  jobSource?: string;
  jobLocation?: {
    city?: string;
    state?: string;
    country?: string;
    remote?: boolean;
    hybrid?: boolean;
  };
  compensation?: {
    salaryRange?: {
      min?: number;
      max?: number;
      currency?: string;
      period?: string;
    };
    equity?: {
      min?: number;
      max?: number;
      type?: string;
    };
    benefits?: string[];
    bonusStructure?: string;
    totalCompensation?: number;
  };
  applicationMethod?: string;
  status?: string;
  notes?: string;
  priority?: string;
  tags?: string[];
  documentsUsed?: {
    resumeId?: string;
    resumeContent?: string;
  };
  applicationStrategy?: {
    whyInterested?: string;
    keySellingPoints?: string[];
    potentialConcerns?: string[];
    uniqueValueProposition?: string;
    researchCompleted?: boolean;
    questionsForCompany?: string[];
    negotiationStrategy?: string;
    walkAwayPoint?: number;
    skillsMatch?: string[];
    skillsToHighlight?: string[];
    experienceGaps?: string[];
    developmentOpportunities?: string[];
  };
  referralContact?: {
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
    company?: string;
    linkedinUrl?: string;
    notes?: string;
  };
}

export interface JobApplicationFilters {
  status?: string[];
  priority?: string[];
  companyName?: string;
  jobTitle?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  salaryRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  archived?: boolean;
}

class JobApplicationService {
  async createApplication(userId: string, applicationData: CreateJobApplicationData): Promise<IJobApplication> {
    try {
      // Get user profile for AI optimization, create basic one if doesn't exist
      let userProfile = await User.findById(userId);
      if (!userProfile) {
        // Create a basic profile for the user
        userProfile = new User({
          userId: new mongoose.Types.ObjectId(userId),
          headline: 'Job Seeker',
          bio: '',
          yearsOfExperience: 0,
          noticePeriod: 'flexible',
          availability: 'flexible',
          currentLocation: {
            city: 'Unknown',
            state: 'Unknown', 
            country: 'United States'
          },
          preferredLocations: [],
          openToRemote: true,
          openToRelocation: false,
          preferredRoles: [],
          preferredIndustries: [],
          preferredCompanySizes: [],
          workType: ['full-time'],
          technicalSkills: [],
          softSkills: [],
          languages: [],
          socialLinks: {},
          portfolioUrls: [],
          workExperience: [],
          education: [],
          projects: [],
          certifications: [],
          achievements: [],
          references: []
        });
        await userProfile.save();
      }

      // Convert string IDs to ObjectIds for database storage
      const processedApplicationData = {
        ...applicationData,
        jobPostingId: applicationData.jobPostingId ? new mongoose.Types.ObjectId(applicationData.jobPostingId) : undefined,
        documentsUsed: applicationData.documentsUsed ? {
          ...applicationData.documentsUsed,
          resumeId: applicationData.documentsUsed.resumeId ? 
            new mongoose.Types.ObjectId(applicationData.documentsUsed.resumeId) : 
            undefined
        } : undefined
      };

      console.log(`🔄 Processed application data:`, {
        hasDocumentsUsed: !!processedApplicationData.documentsUsed,
        resumeId: processedApplicationData.documentsUsed?.resumeId?.toString(),
        hasResumeContent: !!processedApplicationData.documentsUsed?.resumeContent,
        resumeContentLength: processedApplicationData.documentsUsed?.resumeContent?.length || 0
      });

      const application = new JobApplication({
        userId: new mongoose.Types.ObjectId(userId),
        ...processedApplicationData,
        applicationDate: new Date(),
        status: 'applied',
        statusHistory: [{
          status: 'applied',
          date: new Date(),
          notes: 'Application created'
        }],
        interviews: [],
        communications: [],
        tasks: [],
        applicationStrategy: {
          whyInterested: '',
          keySellingPoints: [],
          potentialConcerns: [],
          uniqueValueProposition: '',
          researchCompleted: false,
          questionsForCompany: [],
          skillsMatch: [],
          skillsToHighlight: [],
          experienceGaps: [],
          developmentOpportunities: []
        },
        metrics: {
          applicationScore: 0,
          totalRounds: 0,
          successProbability: 0,
          recommendedActions: []
        },
        automation: {
          autoFollowUpEnabled: true,
          smartRemindersEnabled: true,
          emailTrackingEnabled: false,
          calendarIntegrationEnabled: false,
          aiCoachingEnabled: true,
          negotiationAssistanceEnabled: false,
          interviewPrepEnabled: true
        },
        privacy: {
          shareWithNetwork: false,
          shareWithMentors: false,
          allowRecruitersToSee: false,
          anonymizeData: true
        },
        archived: false
      });

      // Smart AI analysis: Calculate match score if we have sufficient data
      let matchScore = 0;
      let resumeContentForAnalysis = application.documentsUsed?.resumeContent;
      
      console.log(`🔍 Debug AI analysis conditions:`);
      console.log(`   - Has documentsUsed: ${!!application.documentsUsed}`);
      console.log(`   - Resume ID: ${application.documentsUsed?.resumeId || 'NOT SET'}`);
      console.log(`   - Resume content: ${!!resumeContentForAnalysis} (${resumeContentForAnalysis?.length || 0} chars)`);
      
      // If we don't have resume content but have resumeId, fetch the resume
      if (!resumeContentForAnalysis && application.documentsUsed?.resumeId) {
        console.log(`📄 Attempting to fetch resume with ID: ${application.documentsUsed.resumeId}`);
        try {
          const resume = await Resume.findById(application.documentsUsed.resumeId);
          if (resume) {
            resumeContentForAnalysis = JSON.stringify(resume.toObject());
            console.log(`📄 Fetched resume content from ID: ${resume._id} (${resumeContentForAnalysis.length} chars)`);
            
            // Save the fetched content back to the application for future use
            application.documentsUsed.resumeContent = resumeContentForAnalysis;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch resume by ID: ${error.message}`);
        }
      }
      
      if (application.jobDescription && 
          application.jobDescription.length >= 50 && 
          resumeContentForAnalysis && 
          resumeContentForAnalysis.length >= 100) {
        
        try {
          console.log(`🤖 Auto-calculating match score for new application...`);
          const { geminiService } = await import('./ai/gemini');
          
          const matchAnalysis = await geminiService.calculateJobMatchScore(
            application.jobDescription,
            resumeContentForAnalysis,
            application.jobTitle,
            application.companyName
          );
          
          matchScore = matchAnalysis.matchScore;
          console.log(`✅ Auto-calculated match score: ${matchScore}%`);
        } catch (error) {
          console.warn(`⚠️ Auto-calculation failed, will calculate on-demand:`, error.message);
          matchScore = 0;
        }
      }
      
      application.metrics.applicationScore = matchScore;
      
      // ENTERPRISE FEATURE: Auto-generate tracked resume for this specific application
      if (applicationData.enableTracking && application.documentsUsed?.resumeId) {
        try {
          console.log(`🚀 [TRACKING] Initializing auto-tracking for application to ${applicationData.companyName}`);
          
          const shareId = crypto.randomBytes(5).toString('hex');
          const trackingUrl = `${process.env.FRONTEND_URL}/share/r/${shareId}`;
          
          const newShare = new ResumeShare({
            userId: new mongoose.Types.ObjectId(userId),
            resumeId: application.documentsUsed.resumeId,
            shareId,
            title: `Auto-track: ${applicationData.jobTitle} at ${applicationData.companyName}`,
            status: 'active',
            trackingType: applicationData.trackingSettings?.showQrCode ? 'qr_code' : 'pdf_embed',
            settings: {
              requireEmail: false,
              notifyOnView: true,
              allowDownload: true,
              showWatermark: applicationData.trackingSettings?.showWatermark !== false,
              trackLocation: true
            }
          });
          
          await newShare.save();
          console.log(`✅ [TRACKING] Created ResumeShare record: ${shareId}`);
          
          application.documentsUsed.trackedResumeUrl = trackingUrl;
          application.documentsUsed.trackingShareId = shareId;
        } catch (trackingError) {
          console.warn(`⚠️ [TRACKING] Failed to initialize tracking:`, trackingError.message);
        }
      }
      
      console.log(`📝 Application created with match score: ${matchScore}%`);
      console.log(`🎯 Job: ${application.jobTitle} at ${application.companyName}`);
      console.log(`📄 Has job description: ${application.jobDescription?.length > 0 ? 'Yes' : 'No'} (${application.jobDescription?.length || 0} chars)`);
      console.log(`📝 Has resume content: ${application.documentsUsed?.resumeContent ? 'Yes' : 'No'} (${application.documentsUsed?.resumeContent?.length || 0} chars)`);

      await application.save();
      console.log(`📝 Job application created with match score: ${application.metrics.applicationScore}%`);
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create job application: ${error.message}`);
      }
      throw new Error('Failed to create job application');
    }
  }

  async getApplications(
    userId: string,
    filters: JobApplicationFilters = {},
    pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = { page: 1, limit: 20 }
  ): Promise<{
    applications: IJobApplication[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalApplications: number;
      byStatus: { [key: string]: number };
      byPriority: { [key: string]: number };
      averageScore: number;
    };
  }> {
    try {
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query.status = { $in: filters.status };
      }

      if (filters.priority && filters.priority.length > 0) {
        query.priority = { $in: filters.priority };
      }

      if (filters.companyName) {
        query.companyName = new RegExp(filters.companyName, 'i');
      }

      if (filters.jobTitle) {
        query.jobTitle = new RegExp(filters.jobTitle, 'i');
      }

      if (filters.dateRange) {
        query.applicationDate = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }

      if (filters.salaryRange) {
        query['compensation.salaryRange.min'] = { $gte: filters.salaryRange.min };
        query['compensation.salaryRange.max'] = { $lte: filters.salaryRange.max };
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.archived !== undefined) {
        query.archived = filters.archived;
      }

      // Build sort criteria
      const sortCriteria: any = {};
      const sortBy = pagination.sortBy || 'applicationDate';
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
      sortCriteria[sortBy] = sortOrder;

      const skip = (pagination.page - 1) * pagination.limit;

      // Execute queries
      let [applications, total, statusSummary, prioritySummary, scoreSummary] = await Promise.all([
        JobApplication.find(query)
          .populate('jobPostingId')
          .sort(sortCriteria)
          .skip(skip)
          .limit(pagination.limit)
          .lean(),
        JobApplication.countDocuments(query),
        JobApplication.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        JobApplication.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),
        JobApplication.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: null, avgScore: { $avg: '$metrics.applicationScore' }, totalCount: { $sum: 1 } } }
        ])
      ]);

      // AUTO-HEAL: Check for missing jobPostingId and try to link via jobUrl
      // This ensures older applications get linked to the trust system
      const healPromises = applications.map(async (app: any) => {
        if (!app.jobPostingId && app.jobUrl) {
          try {
            const matchedJob = await JobPosting.findOne({ url: app.jobUrl }).select('_id authenticityScore trustBadges reviewCount');
            if (matchedJob) {
              // Update the application record asynchronously
              await JobApplication.updateOne({ _id: app._id }, { jobPostingId: matchedJob._id });
              
              // Patch the returned object so the UI updates immediately
              app.jobPostingId = matchedJob;
            }
          } catch (err) {
            // Ignore healing errors, don't block response
          }
        }
        return app;
      });
      
      applications = await Promise.all(healPromises);

      // Format summary data
      const byStatus = statusSummary.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      const byPriority = prioritySummary.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      const averageScore = scoreSummary[0]?.avgScore || 0;
      const totalApplications = scoreSummary[0]?.totalCount || 0;

      return {
        applications: applications as IJobApplication[],
        total,
        page: pagination.page,
        totalPages: Math.ceil(total / pagination.limit),
        summary: {
          totalApplications,
          byStatus,
          byPriority,
          averageScore: Math.round(averageScore)
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get job applications: ${error.message}`);
      }
      throw new Error('Failed to get job applications');
    }
  }

  async getApplication(userId: string, applicationId: string): Promise<any> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      })
      .populate('jobPostingId')
      .lean();

      if (application && application.documentsUsed?.trackingShareId) {
        // Fetch tracking stats
        const share = await ResumeShare.findOne({ 
          shareId: application.documentsUsed.trackingShareId,
          userId: new mongoose.Types.ObjectId(userId)
        }).lean();

        if (share) {
          return {
            ...application,
            trackingStats: {
              viewCount: share.viewCount,
              lastViewedAt: share.lastViewedAt,
              views: share.views.slice(-5) // Get latest 5 views
            }
          };
        }
      }

      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get job application: ${error.message}`);
      }
      throw new Error('Failed to get job application');
    }
  }

  async updateApplication(userId: string, applicationId: string, updates: UpdateJobApplicationData): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      // Track status changes
      if (updates.status && updates.status !== application.status) {
        application.statusHistory.push({
          status: updates.status,
          date: new Date(),
          notes: updates.notes || `Status changed to ${updates.status}`
        });
        application.status = updates.status as any;
      }

      // Update core job information fields
      if (updates.jobTitle !== undefined) application.jobTitle = updates.jobTitle;
      if (updates.companyName !== undefined) application.companyName = updates.companyName;
      if (updates.jobDescription !== undefined) application.jobDescription = updates.jobDescription;
      if (updates.jobUrl !== undefined) application.jobUrl = updates.jobUrl;
      if (updates.jobSource !== undefined) application.jobSource = updates.jobSource as 'manual' | 'linkedin' | 'indeed' | 'glassdoor' | 'company_website' | 'referral' | 'recruiter';
      if (updates.applicationMethod !== undefined) application.applicationMethod = updates.applicationMethod as 'online' | 'email' | 'referral' | 'recruiter' | 'career_fair' | 'networking';

      // Update job location
      if (updates.jobLocation) {
        application.jobLocation = {
          ...application.jobLocation,
          ...updates.jobLocation
        };
      }

      // Update compensation
      if (updates.compensation) {
        if (application.compensation) {
          // Update existing compensation
          if (updates.compensation.salaryRange) {
            application.compensation.salaryRange = {
              min: updates.compensation.salaryRange.min || application.compensation.salaryRange?.min || 0,
              max: updates.compensation.salaryRange.max || application.compensation.salaryRange?.max || 0,
              currency: updates.compensation.salaryRange.currency || application.compensation.salaryRange?.currency || 'USD',
              period: (updates.compensation.salaryRange.period as 'hourly' | 'monthly' | 'yearly') || application.compensation.salaryRange?.period || 'yearly'
            };
          }
          if (updates.compensation.equity) {
            application.compensation.equity = {
              min: updates.compensation.equity.min || application.compensation.equity?.min || 0,
              max: updates.compensation.equity.max || application.compensation.equity?.max || 0,
              type: (updates.compensation.equity.type as 'options' | 'rsu' | 'percentage') || application.compensation.equity?.type || 'options'
            };
          }
          if (updates.compensation.benefits) application.compensation.benefits = updates.compensation.benefits;
          if (updates.compensation.bonusStructure) application.compensation.bonusStructure = updates.compensation.bonusStructure;
          if (updates.compensation.totalCompensation) application.compensation.totalCompensation = updates.compensation.totalCompensation;
        } else {
          // Create new compensation with proper typing
        const newCompensation: any = {};
        if (updates.compensation.salaryRange) {
          newCompensation.salaryRange = {
            min: updates.compensation.salaryRange.min || 0,
            max: updates.compensation.salaryRange.max || 0,
            currency: updates.compensation.salaryRange.currency || 'USD',
            period: (updates.compensation.salaryRange.period as 'hourly' | 'monthly' | 'yearly') || 'yearly'
          };
        }
        if (updates.compensation.equity) {
          newCompensation.equity = {
            min: updates.compensation.equity.min || 0,
            max: updates.compensation.equity.max || 0,
            type: (updates.compensation.equity.type as 'options' | 'rsu' | 'percentage') || 'options'
          };
        }
        if (updates.compensation.benefits) newCompensation.benefits = updates.compensation.benefits;
        if (updates.compensation.bonusStructure) newCompensation.bonusStructure = updates.compensation.bonusStructure;
        if (updates.compensation.totalCompensation) newCompensation.totalCompensation = updates.compensation.totalCompensation;
        application.compensation = newCompensation;
        }
      }

      // Update referral contact
      if (updates.referralContact) {
        application.referralContact = {
          ...application.referralContact,
          ...updates.referralContact
        };
      }

      // Update other fields
      if (updates.priority) application.priority = updates.priority as any;
      if (updates.tags) application.tags = updates.tags;
            if (updates.documentsUsed) {
              // Handle ObjectId conversion for resumeId
              const processedDocumentsUsed = {
                ...application.documentsUsed,
                ...updates.documentsUsed
              };
              
                      if (updates.documentsUsed.resumeId) {
                        processedDocumentsUsed.resumeId = typeof updates.documentsUsed.resumeId === 'string'
                          ? new mongoose.Types.ObjectId(updates.documentsUsed.resumeId)
                          : updates.documentsUsed.resumeId;
                      }
                      
                      application.documentsUsed = processedDocumentsUsed as any;
                    }
            if (updates.applicationStrategy) {
        application.applicationStrategy = {
          ...application.applicationStrategy,
          ...updates.applicationStrategy
        };
      }

      // Automatically recalculate match score if key fields changed
      await this.handleMatchScoreRecalculation(application, updates);

      await application.save();
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update job application: ${error.message}`);
      }
      throw new Error('Failed to update job application');
    }
  }

  async deleteApplication(userId: string, applicationId: string): Promise<void> {
    try {
      const result = await JobApplication.deleteOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (result.deletedCount === 0) {
        throw new Error('Job application not found');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete job application: ${error.message}`);
      }
      throw new Error('Failed to delete job application');
    }
  }

  async addInterview(
    userId: string,
    applicationId: string,
    interviewData: {
      type: string;
      round: number;
      scheduledDate: Date;
      duration?: number;
      timezone?: string;
      interviewers: {
        name: string;
        title?: string;
        email?: string;
        linkedinUrl?: string;
        department?: string;
      }[];
      location?: string;
      meetingLink?: string;
      meetingId?: string;
      dialInInfo?: string;
    }
  ): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const interview = {
        id: uuidv4(),
        ...interviewData,
        type: interviewData.type as any,
        status: 'scheduled' as const,
        thankYouSent: false
      };

      application.interviews.push(interview as any);
      application.metrics.totalRounds = application.interviews.length;

      // Update status if this is the first interview
      if (application.status === 'applied' || application.status === 'under_review') {
        application.status = 'first_interview';
        application.statusHistory.push({
          status: 'first_interview',
          date: new Date(),
          notes: `${interview.type} interview scheduled`
        });
      }

      await application.save();
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add interview: ${error.message}`);
      }
      throw new Error('Failed to add interview');
    }
  }

  async updateInterview(
    userId: string,
    applicationId: string,
    interviewId: string,
    updates: {
      status?: string;
      feedback?: string;
      rating?: number;
      technicalPerformance?: number;
      culturalFit?: number;
      communicationSkills?: number;
      thankYouSent?: boolean;
      followUpNotes?: string;
      nextSteps?: string;
      completedAt?: Date;
      rescheduleReason?: string;
      cancelReason?: string;
    }
  ): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const interviewIndex = application.interviews.findIndex(interview => interview.id === interviewId);
      if (interviewIndex === -1) {
        throw new Error('Interview not found');
      }

      // Update interview
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] !== undefined) {
          (application.interviews[interviewIndex] as any)[key] = updates[key as keyof typeof updates];
        }
      });

      // If interview completed, update completion date
      if (updates.status === 'completed') {
        application.interviews[interviewIndex].completedAt = new Date();
      }

      await application.save();
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update interview: ${error.message}`);
      }
      throw new Error('Failed to update interview');
    }
  }

  async addCommunication(
    userId: string,
    applicationId: string,
    communicationData: {
      type: string;
      direction: 'inbound' | 'outbound';
      contactPerson: string;
      contactTitle?: string;
      contactEmail?: string;
      subject?: string;
      summary: string;
      fullContent?: string;
      attachments?: {
        name: string;
        url: string;
        type: string;
      }[];
      followUpRequired?: boolean;
      followUpDate?: Date;
      sentiment?: 'positive' | 'neutral' | 'negative';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const communication = {
        id: uuidv4(),
        date: new Date(),
        ...communicationData,
        type: communicationData.type as any,
        followUpCompleted: false,
        automated: false
      };

      application.communications.push(communication as any);

      // Update response time metric if this is first response
      if (communicationData.direction === 'inbound' && !application.metrics.responseTime) {
        const daysSinceApplication = Math.floor(
          (Date.now() - application.applicationDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        application.metrics.responseTime = daysSinceApplication;
      }

      await application.save();
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add communication: ${error.message}`);
      }
      throw new Error('Failed to add communication');
    }
  }

  async addTask(
    userId: string,
    applicationId: string,
    taskData: {
      title: string;
      description?: string;
      type: 'research' | 'follow_up' | 'preparation' | 'networking' | 'document_update' | 'other';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      dueDate: Date;
    }
  ): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const task = {
        id: uuidv4(),
        ...taskData,
        completed: false,
        createdDate: new Date()
      };

      application.tasks.push(task);
      await application.save();
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add task: ${error.message}`);
      }
      throw new Error('Failed to add task');
    }
  }

  async completeTask(userId: string, applicationId: string, taskId: string, notes?: string): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const taskIndex = application.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      application.tasks[taskIndex].completed = true;
      application.tasks[taskIndex].completedDate = new Date();
      if (notes) {
        application.tasks[taskIndex].notes = notes;
      }

      await application.save();
      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to complete task: ${error.message}`);
      }
      throw new Error('Failed to complete task');
    }
  }

  private static readonly MATCH_SCORE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static matchScoreQueue = new Map<string, Promise<any>>(); // Prevent duplicate concurrent calculations

  private shouldRecalculateScore(application: any): boolean {
    const lastAnalysis = application.metrics?.lastAnalysisDate;
    if (!lastAnalysis) return true;
    
    const cacheAge = Date.now() - new Date(lastAnalysis).getTime();
    return cacheAge > JobApplicationService.MATCH_SCORE_CACHE_DURATION;
  }

  private async handleMatchScoreRecalculation(application: any, updates: UpdateJobApplicationData): Promise<void> {
    try {
      // Check if any fields that affect match score have changed
      const scoreAffectingFields = [
        'jobTitle', 'jobDescription', 'jobLocation', 'compensation', 'documentsUsed'
      ];
      
      const hasScoreAffectingChanges = scoreAffectingFields.some(field => updates[field] !== undefined);
      
      if (!hasScoreAffectingChanges) {
        console.log('ℹ️ No score-affecting fields changed, skipping recalculation');
        return;
      }

      // Check if recent analysis exists and is still valid (enterprise caching)
      if (!this.shouldRecalculateScore(application)) {
        console.log('ℹ️ Recent analysis exists and is still valid, skipping recalculation');
        return;
      }

      // Check if we have the minimum data required for analysis
      let resumeContentForAnalysis = application.documentsUsed?.resumeContent;
      
      // If we don't have resume content but have resumeId, fetch the resume
      if (!resumeContentForAnalysis && application.documentsUsed?.resumeId) {
        try {
          const resume = await Resume.findById(application.documentsUsed.resumeId);
          if (resume) {
            resumeContentForAnalysis = JSON.stringify(resume.toObject());
            application.documentsUsed.resumeContent = resumeContentForAnalysis;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch resume for recalculation: ${error.message}`);
        }
      }

      // Only recalculate if we have sufficient data
      if (application.jobDescription && 
          application.jobDescription.length >= 50 && 
          resumeContentForAnalysis && 
          resumeContentForAnalysis.length >= 100) {
        
        try {
          console.log(`🔄 Auto-recalculating match score after update...`);
          const { geminiService } = await import('./ai/gemini');
          
          const matchAnalysis = await geminiService.calculateJobMatchScore(
            application.jobDescription,
            resumeContentForAnalysis,
            application.jobTitle,
            application.companyName
          );
          
          application.metrics.applicationScore = matchAnalysis.matchScore;
          application.metrics.lastAnalysisDate = new Date();
          application.metrics.analysisVersion = new Date().toISOString();
          
          console.log(`✅ Auto-recalculated match score: ${matchAnalysis.matchScore}%`);
        } catch (error) {
          console.warn(`⚠️ Auto-recalculation failed, keeping existing score:`, error.message);
        }
      } else {
        console.log('ℹ️ Insufficient data for match score recalculation');
      }
    } catch (error) {
      console.error('❌ Error in handleMatchScoreRecalculation:', error.message);
      // Don't throw - we don't want to fail the update if score calculation fails
    }
  }

  async calculateMatchScore(userId: string, applicationId: string): Promise<any> {
    const cacheKey = `${userId}-${applicationId}`;
    
    // Enterprise optimization: Prevent duplicate concurrent calculations
    if (JobApplicationService.matchScoreQueue.has(cacheKey)) {
      console.log(`🔄 Match score calculation already in progress for ${applicationId}, waiting...`);
      return await JobApplicationService.matchScoreQueue.get(cacheKey);
    }

    const calculationPromise = this.performMatchScoreCalculation(userId, applicationId);
    JobApplicationService.matchScoreQueue.set(cacheKey, calculationPromise);

    try {
      const result = await calculationPromise;
      return result;
    } finally {
      JobApplicationService.matchScoreQueue.delete(cacheKey);
    }
  }

  private async performMatchScoreCalculation(userId: string, applicationId: string): Promise<any> {
    try {
      console.log(`🎯 Starting match score calculation for application ${applicationId}`);
      
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      // Enterprise optimization: Check if we have a recent cached score
      if (!this.shouldRecalculateScore(application) && application.metrics?.applicationScore > 0) {
        console.log(`✅ Using cached match score: ${application.metrics.applicationScore}%`);
        return {
          matchScore: application.metrics.applicationScore,
          cached: true,
          analysisTimestamp: application.metrics.analysisVersion,
          applicationId
        };
      }

      console.log(`📋 Application found: ${application.jobTitle} at ${application.companyName}`);
      console.log(`📄 Job description length: ${application.jobDescription?.length || 0} chars`);
      console.log(`📝 Resume content available: ${!!application.documentsUsed?.resumeContent}`);
      console.log(`📝 Resume ID available: ${application.documentsUsed?.resumeId || 'None'}`);

      let resumeContentForAnalysis = application.documentsUsed?.resumeContent;

      // If we don't have resume content but have resumeId, fetch the resume
      if (!resumeContentForAnalysis && application.documentsUsed?.resumeId) {
        try {
          console.log(`📄 Fetching resume content from ID: ${application.documentsUsed.resumeId}`);
          const resume = await Resume.findById(application.documentsUsed.resumeId);
          if (resume) {
            resumeContentForAnalysis = JSON.stringify(resume.toObject());
            console.log(`✅ Successfully fetched resume content (${resumeContentForAnalysis.length} chars)`);
            
            // Save the fetched content back to the application for future use
            application.documentsUsed.resumeContent = resumeContentForAnalysis;
            await application.save();
          } else {
            throw new Error(`Resume with ID ${application.documentsUsed.resumeId} not found`);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch resume: ${error.message}`);
          throw new Error(`Failed to fetch resume content: ${error.message}`);
        }
      }

      if (!resumeContentForAnalysis) {
        throw new Error('Resume content is required for AI matching. Please add your resume to this application.');
      }

      if (!application.jobDescription || application.jobDescription.length < 50) {
        throw new Error('Job description is too short or missing. Please add a detailed job description for accurate matching.');
      }

      // Add timestamp to ensure fresh analysis
      const analysisTimestamp = new Date().toISOString();
      console.log(`⏰ Analysis timestamp: ${analysisTimestamp}`);

      const { geminiService } = await import('./ai/gemini');
      
      console.log(`🎯 [${analysisTimestamp}] Calling Gemini service directly for fresh analysis`);
      console.log(`📊 Input validation:`);
      console.log(`   - Job description exists: ${!!application.jobDescription}`);
      console.log(`   - Job description length: ${application.jobDescription.length} chars`);
      console.log(`   - Resume content exists: ${!!application.documentsUsed.resumeContent}`);
      console.log(`   - Resume content length: ${application.documentsUsed.resumeContent.length} chars`);
      
      const matchAnalysis = await geminiService.calculateJobMatchScore(
        application.jobDescription,
        resumeContentForAnalysis,
        application.jobTitle,
        application.companyName
      );
      
      console.log(`✅ [${analysisTimestamp}] Direct Gemini analysis completed:`, {
        matchScore: matchAnalysis.matchScore,
        hasMatchReasons: !!matchAnalysis.matchReasons,
        analysisTimestamp
      });

      console.log(`✅ Match analysis completed with score: ${matchAnalysis.matchScore}%`);

      // Update the application with the calculated match score and analysis timestamp
      const updatedApplication = await JobApplication.findByIdAndUpdate(
        applicationId, 
        {
          'metrics.applicationScore': matchAnalysis.matchScore,
          'metrics.lastAnalysisDate': new Date(),
          'metrics.analysisVersion': analysisTimestamp
        },
        { new: true }
      );

      console.log(`💾 Updated application metrics: ${updatedApplication?.metrics?.applicationScore}%`);

      return {
        ...matchAnalysis,
        analysisTimestamp,
        applicationId
      };
    } catch (error) {
      console.error(`❌ Match score calculation failed:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to calculate match score: ${error.message}`);
      }
      throw new Error('Failed to calculate match score');
    }
  }

  // Enterprise method: Batch calculate match scores for applications missing them
  async batchCalculateMatchScores(userId: string, limit: number = 10): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    try {
      console.log(`🔄 Starting batch match score calculation for user ${userId}`);
      
      // Find applications with missing or old scores
      const applications = await JobApplication.find({
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { 'metrics.applicationScore': { $eq: 0 } },
          { 'metrics.applicationScore': { $exists: false } },
          { 'metrics.lastAnalysisDate': { $exists: false } },
          { 
            'metrics.lastAnalysisDate': { 
              $lt: new Date(Date.now() - JobApplicationService.MATCH_SCORE_CACHE_DURATION) 
            } 
          }
        ]
      }).limit(limit);

      let processed = 0;
      let updated = 0;
      let errors = 0;

      for (const application of applications) {
        try {
          processed++;
          console.log(`📊 Processing ${processed}/${applications.length}: ${application.jobTitle} at ${application.companyName}`);
          
          // Check if we have sufficient data
          let resumeContentForAnalysis = application.documentsUsed?.resumeContent;
          
          if (!resumeContentForAnalysis && application.documentsUsed?.resumeId) {
            try {
              const resume = await Resume.findById(application.documentsUsed.resumeId);
              if (resume) {
                resumeContentForAnalysis = JSON.stringify(resume.toObject());
                application.documentsUsed.resumeContent = resumeContentForAnalysis;
              }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch resume for ${application._id}: ${error.message}`);
            }
          }

          if (application.jobDescription && 
              application.jobDescription.length >= 50 && 
              resumeContentForAnalysis && 
              resumeContentForAnalysis.length >= 100) {
            
            const { geminiService } = await import('./ai/gemini');
            
            const matchAnalysis = await geminiService.calculateJobMatchScore(
              application.jobDescription,
              resumeContentForAnalysis,
              application.jobTitle,
              application.companyName
            );
            
            await JobApplication.findByIdAndUpdate(application._id, {
              'metrics.applicationScore': matchAnalysis.matchScore,
              'metrics.lastAnalysisDate': new Date(),
              'metrics.analysisVersion': new Date().toISOString()
            });
            
            updated++;
            console.log(`✅ Updated ${application.jobTitle}: ${matchAnalysis.matchScore}%`);
          } else {
            console.log(`⏭️ Skipping ${application.jobTitle}: insufficient data`);
          }
          
          // Add small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          errors++;
          console.error(`❌ Failed to process ${application.jobTitle}:`, error.message);
        }
      }

      console.log(`✅ Batch calculation complete: ${processed} processed, ${updated} updated, ${errors} errors`);
      
      return { processed, updated, errors };
    } catch (error) {
      console.error('❌ Batch calculation failed:', error);
      throw new Error(`Failed to batch calculate match scores: ${error.message}`);
    }
  }

  async getJobMatchAnalysis(userId: string, applicationId: string): Promise<any> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User profile not found');
      }

      const analysis = await aiOptimizationService.analyzeJobMatch(userToProfile(user), application);
      return analysis;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get job match analysis: ${error.message}`);
      }
      throw new Error('Failed to get job match analysis');
    }
  }

  async getInterviewPrep(userId: string, applicationId: string, interviewType: string): Promise<any> {
    try {
      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        throw new Error('Job application not found');
      }

      const interviewQuestions = await aiOptimizationService.generateInterviewQuestions(
        application,
        interviewType as any
      );

      return interviewQuestions;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get interview prep: ${error.message}`);
      }
      throw new Error('Failed to get interview prep');
    }
  }

  async archiveApplication(userId: string, applicationId: string): Promise<IJobApplication> {
    try {
      const application = await JobApplication.findOneAndUpdate(
        {
          _id: applicationId,
          userId: new mongoose.Types.ObjectId(userId)
        },
        { archived: true },
        { new: true }
      );

      if (!application) {
        throw new Error('Job application not found');
      }

      return application;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to archive application: ${error.message}`);
      }
      throw new Error('Failed to archive application');
    }
  }

  async getApplicationStats(userId: string): Promise<{
    totalApplications: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    averageTimeToResponse: number;
    averageTimeToInterview: number;
    topCompanies: { name: string; count: number }[];
    statusBreakdown: { [key: string]: number };
    monthlyTrend: { month: string; applications: number; interviews: number; offers: number }[];
    trackingIntelligence?: {
      totalViews: number;
      activeTrackingLinks: number;
      topTrackedApplications: { title: string; views: number; lastView?: Date }[];
    };
  }> {
    try {
      const applications = await JobApplication.find({ userId: new mongoose.Types.ObjectId(userId) });

      const totalApplications = applications.length;
      const responsesReceived = applications.filter(app => 
        app.communications.some(comm => comm.direction === 'inbound')
      ).length;
      const interviewsReceived = applications.filter(app => app.interviews.length > 0).length;
      const offersReceived = applications.filter(app => 
        ['offer_received', 'offer_accepted', 'offer_declined'].includes(app.status)
      ).length;

      const responseRate = totalApplications > 0 ? (responsesReceived / totalApplications) * 100 : 0;
      const interviewRate = totalApplications > 0 ? (interviewsReceived / totalApplications) * 100 : 0;
      const offerRate = totalApplications > 0 ? (offersReceived / totalApplications) * 100 : 0;

      const responseTimes = applications
        .filter(app => app.metrics.responseTime)
        .map(app => app.metrics.responseTime!);
      const averageTimeToResponse = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      // Calculate average time to first interview
      const interviewTimes = applications
        .filter(app => app.interviews.length > 0)
        .map(app => {
          const firstInterview = app.interviews[0];
          return Math.floor((firstInterview.scheduledDate.getTime() - app.applicationDate.getTime()) / (1000 * 60 * 60 * 24));
        });
      const averageTimeToInterview = interviewTimes.length > 0
        ? interviewTimes.reduce((sum, time) => sum + time, 0) / interviewTimes.length
        : 0;

      // Top companies
      const companyCount = applications.reduce((acc, app) => {
        acc[app.companyName] = (acc[app.companyName] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      const topCompanies = Object.entries(companyCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Status breakdown
      const statusBreakdown = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Monthly trend (last 12 months)
      const monthlyTrend: { month: string; applications: number; interviews: number; offers: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const monthApplications = applications.filter(app => {
          const appDate = new Date(app.applicationDate);
          return appDate.getFullYear() === date.getFullYear() && appDate.getMonth() === date.getMonth();
        });

        monthlyTrend.push({
          month: monthKey,
          applications: monthApplications.length,
          interviews: monthApplications.filter(app => app.interviews.length > 0).length,
          offers: monthApplications.filter(app => 
            ['offer_received', 'offer_accepted', 'offer_declined'].includes(app.status)
          ).length
        });
      }

      // Tracking Intelligence
      const trackingShares = await ResumeShare.find({ userId: new mongoose.Types.ObjectId(userId) });
      const totalViews = trackingShares.reduce((sum, share) => sum + share.viewCount, 0);
      const activeTrackingLinks = trackingShares.filter(s => s.status === 'active').length;

      return {
        totalApplications,
        responseRate: Math.round(responseRate),
        interviewRate: Math.round(interviewRate),
        offerRate: Math.round(offerRate),
        averageTimeToResponse: Math.round(averageTimeToResponse),
        averageTimeToInterview: Math.round(averageTimeToInterview),
        topCompanies,
        statusBreakdown,
        monthlyTrend,
        trackingIntelligence: {
          totalViews,
          activeTrackingLinks,
          topTrackedApplications: trackingShares
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 5)
            .map(s => ({ title: s.title, views: s.viewCount, lastView: s.lastViewedAt }))
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get application stats: ${error.message}`);
      }
      throw new Error('Failed to get application stats');
    }
  }

}

export const jobApplicationService = new JobApplicationService();