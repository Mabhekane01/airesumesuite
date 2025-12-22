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
  source: 'scraper' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  postedBy?: mongoose.Types.ObjectId;
  externalId?: string; // For scraped jobs to avoid duplicates
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
    source: { type: String, enum: ['scraper', 'user'], required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending',
      index: true 
    },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    externalId: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

// Compound index for efficient filtering
jobPostingSchema.index({ country: 1, status: 1, createdAt: -1 });

export const JobPosting = mongoose.model<IJobPosting>('JobPosting', jobPostingSchema);
