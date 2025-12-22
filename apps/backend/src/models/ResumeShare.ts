import mongoose, { Document, Schema } from 'mongoose';

export interface IResumeShare extends Document {
  userId: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  shareId: string; // Unique slug for the share link
  title: string; // Internal name for this share (e.g. "Sent to Google")
  recipientEmail?: string;
  recipientName?: string;
  expiresAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
  downloadCount: number;
  lastDownloadedAt?: Date;
  status: 'active' | 'expired' | 'revoked';
  settings: {
    requireEmail: boolean;
    notifyOnView: boolean;
    allowDownload: boolean;
  };
  views: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    viewedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const resumeShareSchema = new Schema<IResumeShare>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    shareId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    recipientEmail: { type: String },
    recipientName: { type: String },
    expiresAt: { type: Date },
    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date },
    status: { 
      type: String, 
      enum: ['active', 'expired', 'revoked'], 
      default: 'active' 
    },
    settings: {
      requireEmail: { type: Boolean, default: false },
      notifyOnView: { type: Boolean, default: true },
      allowDownload: { type: Boolean, default: true }
    },
    views: [{
      ipAddress: String,
      userAgent: String,
      location: String,
      viewedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export const ResumeShare = mongoose.model<IResumeShare>('ResumeShare', resumeShareSchema);
