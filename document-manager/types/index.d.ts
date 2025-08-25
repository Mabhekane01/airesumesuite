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
    title: string;
    description?: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    mimeType: string;
    fileUrl: string;
    filePath: string;
    storageProvider: 'local' | 's3' | 'gcs' | 'azure';
    pageCount?: number;
    thumbnailUrl?: string;
    previewImages: string[];
    textContent?: string;
    version: number;
    parentDocumentId?: string;
    status: 'active' | 'archived' | 'deleted';
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    source: 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
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
    linkId: string;
    visitorId: string;
    visitorEmail?: string;
    visitorName?: string;
    sessionId: string;
    userAgent: string;
    ipAddress: string;
    country?: string;
    city?: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
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
    pageNumber: number;
    durationSeconds?: number;
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
    passwordHash?: string;
    expiresAt?: Date;
    allowDownload: boolean;
    requireEmail: boolean;
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
    viewsOverTime: Array<{
        date: string;
        views: number;
        unique: number;
    }>;
    viewsByCountry: Array<{
        country: string;
        views: number;
    }>;
    viewsByCity: Array<{
        city: string;
        views: number;
    }>;
    viewsByDevice: Array<{
        device: string;
        views: number;
    }>;
    viewsByBrowser: Array<{
        browser: string;
        views: number;
    }>;
    pageAnalytics: Array<{
        pageNumber: number;
        views: number;
        averageTime: number;
        averageScroll: number;
    }>;
    topReferrers: Array<{
        referrer: string;
        views: number;
    }>;
    emailCaptures: EmailCapture[];
}
export interface UploadProgress {
    documentId: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    message?: string;
}
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
export type DocumentSource = 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type DocumentStatus = 'active' | 'archived' | 'deleted';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface DocumentError {
    code: string;
    message: string;
    details?: Record<string, any>;
}
export interface DocumentManagerConfig {
    maxFileSize: number;
    allowedFileTypes: string[];
    storageProvider: 'local' | 's3' | 'gcs' | 'azure';
    enableAnalytics: boolean;
    enableWatermarks: boolean;
    enablePasswordProtection: boolean;
    enableCustomDomains: boolean;
    defaultExpiration?: number;
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
export interface DocumentEvent {
    type: 'view' | 'download' | 'share' | 'update' | 'delete';
    documentId: string;
    userId?: string;
    visitorId?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface WebhookPayload {
    event: string;
    timestamp: Date;
    data: Record<string, any>;
    signature: string;
}
//# sourceMappingURL=index.d.ts.map