import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailOTP extends Document {
  email: string;
  otp: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  isUsed: boolean;
  purpose: 'login_verification' | 'password_reset' | 'email_change';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  verify(providedOTP: string): boolean;
}

const EmailOTPSchema = new Schema<IEmailOTP>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true,
    length: 6
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  purpose: {
    type: String,
    enum: ['login_verification', 'password_reset', 'email_change'],
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for security and performance
EmailOTPSchema.index({ email: 1, purpose: 1, isUsed: 1 });
EmailOTPSchema.index({ email: 1, createdAt: -1 });

// Method to generate OTP
EmailOTPSchema.statics.generateOTP = function(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Method to create new OTP (invalidates previous ones)
EmailOTPSchema.statics.createOTP = async function(
  email: string, 
  purpose: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<IEmailOTP> {
  // Invalidate any existing OTPs for this email and purpose
  await this.updateMany(
    { email, purpose, isUsed: false },
    { isUsed: true }
  );

  // Create new OTP
  const otp = this.generateOTP();
  return await this.create({
    email,
    otp,
    purpose,
    ipAddress,
    userAgent,
    attempts: 0,
    maxAttempts: 3,
    isUsed: false
  });
};

// Method to verify OTP
EmailOTPSchema.methods.verify = function(providedOTP: string): boolean {
  if (this.isUsed) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.attempts >= this.maxAttempts) return false;
  
  this.attempts += 1;
  
  if (this.otp === providedOTP) {
    this.isUsed = true;
    return true;
  }
  
  return false;
};

export const EmailOTP = mongoose.model<IEmailOTP>('EmailOTP', EmailOTPSchema);

// Traditional Email Verification Model (token-based)
export interface IEmailVerification extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  token: string;
  type: 'registration' | 'email_change';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailVerificationSchema = new Schema<IEmailVerification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['registration', 'email_change'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for security and performance
EmailVerificationSchema.index({ userId: 1, isUsed: 1 });
EmailVerificationSchema.index({ token: 1, isUsed: 1, expiresAt: 1 });
EmailVerificationSchema.index({ email: 1, createdAt: -1 });

export const EmailVerification = mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema);