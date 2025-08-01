import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  type: 'success' | 'info' | 'warning' | 'error' | 'deadline';
  category: 'authentication' | 'payment' | 'resume' | 'application' | 'interview' | 'cover_letter' | 'career_coach' | 'system';
  title: string;
  message: string;
  read: boolean;
  readAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  // Action button for interactive notifications
  action?: {
    label: string;
    url: string;
    type: 'internal' | 'external'; // internal for SPA navigation, external for new tab
  };
  // Rich metadata for context
  metadata?: {
    entityType?: 'resume' | 'application' | 'interview' | 'payment' | 'user';
    entityId?: string;
    source?: string; // Which service/controller triggered this
    additionalData?: Record<string, any>;
  };
  // Auto-expiry for temporary notifications
  expiresAt?: Date;
  // Delivery tracking
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveryAttempts: number;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for efficient user queries
  },
  type: {
    type: String,
    enum: ['success', 'info', 'warning', 'error', 'deadline'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['authentication', 'payment', 'resume', 'application', 'interview', 'cover_letter', 'career_coach', 'system'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  action: {
    label: {
      type: String,
      maxlength: 100,
      trim: true
    },
    url: {
      type: String,
      maxlength: 500,
      trim: true
    },
    type: {
      type: String,
      enum: ['internal', 'external'],
      default: 'internal'
    }
  },
  metadata: {
    entityType: {
      type: String,
      enum: ['resume', 'application', 'interview', 'payment', 'user']
    },
    entityId: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      trim: true
    },
    additionalData: {
      type: Schema.Types.Mixed
    }
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for auto-cleanup
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending',
    index: true
  },
  deliveryAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 }); // Unread notifications by user
NotificationSchema.index({ userId: 1, category: 1, createdAt: -1 }); // Notifications by category
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 }); // Notifications by type
NotificationSchema.index({ userId: 1, priority: 1, createdAt: -1 }); // Priority notifications
NotificationSchema.index({ createdAt: -1 }); // Recent notifications for admin
NotificationSchema.index({ deliveryStatus: 1, deliveryAttempts: 1 }); // Failed delivery tracking

// CRITICAL: Duplicate prevention indexes
NotificationSchema.index(
  { 
    userId: 1, 
    title: 1, 
    message: 1,
    category: 1,
    createdAt: 1 
  }, 
  { 
    unique: true,
    expireAfterSeconds: 300, // Prevent duplicates within 5 minutes
    name: 'prevent_duplicate_notifications'
  }
);

// Entity-based deduplication for resume/application notifications
NotificationSchema.index(
  {
    userId: 1,
    category: 1,
    'metadata.entityType': 1,
    'metadata.entityId': 1
  },
  {
    unique: true,
    partialFilterExpression: { 
      'metadata.entityId': { $exists: true },
      'metadata.entityType': { $exists: true }
    },
    name: 'prevent_entity_duplicate_notifications'
  }
);

// Pre-save middleware to set delivered status
NotificationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.deliveryStatus = 'delivered';
    this.deliveryAttempts = 1;
    this.deliveredAt = new Date();
  }
  next();
});

// Instance methods
NotificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Static methods
NotificationSchema.statics.getUnreadCount = function(userId: mongoose.Types.ObjectId) {
  return this.countDocuments({ userId, read: false });
};

NotificationSchema.statics.markAllAsRead = function(userId: mongoose.Types.ObjectId) {
  return this.updateMany(
    { userId, read: false },
    { 
      $set: { 
        read: true, 
        readAt: new Date() 
      } 
    }
  );
};

NotificationSchema.statics.getRecentNotifications = function(
  userId: mongoose.Types.ObjectId, 
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

NotificationSchema.statics.getNotificationsByCategory = function(
  userId: mongoose.Types.ObjectId,
  category: string,
  limit: number = 20
) {
  return this.find({ userId, category })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

NotificationSchema.statics.cleanupExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

NotificationSchema.statics.getFailedDeliveries = function() {
  return this.find({
    deliveryStatus: 'failed',
    deliveryAttempts: { $lt: 3 } // Retry up to 3 times
  });
};

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);