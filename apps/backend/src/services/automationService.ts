import { analyticsService } from './analyticsService';
import { enterpriseService } from './enterpriseService';
import { jobApplicationService } from './jobApplicationService';
import { User } from '../models/User';


export interface AutomationTask {
  taskId: string;
  type: 'market_analysis' | 'user_recommendations' | 'performance_monitoring' | 'alert_check';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  lastRun: Date | null;
  nextRun: Date;
  parameters: any;
  active: boolean;
  results?: any;
}

export interface AlertRule {
  ruleId: string;
  userId?: string;
  type: 'market_change' | 'opportunity' | 'performance_decline' | 'skill_demand';
  conditions: {
    threshold: number;
    comparison: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
    timeframe: string;
  };
  notificationChannels: ('email' | 'sms' | 'push')[];
  active: boolean;
  lastTriggered?: Date;
}

class AutomationService {
  private tasks: Map<string, AutomationTask> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.initializeDefaultTasks();
  }

  // Task Management
  scheduleTask(task: Omit<AutomationTask, 'taskId' | 'nextRun'>): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nextRun = this.calculateNextRun(task.frequency, task.lastRun);
    
    const automationTask: AutomationTask = {
      taskId,
      nextRun,
      ...task
    };

    this.tasks.set(taskId, automationTask);
    return taskId;
  }

  cancelTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  updateTask(taskId: string, updates: Partial<AutomationTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const updatedTask = { ...task, ...updates };
    if (updates.frequency) {
      updatedTask.nextRun = this.calculateNextRun(updates.frequency, task.lastRun);
    }

    this.tasks.set(taskId, updatedTask);
    return true;
  }

  getTask(taskId: string): AutomationTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): AutomationTask[] {
    return Array.from(this.tasks.values());
  }

  // Alert Management
  createAlert(alert: Omit<AlertRule, 'ruleId'>): string {
    const ruleId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: AlertRule = {
      ruleId,
      ...alert
    };

    this.alertRules.set(ruleId, alertRule);
    return ruleId;
  }

  updateAlert(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    this.alertRules.set(ruleId, { ...rule, ...updates });
    return true;
  }

  deleteAlert(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  getAlert(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }

  getAllAlerts(userId?: string): AlertRule[] {
    const alerts = Array.from(this.alertRules.values());
    return userId ? alerts.filter(alert => alert.userId === userId) : alerts;
  }

  // Automation Engine
  startAutomation(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Automation service started');
    
    // Check for tasks every minute
    setInterval(() => {
      this.processPendingTasks();
    }, 60 * 1000);

    // Check alerts every 5 minutes
    setInterval(() => {
      this.checkAlerts();
    }, 5 * 60 * 1000);
  }

  stopAutomation(): void {
    this.isRunning = false;
    console.log('Automation service stopped');
  }

  // Task Processing
  private async processPendingTasks(): Promise<void> {
    if (!this.isRunning) return;

    const now = new Date();
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.active && task.nextRun <= now);

    for (const task of pendingTasks) {
      try {
        await this.executeTask(task);
        
        // Update task schedule
        task.lastRun = now;
        task.nextRun = this.calculateNextRun(task.frequency, now);
        this.tasks.set(task.taskId, task);
        
        console.log(`Task ${task.taskId} executed successfully`);
      } catch (error) {
        console.error(`Error executing task ${task.taskId}:`, error);
      }
    }
  }

  private async executeTask(task: AutomationTask): Promise<void> {
    switch (task.type) {
      case 'market_analysis':
        await this.executeMarketAnalysisTask(task);
        break;
      case 'user_recommendations':
        await this.executeUserRecommendationsTask(task);
        break;
      case 'performance_monitoring':
        await this.executePerformanceMonitoringTask(task);
        break;
      case 'alert_check':
        await this.executeAlertCheckTask(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async executeMarketAnalysisTask(task: AutomationTask): Promise<void> {
    const { location, generateReport } = task.parameters;
    
    const insights = await enterpriseService.generateAutomatedMarketInsights(location);
    
    task.results = {
      insights,
      totalInsights: insights.length,
      criticalInsights: insights.filter(i => i.impact === 'high' && i.actionRequired).length,
      executedAt: new Date()
    };

    if (generateReport) {
      const report = await enterpriseService.generateMarketIntelligenceReport({
        location,
        timeframe: '30days'
      });
      task.results.report = report;
    }

    // Trigger alerts if critical insights found
    const criticalInsights = insights.filter(i => i.impact === 'high' && i.actionRequired);
    if (criticalInsights.length > 0) {
      await this.triggerInsightAlerts(criticalInsights, location);
    }
  }

  private async executeUserRecommendationsTask(task: AutomationTask): Promise<void> {
    const { userIds, batchSize = 10 } = task.parameters;
    
    const results = [];
    const users = userIds || await this.getActiveUsers();
    
    // Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (userId: string) => {
          try {
            const recommendations = await enterpriseService.automateUserRecommendations(userId);
            return { userId, recommendations, status: 'success' };
          } catch (error) {
            return { userId, error: error instanceof Error ? error.message : 'Unknown error', status: 'failed' };
          }
        })
      );
      
      results.push(...batchResults);
    }

    task.results = {
      processedUsers: results.length,
      successfulRecommendations: results.filter(r => r.status === 'success').length,
      failedRecommendations: results.filter(r => r.status === 'failed').length,
      executedAt: new Date()
    };
  }

  private async executePerformanceMonitoringTask(task: AutomationTask): Promise<void> {
    const dashboardMetrics = await analyticsService.getDashboardMetrics();
    
    const performance = {
      systemHealth: this.assessSystemHealth(dashboardMetrics),
      userEngagement: this.assessUserEngagement(dashboardMetrics),
      dataQuality: this.assessDataQuality(dashboardMetrics),
      trendsAnalysis: this.analyzeTrends(dashboardMetrics)
    };

    task.results = {
      performance,
      executedAt: new Date(),
      alertsTriggered: 0
    };

    // Check for performance issues
    if (performance.systemHealth.score < 80) {
      await this.triggerPerformanceAlert('system_health', performance.systemHealth);
      task.results.alertsTriggered++;
    }

    if (performance.userEngagement.score < 70) {
      await this.triggerPerformanceAlert('user_engagement', performance.userEngagement);
      task.results.alertsTriggered++;
    }
  }

  private async executeAlertCheckTask(task: AutomationTask): Promise<void> {
    const alertsChecked = await this.checkAlerts();
    
    task.results = {
      alertsChecked: alertsChecked.total,
      alertsTriggered: alertsChecked.triggered,
      executedAt: new Date()
    };
  }

  // Alert Processing
  private async checkAlerts(): Promise<{ total: number; triggered: number }> {
    const activeAlerts = Array.from(this.alertRules.values()).filter(alert => alert.active);
    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      try {
        const shouldTrigger = await this.evaluateAlert(alert);
        if (shouldTrigger) {
          await this.triggerAlert(alert);
          triggeredCount++;
          
          // Update last triggered time
          alert.lastTriggered = new Date();
          this.alertRules.set(alert.ruleId, alert);
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alert.ruleId}:`, error);
      }
    }

    return { total: activeAlerts.length, triggered: triggeredCount };
  }

  private async evaluateAlert(alert: AlertRule): Promise<boolean> {
    // Don't trigger the same alert too frequently
    if (alert.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - alert.lastTriggered.getTime();
      const minInterval = this.getMinTriggerInterval(alert.type);
      if (timeSinceLastTrigger < minInterval) {
        return false;
      }
    }

    switch (alert.type) {
      case 'market_change':
        return await this.evaluateMarketChangeAlert(alert);
      case 'opportunity':
        return await this.evaluateOpportunityAlert(alert);
      case 'performance_decline':
        return await this.evaluatePerformanceDeclineAlert(alert);
      case 'skill_demand':
        return await this.evaluateSkillDemandAlert(alert);
      default:
        return false;
    }
  }

  private async evaluateMarketChangeAlert(alert: AlertRule): Promise<boolean> {
    const dashboardMetrics = await analyticsService.getDashboardMetrics();
    const currentSuccessRate = dashboardMetrics.overview.applicationSuccessRate;
    
    // This would compare against historical data in a real implementation
    const previousSuccessRate = 20; // Placeholder for historical data
    const changePercentage = ((currentSuccessRate - previousSuccessRate) / previousSuccessRate) * 100;
    
    return this.compareValue(Math.abs(changePercentage), alert.conditions.threshold, alert.conditions.comparison);
  }

  private async evaluateOpportunityAlert(alert: AlertRule): Promise<boolean> {
    const insights = await enterpriseService.generateAutomatedMarketInsights();
    const opportunityInsights = insights.filter(i => i.type === 'opportunity' && i.impact === 'high');
    
    return this.compareValue(opportunityInsights.length, alert.conditions.threshold, alert.conditions.comparison);
  }

  private async evaluatePerformanceDeclineAlert(alert: AlertRule): Promise<boolean> {
    if (!alert.userId) return false;
    
    const userAnalytics = await analyticsService.getUserAnalytics(alert.userId);
    const currentSuccessRate = userAnalytics.applicationMetrics.successRate;
    
    // This would compare against user's historical performance
    const previousSuccessRate = 25; // Placeholder for historical data
    const decline = previousSuccessRate - currentSuccessRate;
    
    return this.compareValue(decline, alert.conditions.threshold, alert.conditions.comparison);
  }

  private async evaluateSkillDemandAlert(alert: AlertRule): Promise<boolean> {
    const dashboardMetrics = await analyticsService.getDashboardMetrics();
    const emergingSkills = dashboardMetrics.skillsAnalytics.emergingSkills;
    const highGrowthSkills = emergingSkills.filter(skill => skill.growth > alert.conditions.threshold);
    
    return highGrowthSkills.length > 0;
  }

  private compareValue(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'percentage_change':
        return Math.abs(value) >= threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: AlertRule): Promise<void> {
    console.log(`Alert triggered: ${alert.ruleId} - ${alert.type}`);
    
    // In a real implementation, this would send notifications through various channels
    for (const channel of alert.notificationChannels) {
      await this.sendNotification(channel, alert);
    }
  }

  private async sendNotification(channel: string, alert: AlertRule): Promise<void> {
    // Placeholder for notification sending
    console.log(`Sending ${channel} notification for alert ${alert.ruleId}`);
    
    // Real implementation would integrate with:
    // - Email service (SendGrid, AWS SES, etc.)
    // - SMS service (Twilio, AWS SNS, etc.)
    // - Push notification service (Firebase, OneSignal, etc.)
  }

  // Utility Methods
  private calculateNextRun(frequency: string, lastRun: Date | null): Date {
    const now = lastRun || new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  private getMinTriggerInterval(alertType: string): number {
    // Minimum time between triggers (in milliseconds)
    switch (alertType) {
      case 'market_change':
        return 60 * 60 * 1000; // 1 hour
      case 'opportunity':
        return 4 * 60 * 60 * 1000; // 4 hours
      case 'performance_decline':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'skill_demand':
        return 12 * 60 * 60 * 1000; // 12 hours
      default:
        return 60 * 60 * 1000; // 1 hour default
    }
  }

  private async getActiveUsers(): Promise<string[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.find({ 
      lastLogin: { $gte: oneWeekAgo } 
    }).select('_id');
    
    return activeUsers.map(user => user._id.toString());
  }

  private assessSystemHealth(metrics: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    if (metrics.overview.applicationSuccessRate < 15) {
      issues.push('Low application success rate');
      score -= 20;
    }

    if (metrics.userActivity.userRetentionRate < 60) {
      issues.push('Low user retention rate');
      score -= 15;
    }

    if (metrics.performanceMetrics.averageResponseTime > 10) {
      issues.push('High response time');
      score -= 10;
    }

    return { score: Math.max(score, 0), issues };
  }

  private assessUserEngagement(metrics: any): { score: number; metrics: any } {
    const activeUsersRatio = metrics.userActivity.activeUsersThisWeek / metrics.overview.totalUsers;
    const applicationActivity = metrics.applicationTrends.applicationsThisWeek / metrics.overview.totalUsers;
    
    let score = 100;
    if (activeUsersRatio < 0.3) score -= 30;
    if (applicationActivity < 2) score -= 20;
    
    return {
      score: Math.max(score, 0),
      metrics: {
        activeUsersRatio,
        applicationActivity,
        newUsersGrowth: metrics.userActivity.newUsersThisWeek
      }
    };
  }

  private assessDataQuality(metrics: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    if (metrics.overview.totalApplications < 100) {
      issues.push('Low data volume');
      score -= 20;
    }

    if (metrics.skillsAnalytics.mostDemandedSkills.length < 10) {
      issues.push('Insufficient skills data');
      score -= 15;
    }

    return { score: Math.max(score, 0), issues };
  }

  private analyzeTrends(metrics: any): any {
    return {
      userGrowth: metrics.userActivity.newUsersThisMonth > metrics.userActivity.newUsersThisWeek * 3 ? 'growing' : 'stable',
      applicationVolume: metrics.applicationTrends.applicationsThisMonth > 500 ? 'high' : 'moderate',
      skillsDemand: metrics.skillsAnalytics.emergingSkills.length > 5 ? 'evolving' : 'stable'
    };
  }

  private async triggerInsightAlerts(insights: any[], location?: string): Promise<void> {
    console.log(`Triggering alerts for ${insights.length} critical insights`);
    // Implementation would send notifications to subscribed users
  }

  private async triggerPerformanceAlert(type: string, data: any): Promise<void> {
    console.log(`Performance alert triggered: ${type}`, data);
    // Implementation would notify system administrators
  }

  private initializeDefaultTasks(): void {
    // Market analysis task - runs daily
    this.scheduleTask({
      type: 'market_analysis',
      frequency: 'daily',
      lastRun: null,
      parameters: { generateReport: false },
      active: true
    });

    // User recommendations task - runs weekly
    this.scheduleTask({
      type: 'user_recommendations',
      frequency: 'weekly',
      lastRun: null,
      parameters: { batchSize: 50 },
      active: true
    });

    // Performance monitoring task - runs hourly
    this.scheduleTask({
      type: 'performance_monitoring',
      frequency: 'hourly',
      lastRun: null,
      parameters: {},
      active: true
    });

    // Alert check task - runs hourly
    this.scheduleTask({
      type: 'alert_check',
      frequency: 'hourly',
      lastRun: null,
      parameters: {},
      active: true
    });
  }
}

export const automationService = new AutomationService();