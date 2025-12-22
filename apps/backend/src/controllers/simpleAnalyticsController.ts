import { Request, Response } from 'express';
import { simpleAnalyticsService } from '../services/simpleAnalyticsService';
import { AuthenticatedRequest } from '../middleware/auth';

export class SimpleAnalyticsController {
  async getUserAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userAnalytics = await simpleAnalyticsService.getUserAnalytics(req.user.id);
      const locationData = await simpleAnalyticsService.getUserLocationData(req.user.id);

      return res.json({
        success: true,
        data: {
          ...userAnalytics,
          userLocation: locationData.userLocation,
          locationComparison: locationData.locationComparison,
          countryInfo: locationData.countryInfo
        }
      });
    } catch (error) {
      console.error('Get user analytics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user analytics'
      });
    }
  }

  async getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const metrics = await simpleAnalyticsService.getDashboardMetrics();

      return res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get dashboard metrics'
      });
    }
  }

  async getApplicationStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userAnalytics = await simpleAnalyticsService.getUserAnalytics(req.user.id);
      const productionAnalytics = await simpleAnalyticsService.getProductionAnalytics(req.user.id);

      // Transform the data to match frontend expectations - ALL REAL DATA
      const transformedData = {
        overview: {
          totalApplications: userAnalytics.applications.total,
          activeApplications: productionAnalytics.activeApplications,
          responseRate: productionAnalytics.responseRate,
          interviewRate: productionAnalytics.interviewRate,
          offerRate: productionAnalytics.offerRate,
          averageResponseTime: userAnalytics.applications.averageResponseTime
        },
        trends: {
          applicationsOverTime: productionAnalytics.applicationsOverTime,
          statusDistribution: Object.entries(userAnalytics.applications.byStatus).map(([status, count]) => ({
            status,
            count
          })),
          applicationsTrend: productionAnalytics.applicationsTrend,
          responseRateTrend: productionAnalytics.responseRateTrend,
          interviewRateTrend: productionAnalytics.interviewRateTrend,
          responseTimeTrend: productionAnalytics.responseTimeTrend
        },
        insights: {
          topCompanies: productionAnalytics.topCompanies,
          applicationsBySource: productionAnalytics.applicationsBySource,
          skillDemand: productionAnalytics.skillDemand,
          marketTrends: productionAnalytics.marketTrends
        },
        performance: {
          monthlyStats: productionAnalytics.monthlyStats,
          successRate: productionAnalytics.successRate,
          averageTimeToResponse: userAnalytics.applications.averageResponseTime,
          applicationFrequency: userAnalytics.applications.recentApplications,
          conversionFunnel: productionAnalytics.conversionFunnel
        }
      };

      return res.json({
        success: true,
        data: transformedData
      });
    } catch (error) {
      console.error('Get application stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get application stats'
      });
    }
  }

  async getResumeAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const resumeId = req.query.resumeId as string;
      const resumeAnalytics = await simpleAnalyticsService.getResumeAnalytics(req.user.id, resumeId);

      return res.json({
        success: true,
        data: resumeAnalytics
      });
    } catch (error) {
      console.error('Get resume analytics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get resume analytics'
      });
    }
  }
}

export const simpleAnalyticsController = new SimpleAnalyticsController();