import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  googleId?: string;
  provider: 'local' | 'google';
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastKnownLocation?: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    timestamp: Date;
  };
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerificationAttempts?: number;
  tier?: string;
  subscription_status?: string;
  subscription_end_date?: Date;
  cancel_at_period_end?: boolean;
  subscription_plan_type?: string;
  profile?: any;
  profileViews?: number;
  searchRankingScore?: number;
  technicalSkills?: Array<{ name: string; level?: string; years?: number; }>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date
  },
  lastKnownLocation: {
    city: { type: String },
    country: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    timestamp: { type: Date }
  },
  googleId: {
    type: String,
    sparse: true
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  refreshTokens: [{
    type: String
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  twoFactorBackupCodes: [String],
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerificationAttempts: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    default: 'free'
  },
  subscription_status: {
    type: String,
    default: 'inactive'
  },
  profileViews: {
    type: Number,
    default: 0
  },
  searchRankingScore: {
    type: Number,
    default: 0
  },
  technicalSkills: [{
    name: String,
    level: String,
    years: Number
  }]
}, {
  timestamps: true
});


export const User = mongoose.model<IUser>('User', UserSchema);