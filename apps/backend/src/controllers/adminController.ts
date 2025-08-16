import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { cleanupExpiredTokens, getTokenStats, cleanupUserTokens } from '../utils/tokenCleanup';

/**
 * Manual token cleanup endpoint (admin only)
 */
export const cleanupTokens = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await cleanupExpiredTokens();
    
    res.json({
      success: true,
      message: 'Token cleanup completed successfully',
      ...result
    });
  } catch (error) {
    console.error('❌ Admin token cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Token cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get token and session statistics
 */
export const getTokenStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getTokenStats();
    
    res.json({
      success: true,
      stats,
      recommendations: {
        shouldCleanup: stats.tokens.usersWithManyTokens > 0,
        criticalUsers: stats.tokens.usersWithManyTokens,
        totalTokensToCleanup: Math.max(0, stats.tokens.totalTokens - (stats.tokens.totalUsers * 5))
      }
    });
  } catch (error) {
    console.error('❌ Failed to get token statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Clean up tokens for a specific user
 */
export const cleanupUserTokensEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await cleanupUserTokens(userId);
    
    res.json({
      success: true,
      message: `Cleaned up tokens for user`,
      ...result
    });
  } catch (error) {
    console.error('❌ User token cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'User token cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};