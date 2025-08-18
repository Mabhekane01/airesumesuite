import { Request, Response } from 'express';
import { query, withTransaction } from '@/config/database';
import { cache } from '@/config/redis';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { logger, logAnalytics, logSecurity } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate unique slug
const generateSlug = async (): Promise<string> => {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug: string;
  let isUnique = false;
  let attempts = 0;
  
  do {
    slug = '';
    for (let i = 0; i < 8; i++) {
      slug += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if slug is unique
    const existingResult = await query('SELECT id FROM document_links WHERE slug = $1', [slug]);
    isUnique = existingResult.rows.length === 0;
    attempts++;
    
    if (attempts > 10) {
      // Fallback to UUID-based slug
      slug = uuidv4().substring(0, 12).replace(/-/g, '');
      break;
    }
  } while (!isUnique);
  
  return slug;
};

// Create shareable link
export const createLink = asyncHandler(async (req: Request, res: Response) => {
  const {
    documentId,
    name,
    description,
    password,
    expiresAt,
    maxViews,
    allowDownload = true,
    allowPrint = true,
    allowCopy = true,
    requireEmail = false,
    requireName = false,
    customDomain,
    brandName,
    brandLogoUrl,
    brandColors = {},
    watermarkText,
    ipRestrictions = [],
    countryRestrictions = []
  } = req.body;
  
  const userId = req.user!.id;
  
  // Verify document ownership
  const documentResult = await query(`
    SELECT id, title, user_id, organization_id
    FROM documents
    WHERE id = $1 AND status = 'active' AND (
      user_id = $2 OR 
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `, [documentId, userId]);
  
  if (documentResult.rows.length === 0) {
    throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  const document = documentResult.rows[0];
  
  // Generate unique slug
  const slug = await generateSlug();
  
  // Hash password if provided
  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }
  
  // Create link
  const linkId = uuidv4();
  
  const linkResult = await query(`
    INSERT INTO document_links (
      id, document_id, user_id, slug, name, description,
      password_hash, expires_at, max_views, current_views,
      allow_download, allow_print, allow_copy, require_email, require_name,
      custom_domain, brand_name, brand_logo_url, brand_colors,
      watermark_text, ip_restrictions, country_restrictions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *
  `, [
    linkId,
    documentId,
    userId,
    slug,
    name || `Share of ${document.title}`,
    description,
    passwordHash,
    expiresAt || null,
    maxViews || null,
    0,
    allowDownload,
    allowPrint,
    allowCopy,
    requireEmail,
    requireName,
    customDomain || null,
    brandName || null,
    brandLogoUrl || null,
    JSON.stringify(brandColors),
    watermarkText || null,
    ipRestrictions,
    countryRestrictions
  ]);
  
  const link = linkResult.rows[0];
  
  // Log activity
  await query(`
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    userId,
    'create_link',
    'document_link',
    linkId,
    JSON.stringify({
      documentId,
      slug,
      hasPassword: !!password,
      expiresAt,
      maxViews
    }),
    req.ip,
    req.get('User-Agent')
  ]);
  
  // Clear cache
  await cache.del(`links:document:${documentId}`);
  
  // Log analytics
  logAnalytics('link_created', {
    linkId,
    documentId,
    userId,
    slug,
    hasPassword: !!password,
    hasExpiration: !!expiresAt,
    hasViewLimit: !!maxViews
  });
  
  // Return link without password hash
  const { password_hash, ...linkData } = link;
  
  res.status(201).json({
    success: true,
    message: 'Shareable link created successfully',
    data: {
      ...linkData,
      shortUrl: `/d/${slug}`,
      fullUrl: `${req.protocol}://${req.get('host')}/d/${slug}`,
      qrCode: `${req.protocol}://${req.get('host')}/api/links/${linkId}/qr`
    }
  });
});

// Get document links
export const getDocumentLinks = asyncHandler(async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const userId = req.user!.id;
  
  // Verify document access
  const documentResult = await query(`
    SELECT id FROM documents
    WHERE id = $1 AND (
      user_id = $2 OR 
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `, [documentId, userId]);
  
  if (documentResult.rows.length === 0) {
    throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  // Get links
  const linksResult = await query(`
    SELECT 
      id, slug, name, description, expires_at, max_views, current_views,
      allow_download, allow_print, allow_copy, require_email, require_name,
      custom_domain, brand_name, brand_logo_url, brand_colors,
      watermark_text, ip_restrictions, country_restrictions,
      is_active, created_at, updated_at,
      CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as has_password
    FROM document_links
    WHERE document_id = $1
    ORDER BY created_at DESC
  `, [documentId]);
  
  const links = linksResult.rows.map((link: any) => ({
    ...link,
    shortUrl: `/d/${link.slug}`,
    fullUrl: `${req.protocol}://${req.get('host')}/d/${link.slug}`,
    qrCode: `${req.protocol}://${req.get('host')}/api/links/${link.id}/qr`,
    isExpired: link.expires_at ? new Date(link.expires_at) < new Date() : false,
    isViewLimitReached: link.max_views ? link.current_views >= link.max_views : false
  }));
  
  res.json({
    success: true,
    data: links
  });
});

// Get single link
export const getLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const linkResult = await query(`
    SELECT 
      dl.*,
      d.title as document_title, d.file_name, d.file_type,
      CASE WHEN dl.password_hash IS NOT NULL THEN true ELSE false END as has_password
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.id = $1 AND (
      dl.user_id = $2 OR 
      d.organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `, [id, userId]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Link not found or access denied', 404, 'LINK_NOT_FOUND');
  }
  
  const link = linkResult.rows[0];
  
  // Remove password hash from response
  const { password_hash, ...linkData } = link;
  
  res.json({
    success: true,
    data: {
      ...linkData,
      shortUrl: `/d/${link.slug}`,
      fullUrl: `${req.protocol}://${req.get('host')}/d/${link.slug}`,
      qrCode: `${req.protocol}://${req.get('host')}/api/links/${link.id}/qr`,
      isExpired: link.expires_at ? new Date(link.expires_at) < new Date() : false,
      isViewLimitReached: link.max_views ? link.current_views >= link.max_views : false
    }
  });
});

// Update link
export const updateLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    description,
    password,
    expiresAt,
    maxViews,
    allowDownload,
    allowPrint,
    allowCopy,
    requireEmail,
    requireName,
    watermarkText,
    ipRestrictions,
    countryRestrictions,
    isActive
  } = req.body;
  
  const userId = req.user!.id;
  
  // Verify link ownership
  const linkResult = await query(`
    SELECT dl.id, dl.document_id
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.id = $1 AND (
      dl.user_id = $2 OR 
      d.organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2 AND role IN ('owner', 'admin')
      )
    )
  `, [id, userId]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Link not found or access denied', 404, 'LINK_NOT_FOUND');
  }
  
  // Hash new password if provided
  let passwordHash = undefined;
  if (password !== undefined) {
    passwordHash = password ? await bcrypt.hash(password, 12) : null;
  }
  
  // Build update query
  const updates = [];
  const values = [];
  let paramCount = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (passwordHash !== undefined) {
    updates.push(`password_hash = $${paramCount++}`);
    values.push(passwordHash);
  }
  if (expiresAt !== undefined) {
    updates.push(`expires_at = $${paramCount++}`);
    values.push(expiresAt);
  }
  if (maxViews !== undefined) {
    updates.push(`max_views = $${paramCount++}`);
    values.push(maxViews);
  }
  if (allowDownload !== undefined) {
    updates.push(`allow_download = $${paramCount++}`);
    values.push(allowDownload);
  }
  if (allowPrint !== undefined) {
    updates.push(`allow_print = $${paramCount++}`);
    values.push(allowPrint);
  }
  if (allowCopy !== undefined) {
    updates.push(`allow_copy = $${paramCount++}`);
    values.push(allowCopy);
  }
  if (requireEmail !== undefined) {
    updates.push(`require_email = $${paramCount++}`);
    values.push(requireEmail);
  }
  if (requireName !== undefined) {
    updates.push(`require_name = $${paramCount++}`);
    values.push(requireName);
  }
  if (watermarkText !== undefined) {
    updates.push(`watermark_text = $${paramCount++}`);
    values.push(watermarkText);
  }
  if (ipRestrictions !== undefined) {
    updates.push(`ip_restrictions = $${paramCount++}`);
    values.push(ipRestrictions);
  }
  if (countryRestrictions !== undefined) {
    updates.push(`country_restrictions = $${paramCount++}`);
    values.push(countryRestrictions);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(isActive);
  }
  
  if (updates.length === 0) {
    throw createError('No fields to update', 400, 'NO_UPDATE_FIELDS');
  }
  
  updates.push('updated_at = NOW()');
  values.push(id);
  
  const updateResult = await query(`
    UPDATE document_links 
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `, values);
  
  // Clear cache
  await cache.del(`links:document:${linkResult.rows[0].document_id}`);
  
  // Log activity
  await query(`
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    userId,
    'update_link',
    'document_link',
    id,
    JSON.stringify(req.body),
    req.ip,
    req.get('User-Agent')
  ]);
  
  // Remove password hash from response
  const { password_hash, ...updatedLinkData } = updateResult.rows[0];
  
  res.json({
    success: true,
    message: 'Link updated successfully',
    data: updatedLinkData
  });
});

// Delete link
export const deleteLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // Verify link ownership
  const linkResult = await query(`
    SELECT dl.id, dl.document_id, dl.slug
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.id = $1 AND (
      dl.user_id = $2 OR 
      d.organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2 AND role IN ('owner', 'admin')
      )
    )
  `, [id, userId]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Link not found or access denied', 404, 'LINK_NOT_FOUND');
  }
  
  const link = linkResult.rows[0];
  
  // Delete link and related data
  await withTransaction(async (client) => {
    // Delete email captures
    await client.query('DELETE FROM email_captures WHERE link_id = $1', [id]);
    
    // Delete downloads
    await client.query('DELETE FROM document_downloads WHERE link_id = $1', [id]);
    
    // Delete views
    await client.query('DELETE FROM document_views WHERE link_id = $1', [id]);
    
    // Delete link
    await client.query('DELETE FROM document_links WHERE id = $1', [id]);
    
    // Log activity
    await client.query(`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      'delete_link',
      'document_link',
      id,
      JSON.stringify({ slug: link.slug }),
      req.ip,
      req.get('User-Agent')
    ]);
  });
  
  // Clear cache
  await cache.del(`links:document:${link.document_id}`);
  
  res.json({
    success: true,
    message: 'Link deleted successfully'
  });
});

// Get link analytics
export const getLinkAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { days = 30 } = req.query;
  const userId = req.user!.id;
  
  // Verify link ownership
  const linkResult = await query(`
    SELECT dl.id, dl.slug
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.id = $1 AND (
      dl.user_id = $2 OR 
      d.organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `, [id, userId]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Link not found or access denied', 404, 'LINK_NOT_FOUND');
  }
  
  // Get analytics data
  const viewsResult = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as views,
      COUNT(DISTINCT visitor_id) as unique_visitors
    FROM document_views
    WHERE link_id = $1 AND created_at >= NOW() - INTERVAL '${Number(days)} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [id]);
  
  const downloadsResult = await query(`
    SELECT COUNT(*) as total_downloads
    FROM document_downloads
    WHERE link_id = $1 AND downloaded_at >= NOW() - INTERVAL '${Number(days)} days'
  `, [id]);
  
  const emailsResult = await query(`
    SELECT COUNT(*) as total_emails
    FROM email_captures
    WHERE link_id = $1 AND created_at >= NOW() - INTERVAL '${Number(days)} days'
  `, [id]);
  
  res.json({
    success: true,
    data: {
      views: viewsResult.rows,
      totalDownloads: parseInt(downloadsResult.rows[0].total_downloads),
      totalEmails: parseInt(emailsResult.rows[0].total_emails)
    }
  });
});

// Generate QR code
export const generateQRCode = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // Verify link ownership
  const linkResult = await query(`
    SELECT dl.slug
    FROM document_links dl
    JOIN documents d ON dl.document_id = d.id
    WHERE dl.id = $1 AND (
      dl.user_id = $2 OR 
      d.organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `, [id, userId]);
  
  if (linkResult.rows.length === 0) {
    throw createError('Link not found or access denied', 404, 'LINK_NOT_FOUND');
  }
  
  const link = linkResult.rows[0];
  const url = `${req.protocol}://${req.get('host')}/d/${link.slug}`;
  
  // Generate QR code (would need qrcode library)
  try {
    const QRCode = require('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        url
      }
    });
  } catch (error) {
    logger.error('QR code generation failed:', error);
    throw createError('QR code generation failed', 500, 'QR_GENERATION_ERROR');
  }
});

export default {
  createLink,
  getDocumentLinks,
  getLink,
  updateLink,
  deleteLink,
  getLinkAnalytics,
  generateQRCode,
};