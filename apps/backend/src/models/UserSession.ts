import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  loginTime: Date;
  logoutTime?: Date;
  location: {
    city?: string;
    country?: string;
    region?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    ipAddress?: string;
    timezone?: string;
  };
  userAgent: {
    browser?: string;
    os?: string;
    device?: string;
  };
  isActive: boolean;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  loginTime: {
    type: Date,
    required: true,
    index: true
  },
  logoutTime: {
    type: Date,
    index: true
  },
  location: {
    city: { type: String },
    country: { type: String, index: true },
    region: { type: String },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    ipAddress: { type: String },
    timezone: { type: String }
  },
  userAgent: {
    browser: { type: String },
    os: { type: String },
    device: { type: String }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  refreshTokens: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
UserSessionSchema.index({ userId: 1, isActive: 1 });
UserSessionSchema.index({ loginTime: -1 });
UserSessionSchema.index({ 'location.country': 1, 'location.city': 1 });
UserSessionSchema.index({ sessionId: 1, isActive: 1 });

// Virtual to get session duration
UserSessionSchema.virtual('sessionDuration').get(function() {
  if (this.logoutTime) {
    return this.logoutTime.getTime() - this.loginTime.getTime();
  }
  return Date.now() - this.loginTime.getTime();
});

// Static method to get active sessions by location
UserSessionSchema.statics.getActiveSessionsByLocation = function() {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        'location.country': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          city: '$location.city',
          country: '$location.country'
        },
        userCount: { $addToSet: '$userId' },
        sessionCount: { $sum: 1 },
        latestLogin: { $max: '$loginTime' }
      }
    },
    {
      $project: {
        location: {
          city: '$_id.city',
          country: '$_id.country'
        },
        uniqueUsers: { $size: '$userCount' },
        sessionCount: 1,
        latestLogin: 1
      }
    },
    {
      $sort: { uniqueUsers: -1 }
    }
  ]);
};

// Static method to get location analytics for salary data
UserSessionSchema.statics.getLocationAnalytics = function(timeRange: number = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        loginTime: { $gte: startDate },
        'location.country': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          city: '$location.city',
          country: '$location.country'
        },
        uniqueUsers: { $addToSet: '$userId' },
        totalSessions: { $sum: 1 },
        averageCoordinates: {
          $avg: {
            latitude: '$location.coordinates.latitude',
            longitude: '$location.coordinates.longitude'
          }
        },
        firstSeen: { $min: '$loginTime' },
        lastSeen: { $max: '$loginTime' }
      }
    },
    {
      $project: {
        location: {
          city: '$_id.city',
          country: '$_id.country',
          coordinates: '$averageCoordinates'
        },
        userCount: { $size: '$uniqueUsers' },
        sessionCount: '$totalSessions',
        activityLevel: {
          $divide: ['$totalSessions', { $size: '$uniqueUsers' }]
        },
        timespan: {
          $subtract: ['$lastSeen', '$firstSeen']
        }
      }
    },
    {
      $sort: { userCount: -1 }
    }
  ]);
};

// Static method to get user's recent locations
UserSessionSchema.statics.getUserRecentLocations = function(userId: mongoose.Types.ObjectId, limit: number = 5) {
  return this.find({
    userId,
    'location.country': { $exists: true, $ne: null }
  })
  .sort({ loginTime: -1 })
  .limit(limit)
  .select('location loginTime')
  .lean();
};

// Method to end session
UserSessionSchema.methods.endSession = function() {
  this.isActive = false;
  this.logoutTime = new Date();
  return this.save();
};

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);