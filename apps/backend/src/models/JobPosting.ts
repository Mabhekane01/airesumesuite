import mongoose, { Document, Schema } from 'mongoose';

export interface IJobPosting extends Document {
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  url?: string;
  salaryRange?: string;
  jobType?: string; // Full-time, Part-time, Contract
  source: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  postedBy: mongoose.Types.ObjectId;
  jobApplicationId?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;
  authenticityScore: number;
  trustBadges: string[];
  reviewCount: number;
  lastReviewDate?: Date;
  isLocked: boolean;
  postedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobPostingSchema = new Schema<IJobPosting>(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    country: { type: String, required: true, index: true },
    description: { type: String, required: true },
    url: { type: String },
    salaryRange: { type: String },
    jobType: { type: String },
    postedDate: { type: Date },
    source: { type: String, enum: ['user', 'admin'], required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'applied'], 
      default: 'pending',
      index: true 
    },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobApplicationId: { type: Schema.Types.ObjectId, ref: 'JobApplication' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verificationNotes: { type: String },
    
    // Authenticity & Trust
    authenticityScore: { type: Number, default: 50, min: 0, max: 100, index: true },
    trustBadges: { type: [String], default: [] },
    reviewCount: { type: Number, default: 0 },
    lastReviewDate: { type: Date },
    isLocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound index for efficient filtering
jobPostingSchema.index({ country: 1, status: 1, createdAt: -1 });

export const JobPosting = mongoose.model<IJobPosting>('JobPosting', jobPostingSchema);
