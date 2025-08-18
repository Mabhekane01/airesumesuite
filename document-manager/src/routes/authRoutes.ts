import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import { query } from '@/config/database';

const router = Router();

// Get current user - integrated with AI Resume Suite
const getCurrentUser = asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  
  const userResult = await query(`
    SELECT id, email, name, subscription_tier, custom_domain, brand_logo_url, created_at
    FROM users 
    WHERE id = $1
  `, [userId]);
  
  if (userResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    data: {
      ...userResult.rows[0],
      tier: req.user.tier // Include AI Resume Suite tier
    }
  });
});

// Verify token endpoint (for cross-service communication)
const verifyToken = asyncHandler(async (req: any, res: any) => {
  // If we reach here, the token is valid (authMiddleware passed)
  res.json({
    success: true,
    data: {
      user: req.user,
      valid: true
    }
  });
});

// Routes
router.get('/me', authMiddleware, getCurrentUser);
router.get('/verify', authMiddleware, verifyToken);

export default router;