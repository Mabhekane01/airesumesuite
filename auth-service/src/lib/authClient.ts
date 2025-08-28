/**
 * AI Job Suite Auth Service Client Library
 *
 * This library provides easy integration for other services to:
 * - Validate user tokens
 * - Check permissions and subscription status
 * - Track resource usage
 * - Handle authentication errors
 */

export interface AuthServiceConfig {
  baseUrl: string;
  serviceKey: string;
  serviceName: string;
  timeout?: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  serviceType: string;
  isActive: boolean;
  createdAt: string;
}

export interface Subscription {
  status: string;
  planName: string;
  features: Record<string, string[]>;
  limits: Record<string, number>;
}

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
  subscription?: {
    planId: string;
    features: string[];
    limits: number | null;
  };
  usage?: {
    current: number;
    limit: number;
    remaining: number;
    canProceed: boolean;
  };
  canProceed: boolean;
}

export interface UsageInfo {
  resource: string;
  action: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

export class AuthServiceClient {
  private config: AuthServiceConfig;
  private baseUrl: string;

  constructor(config: AuthServiceConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Validate a JWT token and return user information
   */
  async validateToken(
    token: string
  ): Promise<{ user: User; subscription: Subscription | null }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/services/validate-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": this.config.serviceKey,
            "X-Service-Name": this.config.serviceName,
          },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(this.config.timeout || 5000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AuthServiceError(
          (error as any).message || "Unknown error",
          (error as any).code || "UNKNOWN_ERROR",
          response.status
        );
      }

      const result = await response.json();
      return (result as any).data;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to validate token",
        "TOKEN_VALIDATION_ERROR",
        500
      );
    }
  }

  /**
   * Check if a user has permission for a specific resource/action
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheck> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/services/check-permission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": this.config.serviceKey,
            "X-Service-Name": this.config.serviceName,
          },
          body: JSON.stringify({ userId, resource, action }),
          signal: AbortSignal.timeout(this.config.timeout || 5000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AuthServiceError(
          (error as any).message || "Unknown error",
          (error as any).code || "UNKNOWN_ERROR",
          response.status
        );
      }

      const result = await response.json();
      return (result as any).data;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to check permission",
        "PERMISSION_CHECK_ERROR",
        500
      );
    }
  }

  /**
   * Get user's permissions summary
   */
  async getUserPermissions(userId: string): Promise<{
    hasSubscription: boolean;
    planName?: string;
    permissions: Record<string, string[]>;
    limits: Record<string, number>;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/services/user-permissions/${userId}`,
        {
          method: "GET",
          headers: {
            "X-Service-Key": this.config.serviceKey,
            "X-Service-Name": this.config.serviceName,
          },
          signal: AbortSignal.timeout(this.config.timeout || 5000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AuthServiceError(
          (error as any).message || "Unknown error",
          (error as any).code || "UNKNOWN_ERROR",
          response.status
        );
      }

      const result = await response.json();
      return (result as any).data;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to get user permissions",
        "USER_PERMISSIONS_ERROR",
        500
      );
    }
  }

  /**
   * Track resource usage for billing and limits
   */
  async trackUsage(usage: UsageInfo & { userId: string }): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/services/track-usage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": this.config.serviceKey,
            "X-Service-Name": this.config.serviceName,
          },
          body: JSON.stringify(usage),
          signal: AbortSignal.timeout(this.config.timeout || 5000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AuthServiceError(
          (error as any).message || "Unknown error",
          (error as any).code || "UNKNOWN_ERROR",
          response.status
        );
      }
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to track usage",
        "USAGE_TRACK_ERROR",
        500
      );
    }
  }

  /**
   * Get user's current month usage
   */
  async getUserUsage(userId: string): Promise<
    Array<{
      resource: string;
      action: string;
      total_usage: number;
      action_count: number;
    }>
  > {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/services/user-usage/${userId}`,
        {
          method: "GET",
          headers: {
            "X-Service-Key": this.config.serviceKey,
            "X-Service-Name": this.config.serviceName,
          },
          signal: AbortSignal.timeout(this.config.timeout || 5000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AuthServiceError(
          (error as any).message || "Unknown error",
          (error as any).code || "UNKNOWN_ERROR",
          response.status
        );
      }

      const result = await response.json();
      return (result as any).data;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to get user usage",
        "USER_USAGE_ERROR",
        500
      );
    }
  }

  /**
   * Bulk permission check for multiple users
   */
  async bulkCheckPermissions(
    checks: Array<{ userId: string; resource: string; action: string }>
  ): Promise<
    Array<{
      userId: string;
      resource: string;
      action: string;
      hasPermission: boolean;
      reason?: string;
      planId?: string;
      error?: string;
    }>
  > {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/services/bulk-permissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": this.config.serviceKey,
            "X-Service-Name": this.config.serviceName,
          },
          body: JSON.stringify({ checks }),
          signal: AbortSignal.timeout(this.config.timeout || 10000), // Longer timeout for bulk operations
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AuthServiceError(
          (error as any).message || "Unknown error",
          (error as any).code || "UNKNOWN_ERROR",
          response.status
        );
      }

      const result = await response.json();
      return (result as any).data;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to check bulk permissions",
        "BULK_PERMISSIONS_ERROR",
        500
      );
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    service: string;
    version: string;
    environment: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(this.config.timeout || 5000),
      });

      if (!response.ok) {
        throw new AuthServiceError(
          "Service unhealthy",
          "SERVICE_UNHEALTHY",
          response.status
        );
      }

      return (await response.json()) as {
        status: string;
        timestamp: string;
        service: string;
        version: string;
        environment: string;
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        "Failed to check service health",
        "HEALTH_CHECK_ERROR",
        500
      );
    }
  }
}

/**
 * Custom error class for auth service errors
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

/**
 * Helper function to create an auth service client
 */
export function createAuthClient(config: AuthServiceConfig): AuthServiceClient {
  return new AuthServiceClient(config);
}

/**
 * Common permission resources and actions
 */
export const PERMISSIONS = {
  RESOURCES: {
    // AI Resume Service - Core Features
    RESUME_GENERATION: "resume_generation",
    RESUME_TEMPLATE: "resume_template",
    RESUME_ANALYSIS: "resume_analysis",
    COVER_LETTER: "cover_letter",
    JOB_APPLICATION: "job_application",
    CAREER_COACHING: "career_coaching",

    // AI and Suggestions
    AI_SUGGESTIONS: "ai_suggestions",
    ATS_OPTIMIZATION: "ats_optimization",
    SKILL_ASSESSMENT: "skill_assessment",

    // Export and Formats
    EXPORT_FORMATS: "export_formats",
    CUSTOM_TEMPLATES: "custom_templates",

    // Job Tracking
    JOB_TRACKING: "job_tracking",
    INTERVIEW_SCHEDULING: "interview_scheduling",

    // Document Management Service (for future document services)
    DOCUMENT_MANAGEMENT: "document_management",
    DOCUMENT_VIEW: "document_view",
    DOCUMENT_EDIT: "document_edit",
    DOCUMENT_DELETE: "document_delete",
    DOCUMENT_UPLOAD: "document_upload",
    DOCUMENT_DOWNLOAD: "document_download",
    DOCUMENT_SHARING: "document_sharing",
    DOCUMENT_COLLABORATION: "document_collaboration",
    DOCUMENT_VERSION_CONTROL: "document_version_control",

    // Folder Management
    FOLDER_CREATE: "folder_create",
    FOLDER_MANAGE: "folder_manage",
    FOLDER_VIEW: "folder_view",
    FOLDER_DELETE: "folder_delete",

    // Storage and Collaboration
    STORAGE: "storage",
    COLLABORATION_INVITE: "collaboration_invite",
    COLLABORATION_MANAGE: "collaboration_manage",

    // General Services
    ANALYTICS: "analytics",
    API_ACCESS: "api_access",
    TEAM_MANAGEMENT: "team_management",
    PRIORITY_SUPPORT: "priority_support",
  },
  ACTIONS: {
    // Basic CRUD actions
    CREATE: "create",
    READ: "read",
    UPDATE: "update",
    DELETE: "delete",
    VIEW: "view",

    // Resume-specific actions
    EXPORT_PDF: "export_pdf",
    EXPORT_DOCX: "export_docx",
    EXPORT_TXT: "export_txt",
    EXPORT_HTML: "export_html",
    ATS_OPTIMIZE: "ats_optimize",
    AI_ANALYZE: "ai_analyze",
    CUSTOMIZE_TEMPLATE: "customize_template",

    // Document actions
    UPLOAD: "upload",
    DOWNLOAD: "download",
    SHARE: "share",
    EXPORT: "export",
    ACCESS: "access",
    INVITE: "invite",
    MANAGE: "manage",
    COLLABORATE: "collaborate",
    VERSION: "version",
    ORGANIZE: "organize",

    // Career development actions
    TRACK_APPLICATIONS: "track_applications",
    SCHEDULE_INTERVIEWS: "schedule_interviews",
    GET_AI_COACHING: "get_ai_coaching",
    ASSESS_SKILLS: "assess_skills",
    PLAN_CAREER_PATH: "plan_career_path",

    // Advanced actions
    BULK_OPERATIONS: "bulk_operations",
    WORKFLOW_MANAGEMENT: "workflow_management",
    ADVANCED_ANALYTICS: "advanced_analytics",
    API_READ: "api_read",
    API_WRITE: "api_write",
    WEBHOOKS: "webhooks",
  },
} as const;

/**
 * Utility function to check if a user can proceed with an action
 */
export function canProceed(permissionCheck: PermissionCheck): boolean {
  return permissionCheck.canProceed;
}

/**
 * Utility function to get remaining usage for a resource
 */
export function getRemainingUsage(
  permissionCheck: PermissionCheck
): number | null {
  return permissionCheck.usage?.remaining ?? null;
}

/**
 * Utility function to check if usage limit is exceeded
 */
export function isUsageLimitExceeded(
  permissionCheck: PermissionCheck
): boolean {
  return permissionCheck.usage
    ? permissionCheck.usage.current >= permissionCheck.usage.limit
    : false;
}
