import { Request, Response } from 'express';
import { query, withTransaction } from '@/config/database';
import { cache } from '@/config/redis';
import { DocumentProcessingService, UploadedFile } from '@/services/documentUploadService';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { logger, logAnalytics } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Document creation
export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, folderId, organizationId, source = 'upload', sourceMetadata = {} } = req.body;
  const userId = req.user!.id;
  
  if (!req.file) {
    throw createError('No file uploaded', 400, 'NO_FILE');
  }
  
  // Validate file
  DocumentProcessingService.validateFile(req.file);
  
  // Process the uploaded file
  const processedFile: UploadedFile = await DocumentProcessingService.processFile(req.file, userId);
  
  // Create document in database
  const documentId = uuidv4();
  
  await withTransaction(async (client) => {
    const documentResult = await client.query(`
      INSERT INTO documents (
        id, user_id, organization_id, folder_id, title, description,
        file_name, file_size, file_type, mime_type, file_url, file_path,
        page_count, thumbnail_url, preview_images, text_content,
        source, source_metadata, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      documentId,
      userId,
      organizationId || null,
      folderId || null,
      title || processedFile.originalName,
      description || null,
      processedFile.originalName,
      processedFile.fileSize,
      processedFile.fileType,
      processedFile.mimeType,
      processedFile.url,
      processedFile.filePath,
      processedFile.pageCount || null,
      processedFile.thumbnailUrl || null,
      processedFile.previewImages || [],
      processedFile.textContent || null,
      source,
      JSON.stringify(sourceMetadata),
      'completed'
    ]);
    
    // Log activity
    await client.query(`
      INSERT INTO activity_logs (user_id, organization_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      organizationId || null,
      'upload',
      'document',
      documentId,
      JSON.stringify({
        fileName: processedFile.originalName,
        fileSize: processedFile.fileSize,
        fileType: processedFile.fileType
      }),
      req.ip,
      req.get('User-Agent')
    ]);
    
    return documentResult.rows[0];
  });
  
  // Clear cache
  await cache.del(`documents:user:${userId}`);
  if (organizationId) {
    await cache.del(`documents:org:${organizationId}`);
  }
  
  // Log analytics
  logAnalytics('document_created', {
    documentId,
    userId,
    organizationId,
    fileType: processedFile.fileType,
    fileSize: processedFile.fileSize,
    source
  });
  
  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      id: documentId,
      title: title || processedFile.originalName,
      fileName: processedFile.originalName,
      fileSize: processedFile.fileSize,
      fileType: processedFile.fileType,
      url: processedFile.url,
      thumbnailUrl: processedFile.thumbnailUrl,
      pageCount: processedFile.pageCount,
      processing: processedFile.metadata
    }
  });
});

// Get user documents
export const getDocuments = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { folderId, organizationId, search, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  
  const offset = (Number(page) - 1) * Number(limit);
  
  // Build query
  let whereClause = 'WHERE d.status = $1 AND (d.user_id = $2';
  const params: any[] = ['active', userId];
  
  if (organizationId) {
    whereClause += ' OR d.organization_id = $3)';
    params.push(organizationId);
  } else {
    whereClause += ')';
  }
  
  if (folderId) {
    whereClause += ` AND d.folder_id = $${params.length + 1}`;
    params.push(folderId);
  }
  
  if (search) {
    whereClause += ` AND (d.title ILIKE $${params.length + 1} OR d.text_content ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }
  
  // Valid sort columns
  const validSortColumns = ['created_at', 'updated_at', 'title', 'file_size'];
  const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'created_at';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  
  // Get documents
  const documentsResult = await query(`
    SELECT 
      d.id, d.title, d.description, d.file_name, d.file_size, d.file_type,
      d.mime_type, d.file_url, d.thumbnail_url, d.page_count, d.source,
      d.created_at, d.updated_at, d.folder_id,
      f.name as folder_name,
      CASE WHEN d.organization_id IS NOT NULL THEN o.name ELSE NULL END as organization_name
    FROM documents d
    LEFT JOIN folders f ON d.folder_id = f.id
    LEFT JOIN organizations o ON d.organization_id = o.id
    ${whereClause}
    ORDER BY d.${sortColumn} ${order}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, Number(limit), offset]);
  
  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM documents d
    ${whereClause}
  `, params);
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / Number(limit));
  
  res.json({
    success: true,
    data: {
      documents: documentsResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }
  });
});

// Get single document
export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const documentResult = await query(`
    SELECT 
      d.*,
      f.name as folder_name,
      u.email as owner_email,
      CASE WHEN d.organization_id IS NOT NULL THEN o.name ELSE NULL END as organization_name
    FROM documents d
    LEFT JOIN folders f ON d.folder_id = f.id
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE d.id = $1 AND d.status = 'active' AND (
      d.user_id = $2 OR 
      d.organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `, [id, userId]);
  
  if (documentResult.rows.length === 0) {
    throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  const document = documentResult.rows[0];
  
  // Get document sharing links
  const linksResult = await query(`
    SELECT id, slug, name, is_active, created_at, expires_at, current_views, max_views
    FROM document_links
    WHERE document_id = $1 AND is_active = true
    ORDER BY created_at DESC
  `, [id]);
  
  res.json({
    success: true,
    data: {
      ...document,
      links: linksResult.rows
    }
  });
});

// Update document
export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, folderId } = req.body;
  const userId = req.user!.id;
  
  const updateResult = await query(`
    UPDATE documents 
    SET title = COALESCE($1, title),
        description = COALESCE($2, description),
        folder_id = COALESCE($3, folder_id),
        updated_at = NOW()
    WHERE id = $4 AND (
      user_id = $5 OR 
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $5 AND role IN ('owner', 'admin')
      )
    )
    RETURNING *
  `, [title, description, folderId, id, userId]);
  
  if (updateResult.rows.length === 0) {
    throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  // Clear cache
  await cache.del(`documents:user:${userId}`);
  
  // Log activity
  await query(`
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    userId,
    'update',
    'document',
    id,
    JSON.stringify({ title, description, folderId }),
    req.ip,
    req.get('User-Agent')
  ]);
  
  res.json({
    success: true,
    message: 'Document updated successfully',
    data: updateResult.rows[0]
  });
});

// Delete document
export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw createError('Document ID is required', 400, 'MISSING_DOCUMENT_ID');
  }
  
  const userId = req.user!.id;
  const { permanent = false } = req.query;
  
  // Get document details first
  const documentResult = await query(`
    SELECT file_path, file_url, thumbnail_url, preview_images, user_id
    FROM documents
    WHERE id = $1 AND (
      user_id = $2 OR 
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2 AND role IN ('owner', 'admin')
      )
    )
  `, [id, userId]);
  
  if (documentResult.rows.length === 0) {
    throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  const document = documentResult.rows[0];
  
  if (permanent === 'true') {
    // Permanent deletion
    await withTransaction(async (client) => {
      // Delete document links
      await client.query('DELETE FROM document_links WHERE document_id = $1', [id]);
      
      // Delete analytics data
      await client.query('DELETE FROM document_views WHERE document_id = $1', [id]);
      await client.query('DELETE FROM page_views WHERE document_id = $1', [id]);
      await client.query('DELETE FROM document_downloads WHERE document_id = $1', [id]);
      
      // Delete document
      await client.query('DELETE FROM documents WHERE id = $1', [id]);
      
      // Log activity
      await client.query(`
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        'delete_permanent',
        'document',
        id,
        JSON.stringify({ fileName: document.file_path }),
        req.ip,
        req.get('User-Agent')
      ]);
    });
    
    // Delete physical files
    try {
      const fileData: UploadedFile = {
        id,
        originalName: '',
        fileName: '',
        filePath: document.file_path,
        fileSize: 0,
        mimeType: '',
        fileType: '',
        url: document.file_url,
        thumbnailUrl: document.thumbnail_url,
        previewImages: document.preview_images
      };
      
      await DocumentProcessingService.deleteFile(fileData);
    } catch (error) {
      logger.error('File deletion failed:', error);
      // Continue - database deletion succeeded
    }
    
    res.json({
      success: true,
      message: 'Document permanently deleted'
    });
  } else {
    // Soft deletion
    await query(`
      UPDATE documents 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    // Log activity
    await query(`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      'delete',
      'document',
      id,
      JSON.stringify({ soft_delete: true }),
      req.ip,
      req.get('User-Agent')
    ]);
    
    res.json({
      success: true,
      message: 'Document moved to trash'
    });
  }
  
  // Clear cache
  await cache.del(`documents:user:${userId}`);
});

// Get document analytics
export const getDocumentAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { days = 30 } = req.query;
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
  `, [id, userId]);
  
  if (documentResult.rows.length === 0) {
    throw createError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND');
  }
  
  // Get analytics data
  const viewsResult = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as views,
      COUNT(DISTINCT visitor_id) as unique_visitors,
      COUNT(DISTINCT ip_address) as unique_ips
    FROM document_views
    WHERE document_id = $1 AND created_at >= NOW() - INTERVAL '${Number(days)} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [id]);
  
  // Get top countries
  const countriesResult = await query(`
    SELECT country, COUNT(*) as views
    FROM document_views
    WHERE document_id = $1 AND created_at >= NOW() - INTERVAL '${Number(days)} days'
    GROUP BY country
    ORDER BY views DESC
    LIMIT 10
  `, [id]);
  
  // Get device types
  const devicesResult = await query(`
    SELECT device_type, COUNT(*) as views
    FROM document_views
    WHERE document_id = $1 AND created_at >= NOW() - INTERVAL '${Number(days)} days'
    GROUP BY device_type
    ORDER BY views DESC
  `, [id]);
  
  // Get referrers
  const referrersResult = await query(`
    SELECT referrer, COUNT(*) as views
    FROM document_views
    WHERE document_id = $1 AND created_at >= NOW() - INTERVAL '${Number(days)} days' AND referrer IS NOT NULL
    GROUP BY referrer
    ORDER BY views DESC
    LIMIT 10
  `, [id]);
  
  res.json({
    success: true,
    data: {
      views: viewsResult.rows,
      countries: countriesResult.rows,
      devices: devicesResult.rows,
      referrers: referrersResult.rows
    }
  });
});

export default {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getDocumentAnalytics,
};