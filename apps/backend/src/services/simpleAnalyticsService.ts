import mongoose from 'mongoose';
import { JobApplication } from '../models/JobApplication';
import { Resume } from '../models/Resume';
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';

export interface SimpleUserAnalytics {
  userId: string;
  
  // Job Applications
  applications: {
    total: number;
    byStatus: {
      applied: number;
      interview: number;
      offer: number;
      rejected: number;
    };
    recentApplications: number; // Last 30 days
    averageResponseTime: number; // Days
  };
  
  // Resumes
  resumes: {
    total: number;
    created: number;
    updated: number;
    exported: number;
  };
  
  // Account Activity
  activity: {
    lastLoginAt?: Date;
    totalSessions: number;
    activeDays: number; // Days with activity in last 30 days
    accountAge: number; // Days since account creation
  };
}

export interface SimpleDashboardMetrics {
  overview: {
    totalApplications: number;
    totalResumes: number;
    totalUsers: number;
    activeUsers: number; // Last 30 days
  };
  
  applications: {
    thisWeek: number;
    thisMonth: number;
    successRate: number; // Offers / Total applications
    topCompanies: { name: string; count: number }[];
    statusDistribution: {
      applied: number;
      interview: number;
      offer: number;
      rejected: number;
    };
  };
  
  resumes: {
    created: number;
    exported: number;
    optimized: number;
  };
}

class SimpleAnalyticsService {
  async getUserAnalytics(userId: string): Promise<SimpleUserAnalytics> {
    try {
      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get job applications
      const applications = await JobApplication.find({ userId });
      const recentApplications = await JobApplication.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      // Calculate application metrics
      const applicationsByStatus = applications.reduce((acc, app) => {
        acc[app.status as keyof typeof acc] = (acc[app.status as keyof typeof acc] || 0) + 1;
        return acc;
      }, { applied: 0, interview: 0, offer: 0, rejected: 0 });

      // Get resumes
      const resumes = await Resume.find({ userId });

      // Get user sessions
      const sessions = await UserSession.find({ userId });
      const activeDays = await this.calculateActiveDays(userId);

      return {
        userId,
        applications: {
          total: applications.length,
          byStatus: applicationsByStatus,
          recentApplications: recentApplications.length,
          averageResponseTime: this.calculateAverageResponseTime(applications)
        },
        resumes: {
          total: resumes.length,
          created: resumes.length,
          updated: resumes.filter(r => r.updatedAt > r.createdAt).length,
          exported: 0 // Would need to track exports separately
        },
        activity: {
          lastLoginAt: user.lastLoginAt,
          totalSessions: sessions.length,
          activeDays,
          accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        }
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async getDashboardMetrics(): Promise<SimpleDashboardMetrics> {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get totals
      const [totalApplications, totalResumes, totalUsers] = await Promise.all([
        JobApplication.countDocuments(),
        Resume.countDocuments(),
        User.countDocuments()
      ]);

      // Get active users (had sessions in last 30 days)
      const activeUsers = await UserSession.distinct('userId', {
        loginTime: { $gte: oneMonthAgo }
      }).then(userIds => userIds.length);

      // Get application metrics
      const [applicationsThisWeek, applicationsThisMonth] = await Promise.all([
        JobApplication.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        JobApplication.countDocuments({ createdAt: { $gte: oneMonthAgo } })
      ]);

      // Calculate success rate (offers / total applications)
      const offersCount = await JobApplication.countDocuments({ status: 'offer' });
      const successRate = totalApplications > 0 ? (offersCount / totalApplications) * 100 : 0;

      // Get top companies
      const topCompanies = await JobApplication.aggregate([
        { $group: { _id: '$companyName', count: { $sum: 1 } } },
        { $sort: { count: -1 as const } },
        { $limit: 5 },
        { $project: { name: '$_id', count: 1, _id: 0 } }
      ]);

      // Get status distribution
      const statusDistribution = await JobApplication.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } }
      ]).then(results => {
        return results.reduce((acc, item) => {
          acc[item.status as keyof typeof acc] = item.count;
          return acc;
        }, { applied: 0, interview: 0, offer: 0, rejected: 0 });
      });

      // Get resume metrics
      const resumesCreated = await Resume.countDocuments({ createdAt: { $gte: oneMonthAgo } });

      return {
        overview: {
          totalApplications,
          totalResumes,
          totalUsers,
          activeUsers
        },
        applications: {
          thisWeek: applicationsThisWeek,
          thisMonth: applicationsThisMonth,
          successRate: Math.round(successRate * 100) / 100,
          topCompanies,
          statusDistribution
        },
        resumes: {
          created: resumesCreated,
          exported: 0, // Would need to track separately
          optimized: 0 // Would need to track separately
        }
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  private calculateAverageResponseTime(applications: any[]): number {
    const responseTimes = applications
      .filter(app => app.status !== 'applied' && app.appliedDate)
      .map(app => {
        const appliedDate = new Date(app.appliedDate);
        const responseDate = new Date(app.updatedAt);
        return Math.floor((responseDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter(days => days > 0);

    return responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, days) => sum + days, 0) / responseTimes.length)
      : 0;
  }

  async getResumeAnalytics(userId: string, resumeId?: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's resumes
      const query = resumeId ? { userId, _id: resumeId } : { userId };
      const resumes = await Resume.find(query);
      
      if (resumes.length === 0) {
        return {
          resumeMetrics: {
            totalResumes: 0,
            averageScore: 0,
            completionRate: 0,
            lastUpdated: null
          },
          skillAnalysis: {
            totalSkills: 0,
            topSkills: [],
            skillCategories: {}
          },
          optimizationSuggestions: []
        };
      }

      // Calculate resume metrics
      const totalResumes = resumes.length;
      const completedResumes = resumes.filter(r => 
        r.personalInfo?.firstName && 
        r.personalInfo?.lastName && 
        r.personalInfo?.email && 
        r.professionalSummary && 
        r.workExperience && 
        r.workExperience.length > 0
      ).length;
      const completionRate = totalResumes > 0 ? (completedResumes / totalResumes) * 100 : 0;
      
      // Extract skills from all resumes
      const allSkills: string[] = [];
      resumes.forEach(resume => {
        if (resume.skills && Array.isArray(resume.skills)) {
          const skillNames = resume.skills.map((skill: any) => 
            typeof skill === 'string' ? skill : skill.name || skill
          );
          allSkills.push(...skillNames);
        }
      });

      // Count skill occurrences
      const skillCounts = allSkills.reduce((acc, skill) => {
        acc[skill] = (acc[skill] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get top skills
      const topSkills = Object.entries(skillCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      return {
        resumeMetrics: {
          totalResumes,
          averageScore: this.calculateRealResumeScore(resumes),
          completionRate: Math.round(completionRate),
          lastUpdated: resumes[0]?.updatedAt
        },
        skillAnalysis: {
          totalSkills: Object.keys(skillCounts).length,
          topSkills,
          skillCategories: this.categorizeSkills(Object.keys(skillCounts))
        },
        optimizationSuggestions: this.generateOptimizationSuggestions(resumes)
      };
    } catch (error) {
      console.error('Error getting resume analytics:', error);
      throw error;
    }
  }

  private categorizeSkills(skills: string[]) {
    const categories = {
      technical: [] as string[],
      soft: [] as string[],
      languages: [] as string[],
      other: [] as string[]
    };

    const technicalKeywords = ['javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'git'];
    const softKeywords = ['communication', 'leadership', 'teamwork', 'problem-solving', 'management'];
    const languageKeywords = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese'];

    skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      if (technicalKeywords.some(keyword => lowerSkill.includes(keyword))) {
        categories.technical.push(skill);
      } else if (softKeywords.some(keyword => lowerSkill.includes(keyword))) {
        categories.soft.push(skill);
      } else if (languageKeywords.some(keyword => lowerSkill.includes(keyword))) {
        categories.languages.push(skill);
      } else {
        categories.other.push(skill);
      }
    });

    return categories;
  }

  private generateOptimizationSuggestions(resumes: any[]) {
    const suggestions = [];

    // Check for common optimization opportunities
    const incompleteResumes = resumes.filter(r => !r.isComplete);
    if (incompleteResumes.length > 0) {
      suggestions.push({
        type: 'completion',
        priority: 'high',
        message: `Complete ${incompleteResumes.length} incomplete resume(s)`
      });
    }

    // Check for missing sections
    const resumesWithoutSummary = resumes.filter(r => !r.summary || r.summary.trim() === '');
    if (resumesWithoutSummary.length > 0) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        message: 'Add professional summary to improve resume impact'
      });
    }

    // Check for outdated resumes
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const outdatedResumes = resumes.filter(r => r.updatedAt < oneMonthAgo);
    if (outdatedResumes.length > 0) {
      suggestions.push({
        type: 'maintenance',
        priority: 'low',
        message: 'Consider updating resumes that haven\'t been modified in over a month'
      });
    }

    return suggestions;
  }

  async getProductionAnalytics(userId: string) {
    try {
      const applications = await JobApplication.find({ userId });
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate real active applications (not just applied/interview)
      const activeApplications = applications.filter(app => 
        !['rejected', 'withdrawn', 'offer_declined', 'offer_accepted'].includes(app.status)
      ).length;

      // Calculate real rates
      const totalApps = applications.length;
      const responsesReceived = applications.filter(app => app.status !== 'applied').length;
      const interviews = applications.filter(app => 
        ['phone_screen', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview'].includes(app.status)
      ).length;
      const offers = applications.filter(app => 
        ['offer_received', 'offer_accepted', 'offer_declined'].includes(app.status)
      ).length;

      const responseRate = totalApps > 0 ? (responsesReceived / totalApps) * 100 : 0;
      const interviewRate = totalApps > 0 ? (interviews / totalApps) * 100 : 0;
      const offerRate = totalApps > 0 ? (offers / totalApps) * 100 : 0;
      const successRate = totalApps > 0 ? (offers / totalApps) * 100 : 0;

      // Real applications over time (last 6 months by week)
      const applicationsOverTime = await this.getApplicationsOverTime(userId);

      // Real applications by source
      const applicationsBySource = await this.getApplicationsBySource(userId);

      // Real top companies with success rates
      const topCompanies = await this.getTopCompaniesWithSuccessRates(userId);

      // Real skill demand based on job applications
      const skillDemand = await this.getSkillDemandFromApplications(userId);

      // Real market trends
      const marketTrends = await this.getMarketTrends(userId);

      // Real monthly stats (last 6 months)
      const monthlyStats = await this.getMonthlyStats(userId);

      // Real conversion funnel
      const conversionFunnel = [
        {
          stage: 'Applications Sent',
          count: totalApps,
          percentage: 100
        },
        {
          stage: 'Responses Received',
          count: responsesReceived,
          percentage: totalApps > 0 ? Math.round((responsesReceived / totalApps) * 100) : 0
        },
        {
          stage: 'Interviews Scheduled',
          count: interviews,
          percentage: totalApps > 0 ? Math.round((interviews / totalApps) * 100) : 0
        },
        {
          stage: 'Offers Received',
          count: offers,
          percentage: totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0
        }
      ];

      // Calculate period-over-period trends
      const currentPeriod = applications.filter(app => 
        app.applicationDate >= thirtyDaysAgo
      );
      const previousPeriod = applications.filter(app => {
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        return app.applicationDate >= sixtyDaysAgo && app.applicationDate < thirtyDaysAgo;
      });

      const currentApplications = currentPeriod.length;
      const previousApplications = previousPeriod.length;
      const applicationsTrend = previousApplications > 0 ? 
        ((currentApplications - previousApplications) / previousApplications) * 100 : 0;

      const currentResponseRate = currentPeriod.length > 0 ? 
        (currentPeriod.filter(app => app.status !== 'applied').length / currentPeriod.length) * 100 : 0;
      const previousResponseRate = previousPeriod.length > 0 ? 
        (previousPeriod.filter(app => app.status !== 'applied').length / previousPeriod.length) * 100 : 0;
      const responseRateTrend = currentResponseRate - previousResponseRate;

      const currentInterviewRate = currentPeriod.length > 0 ? 
        (currentPeriod.filter(app => ['phone_screen', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview'].includes(app.status)).length / currentPeriod.length) * 100 : 0;
      const previousInterviewRate = previousPeriod.length > 0 ? 
        (previousPeriod.filter(app => ['phone_screen', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview'].includes(app.status)).length / previousPeriod.length) * 100 : 0;
      const interviewRateTrend = currentInterviewRate - previousInterviewRate;

      const currentAvgResponseTime = this.calculateAverageResponseTime(currentPeriod);
      const previousAvgResponseTime = this.calculateAverageResponseTime(previousPeriod);
      const responseTimeTrend = currentAvgResponseTime - previousAvgResponseTime;

      return {
        activeApplications,
        responseRate: Math.round(responseRate * 100) / 100,
        interviewRate: Math.round(interviewRate * 100) / 100,
        offerRate: Math.round(offerRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        applicationsOverTime,
        applicationsBySource,
        topCompanies,
        skillDemand,
        marketTrends,
        monthlyStats,
        conversionFunnel,
        applicationsTrend: Math.round(applicationsTrend * 100) / 100,
        responseRateTrend: Math.round(responseRateTrend * 100) / 100,
        interviewRateTrend: Math.round(interviewRateTrend * 100) / 100,
        responseTimeTrend: Math.round(responseTimeTrend)
      };
    } catch (error) {
      console.error('Error getting production analytics:', error);
      throw error;
    }
  }

  private async getApplicationsOverTime(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const pipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          applicationDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$applicationDate' },
            week: { $week: '$applicationDate' }
          },
          applications: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'applied'] },
                1,
                0
              ]
            }
          },
          interviews: {
            $sum: {
              $cond: [
                { $in: ['$status', ['phone_screen', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1 as const, '_id.week': 1 as const }
      }
    ];

    const result = await JobApplication.aggregate(pipeline);
    return result.map(item => ({
      date: `${item._id.year}-W${item._id.week}`,
      applications: item.applications,
      responses: item.responses,
      interviews: item.interviews
    }));
  }

  private async getApplicationsBySource(userId: string) {
    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$jobSource', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } }
    ];

    const sourceCounts = await JobApplication.aggregate(pipeline);
    
    // Calculate conversion rates for each source
    const sourceAnalytics = await Promise.all(
      sourceCounts.map(async (sourceData) => {
        const totalFromSource = sourceData.count;
        const offersFromSource = await JobApplication.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
          jobSource: sourceData._id,
          status: { $in: ['offer_received', 'offer_accepted', 'offer_declined'] }
        });
        
        const conversionRate = totalFromSource > 0 ? (offersFromSource / totalFromSource) * 100 : 0;
        
        return {
          source: sourceData._id,
          count: totalFromSource,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
      })
    );

    return sourceAnalytics;
  }

  private async getTopCompaniesWithSuccessRates(userId: string) {
    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$companyName', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
      { $limit: 5 }
    ];

    const companyCounts = await JobApplication.aggregate(pipeline);
    
    // Calculate success rates for each company
    const companyAnalytics = await Promise.all(
      companyCounts.map(async (companyData) => {
        const totalApplications = companyData.count;
        const successfulApplications = await JobApplication.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
          companyName: companyData._id,
          status: { $in: ['offer_received', 'offer_accepted'] }
        });
        
        const successRate = totalApplications > 0 ? (successfulApplications / totalApplications) * 100 : 0;
        
        return {
          company: companyData._id,
          applications: totalApplications,
          successRate: Math.round(successRate * 100) / 100
        };
      })
    );

    return companyAnalytics;
  }

  private async getSkillDemandFromApplications(userId: string) {
    // Get all job descriptions and extract commonly mentioned skills
    const applications = await JobApplication.find({ userId }, 'jobDescription jobTitle');
    
    const skillKeywords = [
      'javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes',
      'java', 'c++', 'golang', 'typescript', 'vue', 'angular', 'mongodb', 'postgresql',
      'machine learning', 'artificial intelligence', 'data science', 'cloud computing'
    ];

    const skillDemand = skillKeywords.map(skill => {
      const mentions = applications.filter(app => 
        app.jobDescription.toLowerCase().includes(skill.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(skill.toLowerCase())
      ).length;
      
      return {
        skill,
        demandScore: applications.length > 0 ? (mentions / applications.length) * 100 : 0,
        mentions
      };
    }).filter(item => item.mentions > 0)
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 10);

    return skillDemand;
  }

  private async getMarketTrends(userId: string) {
    const applications = await JobApplication.find({ userId }, 'applicationDate companyName jobTitle');
    
    // Analyze trends in job titles over time
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const currentYearApps = applications.filter(app => app.applicationDate.getFullYear() === currentYear);
    const lastYearApps = applications.filter(app => app.applicationDate.getFullYear() === lastYear);
    
    if (lastYearApps.length === 0) {
      return []; // Not enough historical data
    }
    
    // Analyze job title trends
    const currentTitles = this.extractJobTitleTrends(currentYearApps);
    const lastYearTitles = this.extractJobTitleTrends(lastYearApps);
    
    const trends = Object.keys(currentTitles).map(title => {
      const currentCount = currentTitles[title] || 0;
      const lastYearCount = lastYearTitles[title] || 0;
      const trend = lastYearCount > 0 ? ((currentCount - lastYearCount) / lastYearCount) * 100 : 0;
      
      return {
        trend: title,
        changePercentage: Math.round(trend * 100) / 100,
        currentApplications: currentCount,
        previousApplications: lastYearCount
      };
    }).filter(item => item.currentApplications > 0)
      .sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))
      .slice(0, 5);

    return trends;
  }

  private extractJobTitleTrends(applications: any[]) {
    const titleCounts: Record<string, number> = {};
    
    applications.forEach(app => {
      // Normalize job titles to identify trends
      const title = app.jobTitle.toLowerCase();
      const normalizedTitle = this.normalizeJobTitle(title);
      titleCounts[normalizedTitle] = (titleCounts[normalizedTitle] || 0) + 1;
    });
    
    return titleCounts;
  }

  private normalizeJobTitle(title: string): string {
    // Extract key role types
    if (title.includes('senior') || title.includes('sr.')) return 'Senior Developer';
    if (title.includes('lead') || title.includes('principal')) return 'Lead Developer';
    if (title.includes('manager') || title.includes('engineering manager')) return 'Engineering Manager';
    if (title.includes('fullstack') || title.includes('full stack')) return 'Full Stack Developer';
    if (title.includes('frontend') || title.includes('front end')) return 'Frontend Developer';
    if (title.includes('backend') || title.includes('back end')) return 'Backend Developer';
    if (title.includes('devops') || title.includes('sre')) return 'DevOps Engineer';
    if (title.includes('data') && title.includes('scientist')) return 'Data Scientist';
    if (title.includes('data') && title.includes('engineer')) return 'Data Engineer';
    if (title.includes('machine learning') || title.includes('ml engineer')) return 'ML Engineer';
    
    return 'Software Developer'; // Default fallback
  }

  private async getMonthlyStats(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const pipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          applicationDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$applicationDate' },
            month: { $month: '$applicationDate' }
          },
          applications: { $sum: 1 },
          interviews: {
            $sum: {
              $cond: [
                { $in: ['$status', ['phone_screen', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview']] },
                1,
                0
              ]
            }
          },
          offers: {
            $sum: {
              $cond: [
                { $in: ['$status', ['offer_received', 'offer_accepted']] },
                1,
                0
              ]
            }
          },
          rejections: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'rejected'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1 as const, '_id.month': 1 as const }
      }
    ];

    const result = await JobApplication.aggregate(pipeline);
    return result.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      applications: item.applications,
      interviews: item.interviews,
      offers: item.offers,
      rejections: item.rejections
    }));
  }

  private calculateRealResumeScore(resumes: any[]): number {
    if (resumes.length === 0) return 0;
    
    let totalScore = 0;
    resumes.forEach(resume => {
      let completionFactors = 0;
      const maxFactors = 11; // Total possible completion factors
      
      // Core completeness factors
      if (resume.personalInfo?.firstName && resume.personalInfo?.lastName) completionFactors++;
      if (resume.personalInfo?.email) completionFactors++;
      if (resume.personalInfo?.phone) completionFactors++;
      if (resume.summary && resume.summary.length > 50) completionFactors++;
      if (resume.experience && resume.experience.length > 0) completionFactors++;
      if (resume.education && resume.education.length > 0) completionFactors++;
      
      // Enhancement factors (weighted by content quality)
      if (resume.skills && resume.skills.length >= 3) completionFactors++;
      if (resume.projects && resume.projects.length > 0) completionFactors++;
      if (resume.certifications && resume.certifications.length > 0) completionFactors++;
      if (resume.languages && resume.languages.length > 0) completionFactors++;
      if (resume.achievements && resume.achievements.length > 0 || 
          resume.publications && resume.publications.length > 0 || 
          resume.volunteerExperience && resume.volunteerExperience.length > 0) completionFactors++;
      
      // Calculate percentage-based score
      const baseScore = (completionFactors / maxFactors) * 70; // Base up to 70%
      
      // Bonus points for content richness
      let bonusScore = 0;
      if (resume.summary && resume.summary.length > 100) bonusScore += 5;
      if (resume.skills && resume.skills.length >= 8) bonusScore += 10;
      if (resume.experience && resume.experience.length >= 3) bonusScore += 10;
      if (resume.projects && resume.projects.length >= 2) bonusScore += 5;
      
      totalScore += Math.min(baseScore + bonusScore, 100);
    });
    
    return Math.round(totalScore / resumes.length);
  }

  private async calculateActiveDays(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const sessions = await UserSession.find({
      userId,
      loginTime: { $gte: thirtyDaysAgo }
    });

    const uniqueDays = new Set(
      sessions.map(session => 
        session.loginTime.toISOString().split('T')[0]
      )
    );

    return uniqueDays.size;
  }

  async getUserLocationData(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          userLocation: null,
          locationComparison: [],
          countryInfo: null
        };
      }

      // Extract location from user profile or job applications
      const applications = await JobApplication.find({ userId }).limit(10);
      let userLocation = null;
      let countryInfo = null;

      // Try to get location from user profile first
      if (user.profile?.location) {
        const locationParts = user.profile.location.split(',').map(s => s.trim());
        userLocation = {
          city: locationParts[0] || 'Unknown',
          country: locationParts[locationParts.length - 1] || 'Unknown'
        };
      } 
      // Fallback to most common location from job applications
      else if (applications.length > 0) {
        const locationCounts = {};
        applications.forEach(app => {
          if (app.jobLocation?.city && app.jobLocation?.country) {
            const locationKey = `${app.jobLocation.city}, ${app.jobLocation.country}`;
            locationCounts[locationKey] = (locationCounts[locationKey] || 0) + 1;
          }
        });

        const mostCommonLocation = Object.keys(locationCounts).reduce((a, b) => 
          locationCounts[a] > locationCounts[b] ? a : b, Object.keys(locationCounts)[0]
        );

        if (mostCommonLocation) {
          const [city, country] = mostCommonLocation.split(', ');
          userLocation = { city, country };
        }
      }

      // Get country-specific info if we have a location
      if (userLocation?.country) {
        const countryApplications = applications.filter(app => 
          app.jobLocation?.country === userLocation.country
        );
        
        countryInfo = {
          country: userLocation.country,
          totalCitiesAnalyzed: new Set(countryApplications.map(app => app.jobLocation?.city)).size,
          totalApplicationsInCountry: countryApplications.length
        };
      }

      return {
        userLocation,
        locationComparison: [], // Could be enhanced with salary comparison data
        countryInfo
      };
    } catch (error) {
      console.error('Error getting user location data:', error);
      return {
        userLocation: null,
        locationComparison: [],
        countryInfo: null
      };
    }
  }
}

export const simpleAnalyticsService = new SimpleAnalyticsService();