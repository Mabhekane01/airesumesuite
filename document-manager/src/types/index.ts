// Enterprise Document Management System Types
// Comprehensive TypeScript definitions for enterprise-grade features

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl: string | null;
  subscriptionTier: "free" | "pro" | "enterprise";
  customDomain?: string;
  brandLogoUrl?: string;
  brandColors: Record<string, string>;
  apiKey?: string;
  password?: string;
  isActive?: boolean;
  organizationName?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  subscriptionTier: "enterprise";
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  permissions: Record<string, boolean>;
  createdAt: Date;
}

export interface Folder {
  id: string;
  userId: string;
  organizationId?: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  organizationId?: string;
  folderId?: string;

  // Document metadata
  title: string;
  description?: string;
  fileName: string;
  originalFilename?: string;
  fileSize: number;
  fileType: string;
  mimeType: string;

  // Storage
  fileUrl: string;
  filePath: string;
  storageProvider: "local" | "s3" | "gcs" | "azure";

  // Document processing
  pageCount?: number;
  thumbnailUrl?: string;
  previewImages: string[];
  textContent?: string;

  // Versioning
  version: number;
  parentDocumentId?: string;

  // Status
  status: "active" | "archived" | "deleted";
  processingStatus: "pending" | "processing" | "completed" | "failed";

  // Integration sources
  source: "upload" | "ai_resume" | "pdf_editor" | "api";
  sourceMetadata: Record<string, any>;

  // Additional properties that were missing
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentLink {
  id: string;
  documentId: string;
  userId: string;

  // Link configuration
  slug: string;
  name?: string;
  description?: string;

  // Access control
  passwordHash?: string;
  expiresAt?: Date;
  maxViews?: number;
  currentViews: number;

  // Permissions
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  requireEmail: boolean;
  requireName: boolean;

  // Branding
  customDomain?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandColors: Record<string, string>;

  // Security
  watermarkText?: string;
  ipRestrictions: string[];
  countryRestrictions: string[];

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  userId: string;

  // Share configuration
  email?: string;
  name?: string;
  role: "viewer" | "editor" | "commenter";
  permissions: Record<string, boolean>;

  // Access control
  expiresAt?: Date;
  password?: string;

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Analytics {
  id: string;
  documentId: string;
  shareId?: string;

  // View data
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;

  // Engagement
  timeOnPage: number;
  pagesViewed: number[];
  actions: string[];

  // UTM tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  createdAt: Date;
}

export interface Webhook {
  id: string;
  userId: string;
  organizationId?: string;

  // Webhook configuration
  name: string;
  url: string;
  events: string[];
  secret?: string;

  // Status
  isActive: boolean;
  lastTriggered?: Date;
  failureCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;

  // Event data
  eventType: string;
  payload: any;
  userId?: string;
  organizationId?: string;

  // Delivery status
  status: "pending" | "delivered" | "failed";
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;

  // Response
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Service interfaces
export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  subscriptionTier: "free" | "pro" | "enterprise";
  isActive?: boolean;
}

export interface CreateDocumentData {
  userId: string;
  organizationId?: string;
  folderId?: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  fileUrl: string;
  filePath: string;
  storageProvider: "local" | "s3" | "gcs" | "azure";
  pageCount?: number;
  thumbnailUrl?: string;
  previewImages: string[];
  textContent?: string;
  version: number;
  parentDocumentId?: string;
  status: "active" | "archived" | "deleted";
  processingStatus: "pending" | "processing" | "completed" | "failed";
  source: "upload" | "ai_resume" | "pdf_editor" | "api";
  sourceMetadata: Record<string, any>;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  folderId?: string;
  status?: "active" | "archived" | "deleted";
  processingStatus?: "pending" | "processing" | "completed" | "failed";
}

export interface DocumentFilters {
  userId: string;
  organizationId?: string;
  folderId?: string;
  fileType?: string;
  status?: string;
  processingStatus?: string;
  source?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DocumentWithFolder extends Document {
  folder?: Folder;
  shareCount: number;
  viewCount: number;
  lastViewed?: Date;
}

export interface DocumentSearchResult {
  documents: DocumentWithFolder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WebhookEventData {
  eventType: string;
  payload: any;
  userId: string;
  organizationId: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  responseTime: number;
  retryCount: number;
  errorMessage?: string;
}

// Additional interfaces for missing functionality
export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  password?: string;
}

export interface ShareLinkData {
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  allowDownload?: boolean;
  allowPrint?: boolean;
  trackViews?: boolean;
  notifyOnView?: boolean;
}

// Analytics interfaces
export interface AnalyticsInsights {
  engagementTrends: string[];
  viewerBehavior: string[];
  optimizationSuggestions: string[];
  contentRecommendations: string[];
}

export interface HeatmapData {
  pageNumber: number;
  clicks: Array<{ x: number; y: number; intensity: number }>;
  scrolls: Array<{ y: number; intensity: number }>;
  hovers: Array<{ x: number; y: number; intensity: number }>;
  scrollDepth: {
    average: number;
    distribution: Record<string, number>;
  };
}
