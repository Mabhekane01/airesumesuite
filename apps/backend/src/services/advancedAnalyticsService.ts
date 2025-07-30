import mongoose from 'mongoose';
import { JobApplication } from '../models/JobApplication';

// Production monitoring for advanced analytics
class AdvancedAnalyticsLogger {
  static logOperation(operation: string, userId: string, duration: number, success: boolean) {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        level: success ? 'info' : 'error',
        service: 'advanced-analytics',
        operation,
        userId,
        duration,
        success,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log(`[ADVANCED-ANALYTICS] ${operation} for user ${userId} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  }
}

// Caching for expensive advanced analytics operations
class AdvancedAnalyticsCache {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes for complex analytics
  
  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
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
}

export interface AnalyticsMetrics {
  // Core metrics
  applicationEffectiveness: number;
  responseRate: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  timeToResponse: number;
  timeToInterview: number;
  timeToOffer: number;
  
  // Advanced metrics
  successPredictionScore: number;
  marketCompetitiveness: number;
  applicationOptimizationScore: number;
  industryBenchmark: number;
  
  // Trend analysis
  applicationTrends: TrendData[];
  seasonalPatterns: SeasonalPattern[];
  performanceImprovement: number;
}

export interface TrendData {
  period: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  rejections: number;
  responseRate: number;
  successRate: number;
}

export interface SeasonalPattern {
  month: number;
  averageApplications: number;
  averageSuccessRate: number;
  marketActivity: 'high' | 'medium' | 'low';
  recommendedActions: string[];
}

export interface CompanyAnalysis {
  companyName: string;
  applicationCount: number;
  successRate: number;
  averageTimeToResponse: number;
  rejectionReasons: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  recommendedApproach: string;
}

export interface SkillGapAnalysis {
  missingSkills: string[];
  overrepresentedSkills: string[];
  marketDemandSkills: string[];
  skillMatchScore: number;
  improvementSuggestions: string[];
}

export interface JobMatchingInsights {
  bestMatchingRoles: string[];
  roleCompatibilityScores: Record<string, number>;
  salaryBenchmarks: Record<string, number>;
  locationPreferences: string[];
  industryFit: Record<string, number>;
}

class AdvancedAnalyticsService {
  private async withTracking<T>(
    operation: string,
    userId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      AdvancedAnalyticsLogger.logOperation(operation, userId, duration, true);
      
      if (duration > 3000) { // Log slow advanced operations
        console.warn(`[PERFORMANCE] Slow advanced analytics operation: ${operation} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      AdvancedAnalyticsLogger.logOperation(operation, userId, duration, false);
      throw error;
    }
  }
  
  async getComprehensiveAnalytics(userId: string): Promise<AnalyticsMetrics> {
    return this.withTracking('getComprehensiveAnalytics', userId, async () => {
      // Check cache first for expensive operation
      const cacheKey = `comprehensive_analytics_${userId}`;
      const cached = AdvancedAnalyticsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      try {
      const applications = await JobApplication.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      }).sort({ applicationDate: -1 });

      if (applications.length === 0) {
        return this.getEmptyMetrics();
      }

      const coreMetrics = await this.calculateCoreMetrics(applications);
      const advancedMetrics = await this.calculateAdvancedMetrics(applications);
      const trendAnalysis = await this.calculateTrendAnalysis(applications);
      const seasonalPatterns = await this.calculateSeasonalPatterns(applications);
      const performanceImprovement = await this.calculatePerformanceImprovement(applications);

      return {
        applicationEffectiveness: coreMetrics.applicationEffectiveness || 0,
        responseRate: coreMetrics.responseRate || 0,
        interviewConversionRate: coreMetrics.interviewConversionRate || 0,
        offerConversionRate: coreMetrics.offerConversionRate || 0,
        timeToResponse: coreMetrics.timeToResponse || 0,
        timeToInterview: coreMetrics.timeToInterview || 0,
        timeToOffer: coreMetrics.timeToOffer || 0,
        successPredictionScore: advancedMetrics.successPredictionScore || 0,
        marketCompetitiveness: advancedMetrics.marketCompetitiveness || 0,
        applicationOptimizationScore: advancedMetrics.applicationOptimizationScore || 0,
        industryBenchmark: advancedMetrics.industryBenchmark || 0,
        applicationTrends: trendAnalysis,
        seasonalPatterns,
        performanceImprovement,
      };
      
      // Cache expensive comprehensive analytics for 10 minutes
      AdvancedAnalyticsCache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
      
    } catch (error) {
      console.error('Error generating comprehensive analytics:', error);
      throw new Error('Failed to generate analytics');
    }
    });
  }

  async getCompanyAnalysis(userId: string): Promise<CompanyAnalysis[]> {
    return this.withTracking('getCompanyAnalysis', userId, async () => {
      const cacheKey = `company_analysis_${userId}`;
      const cached = AdvancedAnalyticsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      try {
      const applications = await JobApplication.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      });

      const companyMap = new Map<string, any[]>();
      
      applications.forEach(app => {
        const companyName = app.companyName;
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, []);
        }
        companyMap.get(companyName)!.push(app);
      });

      const analyses: CompanyAnalysis[] = [];

      for (const [companyName, companyApps] of companyMap.entries()) {
        const analysis = await this.analyzeCompany(companyName, companyApps);
        analyses.push(analysis);
      }

      const result = analyses.sort((a, b) => b.applicationCount - a.applicationCount);
      
      // Cache company analysis for 15 minutes
      AdvancedAnalyticsCache.set(cacheKey, result, 15 * 60 * 1000);
      return result;
      
    } catch (error) {
      console.error('Error generating company analysis:', error);
      throw new Error('Failed to generate company analysis');
    }
    });
  }

  async getSkillGapAnalysis(userId: string): Promise<SkillGapAnalysis> {
    try {
      const applications = await JobApplication.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      });

      // Extract skills from job descriptions using NLP-like processing
      const requiredSkills = this.extractSkillsFromJobDescriptions(applications);
      const userSkills = await this.getUserSkills(userId);
      
      const missingSkills = requiredSkills.filter(skill => !userSkills.includes(skill));
      const overrepresentedSkills = userSkills.filter(skill => 
        !requiredSkills.includes(skill) && this.isSkillOverrepresented(skill, applications)
      );
      
      const marketDemandSkills = await this.getMarketDemandSkills();
      const skillMatchScore = this.calculateSkillMatchScore(userSkills, requiredSkills);
      
      const improvementSuggestions = this.generateSkillImprovementSuggestions(
        missingSkills, 
        marketDemandSkills,
        applications
      );

      return {
        missingSkills: missingSkills.slice(0, 10), // Top 10
        overrepresentedSkills: overrepresentedSkills.slice(0, 5),
        marketDemandSkills: marketDemandSkills.slice(0, 10),
        skillMatchScore,
        improvementSuggestions,
      };
    } catch (error) {
      console.error('Error generating skill gap analysis:', error);
      throw new Error('Failed to generate skill gap analysis');
    }
  }

  async getJobMatchingInsights(userId: string): Promise<JobMatchingInsights> {
    try {
      const applications = await JobApplication.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      });

      const userProfile = await this.buildUserProfile(userId);
      const roleAnalysis = this.analyzeRoleCompatibility(applications, userProfile);
      const salaryBenchmarks = await this.calculateSalaryBenchmarks(applications);
      const locationPreferences = this.extractLocationPreferences(applications);
      const industryFit = this.calculateIndustryFit(applications, userProfile);

      return {
        bestMatchingRoles: roleAnalysis.bestMatches,
        roleCompatibilityScores: roleAnalysis.scores,
        salaryBenchmarks,
        locationPreferences,
        industryFit,
      };
    } catch (error) {
      console.error('Error generating job matching insights:', error);
      throw new Error('Failed to generate job matching insights');
    }
  }

  async getPredictiveInsights(userId: string): Promise<{
    successProbability: Record<string, number>;
    timeToOfferPrediction: number;
    recommendedActions: string[];
    marketTiming: string;
  }> {
    try {
      const applications = await JobApplication.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      });

      const userMetrics = await this.calculateCoreMetrics(applications);
      const historicalPatterns = await this.calculateSeasonalPatterns(applications);
      
      // Machine learning-inspired predictions based on historical data
      const successProbability = this.predictSuccessProbability(applications, userMetrics);
      const timeToOfferPrediction = this.predictTimeToOffer(applications);
      const recommendedActions = this.generateRecommendedActions(applications, userMetrics);
      const marketTiming = this.analyzeMarketTiming(historicalPatterns);

      return {
        successProbability,
        timeToOfferPrediction,
        recommendedActions,
        marketTiming,
      };
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      throw new Error('Failed to generate predictive insights');
    }
  }

  private async calculateCoreMetrics(applications: any[]): Promise<Partial<AnalyticsMetrics>> {
    const totalApplications = applications.length;
    const responsesReceived = applications.filter(app => 
      ['under_review', 'phone_screen', 'technical_assessment', 'first_interview', 
       'second_interview', 'final_interview', 'offer_received', 'offer_accepted'].includes(app.status)
    ).length;
    
    const interviewsScheduled = applications.filter(app => app.interviews.length > 0).length;
    const offersReceived = applications.filter(app => 
      ['offer_received', 'offer_accepted'].includes(app.status)
    ).length;

    const responseRate = totalApplications > 0 ? (responsesReceived / totalApplications) * 100 : 0;
    const interviewConversionRate = responsesReceived > 0 ? (interviewsScheduled / responsesReceived) * 100 : 0;
    const offerConversionRate = interviewsScheduled > 0 ? (offersReceived / interviewsScheduled) * 100 : 0;

    // Calculate average times
    const timeToResponse = this.calculateAverageTimeToResponse(applications);
    const timeToInterview = this.calculateAverageTimeToInterview(applications);
    const timeToOffer = this.calculateAverageTimeToOffer(applications);

    return {
      applicationEffectiveness: (responseRate + interviewConversionRate + offerConversionRate) / 3,
      responseRate,
      interviewConversionRate,
      offerConversionRate,
      timeToResponse,
      timeToInterview,
      timeToOffer,
    };
  }

  private async calculateAdvancedMetrics(applications: any[]): Promise<Partial<AnalyticsMetrics>> {
    const successPredictionScore = this.calculateSuccessPredictionScore(applications);
    const marketCompetitiveness = await this.calculateMarketCompetitiveness(applications);
    const applicationOptimizationScore = this.calculateApplicationOptimizationScore(applications);
    const industryBenchmark = await this.calculateIndustryBenchmark(applications);

    return {
      successPredictionScore,
      marketCompetitiveness,
      applicationOptimizationScore,
      industryBenchmark,
    };
  }

  private async calculateTrendAnalysis(applications: any[]): Promise<TrendData[]> {
    const last12Months = this.getLast12Months();
    const trends: TrendData[] = [];

    for (const month of last12Months) {
      const monthApplications = applications.filter(app => {
        const appDate = new Date(app.applicationDate);
        return appDate.getMonth() === month.month && appDate.getFullYear() === month.year;
      });

      const responses = monthApplications.filter(app => 
        !['applied', 'rejected', 'withdrawn'].includes(app.status)
      ).length;

      const interviews = monthApplications.filter(app => app.interviews.length > 0).length;
      const offers = monthApplications.filter(app => 
        ['offer_received', 'offer_accepted'].includes(app.status)
      ).length;
      const rejections = monthApplications.filter(app => app.status === 'rejected').length;

      const responseRate = monthApplications.length > 0 ? (responses / monthApplications.length) * 100 : 0;
      const successRate = monthApplications.length > 0 ? (offers / monthApplications.length) * 100 : 0;

      trends.push({
        period: `${month.year}-${String(month.month + 1).padStart(2, '0')}`,
        applications: monthApplications.length,
        responses,
        interviews,
        offers,
        rejections,
        responseRate,
        successRate,
      });
    }

    return trends.reverse(); // Most recent first
  }

  private async calculateSeasonalPatterns(applications: any[]): Promise<SeasonalPattern[]> {
    const monthlyData = new Array(12).fill(0).map((_, index) => ({
      month: index,
      applications: [] as any[],
    }));

    applications.forEach(app => {
      const month = new Date(app.applicationDate).getMonth();
      monthlyData[month].applications.push(app);
    });

    return monthlyData.map(data => {
      const averageApplications = data.applications.length;
      const successfulApps = data.applications.filter(app => 
        ['offer_received', 'offer_accepted'].includes(app.status)
      ).length;
      const averageSuccessRate = averageApplications > 0 ? (successfulApps / averageApplications) * 100 : 0;

      let marketActivity: 'high' | 'medium' | 'low' = 'medium';
      if (averageApplications > 10) marketActivity = 'high';
      else if (averageApplications < 3) marketActivity = 'low';

      const recommendedActions = this.generateSeasonalRecommendations(data.month, marketActivity);

      return {
        month: data.month,
        averageApplications,
        averageSuccessRate,
        marketActivity,
        recommendedActions,
      };
    });
  }

  private calculatePerformanceImprovement(applications: any[]): number {
    if (applications.length < 10) return 0;

    const sortedApps = applications.sort((a, b) => 
      new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime()
    );

    const firstHalf = sortedApps.slice(0, Math.floor(sortedApps.length / 2));
    const secondHalf = sortedApps.slice(Math.floor(sortedApps.length / 2));

    const firstHalfSuccessRate = this.calculateSuccessRate(firstHalf);
    const secondHalfSuccessRate = this.calculateSuccessRate(secondHalf);

    return secondHalfSuccessRate - firstHalfSuccessRate;
  }

  private calculateSuccessRate(applications: any[]): number {
    if (applications.length === 0) return 0;
    const successful = applications.filter(app => 
      ['offer_received', 'offer_accepted'].includes(app.status)
    ).length;
    return (successful / applications.length) * 100;
  }

  private async analyzeCompany(companyName: string, applications: any[]): Promise<CompanyAnalysis> {
    const applicationCount = applications.length;
    const successfulApps = applications.filter(app => 
      ['offer_received', 'offer_accepted'].includes(app.status)
    ).length;
    const successRate = applicationCount > 0 ? (successfulApps / applicationCount) * 100 : 0;

    const responseTimes = applications
      .filter(app => app.communications.length > 0)
      .map(app => {
        const firstComm = app.communications.sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0];
        return new Date(firstComm.date).getTime() - new Date(app.applicationDate).getTime();
      });

    const averageTimeToResponse = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60 * 60 * 24)
      : 0;

    const rejectionReasons = this.extractRejectionReasons(applications);
    const difficulty = this.assessCompanyDifficulty(successRate, averageTimeToResponse);
    const recommendedApproach = this.generateCompanyRecommendation(companyName, applications);

    return {
      companyName,
      applicationCount,
      successRate,
      averageTimeToResponse,
      rejectionReasons,
      difficulty,
      recommendedApproach,
    };
  }

  // Helper methods
  private getEmptyMetrics(): AnalyticsMetrics {
    return {
      applicationEffectiveness: 0,
      responseRate: 0,
      interviewConversionRate: 0,
      offerConversionRate: 0,
      timeToResponse: 0,
      timeToInterview: 0,
      timeToOffer: 0,
      successPredictionScore: 0,
      marketCompetitiveness: 0,
      applicationOptimizationScore: 0,
      industryBenchmark: 0,
      applicationTrends: [],
      seasonalPatterns: [],
      performanceImprovement: 0,
    };
  }

  private getLast12Months(): Array<{ month: number; year: number }> {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    
    return months;
  }

  private calculateAverageTimeToResponse(applications: any[]): number {
    const responseTimes = applications
      .filter(app => app.communications.length > 0)
      .map(app => {
        const firstResponse = app.communications
          .filter((comm: any) => comm.direction === 'inbound')
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        
        if (!firstResponse) return null;
        
        return new Date(firstResponse.date).getTime() - new Date(app.applicationDate).getTime();
      })
      .filter(time => time !== null) as number[];

    if (responseTimes.length === 0) return 0;
    
    const averageMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(averageMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private calculateAverageTimeToInterview(applications: any[]): number {
    const interviewTimes = applications
      .filter(app => app.interviews.length > 0)
      .map(app => {
        const firstInterview = app.interviews
          .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
        
        return new Date(firstInterview.scheduledDate).getTime() - new Date(app.applicationDate).getTime();
      });

    if (interviewTimes.length === 0) return 0;
    
    const averageMs = interviewTimes.reduce((sum, time) => sum + time, 0) / interviewTimes.length;
    return Math.round(averageMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private calculateAverageTimeToOffer(applications: any[]): number {
    const offerTimes = applications
      .filter(app => ['offer_received', 'offer_accepted'].includes(app.status))
      .map(app => {
        // Use the last interview date or application date as reference
        const lastActivity = app.interviews.length > 0 
          ? Math.max(...app.interviews.map((i: any) => new Date(i.scheduledDate).getTime()))
          : new Date(app.applicationDate).getTime();
        
        // Estimate offer date (this would ideally be tracked separately)
        return Date.now() - lastActivity;
      });

    if (offerTimes.length === 0) return 0;
    
    const averageMs = offerTimes.reduce((sum, time) => sum + time, 0) / offerTimes.length;
    return Math.round(averageMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private calculateSuccessPredictionScore(applications: any[]): number {
    // Simple scoring algorithm based on application patterns
    let score = 50; // Base score
    
    const recentApps = applications.slice(0, 10);
    const responseRate = this.calculateSuccessRate(recentApps);
    
    score += responseRate * 0.5;
    
    // Adjust based on application quality indicators
    const hasStrategy = recentApps.filter(app => 
      app.applicationStrategy?.whyInterested?.length > 50
    ).length;
    score += (hasStrategy / recentApps.length) * 20;
    
    return Math.min(100, Math.max(0, score));
  }

  private async calculateMarketCompetitiveness(applications: any[]): Promise<number> {
    // This would ideally use market data - for now, use application patterns
    const averageApplicationsPerRole = applications.length / new Set(applications.map(app => app.jobTitle)).size;
    
    if (averageApplicationsPerRole > 5) return 80; // High competition
    if (averageApplicationsPerRole > 2) return 60; // Medium competition
    return 40; // Low competition
  }

  private calculateApplicationOptimizationScore(applications: any[]): number {
    let score = 0;
    const totalApps = applications.length;
    
    if (totalApps === 0) return 0;
    
    // Check for complete profiles
    const completeProfiles = applications.filter(app => 
      app.jobDescription?.length > 100 &&
      app.applicationStrategy?.whyInterested?.length > 50 &&
      app.applicationStrategy?.keySellingPoints?.length > 0
    ).length;
    
    score += (completeProfiles / totalApps) * 40;
    
    // Check for follow-up activities
    const withFollowUp = applications.filter(app => 
      app.communications.length > 0 || app.tasks.length > 0
    ).length;
    
    score += (withFollowUp / totalApps) * 30;
    
    // Check for strategic approach
    const strategicApps = applications.filter(app => 
      app.priority === 'high' || app.priority === 'dream_job'
    ).length;
    
    score += (strategicApps / totalApps) * 30;
    
    return Math.round(score);
  }

  private async calculateIndustryBenchmark(applications: any[]): Promise<number> {
    // This would ideally compare against industry data
    // For now, return a benchmark based on application patterns
    const industries = new Set(applications.map(app => this.extractIndustry(app.companyName)));
    
    if (industries.size > 5) return 75; // Diverse industry approach
    if (industries.size > 2) return 60; // Moderate diversity
    return 45; // Limited industry focus
  }

  private extractIndustry(companyName: string): string {
    // Simple industry classification - would be enhanced with actual data
    const techKeywords = ['tech', 'software', 'digital', 'ai', 'data'];
    const financeKeywords = ['bank', 'finance', 'capital', 'invest'];
    const healthKeywords = ['health', 'medical', 'pharma', 'bio'];
    
    const company = companyName.toLowerCase();
    
    if (techKeywords.some(keyword => company.includes(keyword))) return 'technology';
    if (financeKeywords.some(keyword => company.includes(keyword))) return 'finance';
    if (healthKeywords.some(keyword => company.includes(keyword))) return 'healthcare';
    
    return 'other';
  }

  private extractSkillsFromJobDescriptions(applications: any[]): string[] {
    // Simple skill extraction - would be enhanced with NLP
    const commonSkills = [
      'javascript', 'typescript', 'react', 'node.js', 'python', 'java', 'sql',
      'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'rest', 'graphql',
      'mongodb', 'postgresql', 'redis', 'elasticsearch', 'jenkins', 'ci/cd'
    ];
    
    const skillCounts = new Map<string, number>();
    
    applications.forEach(app => {
      const description = app.jobDescription.toLowerCase();
      commonSkills.forEach(skill => {
        if (description.includes(skill)) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      });
    });
    
    return Array.from(skillCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([skill]) => skill)
      .slice(0, 20);
  }

  private async getUserSkills(userId: string): Promise<string[]> {
    // This would fetch from user profile - placeholder for now
    return ['javascript', 'react', 'node.js', 'typescript', 'sql', 'git'];
  }

  private isSkillOverrepresented(skill: string, applications: any[]): boolean {
    const mentionCount = applications.filter(app => 
      app.jobDescription.toLowerCase().includes(skill)
    ).length;
    
    return mentionCount < applications.length * 0.3; // Less than 30% mention rate
  }

  private async getMarketDemandSkills(): Promise<string[]> {
    // This would fetch from market data APIs - placeholder for now
    return [
      'typescript', 'react', 'aws', 'kubernetes', 'python', 'machine learning',
      'data science', 'cybersecurity', 'cloud computing', 'devops'
    ];
  }

  private calculateSkillMatchScore(userSkills: string[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 100;
    
    const matchingSkills = userSkills.filter(skill => requiredSkills.includes(skill));
    return Math.round((matchingSkills.length / requiredSkills.length) * 100);
  }

  private generateSkillImprovementSuggestions(
    missingSkills: string[],
    marketDemandSkills: string[],
    applications: any[]
  ): string[] {
    const suggestions: string[] = [];
    
    if (missingSkills.length > 0) {
      suggestions.push(`Focus on learning ${missingSkills.slice(0, 3).join(', ')} to match job requirements`);
    }
    
    const highDemandMissing = marketDemandSkills.filter(skill => missingSkills.includes(skill));
    if (highDemandMissing.length > 0) {
      suggestions.push(`Prioritize ${highDemandMissing[0]} - it's in high market demand`);
    }
    
    const rejectedApps = applications.filter(app => app.status === 'rejected');
    if (rejectedApps.length > applications.length * 0.5) {
      suggestions.push('Consider taking online courses or getting certifications to strengthen your profile');
    }
    
    return suggestions;
  }

  private async buildUserProfile(userId: string): Promise<any> {
    // This would build from user data, applications, etc.
    return {
      skills: await this.getUserSkills(userId),
      experienceLevel: 'mid', // Would be calculated
      industries: ['technology'],
      preferences: {
        remote: true,
        salary: { min: 80000, max: 120000 },
        location: ['San Francisco', 'Remote']
      }
    };
  }

  private analyzeRoleCompatibility(applications: any[], userProfile: any): {
    bestMatches: string[];
    scores: Record<string, number>;
  } {
    const roleScores = new Map<string, number>();
    
    applications.forEach(app => {
      const role = app.jobTitle;
      let score = 50; // Base score
      
      // Score based on response rate for this role
      const roleApps = applications.filter(a => a.jobTitle === role);
      const successRate = this.calculateSuccessRate(roleApps);
      score += successRate * 0.3;
      
      // Score based on skill match
      const requiredSkills = this.extractSkillsFromJobDescriptions([app]);
      const skillMatch = this.calculateSkillMatchScore(userProfile.skills, requiredSkills);
      score += skillMatch * 0.4;
      
      roleScores.set(role, Math.min(100, score));
    });
    
    const sortedRoles = Array.from(roleScores.entries())
      .sort(([,a], [,b]) => b - a);
    
    return {
      bestMatches: sortedRoles.slice(0, 5).map(([role]) => role),
      scores: Object.fromEntries(sortedRoles),
    };
  }

  private async calculateSalaryBenchmarks(applications: any[]): Promise<Record<string, number>> {
    const benchmarks: Record<string, number> = {};
    
    applications.forEach(app => {
      if (app.compensation?.salaryRange?.min && app.compensation?.salaryRange?.max) {
        const avgSalary = (app.compensation.salaryRange.min + app.compensation.salaryRange.max) / 2;
        const role = app.jobTitle;
        
        if (!benchmarks[role] || benchmarks[role] < avgSalary) {
          benchmarks[role] = avgSalary;
        }
      }
    });
    
    return benchmarks;
  }

  private extractLocationPreferences(applications: any[]): string[] {
    const locationCounts = new Map<string, number>();
    
    applications.forEach(app => {
      const location = app.jobLocation?.remote ? 'Remote' : 
        `${app.jobLocation?.city}, ${app.jobLocation?.state}`;
      
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });
    
    return Array.from(locationCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([location]) => location)
      .slice(0, 5);
  }

  private calculateIndustryFit(applications: any[], userProfile: any): Record<string, number> {
    const industryScores: Record<string, number> = {};
    
    applications.forEach(app => {
      const industry = this.extractIndustry(app.companyName);
      const industryApps = applications.filter(a => this.extractIndustry(a.companyName) === industry);
      const successRate = this.calculateSuccessRate(industryApps);
      
      industryScores[industry] = successRate;
    });
    
    return industryScores;
  }

  private predictSuccessProbability(applications: any[], userMetrics: any): Record<string, number> {
    // Simple prediction based on historical performance
    const roleSuccessRates: Record<string, number> = {};
    
    const roles = new Set(applications.map(app => app.jobTitle));
    
    roles.forEach(role => {
      const roleApps = applications.filter(app => app.jobTitle === role);
      roleSuccessRates[role] = this.calculateSuccessRate(roleApps);
    });
    
    return roleSuccessRates;
  }

  private predictTimeToOffer(applications: any[]): number {
    const offerTimes = this.calculateAverageTimeToOffer(applications);
    
    // Add some intelligence based on current market conditions
    const recentTrend = this.calculatePerformanceImprovement(applications);
    
    if (recentTrend > 10) return Math.max(offerTimes * 0.8, 21); // Improving, faster offers
    if (recentTrend < -10) return offerTimes * 1.2; // Declining, slower offers
    
    return offerTimes;
  }

  private generateRecommendedActions(applications: any[], userMetrics: any): string[] {
    const actions: string[] = [];
    
    if (userMetrics.responseRate < 20) {
      actions.push('Focus on tailoring your resume and cover letter to specific job requirements');
      actions.push('Research companies thoroughly before applying');
    }
    
    if (userMetrics.interviewConversionRate < 50) {
      actions.push('Practice interview skills and prepare better for technical interviews');
      actions.push('Follow up professionally after interviews');
    }
    
    const recentApps = applications.slice(0, 10);
    const strategicApps = recentApps.filter(app => 
      app.applicationStrategy?.whyInterested?.length > 50
    ).length;
    
    if (strategicApps / recentApps.length < 0.7) {
      actions.push('Spend more time on application strategy and personalization');
    }
    
    return actions;
  }

  private analyzeMarketTiming(patterns: SeasonalPattern[]): string {
    const currentMonth = new Date().getMonth();
    const currentPattern = patterns[currentMonth];
    
    if (currentPattern.marketActivity === 'high') {
      return 'Excellent time to apply - high market activity';
    } else if (currentPattern.marketActivity === 'low') {
      return 'Consider waiting for better market timing or focus on networking';
    }
    
    return 'Good time to apply with steady market activity';
  }

  private extractRejectionReasons(applications: any[]): string[] {
    // This would analyze communications for rejection reasons
    // Placeholder implementation
    const reasons = ['Skills mismatch', 'Experience level', 'Cultural fit', 'Position filled'];
    return reasons.slice(0, Math.min(3, Math.ceil(applications.length / 5)));
  }

  private assessCompanyDifficulty(successRate: number, avgResponseTime: number): 'easy' | 'medium' | 'hard' {
    if (successRate > 50) return 'easy';
    if (successRate > 20 && avgResponseTime < 14) return 'medium';
    return 'hard';
  }

  private generateCompanyRecommendation(companyName: string, applications: any[]): string {
    const successRate = this.calculateSuccessRate(applications);
    
    if (successRate > 50) {
      return 'Strong match - continue applying to similar roles';
    } else if (successRate > 20) {
      return 'Moderate success - focus on networking and referrals';
    } else {
      return 'Low success rate - consider improving skills or targeting different roles';
    }
  }

  private generateSeasonalRecommendations(month: number, activity: 'high' | 'medium' | 'low'): string[] {
    const recommendations: string[] = [];
    
    // January
    if (month === 0) {
      recommendations.push('New year hiring surge - increase application volume');
      recommendations.push('Focus on companies with Q1 budget allocations');
    }
    // June-August (Summer)
    else if (month >= 5 && month <= 7) {
      if (activity === 'low') {
        recommendations.push('Summer slowdown - focus on networking and skill development');
        recommendations.push('Prepare for fall hiring season');
      }
    }
    // September-November (Fall)
    else if (month >= 8 && month <= 10) {
      recommendations.push('Fall hiring season - prime time for applications');
      recommendations.push('Companies filling roles before year-end');
    }
    // December
    else if (month === 11) {
      recommendations.push('Holiday slowdown - focus on networking and follow-ups');
      recommendations.push('Prepare for January hiring surge');
    }
    
    return recommendations;
  }
  
  // Production health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test database connectivity with a simple query
      const testQuery = await JobApplication.countDocuments({}).limit(1);
      
      // Test cache functionality
      const testCacheKey = 'health_check_test';
      AdvancedAnalyticsCache.set(testCacheKey, { test: true }, 1000);
      const cacheTest = AdvancedAnalyticsCache.get(testCacheKey);
      
      const isHealthy = typeof testQuery === 'number' && cacheTest !== null;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          database: 'connected',
          cache: cacheTest ? 'functional' : 'failed',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
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
  
  // Clear cache for maintenance
  clearCache(): void {
    AdvancedAnalyticsCache.clear();
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();