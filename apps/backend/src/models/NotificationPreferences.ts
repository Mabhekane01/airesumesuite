import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationPreferences extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  
  // Global notification settings
  enabled: boolean;
  
  // Channel preferences
  channels: {
    inApp: boolean;      // In-app notifications (bell icon)
    email: boolean;      // Email notifications
    browser: boolean;    // Browser push notifications (future)
    mobile: boolean;     // Mobile push notifications (future)
  };
  
  // Category-specific preferences
  categories: {
    authentication: {
      enabled: boolean;
      channels: string[]; // ['inApp', 'email', 'browser', 'mobile']
      priority: 'low' | 'medium' | 'high';
    };
    payment: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
    resume: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
    application: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
    interview: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
    cover_letter: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
    career_coach: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
    system: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
  };
  
  // Timing preferences
  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string;   // "08:00"
    timezone: string;   // User's timezone
  };
  
  // Frequency limits
  dailyLimit: {
    enabled: boolean;
    maxNotifications: number;
  };
  
  // Summary preferences
  summaries: {
    daily: {
      enabled: boolean;
      time: string; // "09:00"
    };
    weekly: {
      enabled: boolean;
      day: number; // 1 = Monday, 7 = Sunday
      time: string;
    };
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateCategory(category: string, settings: { enabled?: boolean; channels?: string[]; priority?: string }): void;
}

const categoryPreferencesSchema = new Schema({
  enabled: { type: Boolean, default: true },
  channels: { 
    type: [String], 
    enum: ['inApp', 'email', 'browser', 'mobile'],
    default: ['inApp'] 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  }
}, { _id: false });

const NotificationPreferencesSchema = new Schema<INotificationPreferences>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    browser: { type: Boolean, default: false },
    mobile: { type: Boolean, default: false }
  },
  categories: {
    authentication: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp', 'email'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'high' 
      }
    },
    payment: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp', 'email'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'high' 
      }
    },
    resume: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
      }
    },
    application: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp', 'email'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'high' 
      }
    },
    interview: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp', 'email'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'high' 
      }
    },
    cover_letter: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
      }
    },
    career_coach: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
      }
    },
    system: {
      enabled: { type: Boolean, default: true },
      channels: { 
        type: [String], 
        enum: ['inApp', 'email', 'browser', 'mobile'],
        default: ['inApp'] 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'low' 
      }
    }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: "22:00" },
    endTime: { type: String, default: "08:00" },
    timezone: { type: String, default: "UTC" }
  },
  dailyLimit: {
    enabled: { type: Boolean, default: false },
    maxNotifications: { type: Number, default: 10, min: 1, max: 50 }
  },
  summaries: {
    daily: {
      enabled: { type: Boolean, default: false },
      time: { type: String, default: "09:00" }
    },
    weekly: {
      enabled: { type: Boolean, default: true },
      day: { type: Number, default: 1, min: 1, max: 7 }, // Monday
      time: { type: String, default: "09:00" }
    }
  }
}, {
  timestamps: true
});

// Static methods interface
interface INotificationPreferencesModel extends mongoose.Model<INotificationPreferences> {
  getOrCreateForUser(userId: mongoose.Types.ObjectId): Promise<INotificationPreferences>;
  shouldSendNotification(
    userId: mongoose.Types.ObjectId,
    category: string,
    channel?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<boolean>;
}

// Static methods
NotificationPreferencesSchema.statics.getOrCreateForUser = async function(userId: mongoose.Types.ObjectId) {
  let preferences = await this.findOne({ userId });
  
  if (!preferences) {
    preferences = await this.create({ userId });
  }
  
  return preferences;
};

NotificationPreferencesSchema.statics.shouldSendNotification = async function(
  userId: mongoose.Types.ObjectId,
  category: string,
  channel: string = 'inApp',
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
) {
  const preferences = await (this as any).getOrCreateForUser(userId);
  
  // For urgent notifications, bypass all checks
  if (priority === 'urgent') {
    return true;
  }
  
  // Check if notifications are globally enabled
  if (!preferences.enabled) return false;
  
  // Check if channel is enabled
  if (!preferences.channels[channel]) return false;
  
  // Check if category is enabled
  const categoryPrefs = preferences.categories[category];
  if (!categoryPrefs || !categoryPrefs.enabled) return false;
  
  // Check if channel is enabled for this category
  if (!categoryPrefs.channels.includes(channel)) return false;
  
  // Check quiet hours
  if (preferences.quietHours.enabled) {
    const now = new Date();
    const userTime = new Date(now.toLocaleString("en-US", { 
      timeZone: preferences.quietHours.timezone 
    }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const [startHour, startMinute] = preferences.quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHours.endTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTimeMinutes > endTimeMinutes) {
      if (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes) {
        return false;
      }
    } else {
      if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
        return false;
      }
    }
  }
  
  // Check daily limit
  if (preferences.dailyLimit.enabled) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const NotificationModel = mongoose.model('Notification');
    const todayCount = await NotificationModel.countDocuments({
      userId,
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    if (todayCount >= preferences.dailyLimit.maxNotifications) {
      return false;
    }
  }
  
  return true;
};

// Instance methods
NotificationPreferencesSchema.methods.updateCategory = function(
  category: string, 
  settings: { enabled?: boolean; channels?: string[]; priority?: string }
) {
  if (this.categories[category]) {
    Object.assign(this.categories[category], settings);
    this.markModified('categories');
  }
  return this.save();
};

export const NotificationPreferences = mongoose.model<INotificationPreferences, INotificationPreferencesModel>('NotificationPreferences', NotificationPreferencesSchema);