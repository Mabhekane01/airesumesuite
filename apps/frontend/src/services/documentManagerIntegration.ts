import { api } from "./api";
import { useAuthStore } from "../stores/authStore";

// Document Manager API base URL
const DOCUMENT_MANAGER_BASE_URL =
  import.meta.env.VITE_DOCUMENT_MANAGER_URL || "http://localhost:3002";

export interface UploadToTrackerOptions {
  title: string;
  source: "ai_resume" | "ai_cover_letter";
  originalId: string;
  templateId?: string;
  jobTitle?: string;
  companyName?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TrackingResponse {
  documentId: string;
  trackingUrl: string;
  publicUrl: string;
  qrCodeUrl?: string;
  shortUrl?: string;
  analyticsUrl?: string;
}

export interface DocumentAnalytics {
  views: number;
  downloads: number;
  uniqueViewers: number;
  averageViewTime: number;
  topCountries: Array<{ country: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; views: number; percentage: number }>;
  dailyStats: Array<{
    date: string;
    views: number;
    downloads: number;
    uniqueViewers: number;
  }>;
  deviceStats: Array<{ device: string; views: number; percentage: number }>;
  browserStats: Array<{ browser: string; views: number; percentage: number }>;
  conversionRate: number;
  engagementScore: number;
  heatmapData?: Array<{ x: number; y: number; intensity: number }>;
}

export interface ShareableLinkSettings {
  name?: string;
  description?: string;
  expiresAt?: string;
  viewLimit?: number;
  requireEmail?: boolean;
  requireName?: boolean;
  password?: string;
  watermarkText?: string;
  allowDownload?: boolean;
  allowPrint?: boolean;
  allowCopy?: boolean;
  customDomain?: string;
  brandName?: string;
  brandLogoUrl?: string;
  ipRestrictions?: string[];
  countryRestrictions?: string[];
  notificationSettings?: {
    emailOnView?: boolean;
    emailOnDownload?: boolean;
    webhookUrl?: string;
  };
}

export interface ShareableLink {
  id: string;
  documentId: string;
  url: string;
  slug: string;
  name?: string;
  description?: string;
  isActive: boolean;
  expiresAt?: string;
  viewLimit?: number;
  currentViews: number;
  requireEmail: boolean;
  requireName: boolean;
  passwordProtected: boolean;
  watermarkText?: string;
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  customDomain?: string;
  brandName?: string;
  brandLogoUrl?: string;
  ipRestrictions?: string[];
  countryRestrictions?: string[];
  createdAt: string;
  updatedAt: string;
  qrCodeUrl?: string;
  shortUrl?: string;
}

export interface DocumentInsights {
  readabilityScore: number;
  keywordDensity: Record<string, number>;
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
    overall: "positive" | "negative" | "neutral";
  };
  documentType: string;
  confidence: number;
  suggestions: string[];
  aiGeneratedSummary?: string;
}

export interface SecurityReport {
  riskLevel: "low" | "medium" | "high" | "critical";
  threats: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    recommendation: string;
  }>;
  compliance: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
    pci: boolean;
  };
  encryptionStatus: "encrypted" | "partially_encrypted" | "not_encrypted";
  accessLogs: Array<{
    timestamp: string;
    ip: string;
    userAgent: string;
    action: string;
    location?: string;
    riskScore: number;
  }>;
}

class DocumentManagerIntegration {
  private static baseUrl = DOCUMENT_MANAGER_BASE_URL;

  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(
      `${DocumentManagerIntegration.baseUrl}${endpoint}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(
        error.message || `Request failed with status ${response.status}`
      );
    }

    return response.json();
  }

  /**
   * Generate PDF from resume and upload to Document Manager for tracking
   */
  static async uploadResumeForTracking(
    resumeId: string,
    options: Omit<UploadToTrackerOptions, "source" | "originalId">
  ): Promise<TrackingResponse> {
    try {
      // First, generate PDF from the resume
      const pdfResponse = await api.get(`/resumes/${resumeId}/pdf`, {
        responseType: "blob",
      });

      if (!pdfResponse.data || !(pdfResponse.data instanceof Blob)) {
        throw new Error("Failed to generate PDF from resume");
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append("file", pdfResponse.data, `${options.title}.pdf`);
      formData.append("title", options.title);
      formData.append("source", "ai_resume");
      formData.append("originalId", resumeId);

      if (options.templateId) {
        formData.append("templateId", options.templateId);
      }

      if (options.description) {
        formData.append("description", options.description);
      }

      if (options.tags && options.tags.length > 0) {
        formData.append("tags", JSON.stringify(options.tags));
      }

      if (options.metadata) {
        formData.append("metadata", JSON.stringify(options.metadata));
      }

      // Upload to Document Manager
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const uploadResponse = await fetch(
        `${DocumentManagerIntegration.baseUrl}/api/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse
          .json()
          .catch(() => ({ message: "Upload failed" }));
        throw new Error(
          errorData.message ||
            `Upload failed with status ${uploadResponse.status}`
        );
      }

      const result = await uploadResponse.json();

      if (!result.data || !result.data.id) {
        throw new Error("Invalid response from Document Manager");
      }

      return {
        documentId: result.data.id,
        trackingUrl: `${DocumentManagerIntegration.baseUrl}/dashboard/documents/${result.data.id}`,
        publicUrl: result.data.publicUrl || "",
        qrCodeUrl: result.data.qrCodeUrl,
        shortUrl: result.data.shortUrl,
        analyticsUrl: `${DocumentManagerIntegration.baseUrl}/analytics/${result.data.id}`,
      };
    } catch (error) {
      console.error("Failed to upload resume for tracking:", error);
      throw error instanceof Error
        ? error
        : new Error("Unknown error occurred");
    }
  }

  /**
   * Generate PDF from cover letter and upload to Document Manager for tracking
   */
  static async uploadCoverLetterForTracking(
    coverLetterId: string,
    options: Omit<UploadToTrackerOptions, "source" | "originalId">
  ): Promise<TrackingResponse> {
    try {
      // First, generate PDF from the cover letter
      const pdfResponse = await api.get(`/cover-letters/${coverLetterId}/pdf`, {
        responseType: "blob",
      });

      if (!pdfResponse.data || !(pdfResponse.data instanceof Blob)) {
        throw new Error("Failed to generate PDF from cover letter");
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append("file", pdfResponse.data, `${options.title}.pdf`);
      formData.append("title", options.title);
      formData.append("source", "ai_cover_letter");
      formData.append("originalId", coverLetterId);

      if (options.jobTitle) {
        formData.append("jobTitle", options.jobTitle);
      }

      if (options.companyName) {
        formData.append("companyName", options.companyName);
      }

      if (options.description) {
        formData.append("description", options.description);
      }

      if (options.tags && options.tags.length > 0) {
        formData.append("tags", JSON.stringify(options.tags));
      }

      if (options.metadata) {
        formData.append("metadata", JSON.stringify(options.metadata));
      }

      // Upload to Document Manager
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const uploadResponse = await fetch(
        `${DocumentManagerIntegration.baseUrl}/api/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse
          .json()
          .catch(() => ({ message: "Upload failed" }));
        throw new Error(
          errorData.message ||
            `Upload failed with status ${uploadResponse.status}`
        );
      }

      const result = await uploadResponse.json();

      if (!result.data || !result.data.id) {
        throw new Error("Invalid response from Document Manager");
      }

      return {
        documentId: result.data.id,
        trackingUrl: `${DocumentManagerIntegration.baseUrl}/dashboard/documents/${result.data.id}`,
        publicUrl: result.data.publicUrl || "",
        qrCodeUrl: result.data.qrCodeUrl,
        shortUrl: result.data.shortUrl,
        analyticsUrl: `${DocumentManagerIntegration.baseUrl}/analytics/${result.data.id}`,
      };
    } catch (error) {
      console.error("Failed to upload cover letter for tracking:", error);
      throw error instanceof Error
        ? error
        : new Error("Unknown error occurred");
    }
  }

  /**
   * Get comprehensive analytics for a tracked document
   */
  static async getDocumentAnalytics(
    documentId: string,
    days = 30
  ): Promise<DocumentAnalytics> {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const response = await this.request(
        `/api/documents/${documentId}/analytics?days=${days}`
      );

      if (!response.data) {
        throw new Error("Invalid analytics response");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to get document analytics:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch analytics");
    }
  }

  /**
   * Get AI-powered document insights
   */
  static async getDocumentInsights(
    documentId: string
  ): Promise<DocumentInsights> {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const response = await this.request(
        `/api/documents/${documentId}/insights`
      );

      if (!response.data) {
        throw new Error("Invalid insights response");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to get document insights:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch insights");
    }
  }

  /**
   * Get security report for a document
   */
  static async getDocumentSecurityReport(
    documentId: string
  ): Promise<SecurityReport> {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const response = await this.request(
        `/api/documents/${documentId}/security`
      );

      if (!response.data) {
        throw new Error("Invalid security report response");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to get security report:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch security report");
    }
  }

  /**
   * Create a shareable link with advanced features
   */
  static async createShareableLink(
    documentId: string,
    settings: ShareableLinkSettings
  ): Promise<ShareableLink> {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const response = await this.request(`/api/links`, {
        method: "POST",
        body: JSON.stringify({
          documentId,
          ...settings,
        }),
      });

      if (!response.data) {
        throw new Error("Invalid response when creating shareable link");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to create shareable link:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to create shareable link");
    }
  }

  /**
   * Get all shareable links for a document
   */
  static async getDocumentLinks(documentId: string): Promise<ShareableLink[]> {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const response = await this.request(`/api/links/document/${documentId}`);

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response when fetching document links");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to get document links:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch document links");
    }
  }

  /**
   * Update shareable link settings
   */
  static async updateShareableLink(
    linkId: string,
    settings: Partial<ShareableLinkSettings>
  ): Promise<ShareableLink> {
    try {
      if (!linkId) {
        throw new Error("Link ID is required");
      }

      const response = await this.request(`/api/links/${linkId}`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      });

      if (!response.data) {
        throw new Error("Invalid response when updating shareable link");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to update shareable link:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to update shareable link");
    }
  }

  /**
   * Delete a shareable link
   */
  static async deleteShareableLink(linkId: string): Promise<void> {
    try {
      if (!linkId) {
        throw new Error("Link ID is required");
      }

      await this.request(`/api/links/${linkId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete shareable link:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to delete shareable link");
    }
  }

  /**
   * Generate QR code for a shareable link
   */
  static async generateLinkQRCode(
    linkId: string
  ): Promise<{ qrCodeUrl: string; qrCodeData: string }> {
    try {
      if (!linkId) {
        throw new Error("Link ID is required");
      }

      const response = await this.request(`/api/links/${linkId}/qr`);

      if (!response.data) {
        throw new Error("Invalid QR code response");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to generate QR code");
    }
  }

  /**
   * Get real-time analytics updates via WebSocket
   */
  static async subscribeToRealTimeAnalytics(
    documentId: string,
    callback: (data: any) => void
  ) {
    try {
      // This would typically connect to a WebSocket or Server-Sent Events
      // For now, we'll simulate with polling
      const interval = setInterval(async () => {
        try {
          const analytics = await this.getDocumentAnalytics(documentId, 1); // Last 24 hours
          callback(analytics);
        } catch (error) {
          console.error("Real-time analytics error:", error);
        }
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    } catch (error) {
      console.error("Failed to subscribe to real-time analytics:", error);
      throw error;
    }
  }

  /**
   * Bulk operations on documents
   */
  static async bulkUpdateDocuments(
    documentIds: string[],
    updates: Record<string, any>
  ): Promise<void> {
    try {
      if (!documentIds.length) {
        throw new Error("Document IDs are required");
      }

      await this.request("/api/documents/bulk", {
        method: "PATCH",
        body: JSON.stringify({
          documentIds,
          updates,
        }),
      });
    } catch (error) {
      console.error("Failed to bulk update documents:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to bulk update documents");
    }
  }

  /**
   * Export documents in various formats
   */
  static async exportDocuments(
    documentIds: string[],
    format: "csv" | "json" | "pdf" | "excel",
    options?: {
      includeAnalytics?: boolean;
      includeMetadata?: boolean;
      dateRange?: { start: string; end: string };
    }
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    try {
      if (!documentIds.length) {
        throw new Error("Document IDs are required");
      }

      const response = await this.request("/api/documents/export", {
        method: "POST",
        body: JSON.stringify({
          documentIds,
          format,
          ...options,
        }),
      });

      if (!response.data) {
        throw new Error("Invalid export response");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to export documents:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to export documents");
    }
  }

  /**
   * Check if Document Manager service is available
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${DocumentManagerIntegration.baseUrl}/health`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive service status
   */
  static async getServiceStatus(): Promise<{
    available: boolean;
    version?: string;
    uptime?: number;
    lastCheck: Date;
    features: string[];
    limits: {
      maxFileSize: number;
      maxDocuments: number;
      maxLinks: number;
      supportedFormats: string[];
    };
  }> {
    try {
      const response = await fetch(
        `${DocumentManagerIntegration.baseUrl}/health`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return {
          available: false,
          lastCheck: new Date(),
          features: [],
          limits: {
            maxFileSize: 0,
            maxDocuments: 0,
            maxLinks: 0,
            supportedFormats: [],
          },
        };
      }

      const data = await response.json();
      return {
        available: true,
        version: data.version,
        uptime: data.uptime,
        lastCheck: new Date(),
        features: data.features || [],
        limits: data.limits || {
          maxFileSize: 100 * 1024 * 1024, // 100MB default
          maxDocuments: 1000,
          maxLinks: 100,
          supportedFormats: [
            "pdf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "txt",
          ],
        },
      };
    } catch (error) {
      return {
        available: false,
        lastCheck: new Date(),
        features: [],
        limits: {
          maxFileSize: 0,
          maxDocuments: 0,
          maxLinks: 0,
          supportedFormats: [],
        },
      };
    }
  }
}

export default DocumentManagerIntegration;
