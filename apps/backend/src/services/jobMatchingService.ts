
import { JobApplication } from '../models/JobApplication';
import { aiOptimizationService } from './aiOptimizationService';
import mongoose from 'mongoose';

export interface JobListing {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  salary: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  benefits?: string[];
  skills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  industry: string;
  postedDate: Date;
  deadline?: Date;
  source: string;
  originalUrl?: string;
}

export interface JobMatch {
  job: JobListing;
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    locationMatch: number;
    experienceMatch: number;
    salaryMatch: number;
    typeMatch: number;
  };
  recommendations: string[];
  missingSkills: string[];
  competitiveAdvantages: string[];
  applicationStrategy: {
    difficulty: 'low' | 'medium' | 'high';
    timeToApply: 'immediate' | 'within_week' | 'research_needed';
    keyPoints: string[];
    coverLetterTips: string[];
  };
}

export interface JobSearchFilters {
  keywords?: string[];
  location?: string;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string[];
  employmentType?: string[];
  industry?: string[];
  skills?: string[];
  postedWithin?: number; // days
  excludeApplied?: boolean;
}

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  filters: JobSearchFilters;
  frequency: 'immediate' | 'daily' | 'weekly';
  enabled: boolean;
  lastSent?: Date;
  createdAt: Date;
}

class JobMatchingService {
  private jobListings: Map<string, JobListing> = new Map();
  private userAlerts: Map<string, JobAlert[]> = new Map();

  async findMatchingJobs(
    userId: string,
    filters: JobSearchFilters = {},
    limit: number = 50
  ): Promise<{
    matches: JobMatch[];
    total: number;
    recommendations: {
      improveProfile: string[];
      searchTips: string[];
      marketInsights: string[];
    };
  }> {
    try {
      const userProfile = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get user's applied jobs to filter out
      const appliedJobs = filters.excludeApplied 
        ? await JobApplication.find({ userId: new mongoose.Types.ObjectId(userId) }).select('jobId jobTitle companyName')
        : [];
      const appliedJobIds = new Set(appliedJobs.map(app => app.jobId).filter(Boolean));
      const appliedCompanyTitles = new Set(
        appliedJobs.map(app => `${app.companyName.toLowerCase()}_${app.jobTitle.toLowerCase()}`)
      );

      // Get available jobs (this would typically come from job scraping APIs)
      const availableJobs = await this.getAvailableJobs(filters);

      // Filter out already applied jobs
      const filteredJobs = availableJobs.filter(job => {
        if (appliedJobIds.has(job.id)) return false;
        const companyTitle = `${job.company.toLowerCase()}_${job.title.toLowerCase()}`;
        return !appliedCompanyTitles.has(companyTitle);
      });

      // Calculate match scores for all jobs
      const jobMatches: JobMatch[] = [];
      for (const job of filteredJobs.slice(0, limit * 2)) { // Process more than limit for better selection
        const match = await this.calculateJobMatch(userProfile, job);
        if (match.matchScore >= 30) { // Only include jobs with reasonable match
          jobMatches.push(match);
        }
      }

      // Sort by match score and take top results
      jobMatches.sort((a, b) => b.matchScore - a.matchScore);
      const topMatches = jobMatches.slice(0, limit);

      // Generate recommendations
      const recommendations = await this.generateSearchRecommendations(userProfile, topMatches);

      return {
        matches: topMatches,
        total: filteredJobs.length,
        recommendations
      };
    } catch (error: any) {
      throw new Error(`Failed to find matching jobs: ${error.message}`);
    }
  }

  async calculateJobMatch(userProfile: IUserProfile, job: JobListing): Promise<JobMatch> {
    try {
      // Skills matching (40% weight)
      const skillsMatch = this.calculateSkillsMatch(userProfile, job);

      // Location matching (20% weight)
      const locationMatch = this.calculateLocationMatch(userProfile, job);

      // Experience matching (25% weight)
      const experienceMatch = this.calculateExperienceMatch(userProfile, job);

      // Salary matching (10% weight)
      const salaryMatch = this.calculateSalaryMatch(userProfile, job);

      // Employment type matching (5% weight)
      const typeMatch = this.calculateTypeMatch(userProfile, job);

      // Calculate overall match score
      const matchScore = Math.round(
        skillsMatch * 0.4 +
        locationMatch * 0.2 +
        experienceMatch * 0.25 +
        salaryMatch * 0.1 +
        typeMatch * 0.05
      );

      // Generate recommendations and insights
      const recommendations = this.generateMatchRecommendations(userProfile, job, {
        skillsMatch,
        locationMatch,
        experienceMatch,
        salaryMatch,
        typeMatch
      });

      const missingSkills = this.findMissingSkills(userProfile, job);
      const competitiveAdvantages = this.findCompetitiveAdvantages(userProfile, job);
      const applicationStrategy = this.generateApplicationStrategy(matchScore, missingSkills.length);

      return {
        job,
        matchScore,
        matchBreakdown: {
          skillsMatch,
          locationMatch,
          experienceMatch,
          salaryMatch,
          typeMatch
        },
        recommendations,
        missingSkills,
        competitiveAdvantages,
        applicationStrategy
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate job match: ${error.message}`);
    }
  }

  async createJobAlert(
    userId: string,
    alertData: {
      name: string;
      filters: JobSearchFilters;
      frequency: 'immediate' | 'daily' | 'weekly';
    }
  ): Promise<JobAlert> {
    try {
      const alert: JobAlert = {
        id: new mongoose.Types.ObjectId().toString(),
        userId,
        ...alertData,
        enabled: true,
        createdAt: new Date()
      };

      // Store alert (in production, this would be in database)
      const userAlerts = this.userAlerts.get(userId) || [];
      userAlerts.push(alert);
      this.userAlerts.set(userId, userAlerts);

      return alert;
    } catch (error: any) {
      throw new Error(`Failed to create job alert: ${error.message}`);
    }
  }

  async getUserJobAlerts(userId: string): Promise<JobAlert[]> {
    return this.userAlerts.get(userId) || [];
  }

  async updateJobAlert(userId: string, alertId: string, updates: Partial<JobAlert>): Promise<JobAlert> {
    try {
      const userAlerts = this.userAlerts.get(userId) || [];
      const alertIndex = userAlerts.findIndex(alert => alert.id === alertId);
      
      if (alertIndex === -1) {
        throw new Error('Job alert not found');
      }

      userAlerts[alertIndex] = { ...userAlerts[alertIndex], ...updates };
      this.userAlerts.set(userId, userAlerts);

      return userAlerts[alertIndex];
    } catch (error: any) {
      throw new Error(`Failed to update job alert: ${error.message}`);
    }
  }

  async deleteJobAlert(userId: string, alertId: string): Promise<void> {
    try {
      const userAlerts = this.userAlerts.get(userId) || [];
      const filteredAlerts = userAlerts.filter(alert => alert.id !== alertId);
      this.userAlerts.set(userId, filteredAlerts);
    } catch (error: any) {
      throw new Error(`Failed to delete job alert: ${error.message}`);
    }
  }

  async processJobAlerts(): Promise<void> {
    try {
      const now = new Date();
      
      for (const [userId, alerts] of this.userAlerts.entries()) {
        for (const alert of alerts) {
          if (!alert.enabled) continue;

          const shouldSend = this.shouldSendAlert(alert, now);
          if (shouldSend) {
            await this.sendJobAlert(userId, alert);
            alert.lastSent = now;
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to process job alerts:', error);
    }
  }

  async getJobRecommendations(userId: string, count: number = 10): Promise<JobMatch[]> {
    try {
      const userProfile = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get personalized filters based on user profile
      const personalizedFilters = this.generatePersonalizedFilters(userProfile);
      
      const result = await this.findMatchingJobs(userId, personalizedFilters, count);
      return result.matches;
    } catch (error: any) {
      throw new Error(`Failed to get job recommendations: ${error.message}`);
    }
  }

  async getSimilarJobs(jobId: string, userId: string, count: number = 5): Promise<JobMatch[]> {
    try {
      const job = this.jobListings.get(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const userProfile = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Find jobs similar to the given job
      const similarFilters: JobSearchFilters = {
        keywords: [job.title],
        industry: [job.industry],
        skills: job.skills.slice(0, 5), // Top 5 skills
        experienceLevel: [job.experienceLevel],
        employmentType: [job.employmentType]
      };

      const result = await this.findMatchingJobs(userId, similarFilters, count + 5);
      
      // Filter out the original job and return top matches
      return result.matches
        .filter(match => match.job.id !== jobId)
        .slice(0, count);
    } catch (error: any) {
      throw new Error(`Failed to get similar jobs: ${error.message}`);
    }
  }

  // Private helper methods

  private async getAvailableJobs(filters: JobSearchFilters): Promise<JobListing[]> {
    // In production, this would fetch from job scraping APIs (Indeed, LinkedIn, etc.)
    // For now, returning mock data
    const mockJobs: JobListing[] = [
      {
        id: '1',
        title: 'Senior Full Stack Developer',
        company: 'TechCorp Inc',
        description: 'We are looking for a senior full stack developer...',
        requirements: ['5+ years experience', 'React', 'Node.js', 'TypeScript'],
        location: { city: 'San Francisco', state: 'CA', country: 'USA', remote: true },
        salary: { min: 120000, max: 180000, currency: 'USD', period: 'yearly' },
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
        experienceLevel: 'senior',
        employmentType: 'full-time',
        industry: 'Technology',
        postedDate: new Date(),
        source: 'company_website'
      },
      {
        id: '2',
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        description: 'Join our dynamic frontend team...',
        requirements: ['3+ years React', 'JavaScript', 'CSS'],
        location: { city: 'Austin', state: 'TX', country: 'USA', remote: false },
        salary: { min: 80000, max: 120000, currency: 'USD', period: 'yearly' },
        skills: ['React', 'JavaScript', 'CSS', 'Redux', 'Jest'],
        experienceLevel: 'mid',
        employmentType: 'full-time',
        industry: 'Technology',
        postedDate: new Date(),
        source: 'indeed'
      }
      // Add more mock jobs...
    ];

    // Apply filters
    return mockJobs.filter(job => {
      if (filters.keywords && filters.keywords.length > 0) {
        const jobText = `${job.title} ${job.description}`.toLowerCase();
        const hasKeyword = filters.keywords.some(keyword => 
          jobText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      if (filters.location && !job.location.remote) {
        const jobLocation = `${job.location.city} ${job.location.state}`.toLowerCase();
        if (!jobLocation.includes(filters.location.toLowerCase())) return false;
      }

      if (filters.remote === true && !job.location.remote) return false;

      if (filters.salaryMin && job.salary.max && job.salary.max < filters.salaryMin) return false;
      if (filters.salaryMax && job.salary.min && job.salary.min > filters.salaryMax) return false;

      if (filters.experienceLevel && filters.experienceLevel.length > 0) {
        if (!filters.experienceLevel.includes(job.experienceLevel)) return false;
      }

      if (filters.employmentType && filters.employmentType.length > 0) {
        if (!filters.employmentType.includes(job.employmentType)) return false;
      }

      if (filters.industry && filters.industry.length > 0) {
        if (!filters.industry.includes(job.industry)) return false;
      }

      if (filters.skills && filters.skills.length > 0) {
        const hasRequiredSkills = filters.skills.some(skill =>
          job.skills.some(jobSkill => 
            jobSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (!hasRequiredSkills) return false;
      }

      if (filters.postedWithin) {
        const cutoffDate = new Date(Date.now() - filters.postedWithin * 24 * 60 * 60 * 1000);
        if (job.postedDate < cutoffDate) return false;
      }

      return true;
    });
  }

  private calculateSkillsMatch(userProfile: IUserProfile, job: JobListing): number {
    const userSkills = userProfile.technicalSkills.map(skill => skill.name.toLowerCase());
    const jobSkills = job.skills.map(skill => skill.toLowerCase());
    
    if (jobSkills.length === 0) return 50; // Default score if no skills specified

    const matchedSkills = jobSkills.filter(jobSkill =>
      userSkills.some(userSkill => 
        userSkill.includes(jobSkill) || jobSkill.includes(userSkill)
      )
    );

    const matchPercentage = (matchedSkills.length / jobSkills.length) * 100;
    
    // Bonus for having more skills than required
    const bonusSkills = userSkills.length > jobSkills.length ? 10 : 0;
    
    return Math.min(matchPercentage + bonusSkills, 100);
  }

  private calculateLocationMatch(userProfile: IUserProfile, job: JobListing): number {
    // If job is remote and user is open to remote
    if (job.location.remote && userProfile.openToRemote) {
      return 100;
    }

    // If job is remote but user prefers on-site
    if (job.location.remote && !userProfile.openToRemote) {
      return 60;
    }

    // Check current location match
    const userLocation = userProfile.currentLocation;
    const jobLocation = job.location;

    if (userLocation.city?.toLowerCase() === jobLocation.city?.toLowerCase() &&
        userLocation.state?.toLowerCase() === jobLocation.state?.toLowerCase()) {
      return 100;
    }

    // Check preferred locations
    if (userProfile.preferredLocations.some(loc => 
      loc.toLowerCase().includes(jobLocation.city?.toLowerCase() || '') ||
      loc.toLowerCase().includes(jobLocation.state?.toLowerCase() || '')
    )) {
      return 90;
    }

    // Same state
    if (userLocation.state?.toLowerCase() === jobLocation.state?.toLowerCase()) {
      return 70;
    }

    // Same country
    if (userLocation.country?.toLowerCase() === jobLocation.country?.toLowerCase()) {
      return 50;
    }

    // Open to relocation
    if (userProfile.openToRelocation) {
      return 60;
    }

    return 20;
  }

  private calculateExperienceMatch(userProfile: IUserProfile, job: JobListing): number {
    const userExperience = userProfile.yearsOfExperience;
    
    const experienceLevelMap = {
      'entry': { min: 0, max: 2 },
      'mid': { min: 2, max: 5 },
      'senior': { min: 5, max: 10 },
      'executive': { min: 10, max: 50 }
    };

    const requiredRange = experienceLevelMap[job.experienceLevel];
    
    if (userExperience >= requiredRange.min && userExperience <= requiredRange.max) {
      return 100;
    }

    // Overqualified (might still be interested)
    if (userExperience > requiredRange.max) {
      const overqualification = userExperience - requiredRange.max;
      return Math.max(70 - (overqualification * 5), 30);
    }

    // Underqualified
    if (userExperience < requiredRange.min) {
      const gap = requiredRange.min - userExperience;
      return Math.max(80 - (gap * 20), 20);
    }

    return 50;
  }

  private calculateSalaryMatch(userProfile: IUserProfile, job: JobListing): number {
    if (!userProfile.expectedSalary || !job.salary.max) {
      return 50; // Default score if no salary info
    }

    // Use the average of min and max for comparison
    const expectedSalaryAvg = (userProfile.expectedSalary.min + userProfile.expectedSalary.max) / 2;
    const jobSalaryMax = job.salary.max;
    const jobSalaryMin = job.salary.min || jobSalaryMax * 0.8;

    // Perfect match if expected range overlaps with job range
    if (userProfile.expectedSalary.min <= jobSalaryMax && userProfile.expectedSalary.max >= jobSalaryMin) {
      return 100;
    }

    // Job pays more than expected (good for user)
    if (jobSalaryMin > expectedSalaryAvg) {
      return 95;
    }

    // Job pays less than expected
    if (jobSalaryMax < expectedSalaryAvg) {
      const shortfall = (expectedSalaryAvg - jobSalaryMax) / expectedSalaryAvg;
      return Math.max(100 - (shortfall * 100), 20);
    }

    return 50;
  }

  private calculateTypeMatch(userProfile: IUserProfile, job: JobListing): number {
    if (userProfile.workType.includes(job.employmentType)) {
      return 100;
    }

    // Partial matches
    if (job.employmentType === 'full-time' && userProfile.workType.includes('part-time')) {
      return 70;
    }

    if (job.employmentType === 'contract' && userProfile.workType.includes('freelance')) {
      return 80;
    }

    return 30;
  }

  private generateMatchRecommendations(
    userProfile: IUserProfile,
    job: JobListing,
    matchBreakdown: any
  ): string[] {
    const recommendations: string[] = [];

    if (matchBreakdown.skillsMatch < 70) {
      recommendations.push('Consider highlighting transferable skills in your application');
    }

    if (matchBreakdown.experienceMatch < 70) {
      recommendations.push('Emphasize relevant projects and achievements to bridge experience gaps');
    }

    if (matchBreakdown.locationMatch < 50 && !job.location.remote) {
      recommendations.push('Consider mentioning your willingness to relocate if applicable');
    }

    if (job.salary.max && userProfile.expectedSalary && job.salary.max < userProfile.expectedSalary.min) {
      recommendations.push('This role may offer growth opportunities that justify the salary range');
    }

    return recommendations;
  }

  private findMissingSkills(userProfile: IUserProfile, job: JobListing): string[] {
    const userSkills = userProfile.technicalSkills.map(skill => skill.name.toLowerCase());
    const jobSkills = job.skills.map(skill => skill.toLowerCase());

    return jobSkills.filter(jobSkill =>
      !userSkills.some(userSkill => 
        userSkill.includes(jobSkill) || jobSkill.includes(userSkill)
      )
    );
  }

  private findCompetitiveAdvantages(userProfile: IUserProfile, job: JobListing): string[] {
    const advantages: string[] = [];

    // Experience advantage
    const experienceLevelMap = { 'entry': 1, 'mid': 3, 'senior': 7, 'executive': 12 };
    const requiredExp = experienceLevelMap[job.experienceLevel];
    if (userProfile.yearsOfExperience > requiredExp + 2) {
      advantages.push('Exceeds experience requirements');
    }

    // Skills advantage
    const userSkills = userProfile.technicalSkills.map(s => s.name.toLowerCase());
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const extraSkills = userSkills.filter(skill => !jobSkills.includes(skill));
    if (extraSkills.length > 3) {
      advantages.push('Brings additional valuable skills');
    }

    // Location advantage
    if (userProfile.currentLocation.city?.toLowerCase() === job.location.city?.toLowerCase()) {
      advantages.push('Local candidate - no relocation needed');
    }

    return advantages;
  }

  private generateApplicationStrategy(
    matchScore: number,
    missingSkillsCount: number
  ): JobMatch['applicationStrategy'] {
    let difficulty: 'low' | 'medium' | 'high' = 'medium';
    let timeToApply: 'immediate' | 'within_week' | 'research_needed' = 'within_week';

    if (matchScore >= 80 && missingSkillsCount <= 1) {
      difficulty = 'low';
      timeToApply = 'immediate';
    } else if (matchScore >= 60 && missingSkillsCount <= 3) {
      difficulty = 'medium';
      timeToApply = 'within_week';
    } else {
      difficulty = 'high';
      timeToApply = 'research_needed';
    }

    const keyPoints: string[] = [];
    const coverLetterTips: string[] = [];

    if (difficulty === 'low') {
      keyPoints.push('Strong match - apply confidently');
      coverLetterTips.push('Emphasize your matching skills and experience');
    } else if (difficulty === 'medium') {
      keyPoints.push('Good match with some skill gaps to address');
      coverLetterTips.push('Address skill gaps by highlighting transferable experience');
    } else {
      keyPoints.push('Challenging match - requires strategic approach');
      coverLetterTips.push('Focus on enthusiasm and learning ability');
    }

    return { difficulty, timeToApply, keyPoints, coverLetterTips };
  }

  private generatePersonalizedFilters(userProfile: IUserProfile): JobSearchFilters {
    return {
      keywords: userProfile.preferredRoles,
      location: userProfile.openToRemote ? undefined : userProfile.currentLocation.city,
      remote: userProfile.openToRemote,
      salaryMin: userProfile.expectedSalary ? userProfile.expectedSalary.min * 0.8 : undefined,
      experienceLevel: this.getExperienceLevelFromYears(userProfile.yearsOfExperience),
      employmentType: userProfile.workType,
      industry: userProfile.preferredIndustries,
      skills: userProfile.technicalSkills.slice(0, 5).map(skill => skill.name),
      postedWithin: 30,
      excludeApplied: true
    };
  }

  private getExperienceLevelFromYears(years: number): string[] {
    if (years <= 2) return ['entry', 'mid'];
    if (years <= 5) return ['mid', 'senior'];
    if (years <= 10) return ['senior'];
    return ['senior', 'executive'];
  }

  private shouldSendAlert(alert: JobAlert, now: Date): boolean {
    if (!alert.lastSent) return true;

    const timeSinceLastSent = now.getTime() - alert.lastSent.getTime();
    const hoursAgo = timeSinceLastSent / (1000 * 60 * 60);

    switch (alert.frequency) {
      case 'immediate':
        return hoursAgo >= 1; // Send max once per hour
      case 'daily':
        return hoursAgo >= 24;
      case 'weekly':
        return hoursAgo >= 168; // 24 * 7
      default:
        return false;
    }
  }

  private async sendJobAlert(userId: string, alert: JobAlert): Promise<void> {
    try {
      const matches = await this.findMatchingJobs(userId, alert.filters, 10);
      
      // In production, this would send email/notification
      console.log(`Sending job alert "${alert.name}" to user ${userId} with ${matches.matches.length} new matches`);
      
      // You would integrate with email service here
      // await emailService.sendJobAlert(userId, alert, matches);
    } catch (error: any) {
      console.error(`Failed to send job alert for user ${userId}:`, error);
    }
  }

  private async generateSearchRecommendations(
    userProfile: IUserProfile,
    matches: JobMatch[]
  ): Promise<{
    improveProfile: string[];
    searchTips: string[];
    marketInsights: string[];
  }> {
    const recommendations = {
      improveProfile: [] as string[],
      searchTips: [] as string[],
      marketInsights: [] as string[]
    };

    // Analyze common patterns in top matches
    if (matches.length > 0) {
      const avgScore = matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length;
      
      if (avgScore < 60) {
        recommendations.improveProfile.push('Consider expanding your skill set to match more opportunities');
        recommendations.searchTips.push('Try broadening your search criteria');
      }

      // Analyze missing skills across matches
      const allMissingSkills = matches.flatMap(match => match.missingSkills);
      const skillCounts = allMissingSkills.reduce((acc, skill) => {
        acc[skill] = (acc[skill] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const topMissingSkills = Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([skill]) => skill);

      if (topMissingSkills.length > 0) {
        recommendations.improveProfile.push(`Consider learning: ${topMissingSkills.join(', ')}`);
      }
    }

    recommendations.searchTips.push('Set up job alerts for continuous monitoring');
    recommendations.marketInsights.push('Remote work opportunities are trending upward');

    return recommendations;
  }
}

export const jobMatchingService = new JobMatchingService();