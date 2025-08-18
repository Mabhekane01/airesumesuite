import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireRole, requireSubscription } from '@/middleware/auth';
import { asyncHandler, validationErrorHandler } from '@/middleware/errorHandler';
import { query as dbQuery, withTransaction } from '@/config/database';
import { generateApiKey, hashApiKey } from '@/middleware/apiKey';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    throw validationErrorHandler(errors.array());
  }
  next();
};

// Get system statistics (Enterprise only)
const getSystemStats = asyncHandler(async (req: any, res: any) => {
  const { days = 30 } = req.query;
  
  // Total users
  const usersResult = await dbQuery('SELECT COUNT(*) as total FROM users');
  
  // Total documents
  const documentsResult = await dbQuery('SELECT COUNT(*) as total FROM documents WHERE status = $1', ['active']);
  
  // Total views
  const viewsResult = await dbQuery(`
    SELECT COUNT(*) as total 
    FROM document_views 
    WHERE created_at >= NOW() - INTERVAL '${Number(days)} days'
  `);
  
  // Storage usage
  const storageResult = await dbQuery('SELECT SUM(file_size) as total_bytes FROM documents WHERE status = $1', ['active']);
  
  // Active links
  const linksResult = await dbQuery('SELECT COUNT(*) as total FROM document_links WHERE is_active = true');
  
  res.json({
    success: true,
    data: {
      users: parseInt(usersResult.rows[0].total),
      documents: parseInt(documentsResult.rows[0].total),
      views: parseInt(viewsResult.rows[0].total),
      storageBytes: parseInt(storageResult.rows[0].total_bytes || 0),
      activeLinks: parseInt(linksResult.rows[0].total)
    }
  });
});

// Get all users (Enterprise only)
const getAllUsers = asyncHandler(async (req: any, res: any) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let whereClause = '';
  const params: any[] = [];
  
  if (search) {
    whereClause = 'WHERE email ILIKE $1 OR name ILIKE $1';
    params.push(`%${search}%`);
  }
  
  const usersResult = await dbQuery(`
    SELECT 
      id, email, name, subscription_tier, created_at,
      (SELECT COUNT(*) FROM documents WHERE user_id = users.id AND status = 'active') as document_count,
      (SELECT COUNT(*) FROM document_views dv JOIN documents d ON dv.document_id = d.id WHERE d.user_id = users.id) as total_views
    FROM users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, Number(limit), offset]);
  
  const countResult = await dbQuery(`
    SELECT COUNT(*) as total FROM users ${whereClause}
  `, params);
  
  const total = parseInt(countResult.rows[0].total);
  
  res.json({
    success: true,
    data: {
      users: usersResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// Create API key
const createApiKey = asyncHandler(async (req: any, res: any) => {
  const { name, permissions = [], expiresAt } = req.body;
  const userId = req.user.id;
  
  // Generate API key
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  
  // Store in database
  const apiKeyResult = await dbQuery(`
    INSERT INTO api_keys (id, user_id, name, key_hash, permissions, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, permissions, expires_at, created_at
  `, [
    uuidv4(),
    userId,
    name,
    keyHash,
    permissions,
    expiresAt || null
  ]);
  
  res.status(201).json({
    success: true,
    message: 'API key created successfully',
    data: {
      ...apiKeyResult.rows[0],
      key: apiKey, // Only return the key once during creation
      keyPrefix: apiKey.substring(0, 8) + '...'
    }
  });
});

// Get user API keys
const getApiKeys = asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  
  const apiKeysResult = await dbQuery(`
    SELECT 
      id, name, permissions, expires_at, last_used_at, is_active, created_at,
      CONCAT(SUBSTRING(key_hash, 1, 8), '...') as key_prefix
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
  
  res.json({
    success: true,
    data: apiKeysResult.rows
  });
});

// Delete API key
const deleteApiKey = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const deleteResult = await dbQuery(`
    DELETE FROM api_keys
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `, [id, userId]);
  
  if (deleteResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'API key not found',
      code: 'API_KEY_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    message: 'API key deleted successfully'
  });
});

// Organization management
const createOrganization = asyncHandler(async (req: any, res: any) => {
  const { name, domain } = req.body;
  const userId = req.user.id;
  
  const orgId = uuidv4();
  
  await withTransaction(async (client) => {
    // Create organization
    const orgResult = await client.query(`
      INSERT INTO organizations (id, name, domain)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [orgId, name, domain]);
    
    // Add user as owner
    await client.query(`
      INSERT INTO organization_members (id, organization_id, user_id, role)
      VALUES ($1, $2, $3, $4)
    `, [uuidv4(), orgId, userId, 'owner']);
    
    return orgResult.rows[0];
  });
  
  res.status(201).json({
    success: true,
    message: 'Organization created successfully',
    data: { id: orgId, name, domain }
  });
});

// Get user organizations
const getUserOrganizations = asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  
  const orgsResult = await dbQuery(`
    SELECT 
      o.id, o.name, o.domain, o.created_at,
      om.role,
      (SELECT COUNT(*) FROM documents WHERE organization_id = o.id) as document_count,
      (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = $1
    ORDER BY o.created_at DESC
  `, [userId]);
  
  res.json({
    success: true,
    data: orgsResult.rows
  });
});

// Routes
router.get('/stats',
  requireSubscription(['enterprise']),
  requireRole(['admin', 'owner']),
  getSystemStats
);

router.get('/users',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('search').optional().isLength({ min: 1 }).withMessage('Search query required'),
  ],
  validateRequest,
  requireSubscription(['enterprise']),
  requireRole(['admin', 'owner']),
  getAllUsers
);

router.post('/api-keys',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date'),
  ],
  validateRequest,
  createApiKey
);

router.get('/api-keys', getApiKeys);

router.delete('/api-keys/:id',
  [
    param('id').isUUID().withMessage('Invalid API key ID'),
  ],
  validateRequest,
  deleteApiKey
);

router.post('/organizations',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('domain').optional().isFQDN().withMessage('Invalid domain'),
  ],
  validateRequest,
  requireSubscription(['pro', 'enterprise']),
  createOrganization
);

router.get('/organizations', getUserOrganizations);

export default router;