import { JobApplication } from '../models/JobApplication';
// UserProfile model removed - using User model for basic user info
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import mongoose from 'mongoose';

// Production monitoring and logging
interface AnalyticsMetrics {
  requestDuration: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}

class ProductionLogger {
  static logAnalyticsRequest(operation: string, userId: string, duration: number, success: boolean) {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      userId,
      duration,
      success,
      environment: process.env.NODE_ENV || 'development'
    };
    
    if (process.env.NODE_ENV === 'production') {
      // In production, use structured logging (JSON format for log aggregation)
      console.log(JSON.stringify({
        level: success ? 'info' : 'error',
        service: 'analytics',
        ...logData
      }));
    } else {
      console.log(`[ANALYTICS] ${operation} for user ${userId} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  }
  
  static logPerformanceMetric(metric: string, value: number, userId?: string) {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        level: 'info',
        service: 'analytics',
        metric,
        value,
        userId,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

// Simple in-memory cache for analytics data
class AnalyticsCache {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      ProductionLogger.logPerformanceMetric('cache_hit', 1);
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired entry
    }
    ProductionLogger.logPerformanceMetric('cache_miss', 1);
    return null;
  }
  
  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
  
  static clear(): void {
    this.cache.clear();
  }
  
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export interface DashboardMetrics {
  overview: {
    totalUsers: number;
    totalApplications: number;
    totalProfiles: number;
    activeUsers: number;
    applicationSuccessRate: number;
    averageApplicationScore: number;
  };
  userActivity: {
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    activeUsersThisWeek: number;
    activeUsersThisMonth: number;
    userRetentionRate: number;
  };
  applicationTrends: {
    applicationsThisWeek: number;
    applicationsThisMonth: number;
    averageApplicationsPerUser: number;
    topCompanies: { name: string; count: number; successRate: number }[];
    topJobTitles: { title: string; count: number; avgScore: number }[];
  };
  performanceMetrics: {
    averageResponseTime: number;
    averageInterviewRate: number;
    averageOfferRate: number;
    topPerformingUsers: {
      userId: string;
      userName: string;
      successRate: number;
      totalApplications: number;
    }[];
  };
  skillsAnalytics: {
    mostDemandedSkills: { skill: string; count: number; avgSalary: number }[];
    emergingSkills: { skill: string; growth: number }[];
    skillsGaps: { skill: string; demand: number; supply: number }[];
  };
  locationAnalytics: {
    topCities: { city: string; count: number; avgSalary: number }[];
    remoteJobsPercentage: number;
    locationTrends: { location: string; trend: 'growing' | 'stable' | 'declining' }[];
  };
}

export interface UserAnalytics {
  applicationMetrics: {
    totalApplications: number;
    successRate: number;
    averageScore: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  };
  profileMetrics: {
    profileViews: number;
    profileStrength: number;
    searchRanking: number;
    completeness: number;
  };
  skillsAnalysis: {
    strongestSkills: { skill: string; proficiency: string; marketValue: number }[];
    skillsToImprove: { skill: string; importance: number; currentLevel: string }[];
    marketDemand: { skill: string; demandLevel: 'high' | 'medium' | 'low' }[];
  };
  careerInsights: {
    careerProgression: string[];
    salaryProjection: { year: number; projectedSalary: number }[];
    industryTrends: { industry: string; outlook: string; growth: number }[];
  };
  activityTimeline: {
    date: Date;
    action: string;
    details: string;
    impact: 'positive' | 'neutral' | 'negative';
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: 'profile' | 'applications' | 'skills' | 'networking';
    title: string;
    description: string;
    actionItems: string[];
  }[];
}

export interface CompanyAnalytics {
  overview: {
    totalApplications: number;
    successRate: number;
    averageTimeToHire: number;
    popularityTrend: 'growing' | 'stable' | 'declining';
  };
  hiringTrends: {
    monthlyApplications: { month: string; applications: number; hires: number }[];
    seasonalPatterns: { quarter: string; avgApplications: number }[];
    rolesDemand: { role: string; applications: number; difficulty: number }[];
  };
  candidateInsights: {
    topSkills: { skill: string; frequency: number }[];
    experienceLevels: { level: string; percentage: number }[];
    locationDistribution: { location: string; count: number }[];
  };
  competitiveAnalysis: {
    similarCompanies: { name: string; similarityScore: number; applicationVolume: number }[];
    benchmarks: {
      averageResponseTime: number;
      industryResponseTime: number;
      successRate: number;
      industrySuccessRate: number;
    };
  };
}

class AnalyticsService {
  private performanceTracker = {
    requestCount: 0,
    totalDuration: 0,
    errorCount: 0,
    cacheHitRate: 0
  };
  
  private async withPerformanceTracking<T>(
    operation: string,
    userId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.performanceTracker.requestCount++;
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.performanceTracker.totalDuration += duration;
      
      ProductionLogger.logAnalyticsRequest(operation, userId, duration, true);
      
      // Log slow queries for optimization
      if (duration > 2000) {
        ProductionLogger.logPerformanceMetric('slow_query', duration, userId);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceTracker.errorCount++;
      
      ProductionLogger.logAnalyticsRequest(operation, userId, duration, false);
      
      // Re-throw the error after logging
      throw error;
    }
  }
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.withPerformanceTracking('getDashboardMetrics', 'system', async () => {
      // Check cache first
      const cacheKey = 'dashboard_metrics';
      const cached = AnalyticsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Run aggregation queries in parallel
      const [
        totalUsers,
        totalApplications,
        totalProfiles,
        activeUsers,
        newUsersThisWeek,
        newUsersThisMonth,
        activeUsersThisWeek,
        activeUsersThisMonth,
        applicationsThisWeek,
        applicationsThisMonth,
        successfulApplications,
        applicationScores,
        topCompaniesData,
        topJobTitlesData,
        responseTimeData,
        skillsData,
        locationDataPromise
      ] = await Promise.all([
        User.countDocuments(),
        JobApplication.countDocuments(),
        User.countDocuments(), // Total profiles same as total users
        User.countDocuments({ lastLogin: { $gte: oneWeekAgo } }), // Active users based on login
        User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        User.countDocuments({ createdAt: { $gte: oneMonthAgo } }),
        User.countDocuments({ lastLogin: { $gte: oneWeekAgo } }),
        User.countDocuments({ lastLogin: { $gte: oneMonthAgo } }),
        JobApplication.countDocuments({ applicationDate: { $gte: oneWeekAgo } }),
        JobApplication.countDocuments({ applicationDate: { $gte: oneMonthAgo } }),
        JobApplication.countDocuments({ status: { $in: ['offer_accepted', 'offer_received'] } }),
        this.getApplicationScoreStats(),
        this.getTopCompaniesAnalytics(),
        this.getTopJobTitlesAnalytics(),
        this.getResponseTimeAnalytics(),
        this.getSkillsAnalytics(),
        Promise.resolve().then(() => this.getLocationAnalytics())
      ]);

      const applicationSuccessRate = totalApplications > 0 ? (successfulApplications / totalApplications) * 100 : 0;
      const averageApplicationsPerUser = totalUsers > 0 ? totalApplications / totalUsers : 0;
      const userRetentionRate = activeUsersThisMonth > 0 ? (activeUsersThisWeek / activeUsersThisMonth) * 100 : 0;

      return {
        overview: {
          totalUsers,
          totalApplications,
          totalProfiles,
          activeUsers,
          applicationSuccessRate: Math.round(applicationSuccessRate),
          averageApplicationScore: applicationScores.average
        },
        userActivity: {
          newUsersThisWeek,
          newUsersThisMonth,
          activeUsersThisWeek,
          activeUsersThisMonth,
          userRetentionRate: Math.round(userRetentionRate)
        },
        applicationTrends: {
          applicationsThisWeek,
          applicationsThisMonth,
          averageApplicationsPerUser: Math.round(averageApplicationsPerUser),
          topCompanies: topCompaniesData,
          topJobTitles: topJobTitlesData
        },
        performanceMetrics: {
          averageResponseTime: responseTimeData.average,
          averageInterviewRate: responseTimeData.interviewRate,
          averageOfferRate: responseTimeData.offerRate,
          topPerformingUsers: await this.getTopPerformingUsers()
        },
        skillsAnalytics: skillsData,
        locationAnalytics: locationDataPromise
      };
      
      // Cache the result
      AnalyticsCache.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes cache
      return result;
      
    } catch (error: any) {
      ProductionLogger.logPerformanceMetric('dashboard_metrics_error', 1);
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
    });
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    return this.withPerformanceTracking('getUserAnalytics', userId, async () => {
      // Check cache first
      const cacheKey = `user_analytics_${userId}`;
      const cached = AnalyticsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      try {
      const [applications, user, recommendations] = await Promise.all([
        JobApplication.find({ userId: new mongoose.Types.ObjectId(userId) }),
        User.findById(userId),
        this.generateUserRecommendations(userId)
      ]);
      
      // Get user sessions for location data
      const userSessions = await UserSession.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ loginTime: -1 }).limit(5);

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate application metrics
      const totalApplications = applications.length;
      const successfulApps = applications.filter(app => 
        ['offer_accepted', 'offer_received'].includes(app.status)
      ).length;
      const responsesReceived = applications.filter(app => 
        app.communications.some(comm => comm.direction === 'inbound')
      ).length;
      const interviewsReceived = applications.filter(app => app.interviews.length > 0).length;

      const successRate = totalApplications > 0 ? (successfulApps / totalApplications) * 100 : 0;
      const averageScore = applications.length > 0 
        ? applications.reduce((sum, app) => sum + app.metrics.applicationScore, 0) / applications.length 
        : 0;
      const responseRate = totalApplications > 0 ? (responsesReceived / totalApplications) * 100 : 0;
      const interviewRate = totalApplications > 0 ? (interviewsReceived / totalApplications) * 100 : 0;
      const offerRate = totalApplications > 0 ? (successfulApps / totalApplications) * 100 : 0;

      // Calculate profile metrics
      const profileStrength = this.calculateProfileStrength(profile);
      const completeness = this.calculateProfileCompleteness(profile);

      // Skills analysis
      const skillsAnalysis = await this.analyzeUserSkills(profile);

      // Career insights with location-aware salary data from recent sessions
      const mostRecentLocation = userSessions && userSessions.length > 0 ? userSessions[0].location : null;
      const careerInsights = await this.generateCareerInsights(profile, applications, mostRecentLocation);

      // Activity timeline
      const activityTimeline = this.generateActivityTimeline(applications, profile);

      return {
        applicationMetrics: {
          totalApplications,
          successRate: Math.round(successRate),
          averageScore: Math.round(averageScore),
          responseRate: Math.round(responseRate),
          interviewRate: Math.round(interviewRate),
          offerRate: Math.round(offerRate)
        },
        profileMetrics: {
          profileViews: profile.profileViews,
          profileStrength: Math.round(profileStrength),
          searchRanking: Math.round(profile.searchRankingScore),
          completeness: Math.round(completeness)
        },
        skillsAnalysis,
        careerInsights,
        activityTimeline,
        recommendations
      };
      
      // Cache the result for 5 minutes
      AnalyticsCache.set(cacheKey, result, 5 * 60 * 1000);
      return result;
      
    } catch (error: any) {
      ProductionLogger.logPerformanceMetric('user_analytics_error', 1, userId);
      throw new Error(`Failed to get user analytics: ${error.message}`);
    }
    });
  }

  async getCompanyAnalytics(companyName: string): Promise<CompanyAnalytics> {
    return this.withPerformanceTracking('getCompanyAnalytics', 'system', async () => {
      // Check cache first
      const cacheKey = `company_analytics_${companyName}`;
      const cached = AnalyticsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      try {
      const applications = await JobApplication.find({ companyName });
      
      const totalApplications = applications.length;
      const successfulApplications = applications.filter(app => 
        ['offer_accepted', 'offer_received'].includes(app.status)
      ).length;
      const successRate = totalApplications > 0 ? (successfulApplications / totalApplications) * 100 : 0;

      // Calculate average time to hire
      const hiredApplications = applications.filter(app => app.status === 'offer_accepted');
      const hireTimes = hiredApplications.map(app => {
        const hireDate = app.statusHistory.find(status => status.status === 'offer_accepted')?.date;
        if (hireDate) {
          return Math.floor((hireDate.getTime() - app.applicationDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 0;
      }).filter(time => time > 0);
      
      const averageTimeToHire = hireTimes.length > 0 
        ? hireTimes.reduce((sum, time) => sum + time, 0) / hireTimes.length 
        : 0;

      // Determine popularity trend
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      
      const recentApplications = applications.filter(app => app.applicationDate >= threeMonthsAgo).length;
      const olderApplications = applications.filter(app => 
        app.applicationDate >= sixMonthsAgo && app.applicationDate < threeMonthsAgo
      ).length;

      let popularityTrend: 'growing' | 'stable' | 'declining' = 'stable';
      if (recentApplications > olderApplications * 1.2) {
        popularityTrend = 'growing';
      } else if (recentApplications < olderApplications * 0.8) {
        popularityTrend = 'declining';
      }

      // Generate hiring trends
      const hiringTrends = await this.generateHiringTrends(applications);

      // Candidate insights
      const candidateInsights = await this.generateCandidateInsights(applications);

      // Competitive analysis
      const competitiveAnalysis = await this.generateCompetitiveAnalysis(companyName, applications);

      return {
        overview: {
          totalApplications,
          successRate: Math.round(successRate),
          averageTimeToHire: Math.round(averageTimeToHire),
          popularityTrend
        },
        hiringTrends,
        candidateInsights,
        competitiveAnalysis
      };
      
      // Cache the result for 15 minutes (company data changes less frequently)
      AnalyticsCache.set(cacheKey, result, 15 * 60 * 1000);
      return result;
      
    } catch (error: any) {
      ProductionLogger.logPerformanceMetric('company_analytics_error', 1);
      throw new Error(`Failed to get company analytics: ${error.message}`);
    }
    });
  }

  async generateReports(
    type: 'user' | 'company' | 'market',
    filters: any = {},
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<any> {
    try {
      let reportData: any;

      switch (type) {
        case 'user':
          reportData = await this.generateUserReport(filters);
          break;
        case 'company':
          reportData = await this.generateCompanyReport(filters);
          break;
        case 'market':
          reportData = await this.generateMarketReport(filters);
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (format === 'json') {
        return reportData;
      } else {
        // For CSV/PDF formats, you would implement specific formatters
        throw new Error(`Format ${format} not yet implemented`);
      }
    } catch (error: any) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  // Helper methods
  private async getApplicationScoreStats(): Promise<{ average: number; distribution: any }> {
    const result = await JobApplication.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$metrics.applicationScore' },
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      average: Math.round(result[0]?.avgScore || 0),
      distribution: {} // You could add score distribution buckets here
    };
  }

  private async getTopCompaniesAnalytics(): Promise<{ name: string; count: number; successRate: number }[]> {
    const result = await JobApplication.aggregate([
      {
        $group: {
          _id: '$companyName',
          count: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [
                { $in: ['$status', ['offer_accepted', 'offer_received']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          successRate: {
            $round: [
              { $multiply: [{ $divide: ['$successful', '$count'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return result;
  }

  private async getTopJobTitlesAnalytics(): Promise<{ title: string; count: number; avgScore: number }[]> {
    const result = await JobApplication.aggregate([
      {
        $group: {
          _id: '$jobTitle',
          count: { $sum: 1 },
          avgScore: { $avg: '$metrics.applicationScore' }
        }
      },
      {
        $project: {
          title: '$_id',
          count: 1,
          avgScore: { $round: ['$avgScore', 0] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return result;
  }

  private async getResponseTimeAnalytics(): Promise<{
    average: number;
    interviewRate: number;
    offerRate: number;
  }> {
    const applications = await JobApplication.find({}).select('metrics status interviews');
    
    const responseTimes = applications
      .filter(app => app.metrics.responseTime)
      .map(app => app.metrics.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const totalApps = applications.length;
    const withInterviews = applications.filter(app => app.interviews.length > 0).length;
    const withOffers = applications.filter(app => 
      ['offer_received', 'offer_accepted', 'offer_declined'].includes(app.status)
    ).length;

    return {
      average: Math.round(averageResponseTime),
      interviewRate: totalApps > 0 ? Math.round((withInterviews / totalApps) * 100) : 0,
      offerRate: totalApps > 0 ? Math.round((withOffers / totalApps) * 100) : 0
    };
  }

  private async getSkillsAnalytics(): Promise<{
    mostDemandedSkills: { skill: string; count: number; avgSalary: number }[];
    emergingSkills: { skill: string; growth: number }[];
    skillsGaps: { skill: string; demand: number; supply: number }[];
  }> {
    try {
      // Analyze skills from job applications and user profiles
      const [jobApplications, userProfiles] = await Promise.all([
        JobApplication.find({}).select('jobDescription requirements applicationStrategy compensation'),
        UserProfile.find({}).select('technicalSkills')
      ]);

      // Extract skills from job descriptions and requirements
      const skillDemandMap = new Map<string, { count: number; totalSalary: number; salaryCount: number }>();
      const skillSupplyMap = new Map<string, number>();

      // Analyze demand from job applications
      jobApplications.forEach(app => {
        const skills = this.extractSkillsFromText(app.jobDescription);
        const salary = app.compensation?.salaryRange?.max || app.compensation?.totalCompensation || 0;
        
        skills.forEach(skill => {
          const current = skillDemandMap.get(skill) || { count: 0, totalSalary: 0, salaryCount: 0 };
          current.count++;
          if (salary > 0) {
            current.totalSalary += salary;
            current.salaryCount++;
          }
          skillDemandMap.set(skill, current);
        });
      });

      // Analyze supply from user profiles
      userProfiles.forEach(profile => {
        profile.technicalSkills.forEach(skill => {
          const skillName = skill.name.toLowerCase();
          skillSupplyMap.set(skillName, (skillSupplyMap.get(skillName) || 0) + 1);
        });
      });

      // Calculate most demanded skills
      const mostDemandedSkills = Array.from(skillDemandMap.entries())
        .map(([skill, data]) => ({
          skill,
          count: data.count,
          avgSalary: data.salaryCount > 0 ? Math.round(data.totalSalary / data.salaryCount) : 85000
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate skills gaps (high demand, low supply)
      const skillsGaps = Array.from(skillDemandMap.entries())
        .map(([skill, demand]) => ({
          skill,
          demand: demand.count,
          supply: skillSupplyMap.get(skill.toLowerCase()) || 0
        }))
        .filter(gap => gap.demand > 5 && gap.supply < gap.demand * 0.5)
        .sort((a, b) => (b.demand / Math.max(b.supply, 1)) - (a.demand / Math.max(a.supply, 1)))
        .slice(0, 10);

      // Calculate emerging skills (increasing demand over time)
      // This is simplified - would need historical data for accurate trends
      const emergingSkills = this.getEmergingSkillsFromMarket(mostDemandedSkills);

      return {
        mostDemandedSkills,
        emergingSkills,
        skillsGaps
      };
    } catch (error) {
      console.error('Error analyzing skills:', error);
      // Fallback to basic skills if analysis fails
      return {
        mostDemandedSkills: [
          { skill: 'JavaScript', count: 150, avgSalary: 90000 },
          { skill: 'Python', count: 120, avgSalary: 95000 },
          { skill: 'React', count: 100, avgSalary: 88000 }
        ],
        emergingSkills: [
          { skill: 'AI/ML', growth: 85 },
          { skill: 'Cloud Architecture', growth: 65 },
          { skill: 'DevOps', growth: 55 }
        ],
        skillsGaps: [
          { skill: 'Senior Developer', demand: 80, supply: 35 },
          { skill: 'Data Engineering', demand: 60, supply: 25 }
        ]
      };
    }
  }

  private extractSkillsFromText(text: string): string[] {
    // Common technical skills to look for
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'typescript',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
      'html', 'css', 'sass', 'tailwind',
      'git', 'github', 'gitlab', 'bitbucket',
      'rest', 'api', 'graphql', 'microservices',
      'linux', 'ubuntu', 'centos',
      'agile', 'scrum', 'kanban',
      'machine learning', 'artificial intelligence', 'data science', 'big data',
      'golang', 'rust', 'c++', 'c#', 'swift', 'kotlin',
      'flutter', 'react native', 'ionic',
      'devops', 'ci/cd', 'automation', 'testing',
      'blockchain', 'ethereum', 'solidity'
    ];

    const foundSkills: string[] = [];
    const lowerText = text.toLowerCase();

    commonSkills.forEach(skill => {
      if (lowerText.includes(skill)) {
        foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    });

    return foundSkills;
  }

  private getEmergingSkillsFromMarket(demandedSkills: { skill: string; count: number }[]): { skill: string; growth: number }[] {
    // Define skills that are considered emerging based on industry trends
    const emergingTechMap = new Map([
      ['ai', 150], ['artificial intelligence', 150], ['machine learning', 140],
      ['rust', 120], ['golang', 110], ['kubernetes', 100],
      ['blockchain', 95], ['web3', 90], ['solidity', 85],
      ['flutter', 80], ['react native', 75], ['graphql', 70],
      ['terraform', 65], ['ansible', 60], ['elasticsearch', 55]
    ]);

    const emergingSkills: { skill: string; growth: number }[] = [];

    demandedSkills.forEach(skill => {
      const skillLower = skill.skill.toLowerCase();
      for (const [emergingTech, growthRate] of emergingTechMap) {
        if (skillLower.includes(emergingTech)) {
          emergingSkills.push({
            skill: skill.skill,
            growth: growthRate
          });
          break;
        }
      }
    });

    // Add some default emerging skills if none found
    if (emergingSkills.length === 0) {
      emergingSkills.push(
        { skill: 'AI/ML Engineering', growth: 125 },
        { skill: 'Cloud Native Development', growth: 95 },
        { skill: 'DevSecOps', growth: 75 }
      );
    }

    return emergingSkills.slice(0, 5);
  }

  private async getLocationAnalytics(): Promise<{
    topCities: { city: string; count: number; avgSalary: number }[];
    remoteJobsPercentage: number;
    locationTrends: { location: string; trend: 'growing' | 'stable' | 'declining' }[];
  }> {
    try {
      // Get real user session location data
      const locationData = await UserSession.getLocationAnalytics(30); // Last 30 days
      
      // Get job applications data for salary info
      const applications = await JobApplication.find({}).select('jobLocation compensation userId');
      
      // Create maps for efficient lookup
      const cityUserCount: { [key: string]: Set<string> } = {};
      const citySalaryData: { [key: string]: number[] } = {};
      let remoteJobs = 0;

      // Process applications
      applications.forEach(app => {
        if (app.jobLocation.remote) {
          remoteJobs++;
        } else if (app.jobLocation.city && app.jobLocation.country) {
          const locationKey = `${app.jobLocation.city}, ${app.jobLocation.country}`;
          
          // Track unique users per city
          if (!cityUserCount[locationKey]) {
            cityUserCount[locationKey] = new Set();
          }
          cityUserCount[locationKey].add(app.userId.toString());
          
          // Collect salary data
          const salary = app.compensation?.salaryRange?.max || 
                        app.compensation?.totalCompensation || 
                        app.compensation?.salaryRange?.min || 0;
          if (salary > 0) {
            if (!citySalaryData[locationKey]) {
              citySalaryData[locationKey] = [];
            }
            citySalaryData[locationKey].push(salary);
          }
        }
      });

      // Combine session data with application data
      const topCities = locationData.map((loc: any) => {
        const locationKey = loc.location.city ? 
          `${loc.location.city}, ${loc.location.country}` : 
          loc.location.country;
        
        const salaries = citySalaryData[locationKey] || [];
        const avgSalary = salaries.length > 0 
          ? Math.round(salaries.reduce((sum, s) => sum + s, 0) / salaries.length)
          : this.getDefaultSalaryByLocation({ country: loc.location.country });

        return {
          city: locationKey,
          count: loc.userCount, // Real user count from sessions
          avgSalary
        };
      }).slice(0, 10);

      // Calculate trends based on recent vs older session data
      const locationTrends = await this.calculateRealLocationTrends();

      const remoteJobsPercentage = applications.length > 0 
        ? Math.round((remoteJobs / applications.length) * 100) 
        : 0;

      return {
        topCities,
        remoteJobsPercentage,
        locationTrends
      };
    } catch (error) {
      console.error('Error getting location analytics:', error);
      // Fallback to basic analytics
      return {
        topCities: [],
        remoteJobsPercentage: 0,
        locationTrends: []
      };
    }
  }

  private async calculateRealLocationTrends(): Promise<{ location: string; trend: 'growing' | 'stable' | 'declining' }[]> {
    try {
      // Get session data for last 60 days and last 30 days
      const recent30Days = await UserSession.getLocationAnalytics(30);
      const older30Days = await UserSession.aggregate([
        {
          $match: {
            loginTime: { 
              $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            },
            'location.country': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              city: '$location.city',
              country: '$location.country'
            },
            uniqueUsers: { $addToSet: '$userId' },
            totalSessions: { $sum: 1 }
          }
        },
        {
          $project: {
            location: {
              city: '$_id.city',
              country: '$_id.country'
            },
            userCount: { $size: '$uniqueUsers' }
          }
        }
      ]);

      // Create lookup map for older data
      const olderDataMap = new Map();
      older30Days.forEach((item: any) => {
        const key = item.location.city ? 
          `${item.location.city}, ${item.location.country}` : 
          item.location.country;
        olderDataMap.set(key, item.userCount);
      });

      // Calculate trends
      const trends = recent30Days.map((recent: any) => {
        const locationKey = recent.location.city ? 
          `${recent.location.city}, ${recent.location.country}` : 
          recent.location.country;
        
        const recentCount = recent.userCount;
        const olderCount = olderDataMap.get(locationKey) || 0;
        
        let trend: 'growing' | 'stable' | 'declining' = 'stable';
        
        if (olderCount > 0) {
          const changePercent = ((recentCount - olderCount) / olderCount) * 100;
          if (changePercent > 10) trend = 'growing';
          else if (changePercent < -10) trend = 'declining';
        } else if (recentCount > 0) {
          trend = 'growing'; // New location
        }

        return {
          location: locationKey,
          trend
        };
      }).slice(0, 10);

      return trends;
    } catch (error) {
      console.error('Error calculating location trends:', error);
      return [];
    }
  }

  private async getTopPerformingUsers(): Promise<{
    userId: string;
    userName: string;
    successRate: number;
    totalApplications: number;
  }[]> {
    const result = await JobApplication.aggregate([
      {
        $group: {
          _id: '$userId',
          totalApplications: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [
                { $in: ['$status', ['offer_accepted', 'offer_received']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $match: {
          totalApplications: { $gte: 5 } // Only users with at least 5 applications
        }
      },
      {
        $project: {
          userId: '$_id',
          totalApplications: 1,
          successRate: {
            $round: [
              { $multiply: [{ $divide: ['$successful', '$totalApplications'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { successRate: -1, totalApplications: -1 } },
      { $limit: 10 }
    ]);

    // Get user names
    const userIds = result.map(r => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName');
    const userMap = users.reduce((acc, user: any) => {
      acc[user._id.toString()] = `${user.firstName} ${user.lastName}`;
      return acc;
    }, {} as { [key: string]: string });

    return result.map(r => ({
      userId: r.userId.toString(),
      userName: userMap[r.userId.toString()] || 'Unknown User',
      successRate: r.successRate,
      totalApplications: r.totalApplications
    }));
  }

  private calculateProfileStrength(profile: any): number {
    let score = 0;
    
    if (profile.headline && profile.headline.length > 30) score += 20;
    if (profile.bio && profile.bio.length > 200) score += 20;
    if (profile.technicalSkills.length >= 5) score += 25;
    if (profile.yearsOfExperience >= 3) score += 20;
    if (profile.linkedinUrl || profile.githubUrl) score += 15;
    
    return Math.min(score, 100);
  }

  private calculateProfileCompleteness(profile: any): number {
    const fields = [
      profile.headline,
      profile.bio,
      profile.currentLocation.city,
      profile.preferredRoles.length > 0,
      profile.technicalSkills.length > 0,
      profile.yearsOfExperience !== undefined,
      profile.linkedinUrl || profile.githubUrl,
      profile.expectedSalary
    ];

    const completed = fields.filter(Boolean).length;
    return (completed / fields.length) * 100;
  }

  private async analyzeUserSkills(profile: any): Promise<any> {
    // Simplified skills analysis
    return {
      strongestSkills: profile.technicalSkills
        .filter((skill: any) => skill.proficiency === 'expert' || skill.proficiency === 'advanced')
        .slice(0, 5)
        .map((skill: any) => ({
          skill: skill.name,
          proficiency: skill.proficiency,
          marketValue: 85 // Would be calculated based on market data
        })),
      skillsToImprove: [
        { skill: 'Communication', importance: 90, currentLevel: 'intermediate' },
        { skill: 'Leadership', importance: 75, currentLevel: 'beginner' }
      ],
      marketDemand: [
        { skill: 'React', demandLevel: 'high' },
        { skill: 'Python', demandLevel: 'high' },
        { skill: 'AWS', demandLevel: 'medium' }
      ]
    };
  }

  private async generateCareerInsights(profile: any, applications: any[], userLocation?: any): Promise<any> {
    const currentSalary = profile.expectedSalary ? (profile.expectedSalary.min + profile.expectedSalary.max) / 2 : this.getDefaultSalaryByLocation(profile.currentLocation);
    const userCountry = userLocation?.country || profile.currentLocation?.country;
    const userCity = userLocation?.city || profile.currentLocation?.city;
    
    // Get location-specific salary data
    const locationSalaryData = await this.getLocationSpecificSalaryData(userCountry, userCity);
    
    // Adjust salary projections based on location
    const locationMultiplier = this.getLocationSalaryMultiplier(userCountry, userCity);
    
    return {
      careerProgression: this.getLocationSpecificCareerPath(profile.preferredRoles),
      salaryProjection: [
        { year: 2024, projectedSalary: currentSalary },
        { year: 2025, projectedSalary: Math.round(currentSalary * 1.08 * locationMultiplier) },
        { year: 2026, projectedSalary: Math.round(currentSalary * 1.18 * locationMultiplier) }
      ],
      locationSalaryInsights: {
        userLocationAverage: locationSalaryData.userCityAverage,
        countryAverage: locationSalaryData.countryAverage,
        topCitiesInCountry: locationSalaryData.topCities,
        relativePosition: this.calculateRelativePosition(currentSalary, locationSalaryData.userCityAverage)
      },
      industryTrends: this.getLocationSpecificIndustryTrends(userCountry)
    };
  }

  private getDefaultSalaryByLocation(location: any): number {
    if (!location?.country) return 80000;
    
    const countryDefaults: { [key: string]: number } = {
      'united states': 95000,
      'canada': 75000,
      'united kingdom': 65000,
      'germany': 70000,
      'australia': 85000,
      'india': 25000,
      'singapore': 80000,
      'netherlands': 75000,
      'sweden': 70000,
      'switzerland': 110000
    };
    
    return countryDefaults[location.country.toLowerCase()] || 60000;
  }

  private async getLocationSpecificSalaryData(country?: string, city?: string): Promise<{
    userCityAverage: number;
    countryAverage: number;
    topCities: { city: string; averageSalary: number; isUserLocation?: boolean }[];
  }> {
    try {
      // Get salary data from job applications
      const applications = await JobApplication.find({}).select('jobLocation compensation');
      
      const cityData: { [key: string]: { salaries: number[]; country: string } } = {};
      const countryData: { [key: string]: number[] } = {};
      
      applications.forEach(app => {
        const salary = app.compensation?.salaryRange?.max || 
                      app.compensation?.totalCompensation || 
                      app.compensation?.salaryRange?.min || 0;
        
        if (salary > 0 && app.jobLocation?.city && app.jobLocation?.country) {
          const appCity = app.jobLocation.city;
          const appCountry = app.jobLocation.country;
          
          if (!cityData[appCity]) {
            cityData[appCity] = { salaries: [], country: appCountry };
          }
          cityData[appCity].salaries.push(salary);
          
          if (!countryData[appCountry]) {
            countryData[appCountry] = [];
          }
          countryData[appCountry].push(salary);
        }
      });
      
      // Calculate user city average
      const userCityData = city ? cityData[city] : null;
      const userCityAverage = userCityData && userCityData.salaries.length > 0
        ? Math.round(userCityData.salaries.reduce((sum, s) => sum + s, 0) / userCityData.salaries.length)
        : this.getDefaultSalaryByLocation({ country });
      
      // Calculate country average
      const countryDataArray = country ? countryData[country] : null;
      const countryAverage = countryDataArray && countryDataArray.length > 0
        ? Math.round(countryDataArray.reduce((sum, s) => sum + s, 0) / countryDataArray.length)
        : this.getDefaultSalaryByLocation({ country });
      
      // Create comprehensive 5-city salary comparison
      const allCities = Object.entries(cityData)
        .filter(([_, data]) => country ? data.country.toLowerCase() === country.toLowerCase() : true)
        .map(([cityName, data]) => ({
          city: cityName,
          averageSalary: Math.round(data.salaries.reduce((sum, s) => sum + s, 0) / data.salaries.length),
          isUserLocation: city && cityName.toLowerCase() === city.toLowerCase()
        }))
        .sort((a, b) => b.averageSalary - a.averageSalary);

      // Ensure user's city is included if available
      let topCities = allCities.filter(c => c.isUserLocation);
      
      // Add top 4 other cities (excluding user's city if already included)
      const otherCities = allCities.filter(c => !c.isUserLocation).slice(0, 4);
      topCities = [...topCities, ...otherCities];
      
      // If we don't have user's city in data, add it with estimated salary
      if (city && !topCities.some(c => c.isUserLocation)) {
        topCities.unshift({
          city,
          averageSalary: userCityAverage,
          isUserLocation: true
        });
        topCities = topCities.slice(0, 5);
      }
      
      // Fill with global tech hubs if we need more cities
      if (topCities.length < 5) {
        const globalTechHubs = [
          { city: 'San Francisco', averageSalary: 140000 },
          { city: 'New York', averageSalary: 130000 },
          { city: 'Seattle', averageSalary: 125000 },
          { city: 'London', averageSalary: 85000 },
          { city: 'Toronto', averageSalary: 85000 },
          { city: 'Berlin', averageSalary: 75000 },
          { city: 'Amsterdam', averageSalary: 80000 },
          { city: 'Singapore', averageSalary: 90000 }
        ];
        
        const existingCityNames = topCities.map(c => c.city.toLowerCase());
        const additionalCities = globalTechHubs
          .filter(hub => !existingCityNames.includes(hub.city.toLowerCase()))
          .slice(0, 5 - topCities.length)
          .map(hub => ({ ...hub, isUserLocation: false }));
        
        topCities = [...topCities, ...additionalCities];
      }
      
      return {
        userCityAverage,
        countryAverage,
        topCities
      };
    } catch (error) {
      console.error('Error getting location-specific salary data:', error);
      return {
        userCityAverage: this.getDefaultSalaryByLocation({ country }),
        countryAverage: this.getDefaultSalaryByLocation({ country }),
        topCities: []
      };
    }
  }

  private getLocationSalaryMultiplier(country?: string, city?: string): number {
    if (!country) return 1.0;
    
    // High-cost locations get higher multipliers
    const highCostCities: { [key: string]: number } = {
      'san francisco': 1.4,
      'new york': 1.3,
      'london': 1.2,
      'zurich': 1.5,
      'singapore': 1.2,
      'tokyo': 1.1,
      'sydney': 1.1,
      'toronto': 1.1
    };
    
    if (city && highCostCities[city.toLowerCase()]) {
      return highCostCities[city.toLowerCase()];
    }
    
    // Country-level multipliers
    const countryMultipliers: { [key: string]: number } = {
      'united states': 1.1,
      'switzerland': 1.3,
      'singapore': 1.2,
      'australia': 1.05,
      'canada': 1.0,
      'united kingdom': 1.0,
      'germany': 1.0,
      'india': 0.9
    };
    
    return countryMultipliers[country.toLowerCase()] || 1.0;
  }

  private getLocationSpecificCareerPath(preferredRoles: string[]): string[] {
    // This could be enhanced to be role and location specific
    const commonPaths = [
      'Senior Developer',
      'Tech Lead', 
      'Engineering Manager',
      'Director of Engineering'
    ];
    
    return commonPaths;
  }

  private calculateRelativePosition(userSalary: number, locationAverage: number): string {
    if (userSalary > locationAverage * 1.2) return 'Above Market';
    if (userSalary > locationAverage * 0.8) return 'Market Rate';
    return 'Below Market';
  }

  private getLocationSpecificIndustryTrends(country?: string): any[] {
    const globalTrends = [
      { industry: 'Technology', outlook: 'Strong growth expected', growth: 15 },
      { industry: 'Healthcare Tech', outlook: 'Rapid expansion', growth: 22 }
    ];
    
    if (!country) return globalTrends;
    
    const countrySpecificTrends: { [key: string]: any[] } = {
      'united states': [
        { industry: 'AI/ML', outlook: 'Explosive growth', growth: 35 },
        { industry: 'Fintech', outlook: 'Steady expansion', growth: 18 },
        { industry: 'Healthcare Tech', outlook: 'Rapid growth', growth: 25 }
      ],
      'india': [
        { industry: 'Software Services', outlook: 'Stable growth', growth: 12 },
        { industry: 'Fintech', outlook: 'Booming sector', growth: 30 },
        { industry: 'Edtech', outlook: 'Strong growth', growth: 20 }
      ],
      'united kingdom': [
        { industry: 'Fintech', outlook: 'Leading sector', growth: 22 },
        { industry: 'Green Tech', outlook: 'Emerging rapidly', growth: 28 },
        { industry: 'Healthcare Tech', outlook: 'Steady growth', growth: 15 }
      ]
    };
    
    return countrySpecificTrends[country.toLowerCase()] || globalTrends;
  }

  private generateActivityTimeline(applications: any[], profile: any): any[] {
    const timeline: any[] = [];
    
    // Add recent applications
    applications.slice(0, 10).forEach(app => {
      timeline.push({
        date: app.applicationDate,
        action: 'Job Application',
        details: `Applied to ${app.jobTitle} at ${app.companyName}`,
        impact: 'positive'
      });
    });

    // Add profile updates
    timeline.push({
      date: profile.updatedAt,
      action: 'Profile Update',
      details: 'Updated professional profile',
      impact: 'positive'
    });

    return timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private async generateUserRecommendations(userId: string): Promise<any[]> {
    // Simplified recommendations
    return [
      {
        priority: 'high',
        category: 'profile',
        title: 'Complete Your Profile',
        description: 'Adding more details to your profile increases visibility',
        actionItems: ['Add portfolio links', 'Update skills section', 'Write detailed bio']
      },
      {
        priority: 'medium',
        category: 'applications',
        title: 'Follow Up on Applications',
        description: 'Send follow-up messages to pending applications',
        actionItems: ['Check application status', 'Send thank you notes', 'Update application tracking']
      }
    ];
  }

  private async generateHiringTrends(applications: any[]): Promise<any> {
    // Simplified hiring trends
    return {
      monthlyApplications: [],
      seasonalPatterns: [],
      rolesDemand: []
    };
  }

  private async generateCandidateInsights(applications: any[]): Promise<any> {
    // Simplified candidate insights
    return {
      topSkills: [],
      experienceLevels: [],
      locationDistribution: []
    };
  }

  private async generateCompetitiveAnalysis(companyName: string, applications: any[]): Promise<any> {
    // Simplified competitive analysis
    return {
      similarCompanies: [],
      benchmarks: {
        averageResponseTime: 7,
        industryResponseTime: 10,
        successRate: 15,
        industrySuccessRate: 12
      }
    };
  }

  private async generateUserReport(filters: any): Promise<any> {
    // Generate comprehensive user report
    return { message: 'User report generation not yet implemented' };
  }

  private async generateCompanyReport(filters: any): Promise<any> {
    // Generate comprehensive company report
    return { message: 'Company report generation not yet implemented' };
  }

  private async generateMarketReport(filters: any): Promise<any> {
    // Generate comprehensive market report
    return { message: 'Market report generation not yet implemented' };
  }
  
  // Production monitoring methods
  getPerformanceStats() {
    const avgDuration = this.performanceTracker.requestCount > 0 
      ? this.performanceTracker.totalDuration / this.performanceTracker.requestCount 
      : 0;
      
    return {
      totalRequests: this.performanceTracker.requestCount,
      averageResponseTime: Math.round(avgDuration),
      errorRate: this.performanceTracker.requestCount > 0 
        ? (this.performanceTracker.errorCount / this.performanceTracker.requestCount) * 100 
        : 0,
      cacheStats: AnalyticsCache.getStats(),
      uptime: process.uptime()
    };
  }
  
  // Health check method for production monitoring
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test database connectivity
      const testQuery = await JobApplication.countDocuments({}).limit(1);
      const stats = this.getPerformanceStats();
      
      const isHealthy = stats.errorRate < 10 && stats.averageResponseTime < 5000;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          database: 'connected',
          performance: stats,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  // Cache management for production
  clearCache(): void {
    AnalyticsCache.clear();
    ProductionLogger.logPerformanceMetric('cache_cleared', 1);
  }
  
  // Reset performance tracking (useful for monitoring windows)
  resetPerformanceTracking(): void {
    this.performanceTracker = {
      requestCount: 0,
      totalDuration: 0,
      errorCount: 0,
      cacheHitRate: 0
    };
  }
}

export const analyticsService = new AnalyticsService();