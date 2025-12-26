import mongoose, { Document, Schema } from 'mongoose';

export interface IJobFeedback extends Document {
  jobId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  jobApplicationId?: mongoose.Types.ObjectId; // Optional link to tracker
  
  // Feedback Type
  feedbackType: 'response' | 'interview' | 'scam' | 'expired' | 'hired' | 'ghosted' | 'rejected' | 'payment_required';
  
  // Structured Questions
  isReal: boolean;
  isResponsive?: boolean;
  didInterview?: boolean;
  askedForMoney?: boolean;
  
  // Optional Text
  comment?: string;
  
  // Metadata for Weighting
  userWeightAtCreation: number; // Snapshot of user weight when review was made
  
  createdAt: Date;
  updatedAt: Date;
}

const JobFeedbackSchema = new Schema<IJobFeedback>({
  jobId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobApplicationId: { type: Schema.Types.ObjectId, ref: 'JobApplication' },
  
  feedbackType: { 
    type: String, 
    enum: ['response', 'interview', 'scam', 'expired', 'hired', 'ghosted', 'rejected', 'payment_required'],
    required: true 
  },
  
  isReal: { type: Boolean, required: true },
  isResponsive: { type: Boolean },
  didInterview: { type: Boolean },
  askedForMoney: { type: Boolean },
  
  comment: { type: String, maxlength: 500 },
  
  userWeightAtCreation: { type: Number, default: 1.0 }
}, {
  timestamps: true
});

// Prevent multiple reviews from same user for same job
JobFeedbackSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export const JobFeedback = mongoose.model<IJobFeedback>('JobFeedback', JobFeedbackSchema);
