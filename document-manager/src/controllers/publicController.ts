import { Request, Response } from 'express';
import { query, withTransaction } from '@/config/database';
import { cache } from '@/config/redis';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { logger, logAnalytics, logSecurity } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';

// Track document view
const trackView = async (
  linkId: string,
  documentId: string,
  req: Request,
  visitorData?: any
): Promise<string> => {
  const visitorId = uuidv4();
  const ua = UAParser(req.get('User-Agent') || '');
  const geo = geoip.lookup(req.ip || '');
  
  // Insert view record
  await query(`
    INSERT INTO document_views (
      id, document_id, link_id, visitor_id, visitor_email, visitor_name,
      session_id, user_agent, ip_address, country, city, device_type, browser, os,
      referrer, utm_source, utm_medium, utm_campaign
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
  `, [
    uuidv4(),
    documentId,
    linkId,
    visitorId,
    visitorData?.email || null,
    visitorData?.name || null,
    req.headers['x-session-id'] || null,
    req.get('User-Agent'),
    req.ip,
    geo?.country || null,
    geo?.city || null,
    ua.device.type || 'desktop',
    ua.browser.name || null,
    ua.os.name || null,
    req.get('Referer') || null,
    req.query.utm_source || null,
    req.query.utm_medium || null,
    req.query.utm_campaign || null
  ]);
  
  // Update link view count
  await query(
    'UPDATE document_links SET current_views = current_views + 1 WHERE id = $1',
    [linkId]
  );
  
  // Track in Redis for real-time analytics
  await cache.analytics.trackView(documentId, {
    visitorId,
    timestamp: new Date().toISOString(),
    country: geo?.country,
    device: ua.device.type || 'desktop',
    browser: ua.browser.name,
    referrer: req.get('Referer')
  });
  
  // Add to real-time viewers
  await cache.analytics.addViewer(documentId, visitorId);
  
  return visitorId;
};

// Track page view
const trackPageView = async (
  documentViewId: string,
  documentId: string,
  pageNumber: number,
  visitorId: string
): Promise<void> => {
  await query(`
    INSERT INTO page_views (id, document_view_id, document_id, page_number, viewed_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [uuidv4(), documentViewId, documentId, pageNumber]);
};

// View document by slug
export const viewDocument = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  
  // Get link and document data
  const linkResult = await query(`
    SELECT 
      dl.*,
      d.id as document_id, d.title, d.file_name, d.file_type, d.mime_type, 
      d.file_url, d.thumbnail_url, d.preview_images, d.page_count,
      u.email as owner_email, u.name as owner_name
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    JOIN users u ON dl.user_id = u.id
    WHERE dl.slug = $1 AND dl.is_active = true AND d.status = 'active'
  `, [slug]);
  
  if (linkResult.rows.length === 0) {
    // Log security event
    logSecurity('Invalid document link accessed', {
      slug,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    });
    
    return res.status(404).render('error', {
      message: 'Document not found',
      description: 'The document you are looking for does not exist or has been removed.',
      statusCode: 404
    });
  }
  
  const link = linkResult.rows[0];
  
  // Check if link has expired
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    logSecurity('Expired document link accessed', {
      linkId: link.id,
      slug,
      expiresAt: link.expires_at,
      ip: req.ip
    });
    
    return res.status(410).render('error', {
      message: 'Link Expired',
      description: 'This document link has expired and is no longer accessible.',
      statusCode: 410
    });
  }
  
  // Check view limit
  if (link.max_views && link.current_views >= link.max_views) {
    logSecurity('View limit exceeded for document link', {
      linkId: link.id,
      slug,
      maxViews: link.max_views,
      currentViews: link.current_views,
      ip: req.ip
    });
    
    return res.status(410).render('error', {
      message: 'View Limit Reached',
      description: 'This document has reached its maximum number of views.',
      statusCode: 410
    });
  }
  
  // Check IP restrictions
  if (link.ip_restrictions && link.ip_restrictions.length > 0) {
    const isAllowed = link.ip_restrictions.some((allowedIp: string) => {
      // Simple IP matching - could be enhanced with CIDR support
      return req.ip === allowedIp || req.ip?.includes(allowedIp);
    });
    
    if (!isAllowed) {
      logSecurity('IP restriction violation', {
        linkId: link.id,
        slug,
        clientIp: req.ip,
        allowedIps: link.ip_restrictions
      });
      
      return res.status(403).render('error', {
        message: 'Access Denied',
        description: 'Your IP address is not authorized to view this document.',
        statusCode: 403
      });
    }
  }
  
  // Check country restrictions
  if (link.country_restrictions && link.country_restrictions.length > 0) {
    const geo = geoip.lookup(req.ip || '');
    const userCountry = geo?.country;
    
    if (!userCountry || !link.country_restrictions.includes(userCountry)) {
      logSecurity('Country restriction violation', {
        linkId: link.id,
        slug,
        userCountry,
        allowedCountries: link.country_restrictions,
        ip: req.ip
      });
      
      return res.status(403).render('error', {
        message: 'Geographic Restriction',
        description: 'This document is not available in your location.',
        statusCode: 403
      });
    }
  }
  
  // Check if password is required
  if (link.password_hash) {
    const sessionKey = `link_auth:${link.id}:${req.ip}`;
    const isAuthenticated = await cache.get(sessionKey);
    
    if (!isAuthenticated) {
      return res.render('password-prompt', {
        slug,
        linkName: link.name,
        documentTitle: link.title,
        brandName: link.brand_name,
        brandLogo: link.brand_logo_url,
        brandColors: link.brand_colors
      });
    }
  }
  
  // Check if email/name is required
  if (link.require_email || link.require_name) {
    const sessionKey = `visitor_data:${link.id}:${req.ip}`;
    const visitorData = await cache.get(sessionKey);
    
    if (!visitorData) {
      return res.render('visitor-info', {
        slug,
        linkName: link.name,
        documentTitle: link.title,
        requireEmail: link.require_email,
        requireName: link.require_name,
        brandName: link.brand_name,
        brandLogo: link.brand_logo_url,
        brandColors: link.brand_colors
      });
    }
  }
  
  // Track the view
  const visitorData = link.require_email || link.require_name ? 
    await cache.get(`visitor_data:${link.id}:${req.ip}`) : null;
  
  const visitorId = await trackView(link.id, link.document_id, req, visitorData);
  
  // Log analytics
  logAnalytics('document_viewed', {
    documentId: link.document_id,
    linkId: link.id,
    visitorId,
    slug,
    fileType: link.file_type,
    ip: req.ip,
    country: geoip.lookup(req.ip || '')?.country
  });
  
  // Render document viewer
  res.render('document-viewer', {
    document: {
      id: link.document_id,
      title: link.title,
      fileName: link.file_name,
      fileType: link.file_type,
      fileUrl: link.file_url,
      thumbnailUrl: link.thumbnail_url,
      previewImages: link.preview_images,
      pageCount: link.page_count
    },
    link: {
      id: link.id,
      slug: link.slug,
      name: link.name,
      allowDownload: link.allow_download,
      allowPrint: link.allow_print,
      allowCopy: link.allow_copy,
      watermarkText: link.watermark_text,
      brandName: link.brand_name,
      brandLogo: link.brand_logo_url,
      brandColors: link.brand_colors
    },
    visitorId,
    analytics: {
      trackingEnabled: true,
      realTimeEnabled: true
    }
  });
});

// Authenticate with password
export const authenticatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { slug, password } = req.body;
  
  // Get link data
  const linkResult = await query(`
    SELECT id, password_hash, name, title
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.slug = $1 AND dl.is_active = true
  `, [slug]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Invalid link', 404, 'LINK_NOT_FOUND');
  }
  
  const link = linkResult.rows[0];
  
  if (!link.password_hash) {
    throw createError('Password not required', 400, 'PASSWORD_NOT_REQUIRED');
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, link.password_hash);
  
  if (!isValidPassword) {
    logSecurity('Invalid password attempt', {
      linkId: link.id,
      slug,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw createError('Invalid password', 401, 'INVALID_PASSWORD');
  }
  
  // Store authentication in cache (1 hour)
  const sessionKey = `link_auth:${link.id}:${req.ip}`;
  await cache.set(sessionKey, true, 3600);
  
  res.json({
    success: true,
    message: 'Authentication successful',
    redirectUrl: `/d/${slug}`
  });
});

// Submit visitor information
export const submitVisitorInfo = asyncHandler(async (req: Request, res: Response) => {
  const { slug, email, name, company, message } = req.body;
  
  // Get link data
  const linkResult = await query(`
    SELECT dl.id, dl.require_email, dl.require_name, d.title
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.slug = $1 AND dl.is_active = true
  `, [slug]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Invalid link', 404, 'LINK_NOT_FOUND');
  }
  
  const link = linkResult.rows[0];
  
  // Validate required fields
  if (link.require_email && !email) {
    throw createError('Email is required', 400, 'EMAIL_REQUIRED');
  }
  
  if (link.require_name && !name) {
    throw createError('Name is required', 400, 'NAME_REQUIRED');
  }
  
  // Store visitor data
  const visitorData = { email, name, company, message };
  const sessionKey = `visitor_data:${link.id}:${req.ip}`;
  await cache.set(sessionKey, visitorData, 86400); // 24 hours
  
  // Save email capture if email provided
  if (email) {
    await query(`
      INSERT INTO email_captures (id, document_id, link_id, email, name, company, message, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      uuidv4(),
      link.document_id,
      link.id,
      email,
      name || null,
      company || null,
      message || null,
      req.ip,
      req.get('User-Agent')
    ]);
    
    logAnalytics('email_captured', {
      linkId: link.id,
      email,
      name,
      company,
      ip: req.ip
    });
  }
  
  res.json({
    success: true,
    message: 'Information submitted successfully',
    redirectUrl: `/d/${slug}`
  });
});

// Download document
export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  
  // Get link and document data
  const linkResult = await query(`
    SELECT 
      dl.id as link_id, dl.allow_download, dl.watermark_text,
      d.id as document_id, d.file_path, d.file_name, d.mime_type
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.slug = $1 AND dl.is_active = true AND d.status = 'active'
  `, [slug]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  const data = linkResult.rows[0];
  
  if (!data.allow_download) {
    logSecurity('Unauthorized download attempt', {
      linkId: data.link_id,
      slug,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw createError('Downloads not allowed', 403, 'DOWNLOAD_NOT_ALLOWED');
  }
  
  // Log download
  const visitorId = uuidv4(); // Could get from session if tracking
  await query(`
    INSERT INTO document_downloads (id, document_id, link_id, visitor_id, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    uuidv4(),
    data.document_id,
    data.link_id,
    visitorId,
    req.ip,
    req.get('User-Agent')
  ]);
  
  logAnalytics('document_downloaded', {
    documentId: data.document_id,
    linkId: data.link_id,
    visitorId,
    slug,
    ip: req.ip
  });
  
  // Set download headers
  res.setHeader('Content-Disposition', `attachment; filename="${data.file_name}"`);
  res.setHeader('Content-Type', data.mime_type);
  
  // Send file
  res.sendFile(data.file_path, (err) => {
    if (err) {
      logger.error('File download failed:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Download failed',
          code: 'DOWNLOAD_ERROR'
        });
      }
    }
  });
});

// Track page view (API endpoint for frontend)
export const trackPageViewAPI = asyncHandler(async (req: Request, res: Response) => {
  const { documentId, pageNumber, duration, scrollPercentage, visitorId } = req.body;
  
  // Basic validation
  if (!documentId || !pageNumber || !visitorId) {
    throw createError('Missing required fields', 400, 'MISSING_FIELDS');
  }
  
  // Insert page view
  await query(`
    INSERT INTO page_views (id, document_id, page_number, duration_seconds, scroll_percentage, viewed_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `, [
    uuidv4(),
    documentId,
    pageNumber,
    duration || null,
    scrollPercentage || null
  ]);
  
  res.json({
    success: true,
    message: 'Page view tracked'
  });
});

export default {
  viewDocument,
  authenticatePassword,
  submitVisitorInfo,
  downloadDocument,
  trackPageViewAPI,
};