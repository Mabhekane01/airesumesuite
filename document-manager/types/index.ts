// Enterprise Document Management System Types
// Comprehensive TypeScript definitions for enterprise-grade features

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  customDomain?: string;
  brandLogoUrl?: string;
  brandColors: Record<string, string>;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  subscriptionTier: 'enterprise';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
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
  fileSize: number;
  fileType: string;
  mimeType: string;
  
  // Storage
  fileUrl: string;
  filePath: string;
  storageProvider: 'local' | 's3' | 'gcs' | 'azure';
  
  // Document processing
  pageCount?: number;
  thumbnailUrl?: string;
  previewImages: string[];
  textContent?: string;
  
  // Versioning
  version: number;
  parentDocumentId?: string;
  
  // Status
  status: 'active' | 'archived' | 'deleted';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Integration sources
  source: 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
  sourceMetadata: Record<string, any>;
  
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

export interface DocumentView {
  id: string;
  documentId: string;
  linkId: string;
  
  // Visitor information
  visitorId: string;
  visitorEmail?: string;
  visitorName?: string;
  
  // Session data
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  country?: string;
  city?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  
  // View metadata
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  createdAt: Date;
}

export interface PageView {
  id: string;
  documentViewId: string;
  documentId: string;
  
  // Page details
  pageNumber: number;
  durationSeconds?: number;
  
  // Engagement
  scrollPercentage?: number;
  zoomLevel?: number;
  interactions: Record<string, any>;
  
  viewedAt: Date;
}

export interface DocumentDownload {
  id: string;
  documentId: string;
  linkId: string;
  visitorId: string;
  
  // Download metadata
  ipAddress: string;
  userAgent: string;
  downloadType: 'pdf' | 'original';
  
  downloadedAt: Date;
}

export interface EmailCapture {
  id: string;
  documentId: string;
  linkId: string;
  
  email: string;
  name?: string;
  company?: string;
  message?: string;
  
  // Metadata
  ipAddress: string;
  userAgent: string;
  
  createdAt: Date;
}

export interface DataRoom {
  id: string;
  userId: string;
  organizationId?: string;
  
  name: string;
  description?: string;
  
  // Access control
  passwordHash?: string;
  expiresAt?: Date;
  
  // Permissions
  allowDownload: boolean;
  requireEmail: boolean;
  
  // Branding
  brandName?: string;
  brandLogoUrl?: string;
  brandColors: Record<string, string>;
  
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRoomDocument {
  id: string;
  dataRoomId: string;
  documentId: string;
  
  displayOrder: number;
  isRequired: boolean;
  
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  organizationId?: string;
  
  action: string;
  resourceType: string;
  resourceId: string;
  
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date;
}

export interface Webhook {
  id: string;
  userId: string;
  organizationId?: string;
  
  name: string;
  url: string;
  secret?: string;
  events: string[];
  
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface CreateDocumentRequest {
  file: File;
  title?: string;
  description?: string;
  folderId?: string;
  source?: 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
  sourceMetadata?: Record<string, any>;
}

export interface CreateDocumentLinkRequest {
  documentId: string;
  name?: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
  allowDownload?: boolean;
  allowPrint?: boolean;
  allowCopy?: boolean;
  requireEmail?: boolean;
  requireName?: boolean;
  watermarkText?: string;
  ipRestrictions?: string[];
  countryRestrictions?: string[];
  customDomain?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandColors?: Record<string, string>;
}

export interface DocumentAnalytics {
  totalViews: number;
  uniqueViewers: number;
  averageViewTime: number;
  totalDownloads: number;
  conversionRate: number;
  
  // Time-based data
  viewsOverTime: Array<{ date: string; views: number; unique: number }>;
  
  // Geographic data
  viewsByCountry: Array<{ country: string; views: number }>;
  viewsByCity: Array<{ city: string; views: number }>;
  
  // Device data
  viewsByDevice: Array<{ device: string; views: number }>;
  viewsByBrowser: Array<{ browser: string; views: number }>;
  
  // Page-level analytics
  pageAnalytics: Array<{
    pageNumber: number;
    views: number;
    averageTime: number;
    averageScroll: number;
  }>;
  
  // Engagement metrics
  topReferrers: Array<{ referrer: string; views: number }>;
  emailCaptures: EmailCapture[];
}

export interface UploadProgress {
  documentId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

// Frontend component props
export interface DocumentCardProps {
  document: Document;
  onEdit?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onShare?: (document: Document) => void;
  onMove?: (document: Document) => void;
  showAnalytics?: boolean;
}

export interface DocumentViewerProps {
  document: Document;
  link?: DocumentLink;
  onPageView?: (pageNumber: number, duration: number) => void;
  onInteraction?: (type: string, data: any) => void;
  watermark?: string;
  allowDownload?: boolean;
  allowPrint?: boolean;
  allowCopy?: boolean;
}

export interface AnalyticsDashboardProps {
  document: Document;
  analytics: DocumentAnalytics;
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all';
  onTimeRangeChange: (range: string) => void;
}

// Utility types
export type DocumentSource = 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type DocumentStatus = 'active' | 'archived' | 'deleted';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

// Error types
export interface DocumentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Configuration types
export interface DocumentManagerConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  storageProvider: 'local' | 's3' | 'gcs' | 'azure';
  enableAnalytics: boolean;
  enableWatermarks: boolean;
  enablePasswordProtection: boolean;
  enableCustomDomains: boolean;
  defaultExpiration?: number; // days
  maxLinksPerDocument: number;
}

export interface BrandingConfig {
  logoUrl?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customDomain?: string;
  companyName?: string;
}

// Integration types for AI Resume Suite
export interface AIResumeIntegration {
  resumeId: string;
  documentId: string;
  shareWithEmployers: boolean;
  trackApplications: boolean;
  autoGenerateLinks: boolean;
}

export interface PDFEditorIntegration {
  originalDocumentId: string;
  editedDocumentId: string;
  changeLog: Record<string, any>;
  preserveOriginal: boolean;
}

// Real-time updates
export interface DocumentEvent {
  type: 'view' | 'download' | 'share' | 'update' | 'delete';
  documentId: string;
  userId?: string;
  visitorId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Webhook payload types
export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: Record<string, any>;
  signature: string;
}