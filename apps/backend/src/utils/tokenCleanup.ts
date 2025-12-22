import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { limitActiveTokens } from './jwt';

export interface CleanupResult {
  usersProcessed: number;
  tokensRemoved: number;
  oldSessionsClosed: number;
}

/**
 * Clean up expired refresh tokens for all users
 */
export const cleanupExpiredTokens = async (): Promise<CleanupResult> => {
  console.log('🧹 Starting token cleanup process...');
  
  let usersProcessed = 0;
  let tokensRemoved = 0;
  let oldSessionsClosed = 0;

  try {
    // Find all users with refresh tokens
    const users = await User.find({ 
      refreshTokens: { $exists: true, $not: { $size: 0 } } 
    });

    for (const user of users) {
      const originalTokenCount = user.refreshTokens.length;
      
      // Clean expired tokens and limit to 5 active tokens
      user.refreshTokens = limitActiveTokens(user.refreshTokens, 5);
      
      const removedCount = originalTokenCount - user.refreshTokens.length;
      
      if (removedCount > 0) {
        await user.save();
        tokensRemoved += removedCount;
        console.log(`🧹 User ${user.email}: removed ${removedCount} tokens (${originalTokenCount} → ${user.refreshTokens.length})`);
      }
      
      usersProcessed++;
    }

    // Clean up old inactive sessions (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const oldSessions = await UserSession.updateMany(
      { 
        isActive: true,
        lastActivity: { $lt: thirtyDaysAgo }
      },
      { 
        isActive: false, 
        logoutTime: new Date() 
      }
    );

    oldSessionsClosed = oldSessions.modifiedCount;

    console.log(`✅ Cleanup complete: ${usersProcessed} users processed, ${tokensRemoved} tokens removed, ${oldSessionsClosed} old sessions closed`);

    return {
      usersProcessed,
      tokensRemoved,
      oldSessionsClosed
    };

  } catch (error) {
    console.error('❌ Token cleanup failed:', error);
    throw error;
  }
};

/**
 * Clean up tokens for a specific user
 */
export const cleanupUserTokens = async (userId: string): Promise<{ tokensRemoved: number }> => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const originalTokenCount = user.refreshTokens.length;
  user.refreshTokens = limitActiveTokens(user.refreshTokens, 5);
  const removedCount = originalTokenCount - user.refreshTokens.length;

  if (removedCount > 0) {
    await user.save();
    console.log(`🧹 User ${user.email}: cleaned ${removedCount} tokens`);
  }

  return { tokensRemoved: removedCount };
};

/**
 * Get token statistics for monitoring
 */
export const getTokenStats = async () => {
  const stats = await User.aggregate([
    {
      $project: {
        email: 1,
        tokenCount: { $size: { $ifNull: ['$refreshTokens', []] } }
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalTokens: { $sum: '$tokenCount' },
        avgTokensPerUser: { $avg: '$tokenCount' },
        maxTokens: { $max: '$tokenCount' },
        usersWithTokens: { 
          $sum: { $cond: [{ $gt: ['$tokenCount', 0] }, 1, 0] } 
        },
        usersWithManyTokens: {
          $sum: { $cond: [{ $gt: ['$tokenCount', 10] }, 1, 0] }
        }
      }
    }
  ]);

  const sessionStats = await UserSession.aggregate([
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: { 
          $sum: { $cond: ['$isActive', 1, 0] } 
        },
        inactiveSessions: { 
          $sum: { $cond: ['$isActive', 0, 1] } 
        }
      }
    }
  ]);

  return {
    tokens: stats[0] || {
      totalUsers: 0,
      totalTokens: 0,
      avgTokensPerUser: 0,
      maxTokens: 0,
      usersWithTokens: 0,
      usersWithManyTokens: 0
    },
    sessions: sessionStats[0] || {
      totalSessions: 0,
      activeSessions: 0,
      inactiveSessions: 0
    }
  };
};