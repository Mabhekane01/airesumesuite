import { query } from '../config/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { AdvancedAnalyticsService } from './advancedAnalyticsService';

export interface ShareableLink {
  id: string;
  documentId: string;
  userId: string;
  slug: string;
  name: string;
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

export interface ShareableLinkCreate {
  documentId: string;
  name: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
  allowDownload?: boolean;
  allowPrint?: boolean;
  allowCopy?: boolean;
  requireEmail?: boolean;
  requireName?: boolean;
  customDomain?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandColors?: Record<string, string>;
  watermarkText?: string;
  ipRestrictions?: string[];
  countryRestrictions?: string[];
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

export interface VisitorInfo {
  visitorId: string;
  email?: string;
  name?: string;
  company?: string;
  message?: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export class EnhancedDocumentSharingService {
  private analyticsService: AdvancedAnalyticsService;

  constructor() {
    this.analyticsService = new AdvancedAnalyticsService();
  }

  /**
   * Create a shareable link for a document
   */
  async createShareableLink(
    userId: string,
    linkData: ShareableLinkCreate
  ): Promise<ShareableLink> {
    try {
      // Verify document ownership
      const documentResult = await query(
        'SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND status = $3',
        [linkData.documentId, userId, 'active']
      );

      if (documentResult.rows.length === 0) {
        throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(linkData.name);
      
      // Hash password if provided
      let passwordHash: string | undefined;
      if (linkData.password) {
        passwordHash = await bcrypt.hash(linkData.password, 12);
      }

      const linkId = uuidv4();
      const result = await query(`
        INSERT INTO document_links (
          id, document_id, user_id, slug, name, description, password_hash,
          expires_at, max_views, allow_download, allow_print, allow_copy,
          require_email, require_name, custom_domain, brand_name, brand_logo_url,
          brand_colors, watermark_text, ip_restrictions, country_restrictions,
          is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) RETURNING *
      `, [
        linkId, linkData.documentId, userId, slug, linkData.name, linkData.description,
        passwordHash, linkData.expiresAt, linkData.maxViews, linkData.allowDownload ?? true,
        linkData.allowPrint ?? true, linkData.allowCopy ?? true, linkData.requireEmail ?? false,
        linkData.requireName ?? false, linkData.customDomain, linkData.brandName,
        linkData.brandLogoUrl, JSON.stringify(linkData.brandColors || {}),
        linkData.watermarkText, linkData.ipRestrictions || [], linkData.countryRestrictions || [],
        true, new Date(), new Date()
      ]);

      logger.info('Shareable link created', { userId, linkId, documentId: linkData.documentId });

      return this.mapRowToShareableLink(result.rows[0]);
    } catch (error) {
      logger.error('Error creating shareable link', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get a shareable link by slug
   */
  async getShareableLinkBySlug(slug: string): Promise<ShareableLink | null> {
    try {
      const result = await query(`
        SELECT * FROM document_links WHERE slug = $1 AND is_active = true
      `, [slug]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToShareableLink(result.rows[0]);
    } catch (error) {
      logger.error('Error getting shareable link by slug', { error: error.message, slug });
      throw error;
    }
  }

  /**
   * Update a shareable link
   */
  async updateShareableLink(
    userId: string,
    linkId: string,
    updates: Partial<ShareableLinkCreate>
  ): Promise<ShareableLink> {
    try {
      // Verify ownership
      const linkResult = await query(
        'SELECT id FROM document_links WHERE id = $1 AND user_id = $2',
        [linkId, userId]
      );

      if (linkResult.rows.length === 0) {
        throw createError('Link not found or access denied', 404, 'LINK_NOT_FOUND');
      }

      // Hash password if provided
      let passwordHash: string | undefined;
      if (updates.password) {
        passwordHash = await bcrypt.hash(updates.password, 12);
      }

      const result = await query(`
        UPDATE document_links SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          password_hash = COALESCE($3, password_hash),
          expires_at = COALESCE($4, expires_at),
          max_views = COALESCE($5, max_views),
          allow_download = COALESCE($6, allow_download),
          allow_print = COALESCE($7, allow_print),
          allow_copy = COALESCE($8, allow_copy),
          require_email = COALESCE($9, require_email),
          require_name = COALESCE($10, require_name),
          custom_domain = COALESCE($11, custom_domain),
          brand_name = COALESCE($12, brand_name),
          brand_logo_url = COALESCE($13, brand_logo_url),
          brand_colors = COALESCE($14, brand_colors),
          watermark_text = COALESCE($15, watermark_text),
          ip_restrictions = COALESCE($16, ip_restrictions),
          country_restrictions = COALESCE($17, country_restrictions),
          updated_at = NOW()
        WHERE id = $18
        RETURNING *
      `, [
        updates.name, updates.description, passwordHash, updates.expiresAt,
        updates.maxViews, updates.allowDownload, updates.allowPrint, updates.allowCopy,
        updates.requireEmail, updates.requireName, updates.customDomain, updates.brandName,
        updates.brandLogoUrl, JSON.stringify(updates.brandColors || {}),
        updates.watermarkText, updates.ipRestrictions, updates.countryRestrictions, linkId
      ]);

      logger.info('Shareable link updated', { userId, linkId });

      return this.mapRowToShareableLink(result.rows[0]);
    } catch (error) {
      logger.error('Error updating shareable link', { error: error.message, userId, linkId });
      throw error;
    }
  }

  /**
   * Create a data room
   */
  async createDataRoom(
    userId: string,
    organizationId: string | undefined,
    dataRoomData: {
      name: string;
      description?: string;
      password?: string;
      expiresAt?: Date;
      allowDownload?: boolean;
      requireEmail?: boolean;
      brandName?: string;
      brandLogoUrl?: string;
      brandColors?: Record<string, string>;
    }
  ): Promise<DataRoom> {
    try {
      let passwordHash: string | undefined;
      if (dataRoomData.password) {
        passwordHash = await bcrypt.hash(dataRoomData.password, 12);
      }

      const dataRoomId = uuidv4();
      const result = await query(`
        INSERT INTO data_rooms (
          id, user_id, organization_id, name, description, password_hash,
          expires_at, allow_download, require_email, brand_name, brand_logo_url,
          brand_colors, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *
      `, [
        dataRoomId, userId, organizationId, dataRoomData.name, dataRoomData.description,
        passwordHash, dataRoomData.expiresAt, dataRoomData.allowDownload ?? true,
        dataRoomData.requireEmail ?? false, dataRoomData.brandName, dataRoomData.brandLogoUrl,
        JSON.stringify(dataRoomData.brandColors || {}), true, new Date(), new Date()
      ]);

      logger.info('Data room created', { userId, dataRoomId });

      return this.mapRowToDataRoom(result.rows[0]);
    } catch (error) {
      logger.error('Error creating data room', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Add document to data room
   */
  async addDocumentToDataRoom(
    userId: string,
    dataRoomId: string,
    documentId: string,
    displayOrder: number = 0,
    isRequired: boolean = false
  ): Promise<DataRoomDocument> {
    try {
      // Verify data room ownership
      const dataRoomResult = await query(
        'SELECT id FROM data_rooms WHERE id = $1 AND user_id = $2',
        [dataRoomId, userId]
      );

      if (dataRoomResult.rows.length === 0) {
        throw createError('Data room not found or access denied', 404, 'DATA_ROOM_NOT_FOUND');
      }

      // Verify document ownership
      const documentResult = await query(
        'SELECT id FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );

      if (documentResult.rows.length === 0) {
        throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
      }

      const dataRoomDocumentId = uuidv4();
      const result = await query(`
        INSERT INTO data_room_documents (
          id, data_room_id, document_id, display_order, is_required, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [dataRoomDocumentId, dataRoomId, documentId, displayOrder, isRequired, new Date()]);

      logger.info('Document added to data room', { userId, dataRoomId, documentId });

      return this.mapRowToDataRoomDocument(result.rows[0]);
    } catch (error) {
      logger.error('Error adding document to data room', { error: error.message, userId, dataRoomId });
      throw error;
    }
  }

  /**
   * Record document view with enhanced tracking
   */
  async recordDocumentView(
    linkId: string,
    visitorInfo: VisitorInfo
  ): Promise<void> {
    try {
      // Check if link is still valid
      const linkResult = await query(`
        SELECT * FROM document_links WHERE id = $1 AND is_active = true
      `, [linkId]);

      if (linkResult.rows.length === 0) {
        throw createError('Link not found or inactive', 404, 'LINK_NOT_FOUND');
      }

      const link = linkResult.rows[0];

      // Check expiration
      if (link.expires_at && new Date() > link.expires_at) {
        throw createError('Link has expired', 410, 'LINK_EXPIRED');
      }

      // Check max views
      if (link.max_views && link.current_views >= link.max_views) {
        throw createError('Maximum views reached', 429, 'MAX_VIEWS_REACHED');
      }

      // Check IP restrictions
      if (link.ip_restrictions && link.ip_restrictions.length > 0) {
        if (!link.ip_restrictions.includes(visitorInfo.ipAddress)) {
          throw createError('IP address not allowed', 403, 'IP_NOT_ALLOWED');
        }
      }

      // Check country restrictions
      if (link.country_restrictions && link.country_restrictions.length > 0) {
        if (visitorInfo.country && !link.country_restrictions.includes(visitorInfo.country)) {
          throw createError('Country not allowed', 403, 'COUNTRY_NOT_ALLOWED');
        }
      }

      // Record the view
      const viewId = uuidv4();
      await query(`
        INSERT INTO document_views (
          id, document_id, link_id, visitor_id, visitor_email, visitor_name,
          session_id, user_agent, ip_address, country, city, device_type,
          browser, os, referrer, utm_source, utm_medium, utm_campaign, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
      `, [
        viewId, link.document_id, linkId, visitorInfo.visitorId, visitorInfo.email,
        visitorInfo.name, visitorInfo.visitorId, visitorInfo.userAgent, visitorInfo.ipAddress,
        visitorInfo.country, visitorInfo.city, visitorInfo.deviceType, visitorInfo.browser,
        visitorInfo.os, visitorInfo.referrer, visitorInfo.utmSource, visitorInfo.utmMedium,
        visitorInfo.utmCampaign, new Date()
      ]);

      // Update view count
      await query(`
        UPDATE document_links SET current_views = current_views + 1 WHERE id = $1
      `, [linkId]);

      // Record email capture if required
      if (link.require_email && visitorInfo.email) {
        await this.recordEmailCapture(link.document_id, linkId, visitorInfo);
      }

      logger.info('Document view recorded', { linkId, visitorId: visitorInfo.visitorId });
    } catch (error) {
      logger.error('Error recording document view', { error: error.message, linkId });
      throw error;
    }
  }

  /**
   * Record page view with interaction tracking
   */
  async recordPageView(
    documentViewId: string,
    pageNumber: number,
    durationSeconds: number,
    scrollPercentage: number,
    interactions: Record<string, any>
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO page_views (
          document_view_id, document_id, page_number, duration_seconds,
          scroll_percentage, interactions, viewed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
      `, [
        documentViewId, null, pageNumber, durationSeconds,
        scrollPercentage, JSON.stringify(interactions), new Date()
      ]);
    } catch (error) {
      logger.error('Error recording page view', { error: error.message, documentViewId });
      throw error;
    }
  }

  /**
   * Record document download
   */
  async recordDocumentDownload(
    documentId: string,
    linkId: string,
    visitorId: string,
    downloadType: string = 'pdf',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO document_downloads (
          document_id, link_id, visitor_id, download_type, ip_address, user_agent, downloaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [documentId, linkId, visitorId, downloadType, ipAddress, userAgent, new Date()]);

      logger.info('Document download recorded', { documentId, linkId, visitorId });
    } catch (error) {
      logger.error('Error recording document download', { error: error.message, documentId });
      throw error;
    }
  }

  /**
   * Generate QR code for a shareable link
   */
  async generateQRCode(linkId: string, baseUrl: string): Promise<string> {
    try {
      const linkResult = await query(
        'SELECT slug FROM document_links WHERE id = $1',
        [linkId]
      );

      if (linkResult.rows.length === 0) {
        throw createError('Link not found', 404, 'LINK_NOT_FOUND');
      }

      const fullUrl = `${baseUrl}/view/${linkResult.rows[0].slug}`;
      const qrCodeDataUrl = await QRCode.toDataURL(fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      logger.error('Error generating QR code', { error: error.message, linkId });
      throw error;
    }
  }

  /**
   * Get AI-powered insights for a document
   */
  async getDocumentInsights(documentId: string): Promise<{
    engagementTrends: string[];
    viewerBehavior: string[];
    optimizationSuggestions: string[];
    contentRecommendations: string[];
  }> {
    try {
      const analytics = await this.analyticsService.getDocumentAnalytics(documentId);
      const predictive = await this.analyticsService.getPredictiveAnalytics(documentId);

      const insights = {
        engagementTrends: [],
        viewerBehavior: [],
        optimizationSuggestions: [],
        contentRecommendations: []
      };

      // Analyze engagement trends
      if (predictive.trend === 'increasing') {
        insights.engagementTrends.push('Document engagement is trending upward');
      } else if (predictive.trend === 'decreasing') {
        insights.engagementTrends.push('Document engagement is declining - consider updating content');
      }

      // Analyze viewer behavior
      if (analytics.averageViewTime < 60) {
        insights.viewerBehavior.push('Viewers spend less than 1 minute on average - content may be too long or not engaging');
      }

      if (analytics.conversionRate < 5) {
        insights.optimizationSuggestions.push('Low conversion rate - consider adding clear call-to-actions');
      }

      // Content recommendations based on analytics
      if (analytics.topPages.length > 0) {
        const mostViewedPage = analytics.topPages[0];
        insights.contentRecommendations.push(`Page ${mostViewedPage.pageNumber} is most engaging - expand on this content`);
      }

      return insights;
    } catch (error) {
      logger.error('Error getting document insights', { error: error.message, documentId });
      throw error;
    }
  }

  /**
   * Generate unique slug for a link
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const result = await query(
        'SELECT id FROM document_links WHERE slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Record email capture
   */
  private async recordEmailCapture(
    documentId: string,
    linkId: string,
    visitorInfo: VisitorInfo
  ): Promise<void> {
    try {
      if (!visitorInfo.email) return;

      await query(`
        INSERT INTO email_captures (
          document_id, link_id, email, name, company, message, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        documentId, linkId, visitorInfo.email, visitorInfo.name, visitorInfo.company,
        visitorInfo.message, visitorInfo.ipAddress, visitorInfo.userAgent, new Date()
      ]);
    } catch (error) {
      logger.error('Error recording email capture', { error: error.message, documentId });
    }
  }

  /**
   * Map database row to ShareableLink object
   */
  private mapRowToShareableLink(row: any): ShareableLink {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      passwordHash: row.password_hash,
      expiresAt: row.expires_at,
      maxViews: row.max_views,
      currentViews: row.current_views,
      allowDownload: row.allow_download,
      allowPrint: row.allow_print,
      allowCopy: row.allow_copy,
      requireEmail: row.require_email,
      requireName: row.require_name,
      customDomain: row.custom_domain,
      brandName: row.brand_name,
      brandLogoUrl: row.brand_logo_url,
      brandColors: row.brand_colors || {},
      watermarkText: row.watermark_text,
      ipRestrictions: row.ip_restrictions || [],
      countryRestrictions: row.country_restrictions || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to DataRoom object
   */
  private mapRowToDataRoom(row: any): DataRoom {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      passwordHash: row.password_hash,
      expiresAt: row.expires_at,
      allowDownload: row.allow_download,
      requireEmail: row.require_email,
      brandName: row.brand_name,
      brandLogoUrl: row.brand_logo_url,
      brandColors: row.brand_colors || {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to DataRoomDocument object
   */
  private mapRowToDataRoomDocument(row: any): DataRoomDocument {
    return {
      id: row.id,
      dataRoomId: row.data_room_id,
      documentId: row.document_id,
      displayOrder: row.display_order,
      isRequired: row.is_required,
      createdAt: row.created_at,
    };
  }
}


