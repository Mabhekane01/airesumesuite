import mongoose, { Document, Schema } from 'mongoose';

export interface IInterviewTask extends Document {
  interviewId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Task Details
  title: string;
  description?: string;
  type: 'preparation' | 'research' | 'practice' | 'documentation' | 'follow_up' | 'reminder' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  
  // Timing
  dueDate?: Date;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  completedAt?: Date;
  
  // Assignment
  assignedTo?: 'candidate' | 'interviewer' | 'hr' | 'recruiter';
  assignedBy: mongoose.Types.ObjectId;
  
  // Content
  checklist?: {
    item: string;
    completed: boolean;
    completedAt?: Date;
  }[];
  
  attachments?: {
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }[];
  
  links?: {
    title: string;
    url: string;
    description?: string;
  }[];
  
  // Automation
  isAutomated: boolean;
  automationTrigger?: 'interview_scheduled' | 'interview_confirmed' | 'interview_completed' | 'time_based';
  reminderSettings?: {
    enabled: boolean;
    intervals: number[]; // minutes before due date
    sent: { interval: number; sentAt: Date }[];
  };
  
  // Dependencies
  dependsOn?: mongoose.Types.ObjectId[]; // other task IDs
  blockedBy?: mongoose.Types.ObjectId[]; // other task IDs
  
  // Progress Tracking
  progress: number; // 0-100
  notes?: string;
  
  // Metadata
  tags: string[];
  category?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InterviewTaskSchema = new Schema<IInterviewTask>({
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
  
  // Task Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['preparation', 'research', 'practice', 'documentation', 'follow_up', 'reminder', 'custom'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'],
    default: 'pending',
    index: true
  },
  
  // Timing
  dueDate: {
    type: Date,
    index: true
  },
  estimatedDuration: {
    type: Number,
    min: 1,
    max: 1440 // 24 hours max
  },
  actualDuration: {
    type: Number,
    min: 1
  },
  completedAt: {
    type: Date
  },
  
  // Assignment
  assignedTo: {
    type: String,
    enum: ['candidate', 'interviewer', 'hr', 'recruiter']
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content
  checklist: [{
    item: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  links: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  
  // Automation
  isAutomated: {
    type: Boolean,
    default: false
  },
  automationTrigger: {
    type: String,
    enum: ['interview_scheduled', 'interview_confirmed', 'interview_completed', 'time_based']
  },
  reminderSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    intervals: [Number], // minutes before due date
    sent: [{
      interval: Number,
      sentAt: Date
    }]
  },
  
  // Dependencies
  dependsOn: [{
    type: Schema.Types.ObjectId,
    ref: 'InterviewTask'
  }],
  blockedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'InterviewTask'
  }],
  
  // Progress
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InterviewTaskSchema.index({ interviewId: 1, status: 1 });
InterviewTaskSchema.index({ userId: 1, dueDate: 1 });
InterviewTaskSchema.index({ userId: 1, status: 1, priority: 1 });
InterviewTaskSchema.index({ dueDate: 1, status: 1 });
InterviewTaskSchema.index({ type: 1, assignedTo: 1 });

// Virtual for checking if task is overdue
InterviewTaskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

// Virtual for time until due
InterviewTaskSchema.virtual('timeUntilDue').get(function() {
  if (!this.dueDate) return null;
  
  const now = new Date();
  const timeDiff = this.dueDate.getTime() - now.getTime();
  
  if (timeDiff <= 0) return 'Overdue';
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Virtual for completion percentage from checklist
InterviewTaskSchema.virtual('checklistCompletion').get(function() {
  if (!this.checklist || this.checklist.length === 0) return null;
  
  const completed = this.checklist.filter(item => item.completed).length;
  return Math.round((completed / this.checklist.length) * 100);
});

// Static method to get tasks needing reminders
InterviewTaskSchema.statics.getTasksNeedingReminders = function() {
  const now = new Date();
  
  return this.find({
    dueDate: { $exists: true },
    status: { $in: ['pending', 'in_progress'] },
    'reminderSettings.enabled': true,
    $expr: {
      $and: [
        { $gt: ['$dueDate', now] },
        {
          $or: [
            { $eq: [{ $size: '$reminderSettings.sent' }, 0] },
            {
              $anyElementTrue: {
                $map: {
                  input: '$reminderSettings.intervals',
                  as: 'interval',
                  in: {
                    $and: [
                      { $lte: [{ $subtract: ['$dueDate', { $multiply: ['$$interval', 60000] }] }, now] },
                      {
                        $not: {
                          $in: ['$$interval', '$reminderSettings.sent.interval']
                        }
                      }
                    ]
                  }
                }
              }
            }
          ]
        }
      ]
    }
  }).populate('interviewId userId');
};

// Pre-save middleware
InterviewTaskSchema.pre('save', function(next) {
  // Auto-update status to overdue if past due date
  if (this.dueDate && new Date() > this.dueDate && this.status === 'pending') {
    this.status = 'overdue';
  }
  
  // Set completed date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
    this.progress = 100;
  }
  
  // Update progress based on checklist if available
  if (this.checklist && this.checklist.length > 0) {
    const completed = this.checklist.filter(item => item.completed).length;
    this.progress = Math.round((completed / this.checklist.length) * 100);
  }
  
  next();
});

export const InterviewTask = mongoose.model<IInterviewTask>('InterviewTask', InterviewTaskSchema);