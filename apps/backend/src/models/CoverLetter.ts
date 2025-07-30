import mongoose, { Document, Schema } from 'mongoose';

export interface ICoverLetter extends Document {
  userId: mongoose.Types.ObjectId;
  resumeId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  jobDescription?: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  templateId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CoverLetterSchema = new Schema<ICoverLetter>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: Schema.Types.ObjectId,
    ref: 'Resume'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  jobUrl: {
    type: String
  },
  jobDescription: {
    type: String
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'enthusiastic', 'conservative'],
    default: 'professional'
  },
  templateId: {
    type: String,
    required: true,
    default: 'classic-1'
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

CoverLetterSchema.index({ userId: 1 });
CoverLetterSchema.index({ userId: 1, createdAt: -1 });

export const CoverLetter = mongoose.model<ICoverLetter>('CoverLetter', CoverLetterSchema);