import { Request, Response } from 'express';
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';
import { AuthenticatedRequest } from '../middleware/auth';

// Request validation middleware
class RequestValidator {
  static validateTimeframe(timeframe?: string): string {
    const validTimeframes = ['3months', '6months', '12months', 'all'];
    if (!timeframe || !validTimeframes.includes(timeframe)) {
      return '12months'; // default
    }
    return timeframe;
  }
  
  static validateUserId(userId: string): boolean {
    return userId && userId.length === 24; // MongoDB ObjectId length
  }
  
  static createRateLimitKey(userId: string, operation: string): string {
    return `analytics_${operation}_${userId}`;
  }
}

// Simple rate limiting store (in production, use Redis)
class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute window
  private static readonly MAX_REQUESTS = 30; // 30 requests per minute per user
  
  static isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.WINDOW_MS });
      return true;
    }
    
    if (record.count >= this.MAX_REQUESTS) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  static getRemainingRequests(key: string): number {
    const record = this.requests.get(key);
    if (!record || Date.now() > record.resetTime) {
      return this.MAX_REQUESTS;
    }
    return Math.max(0, this.MAX_REQUESTS - record.count);
  }
  
  static getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now();
    let activeKeys = 0;
    
    for (const [key, record] of this.requests.entries()) {
      if (now <= record.resetTime) {
        activeKeys++;
      }
    }
    
    return {
      totalKeys: this.requests.size,
      activeKeys
    };
  }
}

export class AdvancedAnalyticsController {
  private checkRateLimit(req: AuthenticatedRequest, res: Response, operation: string): boolean {
    if (!req.user) return false;
    
    const rateLimitKey = RequestValidator.createRateLimitKey(req.user.id, operation);
    const allowed = RateLimiter.isAllowed(rateLimitKey);
    
    if (!allowed) {
      const remaining = RateLimiter.getRemainingRequests(rateLimitKey);
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
        remaining
      });
      return false;
    }
    
    return true;
  }
  async getComprehensiveAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Rate limiting check
      if (!this.checkRateLimit(req, res, 'comprehensive')) {
        return;
      }
      
      const userId = req.user.id;
      
      // Input validation
      if (!RequestValidator.validateUserId(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }
      const analytics = await advancedAnalyticsService.getComprehensiveAnalytics(userId);
      
      return res.json({
        success: true,
        data: { analytics },
        meta: {
          timestamp: new Date().toISOString(),
          cached: false // This would be set by caching layer
        }
      });
    } catch (error) {
      // Structured error logging for production
      const errorId = `analytics_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.error(JSON.stringify({
        errorId,
        service: 'advanced-analytics',
        operation: 'getComprehensiveAnalytics',
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }));
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get comprehensive analytics'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getCompanyAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      const companyAnalysis = await advancedAnalyticsService.getCompanyAnalysis(userId);
      
      return res.json({
        success: true,
        data: { companyAnalysis }
      });
    } catch (error) {
      console.error('Get company analysis error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get company analysis'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getSkillGapAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      const skillGapAnalysis = await advancedAnalyticsService.getSkillGapAnalysis(userId);
      
      return res.json({
        success: true,
        data: { skillGapAnalysis }
      });
    } catch (error) {
      console.error('Get skill gap analysis error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get skill gap analysis'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getJobMatchingInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      const jobMatchingInsights = await advancedAnalyticsService.getJobMatchingInsights(userId);
      
      return res.json({
        success: true,
        data: { jobMatchingInsights }
      });
    } catch (error) {
      console.error('Get job matching insights error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get job matching insights'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getPredictiveInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      const predictiveInsights = await advancedAnalyticsService.getPredictiveInsights(userId);
      
      return res.json({
        success: true,
        data: { predictiveInsights }
      });
    } catch (error) {
      console.error('Get predictive insights error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get predictive insights'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getAnalyticsSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      
      // Get all analytics data in parallel for performance
      const [
        comprehensiveAnalytics,
        companyAnalysis,
        skillGapAnalysis,
        jobMatchingInsights,
        predictiveInsights
      ] = await Promise.all([
        advancedAnalyticsService.getComprehensiveAnalytics(userId),
        advancedAnalyticsService.getCompanyAnalysis(userId),
        advancedAnalyticsService.getSkillGapAnalysis(userId),
        advancedAnalyticsService.getJobMatchingInsights(userId),
        advancedAnalyticsService.getPredictiveInsights(userId)
      ]);
      
      return res.json({
        success: true,
        data: {
          comprehensiveAnalytics,
          companyAnalysis: companyAnalysis.slice(0, 5), // Top 5 companies
          skillGapAnalysis,
          jobMatchingInsights,
          predictiveInsights,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get analytics summary error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get analytics summary'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getPerformanceTrends(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Rate limiting and validation
      if (!this.checkRateLimit(req, res, 'trends')) {
        return;
      }
      
      const userId = req.user.id;
      if (!RequestValidator.validateUserId(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }
      
      const timeframe = RequestValidator.validateTimeframe(req.query.timeframe as string);
      
      const analytics = await advancedAnalyticsService.getComprehensiveAnalytics(userId);
      
      // Filter trends based on timeframe
      let trends = analytics.applicationTrends;
      if (timeframe === '6months') {
        trends = trends.slice(-6);
      } else if (timeframe === '3months') {
        trends = trends.slice(-3);
      }
      
      return res.json({
        success: true,
        data: {
          trends,
          seasonalPatterns: analytics.seasonalPatterns,
          performanceImprovement: analytics.performanceImprovement,
          timeframe
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestedTimeframe: timeframe,
          dataPoints: trends.length
        }
      });
    } catch (error) {
      console.error('Get performance trends error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get performance trends'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  async getMarketInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id;
      const analytics = await advancedAnalyticsService.getComprehensiveAnalytics(userId);
      
      return res.json({
        success: true,
        data: {
          marketCompetitiveness: analytics.marketCompetitiveness,
          industryBenchmark: analytics.industryBenchmark,
          seasonalPatterns: analytics.seasonalPatterns,
          recommendations: this.generateMarketRecommendations(analytics)
        }
      });
    } catch (error) {
      console.error('Get market insights error:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Failed to get market insights'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'An unknown error occurred'
      });
    }
  }

  private generateMarketRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];
    
    if (analytics.marketCompetitiveness > 70) {
      recommendations.push('High competition detected - focus on differentiation and networking');
      recommendations.push('Consider targeting niche or emerging companies');
    } else if (analytics.marketCompetitiveness < 40) {
      recommendations.push('Low competition market - good time to apply broadly');
      recommendations.push('Consider raising your salary expectations');
    }
    
    if (analytics.applicationEffectiveness < 30) {
      recommendations.push('Application effectiveness is low - review and improve your application strategy');
      recommendations.push('Consider getting professional resume review');
    }
    
    const currentMonth = new Date().getMonth();
    const currentSeasonalPattern = analytics.seasonalPatterns[currentMonth];
    
    if (currentSeasonalPattern?.marketActivity === 'high') {
      recommendations.push('Excellent timing - high market activity this month');
    } else if (currentSeasonalPattern?.marketActivity === 'low') {
      recommendations.push('Market activity is low - focus on networking and skill development');
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }
  
  // Production monitoring endpoints
  async getHealthCheck(req: Request, res: Response) {
    try {
      // Simple health check - verify service is responsive
      const startTime = Date.now();
      
      // Test a lightweight operation
      const testUserId = '000000000000000000000000'; // Dummy ObjectId
      const health = await advancedAnalyticsService.healthCheck();
      
      const responseTime = Date.now() - startTime;
      
      return res.json({
        status: health.status,
        service: 'advanced-analytics',
        responseTime,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        details: health.details
      });
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        service: 'advanced-analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  async getMetrics(req: Request, res: Response) {
    try {
      // Return service metrics for monitoring
      const metrics = {
        service: 'advanced-analytics',
        timestamp: new Date().toISOString(),
        rateLimiting: {
          totalRequests: RateLimiter.getStats?.() || 'Not available',
          windowMs: 60000,
          maxRequests: 30
        },
        cache: {
          enabled: true,
          defaultTTL: '10 minutes'
        },
        performance: {
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          uptime: Math.round(process.uptime()),
          memoryUsage: process.memoryUsage()
        }
      };
      
      return res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const advancedAnalyticsController = new AdvancedAnalyticsController();