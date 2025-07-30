import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { SettingsService } from '../services/settingsService';

import { UserSettings, IUserSettings, EnhancedUserProfile, IEnhancedUserProfile } from '../models/UserSettings';
import { SystemSettings } from '../models/SystemSettings';
import { User } from '../models/User';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Redis } from 'ioredis';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
    permissions: string[];
  };
  headers: {
    'x-forwarded-for'?: string;
    'user-agent'?: string;
    [key: string]: any;
  };
}

interface SettingsControllerConfig {
  redis?: Redis;
  encryptionKey: string;
  auditLogEnabled: boolean;
  complianceMode: boolean;
}

export class EnterpriseSettingsController {
  private settingsService: SettingsService;
  private redis?: Redis;
  private auditLogEnabled: boolean;
  private complianceMode: boolean;
  
  // Rate limiting configurations
  private readonly settingsRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
      error: 'Too many settings update attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  private readonly profileRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window for profile updates
    message: {
      error: 'Too many profile update attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  });

  constructor(config: SettingsControllerConfig) {
    this.settingsService = new SettingsService({
      redis: config.redis,
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: config.encryptionKey
      }
    });
    this.redis = config.redis;
    this.auditLogEnabled = config.auditLogEnabled;
    this.complianceMode = config.complianceMode;
  }

  // =====================
  // USER PROFILE METHODS
  // =====================

  async getUserProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }

      // Check permissions - users can only access their own profile or admins can access any
      if (req.user?.id !== userId && !req.user?.permissions.includes('profile:read:all')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this profile',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      const profile = await EnhancedUserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('userId', 'email firstName lastName')
        .lean();

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
        return;
      }

      // Apply data filtering based on privacy settings and user permissions
      const filteredProfile = await this.filterProfileData(profile, req.user);

      // Log profile access
      await this.logProfileAccess(userId, req);

      // Update profile view count
      await this.updateProfileViewCount(userId, req);

      res.json({
        success: true,
        data: {
          profile: filteredProfile,
          completeness: profile.profileCompleteness,
          metrics: req.user?.permissions.includes('analytics:read') ? profile.profileMetrics : undefined
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async updateUserProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors.array(),
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const userId = req.params.userId || req.user?.id;
      const updates = req.body;

      // Permission and ownership checks
      if (req.user?.id !== userId && !req.user?.permissions.includes('profile:update:all')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this profile',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      // Validate updates against business rules
      const profileValidationResult = await this.validateProfileUpdates(userId, updates, req.user);
      if (!profileValidationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Profile validation failed',
          details: profileValidationResult.errors,
          code: 'PROFILE_VALIDATION_ERROR'
        });
        return;
      }

      // Sanitize updates
      const sanitizedUpdates = await this.sanitizeProfileUpdates(updates);

      // Add audit trail entry
      if (sanitizedUpdates.compliance?.auditTrail) {
        sanitizedUpdates.compliance.auditTrail.push({
          action: 'profile_updated',
          timestamp: new Date(),
          userId: new mongoose.Types.ObjectId(req.user!.id),
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          changes: Object.keys(updates)
        });
      } else {
        sanitizedUpdates.compliance = {
          ...sanitizedUpdates.compliance,
          auditTrail: [{
            action: 'profile_updated',
            timestamp: new Date(),
            userId: new mongoose.Types.ObjectId(req.user!.id),
            ipAddress: this.getClientIP(req),
            userAgent: req.headers['user-agent'],
            changes: Object.keys(updates)
          }]
        };
      }

      const updatedProfile = await EnhancedUserProfile.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { 
          $set: {
            ...sanitizedUpdates,
            lastActiveDate: new Date()
          }
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      ).populate('userId', 'email firstName lastName');

      if (!updatedProfile) {
        res.status(404).json({
          success: false,
          error: 'Failed to update profile',
          code: 'UPDATE_FAILED'
        });
        return;
      }

      // Clear related caches
      await this.clearProfileCaches(userId);

      // Trigger side effects (notifications, integrations, etc.)
      await this.handleProfileUpdateSideEffects(userId, updates, updatedProfile);

      // Apply data filtering for response
      const filteredProfile = await this.filterProfileData(updatedProfile.toObject(), req.user);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile: filteredProfile,
          completeness: updatedProfile.profileCompleteness,
          changes: Object.keys(updates)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // =====================
  // USER SETTINGS METHODS
  // =====================

  async getUserSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const settings = await this.settingsService.getUserSettings(userId);

      if (!settings) {
        res.status(404).json({
          success: false,
          error: 'User settings not found',
          code: 'SETTINGS_NOT_FOUND'
        });
        return;
      }

      // Filter sensitive settings based on user tier and permissions
      const filteredSettings = await this.filterSettingsData(settings, req.user);

      res.json({
        success: true,
        data: {
          settings: filteredSettings,
          version: settings.version,
          lastUpdated: settings.updatedAt
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async updateUserSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors.array(),
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const userId = req.user?.id;
      const updates = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Validate updates against user tier limits and system constraints
      const settingsValidationResult = await this.validateSettingsUpdates(userId, updates, req.user);
      if (!settingsValidationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Settings validation failed',
          details: settingsValidationResult.errors,
          code: 'SETTINGS_VALIDATION_ERROR'
        });
        return;
      }

      // Sanitize updates
      const sanitizedUpdates = await this.sanitizeSettingsUpdates(updates);

      const updatedSettings = await this.settingsService.updateUserSettings(
        userId,
        sanitizedUpdates
      );

      // Filter response data
      const filteredSettings = await this.filterSettingsData(updatedSettings, req.user);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: {
          settings: filteredSettings,
          version: updatedSettings.version,
          changes: Object.keys(updates)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // =====================
  // SYSTEM SETTINGS METHODS (Admin only)
  // =====================

  async getSystemSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Admin permission check
      if (!req.user?.permissions.includes('system:settings:read')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      const environment = req.query.environment as string || process.env.NODE_ENV;
      const settings = await this.settingsService.getSystemSettings(environment);

      if (!settings) {
        res.status(404).json({
          success: false,
          error: 'System settings not found',
          code: 'SYSTEM_SETTINGS_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          settings,
          environment,
          lastModified: settings.updatedAt
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async updateSystemSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Admin permission check
      if (!req.user?.permissions.includes('system:settings:update')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      const settingsId = req.params.settingsId;
      const updates = req.body;

      const updatedSettings = await this.settingsService.updateSystemSettings(
        new mongoose.Types.ObjectId(settingsId),
        updates,
        new mongoose.Types.ObjectId(req.user!.id)
      );

      res.json({
        success: true,
        message: 'System settings updated successfully',
        data: {
          settings: updatedSettings,
          changes: Object.keys(updates)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // =====================
  // EXPORT/IMPORT METHODS
  // =====================

  async exportUserData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Check user consent for data export
      const settings = await this.settingsService.getUserSettings(userId);
      
      if (!settings?.security.dataDownload.allowExport) {
        res.status(403).json({
          success: false,
          error: 'Data export is not enabled in your settings',
          code: 'DATA_EXPORT_DISABLED'
        });
        return;
      }

      // Export settings
      const exportedSettings = await this.settingsService.exportUserSettings(userId);
      
      // Export profile
      const profile = await EnhancedUserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        settings: exportedSettings,
        profile: profile ? this.sanitizeExportData(profile) : null,
        metadata: {
          version: '1.0',
          format: 'json'
        }
      };

      // Encrypt if required
      const finalData = settings.security.dataDownload.encryptExports 
        ? this.encryptExportData(exportData) 
        : exportData;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
      
      res.json({
        success: true,
        data: finalData
      });

    } catch (error) {
      next(error);
    }
  }

  // =====================
  // ANALYTICS & METRICS
  // =====================

  async getProfileAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }

      // Permission check
      if (req.user?.id !== userId && !req.user?.permissions.includes('analytics:read:all')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      const profile = await EnhancedUserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        .select('profileMetrics profileEngagement profileViewHistory profileCompleteness');

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
        return;
      }

      // Calculate additional metrics
      const analytics = await this.calculateAdvancedAnalytics(profile, userId);

      res.json({
        success: true,
        data: {
          metrics: profile.profileMetrics,
          engagement: profile.profileEngagement,
          completeness: profile.profileCompleteness,
          trends: analytics.trends,
          insights: analytics.insights,
          recommendations: analytics.recommendations
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // =====================
  // HELPER METHODS
  // =====================

  private async filterProfileData(profile: any, user: any): Promise<any> {
    const filtered = { ...profile };

    // Remove sensitive data based on privacy settings
    if (!profile.currentSalary?.isPublic && user?.id !== profile.userId.toString()) {
      delete filtered.currentSalary;
    }

    // Remove compliance data unless admin
    if (!user?.permissions.includes('compliance:read')) {
      delete filtered.compliance;
    }

    // Remove integration data unless authorized
    if (!user?.permissions.includes('integration:read')) {
      delete filtered.integrationData;
    }

    return filtered;
  }

  private async filterSettingsData(settings: IUserSettings, user: any): Promise<any> {
    const filtered = { ...settings.toObject() };

    // Remove custom settings unless admin
    if (!user?.permissions.includes('settings:advanced:read')) {
      delete filtered.customSettings;
    }

    return filtered;
  }

  private async validateProfileUpdates(userId: string, updates: any, user: any): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    // Check for prohibited fields
    const prohibitedFields = ['_id', '__v', 'userId', 'createdAt'];
    for (const field of prohibitedFields) {
      if (updates[field]) {
        errors.push(`Field '${field}' cannot be updated`);
      }
    }

    // Validate salary ranges
    if (updates.expectedSalary && updates.expectedSalary.min > updates.expectedSalary.max) {
      errors.push('Expected salary minimum cannot be greater than maximum');
    }

    // Validate URLs
    const urlFields = ['linkedinUrl', 'githubUrl', 'portfolioUrl', 'personalWebsite'];
    for (const field of urlFields) {
      if (updates[field] && !this.isValidUrl(updates[field])) {
        errors.push(`Invalid URL format for ${field}`);
      }
    }

    // Validate skill levels
    if (updates.aiPersonalizationData?.skillGapAnalysis) {
      for (const skill of updates.aiPersonalizationData.skillGapAnalysis) {
        if (skill.currentLevel > skill.targetLevel) {
          errors.push(`Current level cannot be higher than target level for skill: ${skill.skill}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async validateSettingsUpdates(userId: string, updates: any, user: any): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    // Check tier limitations
    if (user?.tier === 'free') {
      if (updates.jobSearch?.autoApply?.enabled) {
        errors.push('Auto-apply feature requires premium subscription');
      }
      
      if (updates.notifications?.email?.frequency === 'immediate') {
        errors.push('Immediate email notifications require premium subscription');
      }
    }

    // Validate notification preferences
    if (updates.notifications?.push?.quietHours) {
      const { startTime, endTime } = updates.notifications.push.quietHours;
      if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
        errors.push('Invalid time format for quiet hours');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async sanitizeProfileUpdates(updates: any): Promise<any> {
    const sanitized = { ...updates };

    // Sanitize strings
    if (sanitized.headline) sanitized.headline = this.sanitizeString(sanitized.headline);
    if (sanitized.bio) sanitized.bio = this.sanitizeString(sanitized.bio);

    // Sanitize arrays
    if (sanitized.technicalSkills) {
      sanitized.technicalSkills = sanitized.technicalSkills.map((skill: any) => ({
        ...skill,
        name: this.sanitizeString(skill.name)
      }));
    }

    return sanitized;
  }

  private async sanitizeSettingsUpdates(updates: any): Promise<any> {
    const sanitized = { ...updates };

    // Remove any script tags or dangerous content
    if (sanitized.customSettings) {
      sanitized.customSettings = sanitized.customSettings.map((setting: any) => ({
        ...setting,
        key: this.sanitizeString(setting.key),
        value: typeof setting.value === 'string' ? this.sanitizeString(setting.value) : setting.value
      }));
    }

    return sanitized;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  private getClientIP(req: AuthenticatedRequest): string {
    return req.headers['x-forwarded-for'] as string || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
  }

  private async logProfileAccess(userId: string, req: AuthenticatedRequest): Promise<void> {
    if (!this.auditLogEnabled) return;

    const logEntry = {
      action: 'profile_accessed',
      userId,
      accessedBy: req.user?.id,
      timestamp: new Date(),
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent']
    };

    // Store in Redis for real-time monitoring
    await this.redis.lpush('audit_log', JSON.stringify(logEntry));
  }

  private async updateProfileViewCount(userId: string, req: AuthenticatedRequest): Promise<void> {
    const viewerType = this.determineViewerType(req.user);
    
    await EnhancedUserProfile.updateOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { profileViews: 1 },
        $push: {
          profileViewHistory: {
            date: new Date(),
            source: req.headers.referer || 'direct',
            viewerType,
            viewerId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
            deviceInfo: {
              type: this.detectDeviceType(req.headers['user-agent']),
              browser: this.detectBrowser(req.headers['user-agent']),
              location: this.getClientIP(req)
            }
          }
        }
      }
    );
  }

  private determineViewerType(user: any): 'recruiter' | 'employer' | 'peer' | 'anonymous' {
    if (!user) return 'anonymous';
    if (user.role === 'recruiter') return 'recruiter';
    if (user.role === 'employer') return 'employer';
    return 'peer';
  }

  private detectDeviceType(userAgent?: string): 'mobile' | 'desktop' | 'tablet' {
    if (!userAgent) return 'desktop';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private detectBrowser(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'unknown';
  }

  private async clearProfileCaches(userId: string): Promise<void> {
    const cacheKeys = [
      `user_profile:${userId}`,
      `user_settings:${userId}`,
      `profile_analytics:${userId}`,
      `profile_completeness:${userId}`
    ];
    
    await this.redis.del(...cacheKeys);
  }

  private async handleProfileUpdateSideEffects(
    userId: string, 
    updates: any, 
    profile: IEnhancedUserProfile
  ): Promise<void> {
    // Trigger AI re-analysis if skills or experience changed
    if (updates.technicalSkills || updates.yearsOfExperience) {
      await this.redis.publish('profile_skills_updated', JSON.stringify({ userId, updates }));
    }

    // Update search index if searchable fields changed
    const searchableFields = ['headline', 'bio', 'technicalSkills', 'preferredRoles'];
    if (searchableFields.some(field => updates[field])) {
      await this.redis.publish('search_index_update', JSON.stringify({ userId, profile }));
    }

    // Notify integrations if sync is enabled
    if (profile.integrationData?.syncStatus === 'active') {
      await this.redis.publish('integration_sync', JSON.stringify({ userId, updates }));
    }
  }

  private async calculateAdvancedAnalytics(profile: any, userId: string): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate trends
    const recentViews = profile.profileViewHistory.filter((view: any) => 
      new Date(view.date) >= thirtyDaysAgo
    );

    const trends = {
      viewTrend: this.calculateTrend(recentViews),
      engagementTrend: profile.profileEngagement.interactionScore,
      completenessTrend: profile.profileCompleteness.score
    };

    // Generate insights
    const insights = {
      topViewSources: this.getTopViewSources(recentViews),
      peakViewTimes: this.getViewTimeDistribution(recentViews),
      profileStrengths: this.analyzeProfileStrengths(profile),
      improvementAreas: profile.profileCompleteness.missingFields
    };

    // Generate recommendations
    const recommendations = await this.generateRecommendations(profile, trends, insights);

    return { trends, insights, recommendations };
  }

  private calculateTrend(views: any[]): number {
    // Simple trend calculation - could be enhanced with more sophisticated algorithms
    const firstHalf = views.slice(0, Math.floor(views.length / 2));
    const secondHalf = views.slice(Math.floor(views.length / 2));
    
    return secondHalf.length - firstHalf.length;
  }

  private getTopViewSources(views: any[]): any[] {
    const sources = views.reduce((acc: any, view: any) => {
      acc[view.source] = (acc[view.source] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(sources)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));
  }

  private getViewTimeDistribution(views: any[]): any {
    const hours = views.reduce((acc: any, view: any) => {
      const hour = new Date(view.date).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const peakHour = Object.entries(hours)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return { peakHour: peakHour?.[0], viewCount: peakHour?.[1] };
  }

  private analyzeProfileStrengths(profile: any): string[] {
    const strengths = [];
    
    if (profile.profileCompleteness.score > 80) strengths.push('Complete profile');
    if (profile.technicalSkills?.length > 10) strengths.push('Diverse skill set');
    if (profile.professionalDevelopment?.certifications?.length > 0) strengths.push('Certified professional');
    if (profile.linkedinUrl && profile.githubUrl) strengths.push('Strong online presence');
    
    return strengths;
  }

  private async generateRecommendations(profile: any, trends: any, insights: any): Promise<string[]> {
    const recommendations = [];

    if (profile.profileCompleteness.score < 70) {
      recommendations.push('Complete your profile to increase visibility');
    }

    if (trends.viewTrend < 0) {
      recommendations.push('Update your skills and experience to improve discoverability');
    }

    if (!profile.linkedinUrl) {
      recommendations.push('Add your LinkedIn profile to build credibility');
    }

    if (profile.technicalSkills?.length < 5) {
      recommendations.push('Add more technical skills to match with relevant opportunities');
    }

    return recommendations;
  }

  private sanitizeExportData(data: any): any {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.compliance?.auditTrail;
    delete sanitized.integrationData?.customFields;
    
    return sanitized;
  }

  private encryptExportData(data: any): any {
    const algorithm = 'aes-256-gcm';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: true,
      data: encrypted,
      algorithm,
      key: key.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  // Rate limiting middleware getters
  public getSettingsRateLimit() {
    return this.settingsRateLimit;
  }

  public getProfileRateLimit() {
    return this.profileRateLimit;
  }
}