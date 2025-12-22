import mongoose, { Document, Schema } from 'mongoose';

export interface IInterview extends Document {
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  
  // Basic Interview Information
  title: string;
  type: 'phone' | 'video' | 'on_site' | 'technical' | 'behavioral' | 'case_study' | 'presentation' | 'panel' | 'final' | 'hr_screen';
  round: number;
  scheduledDate: Date;
  endDate: Date;
  duration: number; // in minutes
  timezone: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show' | 'pending_confirmation';
  
  // Location & Meeting Details
  location?: {
    type: 'virtual' | 'on_site' | 'phone';
    address?: string;
    building?: string;
    room?: string;
    floor?: string;
    instructions?: string;
    parkingInfo?: string;
  };
  
  meetingDetails?: {
    platform?: 'zoom' | 'teams' | 'google_meet' | 'webex' | 'phone' | 'other';
    meetingUrl?: string;
    meetingId?: string;
    passcode?: string;
    dialInNumber?: string;
    accessCode?: string;
    waitingRoom?: boolean;
  };
  
  // Participants
  interviewers: {
    name: string;
    title: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    department?: string;
    bio?: string;
    isLead?: boolean;
  }[];
  
  // Preparation & Content
  preparationMaterials?: {
    documents?: string[];
    websites?: string[];
    portfolioRequests?: string[];
    technicalRequirements?: string[];
    questionsToAsk?: string[];
    researchNotes?: string;
  };
  
  agenda?: {
    items: {
      topic: string;
      duration: number;
      presenter?: string;
      notes?: string;
    }[];
    totalDuration: number;
  };
  
  // Post-Interview
  feedback?: {
    overallRating?: number; // 1-5
    technicalSkills?: number;
    communicationSkills?: number;
    culturalFit?: number;
    problemSolving?: number;
    leadership?: number;
    notes?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
    nextRoundRecommendation?: string;
  };
  
  followUp?: {
    thankYouSent?: boolean;
    thankYouSentDate?: Date;
    followUpNotes?: string;
    nextSteps?: string;
    expectedDecisionDate?: Date;
    actualDecisionDate?: Date;
    decision?: 'passed' | 'rejected' | 'pending';
  };
  
  // Notification & Reminder Settings
  notifications: {
    emailConfirmationSent: boolean;
    calendarInviteSent: boolean;
    reminders: {
      oneDayBefore: { sent: boolean; sentAt?: Date };
      fourHoursBefore: { sent: boolean; sentAt?: Date };
      oneHourBefore: { sent: boolean; sentAt?: Date };
      fifteenMinsBefore: { sent: boolean; sentAt?: Date };
    };
    followUpReminders: {
      thankYou: { sent: boolean; sentAt?: Date };
      decisionFollowUp: { sent: boolean; sentAt?: Date };
    };
  };
  
  // Calendar Integration
  calendar: {
    icsFileGenerated: boolean;
    icsFileUrl?: string;
    googleCalendarEventId?: string;
    outlookEventId?: string;
    calendarPlatform?: 'google' | 'outlook' | 'apple' | 'other';
    attendeeResponses?: {
      email: string;
      status: 'accepted' | 'declined' | 'tentative' | 'pending';
    }[];
  };
  
  // Metadata
  source?: 'manual' | 'calendar_import' | 'email_integration' | 'ats_import';
  isRecurring?: boolean;
  parentInterviewId?: mongoose.Types.ObjectId;
  version: number; // For tracking rescheduling history
  
  // Audit Trail
  history: {
    action: 'created' | 'updated' | 'rescheduled' | 'cancelled' | 'completed';
    timestamp: Date;
    userId: mongoose.Types.ObjectId;
    details?: string;
    previousData?: any;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true,
    index: true
  },
  
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['phone', 'video', 'on_site', 'technical', 'behavioral', 'case_study', 'presentation', 'panel', 'final', 'hr_screen'],
    required: true,
    index: true
  },
  round: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 15,
    max: 480 // 8 hours max
  },
  timezone: {
    type: String,
    required: true,
    default: 'America/New_York'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show', 'pending_confirmation'],
    default: 'scheduled',
    index: true
  },
  
  // Location
  location: {
    type: {
      type: String,
      enum: ['virtual', 'on_site', 'phone']
    },
    address: String,
    building: String,
    room: String,
    floor: String,
    instructions: String,
    parkingInfo: String
  },
  
  // Meeting Details
  meetingDetails: {
    platform: {
      type: String,
      enum: ['zoom', 'teams', 'google_meet', 'webex', 'phone', 'other']
    },
    meetingUrl: String,
    meetingId: String,
    passcode: String,
    dialInNumber: String,
    accessCode: String,
    waitingRoom: { type: Boolean, default: false }
  },
  
  // Participants
  interviewers: [{
    name: { type: String, required: true },
    title: String,
    email: String,
    phone: String,
    linkedinUrl: String,
    department: String,
    bio: String,
    isLead: { type: Boolean, default: false }
  }],
  
  // Preparation
  preparationMaterials: {
    documents: [String],
    websites: [String],
    portfolioRequests: [String],
    technicalRequirements: [String],
    questionsToAsk: [String],
    researchNotes: String
  },
  
  agenda: {
    items: [{
      topic: { type: String, required: true },
      duration: { type: Number, required: true },
      presenter: String,
      notes: String
    }],
    totalDuration: Number
  },
  
  // Feedback
  feedback: {
    overallRating: { type: Number, min: 1, max: 5 },
    technicalSkills: { type: Number, min: 1, max: 5 },
    communicationSkills: { type: Number, min: 1, max: 5 },
    culturalFit: { type: Number, min: 1, max: 5 },
    problemSolving: { type: Number, min: 1, max: 5 },
    leadership: { type: Number, min: 1, max: 5 },
    notes: String,
    strengths: [String],
    weaknesses: [String],
    recommendation: {
      type: String,
      enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire']
    },
    nextRoundRecommendation: String
  },
  
  followUp: {
    thankYouSent: { type: Boolean, default: false },
    thankYouSentDate: Date,
    followUpNotes: String,
    nextSteps: String,
    expectedDecisionDate: Date,
    actualDecisionDate: Date,
    decision: {
      type: String,
      enum: ['passed', 'rejected', 'pending']
    }
  },
  
  // Notifications
  notifications: {
    emailConfirmationSent: { type: Boolean, default: false },
    calendarInviteSent: { type: Boolean, default: false },
    reminders: {
      oneDayBefore: {
        sent: { type: Boolean, default: false },
        sentAt: Date
      },
      fourHoursBefore: {
        sent: { type: Boolean, default: false },
        sentAt: Date
      },
      oneHourBefore: {
        sent: { type: Boolean, default: false },
        sentAt: Date
      },
      fifteenMinsBefore: {
        sent: { type: Boolean, default: false },
        sentAt: Date
      }
    },
    followUpReminders: {
      thankYou: {
        sent: { type: Boolean, default: false },
        sentAt: Date
      },
      decisionFollowUp: {
        sent: { type: Boolean, default: false },
        sentAt: Date
      }
    }
  },
  
  // Calendar
  calendar: {
    icsFileGenerated: { type: Boolean, default: false },
    icsFileUrl: String,
    googleCalendarEventId: String,
    outlookEventId: String,
    calendarPlatform: {
      type: String,
      enum: ['google', 'outlook', 'apple', 'other']
    },
    attendeeResponses: [{
      email: { type: String, required: true },
      status: {
        type: String,
        enum: ['accepted', 'declined', 'tentative', 'pending'],
        default: 'pending'
      }
    }]
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['manual', 'calendar_import', 'email_integration', 'ats_import'],
    default: 'manual'
  },
  isRecurring: { type: Boolean, default: false },
  parentInterviewId: { type: Schema.Types.ObjectId, ref: 'Interview' },
  version: { type: Number, default: 1 },
  
  // History
  history: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'rescheduled', 'cancelled', 'completed'],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    details: String,
    previousData: Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InterviewSchema.index({ userId: 1, scheduledDate: 1 });
InterviewSchema.index({ userId: 1, status: 1 });
InterviewSchema.index({ scheduledDate: 1, status: 1 });
InterviewSchema.index({ userId: 1, applicationId: 1 });
InterviewSchema.index({ 'notifications.reminders.oneDayBefore.sent': 1, scheduledDate: 1 });
InterviewSchema.index({ 'notifications.reminders.fourHoursBefore.sent': 1, scheduledDate: 1 });
InterviewSchema.index({ 'notifications.reminders.oneHourBefore.sent': 1, scheduledDate: 1 });
InterviewSchema.index({ 'notifications.reminders.fifteenMinsBefore.sent': 1, scheduledDate: 1 });

// Virtual for checking if interview is upcoming
InterviewSchema.virtual('isUpcoming').get(function() {
  return this.scheduledDate > new Date() && ['scheduled', 'confirmed'].includes(this.status);
});

// Virtual for checking if interview is today
InterviewSchema.virtual('isToday').get(function() {
  const today = new Date();
  const interviewDate = new Date(this.scheduledDate);
  return interviewDate.toDateString() === today.toDateString();
});

// Virtual for getting time until interview
InterviewSchema.virtual('timeUntilInterview').get(function() {
  const now = new Date();
  const timeDiff = this.scheduledDate.getTime() - now.getTime();
  
  if (timeDiff <= 0) return 'Past';
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Static methods
InterviewSchema.statics.getUpcomingInterviews = function(userId: string, days = 30) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    scheduledDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['scheduled', 'confirmed'] }
  })
  .populate('applicationId', 'jobTitle companyName')
  .sort({ scheduledDate: 1 });
};

InterviewSchema.statics.getInterviewsNeedingReminders = function() {
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);
  
  return {
    oneDayBefore: this.find({
      scheduledDate: { $gte: now, $lte: oneDayFromNow },
      status: { $in: ['scheduled', 'confirmed'] },
      'notifications.reminders.oneDayBefore.sent': false
    }).populate('userId applicationId'),
    
    fourHoursBefore: this.find({
      scheduledDate: { $gte: now, $lte: fourHoursFromNow },
      status: { $in: ['scheduled', 'confirmed'] },
      'notifications.reminders.fourHoursBefore.sent': false
    }).populate('userId applicationId'),
    
    oneHourBefore: this.find({
      scheduledDate: { $gte: now, $lte: oneHourFromNow },
      status: { $in: ['scheduled', 'confirmed'] },
      'notifications.reminders.oneHourBefore.sent': false
    }).populate('userId applicationId'),
    
    fifteenMinsBefore: this.find({
      scheduledDate: { $gte: now, $lte: fifteenMinsFromNow },
      status: { $in: ['scheduled', 'confirmed'] },
      'notifications.reminders.fifteenMinsBefore.sent': false
    }).populate('userId applicationId')
  };
};

// Pre-save middleware to calculate endDate and validate
InterviewSchema.pre('save', function(next) {
  if (this.isModified('scheduledDate') || this.isModified('duration')) {
    this.endDate = new Date(this.scheduledDate.getTime() + this.duration * 60 * 1000);
  }
  
  // Auto-generate title if not provided
  if (!this.title && this.type && this.round) {
    this.title = `${this.type.charAt(0).toUpperCase() + this.type.slice(1)} Interview - Round ${this.round}`;
  }
  
  next();
});

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);