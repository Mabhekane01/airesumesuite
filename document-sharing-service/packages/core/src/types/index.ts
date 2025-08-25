// Document Sharing Service Core Types

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: "free" | "pro" | "enterprise";
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  organizationId?: string;
  title: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentLink {
  id: string;
  documentId: string;
  userId: string;
  slug: string;
  name?: string;
  description?: string;
  passwordHash?: string;
  expiresAt?: Date;
  maxViews?: number;
  currentViews: number;
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  requireEmail: boolean;
  requireName: boolean;
  customDomain?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandColors: Record<string, string>;
  watermarkText?: string;
  ipRestrictions: string[];
  countryRestrictions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentView {
  id: string;
  documentId: string;
  linkId?: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  timeOnPage: number;
  pagesViewed: number[];
  actions: string[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: Date;
}

export interface DocumentDownload {
  id: string;
  documentId: string;
  linkId?: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  city?: string;
  downloadedAt: Date;
}

export interface EmailCapture {
  id: string;
  linkId: string;
  email: string;
  name?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
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
  totalDownloads: number;
  averageViewTime: number;
  conversionRate: number;
  viewsToday: number;
  viewsThisWeek: number;
  topDocuments: Array<{ id: string; title: string; views: number }>;
  recentActivity: Array<{
    action: string;
    document: string;
    time: Date;
    location?: string;
  }>;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: any;
  userId?: string;
  organizationId?: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}



