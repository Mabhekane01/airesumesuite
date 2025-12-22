import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Basic Company Information
  name: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  website?: string;
  description?: string;
  
  // Location & Contact
  headquarters: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    stateCode?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    locationId?: mongoose.Types.ObjectId;
  };
  
  // Additional offices/locations
  offices: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    stateCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    locationId?: mongoose.Types.ObjectId;
    isHeadquarters: boolean;
    employeeCount?: number;
  }[];
  
  // Financial Information
  fundingStage?: 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'ipo' | 'private' | 'acquired';
  marketCap?: number;
  revenue?: number;
  employeeCount?: number;
  
  // Ratings & Reviews
  ratings: {
    glassdoor?: {
      overall: number;
      workLifeBalance: number;
      compensation: number;
      culture: number;
      careerOpportunities: number;
      lastUpdated: Date;
    };
    linkedin?: {
      followers: number;
      lastUpdated: Date;
    };
  };
  
  // Culture & Values
  culture: {
    values?: string[];
    benefits?: string[];
    workEnvironment?: string;
    diversityScore?: number;
    inclusionInitiatives?: string[];
    remoteFriendly: boolean;
    hybridOptions: boolean;
  };
  
  // Technology & Engineering
  techStack?: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    cloud: string[];
    tools: string[];
  };
  
  // Recent News & Updates
  news: {
    id: string;
    title: string;
    url: string;
    publishedDate: Date;
    summary: string;
    source: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }[];
  
  // Key Personnel & Contacts
  contacts: {
    id: string;
    name: string;
    title: string;
    department: string;
    email?: string;
    linkedinUrl?: string;
    notes?: string;
    lastContact?: Date;
    relationship: 'recruiter' | 'hiring_manager' | 'employee' | 'connection' | 'other';
    status: 'active' | 'inactive' | 'left_company';
  }[];
  
  // Competitive Intelligence
  competitors: string[];
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  strengthsWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  
  // Recent Funding & Financial Events
  fundingHistory: {
    round: string;
    amount: number;
    date: Date;
    investors: string[];
    valuation?: number;
    source: string;
  }[];
  
  // Job Opportunities & Trends
  hiringTrends: {
    departmentsHiring: string[];
    commonRoles: string[];
    hiringVelocity: 'high' | 'medium' | 'low';
    averageTimeToHire?: number;
    lastUpdated: Date;
  };
  
  // Company Events & Insights
  events: {
    id: string;
    name: string;
    type: 'conference' | 'job_fair' | 'networking' | 'product_launch' | 'earnings' | 'other';
    date: Date;
    location?: string;
    notes?: string;
    attended: boolean;
  }[];
  
  // AI-Generated Insights
  aiInsights: {
    cultureMatch: number; // 0-100 score
    careerGrowthPotential: number; // 0-100 score
    compensationCompetitiveness: number; // 0-100 score
    workLifeBalanceScore: number; // 0-100 score
    stabilityScore: number; // 0-100 score
    innovationScore: number; // 0-100 score
    recommendationScore: number; // 0-100 overall score
    keyStrengths: string[];
    potentialConcerns: string[];
    bestFitRoles: string[];
    lastUpdated: Date;
  };
  
  // User Notes & Research
  notes: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  targetCompany: boolean;
  
  // Tracking & Analytics
  interactionHistory: {
    id: string;
    type: 'application' | 'interview' | 'networking' | 'research' | 'contact' | 'event';
    date: Date;
    description: string;
    outcome?: string;
    nextSteps?: string;
  }[];
  
  // Data Sources & Verification
  dataSources: {
    source: string;
    lastUpdated: Date;
    reliability: 'high' | 'medium' | 'low';
  }[];
  
  isVerified: boolean;
  archived: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic Information
  name: { type: String, required: true, trim: true, index: true },
  industry: { type: String, required: true, trim: true, index: true },
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
    required: true
  },
  website: String,
  description: String,
  
  // Location
  headquarters: {
    address: String,
    city: String,
    state: String,
    country: String,
    countryCode: String,
    stateCode: String,
    postalCode: String,
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location' }
  },
  
  // Additional offices
  offices: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    address: String,
    city: String,
    state: String,
    country: String,
    countryCode: String,
    stateCode: String,
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location' },
    isHeadquarters: { type: Boolean, default: false },
    employeeCount: Number
  }],
  
  // Financial
  fundingStage: {
    type: String,
    enum: ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'ipo', 'private', 'acquired']
  },
  marketCap: Number,
  revenue: Number,
  employeeCount: Number,
  
  // Ratings
  ratings: {
    glassdoor: {
      overall: { type: Number, min: 1, max: 5 },
      workLifeBalance: { type: Number, min: 1, max: 5 },
      compensation: { type: Number, min: 1, max: 5 },
      culture: { type: Number, min: 1, max: 5 },
      careerOpportunities: { type: Number, min: 1, max: 5 },
      lastUpdated: Date
    },
    linkedin: {
      followers: Number,
      lastUpdated: Date
    }
  },
  
  // Culture
  culture: {
    values: [String],
    benefits: [String],
    workEnvironment: String,
    diversityScore: { type: Number, min: 1, max: 10 },
    inclusionInitiatives: [String],
    remoteFriendly: { type: Boolean, default: false },
    hybridOptions: { type: Boolean, default: false }
  },
  
  // Tech Stack
  techStack: {
    languages: [String],
    frameworks: [String],
    databases: [String],
    cloud: [String],
    tools: [String]
  },
  
  // News
  news: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    url: String,
    publishedDate: { type: Date, required: true },
    summary: String,
    source: String,
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
  }],
  
  // Contacts
  contacts: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    title: String,
    department: String,
    email: String,
    linkedinUrl: String,
    notes: String,
    lastContact: Date,
    relationship: {
      type: String,
      enum: ['recruiter', 'hiring_manager', 'employee', 'connection', 'other'],
      default: 'other'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'left_company'],
      default: 'active'
    }
  }],
  
  // Competition
  competitors: [String],
  marketPosition: {
    type: String,
    enum: ['leader', 'challenger', 'follower', 'niche']
  },
  strengthsWeaknesses: {
    strengths: [String],
    weaknesses: [String],
    opportunities: [String],
    threats: [String]
  },
  
  // Funding
  fundingHistory: [{
    round: String,
    amount: Number,
    date: Date,
    investors: [String],
    valuation: Number,
    source: String
  }],
  
  // Hiring
  hiringTrends: {
    departmentsHiring: [String],
    commonRoles: [String],
    hiringVelocity: { type: String, enum: ['high', 'medium', 'low'] },
    averageTimeToHire: Number,
    lastUpdated: Date
  },
  
  // Events
  events: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['conference', 'job_fair', 'networking', 'product_launch', 'earnings', 'other'],
      default: 'other'
    },
    date: { type: Date, required: true },
    location: String,
    notes: String,
    attended: { type: Boolean, default: false }
  }],
  
  // AI Insights
  aiInsights: {
    cultureMatch: { type: Number, min: 0, max: 100, default: 0 },
    careerGrowthPotential: { type: Number, min: 0, max: 100, default: 0 },
    compensationCompetitiveness: { type: Number, min: 0, max: 100, default: 0 },
    workLifeBalanceScore: { type: Number, min: 0, max: 100, default: 0 },
    stabilityScore: { type: Number, min: 0, max: 100, default: 0 },
    innovationScore: { type: Number, min: 0, max: 100, default: 0 },
    recommendationScore: { type: Number, min: 0, max: 100, default: 0 },
    keyStrengths: [String],
    potentialConcerns: [String],
    bestFitRoles: [String],
    lastUpdated: Date
  },
  
  // User Organization
  notes: { type: String, default: '' },
  tags: [String],
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  targetCompany: { type: Boolean, default: false },
  
  // Interactions
  interactionHistory: [{
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['application', 'interview', 'networking', 'research', 'contact', 'event'],
      required: true
    },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    outcome: String,
    nextSteps: String
  }],
  
  // Data Quality
  dataSources: [{
    source: String,
    lastUpdated: Date,
    reliability: { type: String, enum: ['high', 'medium', 'low'] }
  }],
  
  isVerified: { type: Boolean, default: false },
  archived: { type: Boolean, default: false, index: true }
  
}, {
  timestamps: true
});

// Indexing Strategy
CompanySchema.index({ userId: 1, name: 1 });
CompanySchema.index({ userId: 1, industry: 1 });
CompanySchema.index({ userId: 1, targetCompany: 1 });
CompanySchema.index({ userId: 1, priority: 1 });
CompanySchema.index({ userId: 1, archived: 1 });
CompanySchema.index({ 'aiInsights.recommendationScore': -1 });

// Text Search
CompanySchema.index({
  name: 'text',
  industry: 'text',
  description: 'text',
  'culture.values': 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    industry: 5,
    tags: 3,
    description: 2,
    'culture.values': 2
  }
});

export const Company = mongoose.model<ICompany>('Company', CompanySchema);