import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  // Application Configuration
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  
  // Feature Flags
  features: {
    aiResumeBuilder: boolean;
    coverLetterGenerator: boolean;
    jobScraping: boolean;
    careerCoach: boolean;
    advancedAnalytics: boolean;
    enterpriseFeatures: boolean;
    multiLanguageSupport: boolean;
    realTimeNotifications: boolean;
    apiAccess: boolean;
    customBranding: boolean;
  };
  
  // Rate Limiting & Performance
  rateLimiting: {
    globalEnabled: boolean;
    authEndpoints: {
      windowMs: number;
      max: number;
    };
    apiEndpoints: {
      windowMs: number;
      max: number;
    };
    fileUpload: {
      windowMs: number;
      max: number;
      maxFileSize: number; // in bytes
    };
    aiServices: {
      windowMs: number;
      max: number;
      costLimitPerUser: number; // in USD
    };
  };
  
  // Security Configuration
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      preventCommonPasswords: boolean;
      passwordHistory: number;
    };
    sessionConfig: {
      maxConcurrentSessions: number;
      sessionTimeout: number; // in minutes
      refreshTokenExpiry: number; // in days
      rememberMeExpiry: number; // in days
    };
    twoFactorAuth: {
      enabled: boolean;
      required: boolean;
      backupCodesCount: number;
      issuerName: string;
    };
    ipWhitelist: string[];
    suspiciousActivityThreshold: number;
    accountLockoutAttempts: number;
    accountLockoutDuration: number; // in minutes
  };
  
  // Email & Communication
  email: {
    provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
    templates: {
      welcome: boolean;
      passwordReset: boolean;
      emailVerification: boolean;
      twoFactorCode: boolean;
      jobAlerts: boolean;
      weeklyDigest: boolean;
      securityAlert: boolean;
    };
    rateLimits: {
      verificationEmails: number;
      passwordResetEmails: number;
      jobAlerts: number;
    };
    fromAddress: string;
    fromName: string;
  };
  
  // File Management
  fileManagement: {
    allowedTypes: string[];
    maxFileSize: number; // in bytes
    maxFilesPerUser: number;
    virusScanEnabled: boolean;
    compressionEnabled: boolean;
    cdnEnabled: boolean;
    retentionPeriod: number; // in days
    encryptionEnabled: boolean;
  };
  
  // AI Services Configuration
  aiServices: {
    providers: {
      openai: {
        enabled: boolean;
        models: string[];
        maxTokens: number;
        temperature: number;
        costPerToken: number;
      };
      anthropic: {
        enabled: boolean;
        models: string[];
        maxTokens: number;
        temperature: number;
        costPerToken: number;
      };
      google: {
        enabled: boolean;
        models: string[];
        maxTokens: number;
        temperature: number;
        costPerToken: number;
      };
    };
    fallbackEnabled: boolean;
    cachingEnabled: boolean;
    contentFiltering: boolean;
    usageTracking: boolean;
    costAlerts: {
      enabled: boolean;
      thresholds: number[];
    };
  };
  
  // Analytics & Monitoring
  analytics: {
    enabled: boolean;
    providers: ('google' | 'mixpanel' | 'amplitude' | 'custom')[];
    retention: number; // in days
    realTimeEnabled: boolean;
    userTrackingEnabled: boolean;
    performanceMonitoring: boolean;
    errorTracking: boolean;
    customEvents: boolean;
  };
  
  // Compliance & Privacy
  compliance: {
    gdprEnabled: boolean;
    ccpaEnabled: boolean;
    coppaEnabled: boolean;
    dataRetentionPeriod: number; // in days
    anonymizeAfterDeletion: boolean;
    auditLogsEnabled: boolean;
    auditLogRetention: number; // in days
    privacyPolicyVersion: string;
    termsOfServiceVersion: string;
    cookieConsentRequired: boolean;
  };
  
  // Enterprise Features
  enterprise: {
    ssoEnabled: boolean;
    ssoProviders: ('google' | 'microsoft' | 'okta' | 'saml')[];
    teamManagement: boolean;
    roleBasedAccess: boolean;
    customDomains: boolean;
    whiteLabeling: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    slaGuarantee: number; // uptime percentage
    customIntegrations: boolean;
  };
  
  // Job Board Integration
  jobBoards: {
    indeed: {
      enabled: boolean;
      apiKey?: string;
      rateLimits: {
        searchRequests: number;
        applicationRequests: number;
      };
    };
    linkedin: {
      enabled: boolean;
      apiKey?: string;
      rateLimits: {
        searchRequests: number;
        profileRequests: number;
      };
    };
    glassdoor: {
      enabled: boolean;
      apiKey?: string;
      rateLimits: {
        companyRequests: number;
        reviewRequests: number;
      };
    };
    customBoards: {
      name: string;
      apiEndpoint: string;
      authMethod: 'api_key' | 'oauth' | 'basic';
      enabled: boolean;
    }[];
  };
  
  // Notification System
  notifications: {
    pushNotifications: {
      enabled: boolean;
      provider: 'firebase' | 'pusher' | 'custom';
      batchingEnabled: boolean;
      quietHours: {
        enabled: boolean;
        startTime: string; // HH:mm format
        endTime: string; // HH:mm format
        timezone: string;
      };
    };
    emailNotifications: {
      enabled: boolean;
      digestEnabled: boolean;
      digestFrequency: 'daily' | 'weekly' | 'monthly';
      instantNotifications: string[];
    };
    smsNotifications: {
      enabled: boolean;
      provider: 'twilio' | 'nexmo' | 'custom';
      urgentOnly: boolean;
    };
  };
  
  // Backup & Recovery
  backup: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    retention: number; // in days
    encryptionEnabled: boolean;
    offSiteBackup: boolean;
    testRestoreFrequency: 'weekly' | 'monthly' | 'quarterly';
    lastSuccessfulBackup?: Date;
    lastTestedRestore?: Date;
  };
  
  // Performance & Caching
  performance: {
    caching: {
      redis: {
        enabled: boolean;
        ttl: number; // in seconds
        maxMemory: string;
        evictionPolicy: string;
      };
      cdn: {
        enabled: boolean;
        provider: 'cloudflare' | 'aws' | 'azure' | 'custom';
        cacheTtl: number;
      };
      databaseQuery: {
        enabled: boolean;
        ttl: number;
      };
    };
    optimization: {
      compressionEnabled: boolean;
      minificationEnabled: boolean;
      imageOptimization: boolean;
      lazyLoadingEnabled: boolean;
    };
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  configVersion: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  appName: {
    type: String,
    required: true,
    default: 'AI Job Suite'
  },
  
  appVersion: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    required: true,
    default: 'development'
  },
  
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  
  maintenanceMessage: String,
  
  features: {
    aiResumeBuilder: { type: Boolean, default: true },
    coverLetterGenerator: { type: Boolean, default: true },
    jobScraping: { type: Boolean, default: true },
    careerCoach: { type: Boolean, default: true },
    advancedAnalytics: { type: Boolean, default: false },
    enterpriseFeatures: { type: Boolean, default: false },
    multiLanguageSupport: { type: Boolean, default: false },
    realTimeNotifications: { type: Boolean, default: true },
    apiAccess: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false }
  },
  
  rateLimiting: {
    globalEnabled: { type: Boolean, default: true },
    authEndpoints: {
      windowMs: { type: Number, default: 900000 }, // 15 minutes
      max: { type: Number, default: 5 }
    },
    apiEndpoints: {
      windowMs: { type: Number, default: 60000 }, // 1 minute
      max: { type: Number, default: 100 }
    },
    fileUpload: {
      windowMs: { type: Number, default: 3600000 }, // 1 hour
      max: { type: Number, default: 10 },
      maxFileSize: { type: Number, default: 10485760 } // 10MB
    },
    aiServices: {
      windowMs: { type: Number, default: 3600000 }, // 1 hour
      max: { type: Number, default: 50 },
      costLimitPerUser: { type: Number, default: 10.0 }
    }
  },
  
  security: {
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: true },
      preventCommonPasswords: { type: Boolean, default: true },
      passwordHistory: { type: Number, default: 5 }
    },
    sessionConfig: {
      maxConcurrentSessions: { type: Number, default: 3 },
      sessionTimeout: { type: Number, default: 480 }, // 8 hours
      refreshTokenExpiry: { type: Number, default: 30 }, // 30 days
      rememberMeExpiry: { type: Number, default: 90 } // 90 days
    },
    twoFactorAuth: {
      enabled: { type: Boolean, default: true },
      required: { type: Boolean, default: false },
      backupCodesCount: { type: Number, default: 10 },
      issuerName: { type: String, default: 'AI Job Suite' }
    },
    ipWhitelist: [String],
    suspiciousActivityThreshold: { type: Number, default: 10 },
    accountLockoutAttempts: { type: Number, default: 5 },
    accountLockoutDuration: { type: Number, default: 30 } // 30 minutes
  },
  
  email: {
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'mailgun', 'ses'],
      default: 'smtp'
    },
    templates: {
      welcome: { type: Boolean, default: true },
      passwordReset: { type: Boolean, default: true },
      emailVerification: { type: Boolean, default: true },
      twoFactorCode: { type: Boolean, default: true },
      jobAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      securityAlert: { type: Boolean, default: true }
    },
    rateLimits: {
      verificationEmails: { type: Number, default: 3 },
      passwordResetEmails: { type: Number, default: 3 },
      jobAlerts: { type: Number, default: 50 }
    },
    fromAddress: { type: String, default: 'noreply@aijobsuite.com' },
    fromName: { type: String, default: 'AI Job Suite' }
  },
  
  fileManagement: {
    allowedTypes: {
      type: [String],
      default: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png']
    },
    maxFileSize: { type: Number, default: 10485760 }, // 10MB
    maxFilesPerUser: { type: Number, default: 50 },
    virusScanEnabled: { type: Boolean, default: true },
    compressionEnabled: { type: Boolean, default: true },
    cdnEnabled: { type: Boolean, default: false },
    retentionPeriod: { type: Number, default: 365 }, // 1 year
    encryptionEnabled: { type: Boolean, default: true }
  },
  
  aiServices: {
    providers: {
      openai: {
        enabled: { type: Boolean, default: true },
        models: { type: [String], default: ['gpt-4', 'gpt-3.5-turbo'] },
        maxTokens: { type: Number, default: 4000 },
        temperature: { type: Number, default: 0.7 },
        costPerToken: { type: Number, default: 0.00002 }
      },
      anthropic: {
        enabled: { type: Boolean, default: true },
        models: { type: [String], default: ['claude-3-opus', 'claude-3-sonnet'] },
        maxTokens: { type: Number, default: 4000 },
        temperature: { type: Number, default: 0.7 },
        costPerToken: { type: Number, default: 0.000015 }
      },
      google: {
        enabled: { type: Boolean, default: true },
        models: { type: [String], default: ['gemini-2.5-flash', 'gemini-1.5-pro'] },
        maxTokens: { type: Number, default: 4000 },
        temperature: { type: Number, default: 0.7 },
        costPerToken: { type: Number, default: 0.00001 }
      }
    },
    fallbackEnabled: { type: Boolean, default: true },
    cachingEnabled: { type: Boolean, default: true },
    contentFiltering: { type: Boolean, default: true },
    usageTracking: { type: Boolean, default: true },
    costAlerts: {
      enabled: { type: Boolean, default: true },
      thresholds: { type: [Number], default: [5, 10, 25, 50] }
    }
  },
  
  analytics: {
    enabled: { type: Boolean, default: true },
    providers: {
      type: [String],
      enum: ['google', 'mixpanel', 'amplitude', 'custom'],
      default: ['google']
    },
    retention: { type: Number, default: 365 },
    realTimeEnabled: { type: Boolean, default: true },
    userTrackingEnabled: { type: Boolean, default: true },
    performanceMonitoring: { type: Boolean, default: true },
    errorTracking: { type: Boolean, default: true },
    customEvents: { type: Boolean, default: true }
  },
  
  compliance: {
    gdprEnabled: { type: Boolean, default: true },
    ccpaEnabled: { type: Boolean, default: true },
    coppaEnabled: { type: Boolean, default: false },
    dataRetentionPeriod: { type: Number, default: 2555 }, // 7 years
    anonymizeAfterDeletion: { type: Boolean, default: true },
    auditLogsEnabled: { type: Boolean, default: true },
    auditLogRetention: { type: Number, default: 2555 }, // 7 years
    privacyPolicyVersion: { type: String, default: '1.0' },
    termsOfServiceVersion: { type: String, default: '1.0' },
    cookieConsentRequired: { type: Boolean, default: true }
  },
  
  enterprise: {
    ssoEnabled: { type: Boolean, default: false },
    ssoProviders: {
      type: [String],
      enum: ['google', 'microsoft', 'okta', 'saml'],
      default: []
    },
    teamManagement: { type: Boolean, default: false },
    roleBasedAccess: { type: Boolean, default: false },
    customDomains: { type: Boolean, default: false },
    whiteLabeling: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    slaGuarantee: { type: Number, default: 99.9 },
    customIntegrations: { type: Boolean, default: false }
  },
  
  jobBoards: {
    indeed: {
      enabled: { type: Boolean, default: false },
      apiKey: String,
      rateLimits: {
        searchRequests: { type: Number, default: 100 },
        applicationRequests: { type: Number, default: 10 }
      }
    },
    linkedin: {
      enabled: { type: Boolean, default: false },
      apiKey: String,
      rateLimits: {
        searchRequests: { type: Number, default: 50 },
        profileRequests: { type: Number, default: 20 }
      }
    },
    glassdoor: {
      enabled: { type: Boolean, default: false },
      apiKey: String,
      rateLimits: {
        companyRequests: { type: Number, default: 100 },
        reviewRequests: { type: Number, default: 50 }
      }
    },
    customBoards: [{
      name: String,
      apiEndpoint: String,
      authMethod: {
        type: String,
        enum: ['api_key', 'oauth', 'basic']
      },
      enabled: { type: Boolean, default: false }
    }]
  },
  
  notifications: {
    pushNotifications: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['firebase', 'pusher', 'custom'],
        default: 'firebase'
      },
      batchingEnabled: { type: Boolean, default: true },
      quietHours: {
        enabled: { type: Boolean, default: true },
        startTime: { type: String, default: '22:00' },
        endTime: { type: String, default: '08:00' },
        timezone: { type: String, default: 'UTC' }
      }
    },
    emailNotifications: {
      enabled: { type: Boolean, default: true },
      digestEnabled: { type: Boolean, default: true },
      digestFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      },
      instantNotifications: {
        type: [String],
        default: ['job_match', 'application_update', 'interview_scheduled']
      }
    },
    smsNotifications: {
      enabled: { type: Boolean, default: false },
      provider: {
        type: String,
        enum: ['twilio', 'nexmo', 'custom'],
        default: 'twilio'
      },
      urgentOnly: { type: Boolean, default: true }
    }
  },
  
  backup: {
    enabled: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    retention: { type: Number, default: 30 },
    encryptionEnabled: { type: Boolean, default: true },
    offSiteBackup: { type: Boolean, default: true },
    testRestoreFrequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly'],
      default: 'monthly'
    },
    lastSuccessfulBackup: Date,
    lastTestedRestore: Date
  },
  
  performance: {
    caching: {
      redis: {
        enabled: { type: Boolean, default: true },
        ttl: { type: Number, default: 3600 }, // 1 hour
        maxMemory: { type: String, default: '256mb' },
        evictionPolicy: { type: String, default: 'allkeys-lru' }
      },
      cdn: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['cloudflare', 'aws', 'azure', 'custom'],
          default: 'cloudflare'
        },
        cacheTtl: { type: Number, default: 86400 } // 24 hours
      },
      databaseQuery: {
        enabled: { type: Boolean, default: true },
        ttl: { type: Number, default: 300 } // 5 minutes
      }
    },
    optimization: {
      compressionEnabled: { type: Boolean, default: true },
      minificationEnabled: { type: Boolean, default: true },
      imageOptimization: { type: Boolean, default: true },
      lazyLoadingEnabled: { type: Boolean, default: true }
    }
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  configVersion: {
    type: Number,
    default: 1
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

// Indexes
SystemSettingsSchema.index({ environment: 1, isActive: 1 });
SystemSettingsSchema.index({ configVersion: -1 });
SystemSettingsSchema.index({ createdAt: -1 });

// Ensure only one active configuration per environment
SystemSettingsSchema.index({ environment: 1, isActive: 1 }, { unique: true });

// Pre-save middleware to increment version
SystemSettingsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.configVersion += 1;
  }
  next();
});

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);