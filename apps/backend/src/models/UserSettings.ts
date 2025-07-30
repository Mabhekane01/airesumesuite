import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  notifications: {
    email: boolean;
    push: boolean;
    frequency: string;
  };
  privacy: {
    profileVisible: boolean;
    dataSharing: boolean;
  };
  preferences: {
    theme: string;
    language: string;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    frequency: { type: String, default: 'daily', enum: ['immediate', 'daily', 'weekly', 'never'] }
  },
  privacy: {
    profileVisible: { type: Boolean, default: true },
    dataSharing: { type: Boolean, default: false }
  },
  preferences: {
    theme: { type: String, default: 'dark', enum: ['light', 'dark', 'auto'] },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
  }
}, {
  timestamps: true
});

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);

// Enhanced User Profile interface (placeholder)
export interface IEnhancedUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  profile: any;
  settings: any;
  analytics: any;
  createdAt: Date;
  updatedAt: Date;
}

const EnhancedUserProfileSchema = new Schema<IEnhancedUserProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  profile: { type: Schema.Types.Mixed, default: {} },
  settings: { type: Schema.Types.Mixed, default: {} },
  analytics: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

export const EnhancedUserProfile = mongoose.model<IEnhancedUserProfile>('EnhancedUserProfile', EnhancedUserProfileSchema);