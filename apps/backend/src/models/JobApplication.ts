import mongoose, { Document, Schema } from 'mongoose';

export interface IJobApplication extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Job Information
  jobTitle: string;
  companyName: string;
  companyId?: mongoose.Types.ObjectId;
  jobDescription: string;
  jobUrl?: string;
  jobSource: 'manual' | 'linkedin' | 'indeed' | 'glassdoor' | 'company_website' | 'referral' | 'recruiter';
  jobId?: string; // External job ID from platforms
  jobPostingId?: mongoose.Types.ObjectId; // Link to internal JobPosting
  
  // Location & Remote Info
  jobLocation: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  
  // Compensation & Benefits
  compensation: {
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
      period: 'hourly' | 'monthly' | 'yearly';
    };
    equity?: {
      min: number;
      max: number;
      type: 'options' | 'rsu' | 'percentage';
    };
    benefits?: string[];
    bonusStructure?: string;
    totalCompensation?: number;
  };
  
  // Application Details
  applicationDate: Date;
  applicationMethod: 'online' | 'email' | 'referral' | 'recruiter' | 'career_fair' | 'networking';
  applicationId?: string; // Tracking ID from platform
  
  // Referral Information
  referralContact?: {
    name: string;
    email?: string;
    phone?: string;
    relationship: string;
    company?: string;
    linkedinUrl?: string;
    notes?: string;
  };
  
  // Status & Pipeline Tracking
  status: 'applied' | 'under_review' | 'phone_screen' | 'technical_assessment' | 
          'first_interview' | 'second_interview' | 'final_interview' | 'reference_check' |
          'offer_negotiation' | 'offer_received' | 'offer_accepted' | 'offer_declined' | 
          'rejected' | 'withdrawn' | 'ghosted' | 'on_hold';
  
  statusHistory: {
    status: string;
    date: Date;
    notes?: string;
    updatedBy?: string;
  }[];
  
  // Interview Pipeline
  interviews: {
    id: string;
    type: 'phone' | 'video' | 'on_site' | 'technical' | 'behavioral' | 'case_study' | 'presentation' | 'panel';
    round: number;
    scheduledDate: Date;
    duration: number; // in minutes
    timezone?: string;
    
    // Interviewer Details
    interviewers: {
      name: string;
      title: string;
      email?: string;
      linkedinUrl?: string;
      department?: string;
    }[];
    
    // Location & Meeting Info
    location?: string;
    meetingLink?: string;
    meetingId?: string;
    dialInInfo?: string;
    
    // Status & Tracking
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
    
    // Preparation & Notes
    preparationNotes?: string;
    questionsToAsk?: string[];
    
    // Post-Interview
    feedback?: string;
    interviewerFeedback?: string;
    rating?: number; // 1-10 scale
    technicalPerformance?: number;
    culturalFit?: number;
    communicationSkills?: number;
    
    // Follow-up
    thankYouSent?: boolean;
    thankYouSentDate?: Date;
    followUpNotes?: string;
    nextSteps?: string;
    
    completedAt?: Date;
    rescheduleReason?: string;
    cancelReason?: string;
  }[];
  
  // Communication Timeline
  communications: {
    id: string;
    date: Date;
    type: 'email' | 'phone' | 'linkedin' | 'text' | 'in_person' | 'video_call' | 'recruiter_call';
    direction: 'inbound' | 'outbound';
    
    // Contact Information
    contactPerson: string;
    contactTitle?: string;
    contactEmail?: string;
    
    // Content
    subject?: string;
    summary: string;
    fullContent?: string;
    attachments?: {
      name: string;
      url: string;
      type: string;
    }[];
    
    // Follow-up Tracking
    followUpRequired: boolean;
    followUpDate?: Date;
    followUpCompleted?: boolean;
    
    // Sentiment & Priority
    sentiment: 'positive' | 'neutral' | 'negative';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    
    // Automation
    automated?: boolean;
    template?: string;
  }[];
  
  // Documents & Portfolio
  documentsUsed: {
    resumeId?: mongoose.Types.ObjectId;
    resumeContent?: string; // Store resume content for AI matching
    trackedResumeUrl?: string; // URL of the tracked resume
    trackingShareId?: string; // Link to ResumeShare node for tracking
    portfolioLinks?: string[];
    
    additionalDocuments?: {
      name: string;
      url: string;
      type: 'transcript' | 'portfolio' | 'writing_sample' | 'code_sample' | 'references' | 'other';
      uploadDate: Date;
    }[];
    
    // Technical Assessments
    technicalAssessments?: {
      name: string;
      platform: string;
      submittedDate: Date;
      score?: number;
      feedback?: string;
      url?: string;
    }[];
  };
  
  // Company Research & Intelligence
  companyIntelligence: {
    // Basic Info
    companySize?: string;
    industry?: string;
    headquarters?: string;
    founded?: number;
    website?: string;
    
    // Ratings & Reviews
    glassdoorRating?: number;
    linkedinFollowers?: number;
    
    // Culture & Values
    cultureDescription?: string;
    values?: string[];
    workLifeBalance?: number;
    diversityScore?: number;
    
    // Financial & Market
    marketCap?: number;
    revenue?: number;
    fundingStage?: string;
    recentFunding?: {
      amount: number;
      date: Date;
      investors: string[];
    };
    
    // Recent News & Updates
    recentNews?: {
      title: string;
      url: string;
      date: Date;
      summary: string;
    }[];
    
    // Key Personnel
    keyContacts?: {
      name: string;
      title: string;
      email?: string;
      linkedinUrl?: string;
      department?: string;
      notes?: string;
      lastContact?: Date;
    }[];
    
    // Competitive Intelligence
    competitors?: string[];
    marketPosition?: string;
    growthTrends?: string[];
  };
  
  // Strategic Notes & Planning
  applicationStrategy: {
    whyInterested: string;
    keySellingPoints: string[];
    potentialConcerns: string[];
    uniqueValueProposition: string;
    
    // Preparation
    researchCompleted: boolean;
    questionsForCompany: string[];
    negotiationStrategy?: string;
    walkAwayPoint?: number;
    
    // Personal Fit
    skillsMatch: string[];
    skillsToHighlight: string[];
    experienceGaps: string[];
    developmentOpportunities: string[];
  };
  
  // Task & Follow-up Management
  tasks: {
    id: string;
    title: string;
    description?: string;
    type: 'research' | 'follow_up' | 'preparation' | 'networking' | 'document_update' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: Date;
    completed: boolean;
    completedDate?: Date;
    notes?: string;
    createdDate: Date;
  }[];
  
  // Analytics & Performance
  metrics: {
    applicationScore: number; // AI-calculated match score (0-100)
    responseTime?: number; // days until first response
    interviewConversionRate?: number;
    totalRounds: number;
    timeInPipeline?: number; // days from application to final decision
    
    // AI Analysis Tracking
    lastAnalysisDate?: Date; // When the last AI analysis was performed
    analysisVersion?: string; // Version/timestamp of the analysis for cache busting
    
    // AI Insights
    successProbability?: number;
    recommendedActions?: string[];
    competitiveAnalysis?: {
      demandLevel: 'low' | 'medium' | 'high';
      competitionLevel: 'low' | 'medium' | 'high';
      marketSalary?: number;
      skillsInDemand?: string[];
    };
  };
  
  // Organization & Management
  priority: 'low' | 'medium' | 'high' | 'dream_job';
  tags: string[];
  category?: string;
  archived: boolean;
  
  // Automation & Smart Features
  automation: {
    autoFollowUpEnabled: boolean;
    smartRemindersEnabled: boolean;
    emailTrackingEnabled: boolean;
    calendarIntegrationEnabled: boolean;
    
    // AI Assistance
    aiCoachingEnabled: boolean;
    negotiationAssistanceEnabled: boolean;
    interviewPrepEnabled: boolean;
  };
  
  // Privacy & Sharing
  privacy: {
    shareWithNetwork: boolean;
    shareWithMentors: boolean;
    allowRecruitersToSee: boolean;
    anonymizeData: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Job Information
  jobTitle: { type: String, required: true, trim: true, index: true },
  companyName: { type: String, required: true, trim: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  jobDescription: { type: String, required: true },
  jobUrl: String,
  jobSource: {
    type: String,
    enum: ['manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'referral', 'recruiter'],
    default: 'manual'
  },
  jobId: String,
  jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting' },
  
  // Location
  jobLocation: {
    city: String,
    state: String,
    country: String,
    remote: { type: Boolean, default: false },
    hybrid: Boolean
  },
  
  // Compensation
  compensation: {
    salaryRange: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
      period: { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' }
    },
    equity: {
      min: Number,
      max: Number,
      type: { type: String, enum: ['options', 'rsu', 'percentage'] }
    },
    benefits: [String],
    bonusStructure: String,
    totalCompensation: Number
  },
  
  // Application
  applicationDate: { type: Date, required: true, default: Date.now, index: true },
  applicationMethod: {
    type: String,
    enum: ['online', 'email', 'referral', 'recruiter', 'career_fair', 'networking'],
    default: 'online'
  },
  applicationId: String,
  
  // Referral
  referralContact: {
    name: String,
    email: String,
    phone: String,
    relationship: String,
    company: String,
    linkedinUrl: String,
    notes: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['applied', 'under_review', 'phone_screen', 'technical_assessment', 
           'first_interview', 'second_interview', 'final_interview', 'reference_check',
           'offer_negotiation', 'offer_received', 'offer_accepted', 'offer_declined', 
           'rejected', 'withdrawn', 'ghosted', 'on_hold'],
    default: 'applied',
    index: true
  },
  
  statusHistory: [{
    status: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    notes: String,
    updatedBy: String
  }],
  
  // Interviews
  interviews: [{
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['phone', 'video', 'on_site', 'technical', 'behavioral', 'case_study', 'presentation', 'panel'],
      required: true
    },
    round: { type: Number, required: true },
    scheduledDate: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    timezone: String,
    
    interviewers: [{
      name: { type: String, required: true },
      title: String,
      email: String,
      linkedinUrl: String,
      department: String
    }],
    
    location: String,
    meetingLink: String,
    meetingId: String,
    dialInInfo: String,
    
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'],
      default: 'scheduled'
    },
    
    preparationNotes: String,
    questionsToAsk: [String],
    
    feedback: String,
    interviewerFeedback: String,
    rating: { type: Number, min: 1, max: 10 },
    technicalPerformance: { type: Number, min: 1, max: 10 },
    culturalFit: { type: Number, min: 1, max: 10 },
    communicationSkills: { type: Number, min: 1, max: 10 },
    
    thankYouSent: { type: Boolean, default: false },
    thankYouSentDate: Date,
    followUpNotes: String,
    nextSteps: String,
    
    completedAt: Date,
    rescheduleReason: String,
    cancelReason: String
  }],
  
  // Communications
  communications: [{
    id: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      enum: ['email', 'phone', 'linkedin', 'text', 'in_person', 'video_call', 'recruiter_call'],
      required: true
    },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    
    contactPerson: { type: String, required: true },
    contactTitle: String,
    contactEmail: String,
    
    subject: String,
    summary: { type: String, required: true },
    fullContent: String,
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    followUpCompleted: { type: Boolean, default: false },
    
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    
    automated: { type: Boolean, default: false },
    template: String
  }],
  
  // Documents & Portfolio
  documentsUsed: {
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
    resumeContent: { type: String }, // Store resume content for AI matching
    trackedResumeUrl: { type: String }, // URL of the tracked resume
    trackingShareId: { type: String }, // Link to ResumeShare node for tracking
    portfolioLinks: [String],
    additionalDocuments: [{
      name: String,
      url: String,
      type: { type: String, enum: ['transcript', 'portfolio', 'writing_sample', 'code_sample', 'references', 'other'] },
      uploadDate: { type: Date, default: Date.now }
    }],
    technicalAssessments: [{
      name: String,
      platform: String,
      submittedDate: Date,
      score: Number,
      feedback: String,
      url: String
    }]
  },
  
  // Company Intelligence
  companyIntelligence: {
    companySize: String,
    industry: String,
    headquarters: String,
    founded: Number,
    website: String,
    glassdoorRating: { type: Number, min: 1, max: 5 },
    linkedinFollowers: Number,
    cultureDescription: String,
    values: [String],
    workLifeBalance: { type: Number, min: 1, max: 5 },
    diversityScore: { type: Number, min: 1, max: 5 },
    marketCap: Number,
    revenue: Number,
    fundingStage: String,
    recentFunding: {
      amount: Number,
      date: Date,
      investors: [String]
    },
    recentNews: [{
      title: String,
      url: String,
      date: Date,
      summary: String
    }],
    keyContacts: [{
      name: String,
      title: String,
      email: String,
      linkedinUrl: String,
      department: String,
      notes: String,
      lastContact: Date
    }],
    competitors: [String],
    marketPosition: String,
    growthTrends: [String]
  },
  
  // Strategy
  applicationStrategy: {
    whyInterested: { type: String, default: '' },
    keySellingPoints: [String],
    potentialConcerns: [String],
    uniqueValueProposition: { type: String, default: '' },
    researchCompleted: { type: Boolean, default: false },
    questionsForCompany: [String],
    negotiationStrategy: String,
    walkAwayPoint: Number,
    skillsMatch: [String],
    skillsToHighlight: [String],
    experienceGaps: [String],
    developmentOpportunities: [String]
  },
  
  // Tasks
  tasks: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['research', 'follow_up', 'preparation', 'networking', 'document_update', 'other'],
      default: 'other'
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    completedDate: Date,
    notes: String,
    createdDate: { type: Date, default: Date.now }
  }],
  
  // Metrics
  metrics: {
    applicationScore: { type: Number, default: 0, index: true },
    responseTime: Number,
    interviewConversionRate: Number,
    totalRounds: { type: Number, default: 0 },
    timeInPipeline: Number,
    lastAnalysisDate: Date,
    analysisVersion: String,
    successProbability: Number,
    recommendedActions: [String],
    competitiveAnalysis: {
      demandLevel: { type: String, enum: ['low', 'medium', 'high'] },
      competitionLevel: { type: String, enum: ['low', 'medium', 'high'] },
      marketSalary: Number,
      skillsInDemand: [String]
    }
  },
  
  // Organization
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'dream_job'],
    default: 'medium',
    index: true
  },
  tags: [String],
  category: String,
  archived: { type: Boolean, default: false, index: true },
  
  // Automation
  automation: {
    autoFollowUpEnabled: { type: Boolean, default: true },
    smartRemindersEnabled: { type: Boolean, default: true },
    emailTrackingEnabled: { type: Boolean, default: false },
    calendarIntegrationEnabled: { type: Boolean, default: false },
    aiCoachingEnabled: { type: Boolean, default: true },
    negotiationAssistanceEnabled: { type: Boolean, default: false },
    interviewPrepEnabled: { type: Boolean, default: true }
  },
  
  // Privacy
  privacy: {
    shareWithNetwork: { type: Boolean, default: false },
    shareWithMentors: { type: Boolean, default: false },
    allowRecruitersToSee: { type: Boolean, default: false },
    anonymizeData: { type: Boolean, default: true }
  }
  
}, {
  timestamps: true
});

// Comprehensive Indexing Strategy
JobApplicationSchema.index({ userId: 1, status: 1 });
JobApplicationSchema.index({ userId: 1, priority: 1 });
JobApplicationSchema.index({ userId: 1, applicationDate: -1 });
JobApplicationSchema.index({ userId: 1, archived: 1 });
JobApplicationSchema.index({ userId: 1, 'metrics.applicationScore': -1 });
JobApplicationSchema.index({ companyName: 1, jobTitle: 1 });
JobApplicationSchema.index({ jobSource: 1, applicationDate: -1 });
JobApplicationSchema.index({ 'interviews.scheduledDate': 1 });
JobApplicationSchema.index({ 'tasks.dueDate': 1, 'tasks.completed': 1 });

// Text Search
JobApplicationSchema.index({
  jobTitle: 'text',
  companyName: 'text',
  jobDescription: 'text',
  'applicationStrategy.whyInterested': 'text',
  tags: 'text'
}, {
  weights: {
    jobTitle: 10,
    companyName: 8,
    tags: 5,
    jobDescription: 3,
    'applicationStrategy.whyInterested': 2
  }
});

export const JobApplication = mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);