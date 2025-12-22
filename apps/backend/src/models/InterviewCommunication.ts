import mongoose, { Document, Schema } from 'mongoose';

export interface IInterviewCommunication extends Document {
  interviewId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Message Details
  type: 'message' | 'email' | 'calendar_invite' | 'reminder' | 'confirmation' | 'reschedule' | 'cancellation' | 'follow_up';
  direction: 'inbound' | 'outbound';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'bounced';
  
  // Participants
  from: {
    name: string;
    email: string;
    role: 'candidate' | 'interviewer' | 'hr' | 'recruiter' | 'system';
    userId?: mongoose.Types.ObjectId;
  };
  
  to: {
    name: string;
    email: string;
    role: 'candidate' | 'interviewer' | 'hr' | 'recruiter';
    userId?: mongoose.Types.ObjectId;
  }[];
  
  cc?: {
    name: string;
    email: string;
    role?: string;
  }[];
  
  bcc?: {
    name: string;
    email: string;
    role?: string;
  }[];
  
  // Content
  subject?: string;
  body: string;
  htmlBody?: string;
  summary?: string; // AI-generated summary for long messages
  
  // Attachments
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }[];
  
  // Threading
  threadId?: string;
  parentMessageId?: mongoose.Types.ObjectId;
  isThreadStart: boolean;
  
  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  category?: string;
  
  // Email-specific
  emailHeaders?: {
    messageId?: string;
    inReplyTo?: string;
    references?: string[];
  };
  
  // Delivery tracking
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  repliedAt?: Date;
  
  // Template information
  templateId?: string;
  templateVariables?: Record<string, any>;
  isAutomated: boolean;
  automationTrigger?: string;
  
  // Integration data
  externalId?: string; // For email service provider ID
  externalPlatform?: 'gmail' | 'outlook' | 'sendgrid' | 'ses' | 'mailgun' | 'other';
  
  // Analytics
  openTracking?: {
    opened: boolean;
    openCount: number;
    firstOpenedAt?: Date;
    lastOpenedAt?: Date;
    openLocations?: string[];
  };
  
  clickTracking?: {
    links: {
      url: string;
      clickCount: number;
      firstClickedAt?: Date;
      lastClickedAt?: Date;
    }[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  _replyCount?: number;
}

const InterviewCommunicationSchema = new Schema<IInterviewCommunication>({
  interviewId: {
    type: Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Message Details
  type: {
    type: String,
    enum: ['message', 'email', 'calendar_invite', 'reminder', 'confirmation', 'reschedule', 'cancellation', 'follow_up'],
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'delivered', 'read', 'replied', 'failed', 'bounced'],
    default: 'draft',
    index: true
  },
  
  // Participants
  from: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ['candidate', 'interviewer', 'hr', 'recruiter', 'system'],
      required: true
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  
  to: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ['candidate', 'interviewer', 'hr', 'recruiter'],
      required: true
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  
  cc: [{
    name: String,
    email: String,
    role: String
  }],
  
  bcc: [{
    name: String,
    email: String,
    role: String
  }],
  
  // Content
  subject: {
    type: String,
    maxlength: 500
  },
  body: {
    type: String,
    required: true,
    maxlength: 10000
  },
  htmlBody: {
    type: String,
    maxlength: 50000
  },
  summary: {
    type: String,
    maxlength: 1000
  },
  
  // Attachments
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Threading
  threadId: {
    type: String,
    index: true
  },
  parentMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'InterviewCommunication'
  },
  isThreadStart: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  category: String,
  
  // Email-specific
  emailHeaders: {
    messageId: String,
    inReplyTo: String,
    references: [String]
  },
  
  // Delivery tracking
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  repliedAt: Date,
  
  // Template
  templateId: String,
  templateVariables: Schema.Types.Mixed,
  isAutomated: {
    type: Boolean,
    default: false
  },
  automationTrigger: String,
  
  // Integration
  externalId: String,
  externalPlatform: {
    type: String,
    enum: ['gmail', 'outlook', 'sendgrid', 'ses', 'mailgun', 'other']
  },
  
  // Analytics
  openTracking: {
    opened: { type: Boolean, default: false },
    openCount: { type: Number, default: 0 },
    firstOpenedAt: Date,
    lastOpenedAt: Date,
    openLocations: [String]
  },
  
  clickTracking: {
    links: [{
      url: { type: String, required: true },
      clickCount: { type: Number, default: 0 },
      firstClickedAt: Date,
      lastClickedAt: Date
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InterviewCommunicationSchema.index({ interviewId: 1, createdAt: -1 });
InterviewCommunicationSchema.index({ userId: 1, type: 1, createdAt: -1 });
InterviewCommunicationSchema.index({ threadId: 1, createdAt: 1 });
InterviewCommunicationSchema.index({ status: 1, sentAt: 1 });
InterviewCommunicationSchema.index({ 'from.email': 1, 'to.email': 1 });

// Virtual for thread messages
InterviewCommunicationSchema.virtual('threadMessages', {
  ref: 'InterviewCommunication',
  localField: 'threadId',
  foreignField: 'threadId',
  options: { sort: { createdAt: 1 } }
});

// Virtual for reply count in thread
InterviewCommunicationSchema.virtual('replyCount').get(function() {
  // This would be populated separately in the controller
  return this._replyCount || 0;
});

// Static methods
InterviewCommunicationSchema.statics.getThreadMessages = function(threadId: string) {
  return this.find({ threadId })
    .populate('from.userId', 'firstName lastName')
    .populate('to.userId', 'firstName lastName')
    .sort({ createdAt: 1 });
};

InterviewCommunicationSchema.statics.getConversationHistory = function(interviewId: string) {
  return this.find({ interviewId })
    .populate('from.userId', 'firstName lastName')
    .populate('to.userId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(50);
};

InterviewCommunicationSchema.statics.getPendingMessages = function() {
  return this.find({
    status: 'draft',
    sentAt: { $exists: false }
  }).populate('interviewId userId');
};

// Pre-save middleware
InterviewCommunicationSchema.pre('save', function(next) {
  // Generate thread ID if this is the start of a thread
  if (this.isNew && this.isThreadStart && !this.threadId) {
    this.threadId = `thread_${this.interviewId}_${Date.now()}`;
  }
  
  // Set thread ID from parent if replying
  if (this.parentMessageId && !this.threadId) {
    // This would need to be handled in the controller to lookup parent's threadId
  }
  
  // Set sent timestamp when status changes to sent
  if (this.isModified('status') && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  
  next();
});

export const InterviewCommunication = mongoose.model<IInterviewCommunication>('InterviewCommunication', InterviewCommunicationSchema);