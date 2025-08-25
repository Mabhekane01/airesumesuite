import { query } from "../database/connection";
import { Document, CreateDocumentLinkRequest } from "../types";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export class DocumentService {
  /**
   * Get document by ID
   */
  async getDocument(id: string, userId: string): Promise<Document | null> {
    try {
      const result = await query(
        `
        SELECT * FROM documents 
        WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [id, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Get document error", {
        error: error.message,
        documentId: id,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create shareable link
   */
  async createShareableLink(
    request: CreateDocumentLinkRequest,
    userId: string
  ): Promise<any> {
    try {
      // Verify document ownership
      const document = await this.getDocument(request.documentId, userId);
      if (!document) {
        throw new Error("Document not found or access denied");
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug();

      // Hash password if provided
      let passwordHash = null;
      if (request.password) {
        passwordHash = await bcrypt.hash(request.password, 12);
      }

      const linkId = uuidv4();
      const result = await query(
        `
        INSERT INTO document_links (
          id, document_id, user_id, slug, name, description,
          password_hash, expires_at, max_views, current_views,
          allow_download, allow_print, allow_copy, require_email,
          require_name, custom_domain, brand_name, brand_logo_url,
          brand_colors, watermark_text, ip_restrictions,
          country_restrictions, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())
        RETURNING *
      `,
        [
          linkId,
          request.documentId,
          userId,
          slug,
          request.name || `Share of ${document.title}`,
          request.description,
          passwordHash,
          request.expiresAt,
          request.maxViews,
          0,
          request.allowDownload ?? true,
          request.allowPrint ?? true,
          request.allowCopy ?? true,
          request.requireEmail ?? false,
          request.requireName ?? false,
          request.customDomain,
          request.brandName,
          request.brandLogoUrl,
          JSON.stringify(request.brandColors || {}),
          request.watermarkText,
          JSON.stringify(request.ipRestrictions || []),
          JSON.stringify(request.countryRestrictions || []),
          true,
        ]
      );

      const link = result.rows[0];

      // Log activity
      await this.logActivity(userId, "create_link", "document_link", linkId, {
        documentId: request.documentId,
        slug,
        hasPassword: !!request.password,
        expiresAt: request.expiresAt,
        maxViews: request.maxViews,
      });

      return {
        ...link,
        shortUrl: `/d/${slug}`,
        fullUrl: `${process.env.BASE_URL || "http://localhost:4000"}/d/${slug}`,
      };
    } catch (error) {
      logger.error("Create shareable link error", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get document link by slug
   */
  async getDocumentLinkBySlug(slug: string): Promise<any> {
    try {
      const result = await query(
        `
        SELECT 
          dl.*,
          d.title, d.file_name, d.file_size, d.file_type,
          d.mime_type, d.file_url, d.page_count
        FROM document_links dl
        JOIN documents d ON dl.document_id = d.id
        WHERE dl.slug = $1 AND dl.is_active = true AND d.status = 'active'
      `,
        [slug]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Get document link by slug error", {
        error: error.message,
        slug,
      });
      throw error;
    }
  }

  /**
   * Record document view
   */
  async recordDocumentView(
    linkId: string,
    documentId: string,
    viewData: {
      ipAddress: string;
      userAgent: string;
      referrer?: string;
      country?: string;
      city?: string;
      timeOnPage?: number;
      pagesViewed?: number[];
      actions?: string[];
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    }
  ): Promise<void> {
    try {
      const viewId = uuidv4();
      await query(
        `
        INSERT INTO document_views (
          id, document_id, link_id, ip_address, user_agent,
          referrer, country, city, time_on_page, pages_viewed,
          actions, utm_source, utm_medium, utm_campaign, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `,
        [
          viewId,
          documentId,
          linkId,
          viewData.ipAddress,
          viewData.userAgent,
          viewData.referrer,
          viewData.country,
          viewData.city,
          viewData.timeOnPage || 0,
          JSON.stringify(viewData.pagesViewed || []),
          JSON.stringify(viewData.actions || []),
          viewData.utmSource,
          viewData.utmMedium,
          viewData.utmCampaign,
        ]
      );

      // Update view count
      await query(
        `
        UPDATE document_links 
        SET current_views = current_views + 1, updated_at = NOW()
        WHERE id = $1
      `,
        [linkId]
      );

      logger.info("Document view recorded", { viewId, documentId, linkId });
    } catch (error) {
      logger.error("Record document view error", {
        error: error.message,
        documentId,
        linkId,
      });
      throw error;
    }
  }

  /**
   * Record document download
   */
  async recordDocumentDownload(
    linkId: string,
    documentId: string,
    downloadData: {
      ipAddress: string;
      userAgent: string;
      country?: string;
      city?: string;
    }
  ): Promise<void> {
    try {
      const downloadId = uuidv4();
      await query(
        `
        INSERT INTO document_downloads (
          id, document_id, link_id, ip_address, user_agent,
          country, city, downloaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
        [
          downloadId,
          documentId,
          linkId,
          downloadData.ipAddress,
          downloadData.userAgent,
          downloadData.country,
          downloadData.city,
        ]
      );

      logger.info("Document download recorded", {
        downloadId,
        documentId,
        linkId,
      });
    } catch (error) {
      logger.error("Record document download error", {
        error: error.message,
        documentId,
        linkId,
      });
      throw error;
    }
  }

  /**
   * Capture email for lead generation
   */
  async captureEmail(
    linkId: string,
    emailData: {
      email: string;
      name?: string;
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<void> {
    try {
      const captureId = uuidv4();
      await query(
        `
        INSERT INTO email_captures (
          id, link_id, email, name, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
        [
          captureId,
          linkId,
          emailData.email,
          emailData.name,
          emailData.ipAddress,
          emailData.userAgent,
        ]
      );

      logger.info("Email captured", {
        captureId,
        linkId,
        email: emailData.email,
      });
    } catch (error) {
      logger.error("Capture email error", { error: error.message, linkId });
      throw error;
    }
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(
    documentId: string,
    userId: string,
    days: number = 30
  ): Promise<any> {
    try {
      // Verify document ownership
      const document = await this.getDocument(documentId, userId);
      if (!document) {
        throw new Error("Document not found or access denied");
      }

      // Get views data
      const viewsResult = await query(
        `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as views,
          COUNT(DISTINCT ip_address) as unique_viewers
        FROM document_views 
        WHERE document_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
        [documentId]
      );

      // Get downloads data
      const downloadsResult = await query(
        `
        SELECT COUNT(*) as total_downloads
        FROM document_downloads 
        WHERE document_id = $1 AND downloaded_at >= NOW() - INTERVAL '${days} days'
      `,
        [documentId]
      );

      // Get email captures
      const emailsResult = await query(
        `
        SELECT COUNT(*) as total_emails
        FROM email_captures ec
        JOIN document_links dl ON ec.link_id = dl.id
        WHERE dl.document_id = $1 AND ec.created_at >= NOW() - INTERVAL '${days} days'
      `,
        [documentId]
      );

      return {
        views: viewsResult.rows,
        totalDownloads: parseInt(
          downloadsResult.rows[0].total_downloads || "0"
        ),
        totalEmails: parseInt(emailsResult.rows[0].total_emails || "0"),
        period: `${days} days`,
      };
    } catch (error) {
      logger.error("Get document analytics error", {
        error: error.message,
        documentId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate unique slug
   */
  private async generateUniqueSlug(): Promise<string> {
    const characters =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let slug: string;
    let isUnique = false;
    let attempts = 0;

    do {
      slug = "";
      for (let i = 0; i < 8; i++) {
        slug += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }

      // Check if slug is unique
      const existingResult = await query(
        "SELECT id FROM document_links WHERE slug = $1",
        [slug]
      );
      isUnique = existingResult.rows.length === 0;
      attempts++;

      if (attempts > 10) {
        // Fallback to UUID-based slug
        slug = uuidv4().substring(0, 12).replace(/-/g, "");
        break;
      }
    } while (!isUnique);

    return slug;
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: any
  ): Promise<void> {
    try {
      await query(
        `
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
        [
          userId,
          action,
          resourceType,
          resourceId,
          details ? JSON.stringify(details) : null,
        ]
      );
    } catch (error) {
      logger.error("Log activity error", {
        error: error.message,
        userId,
        action,
      });
    }
  }
}
