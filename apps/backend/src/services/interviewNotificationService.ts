// Import node-cron conditionally to handle missing dependency gracefully
let cron: any;
try {
  cron = require('node-cron');
} catch (error) {
  console.warn('⚠️  node-cron not found. Interview reminders will be disabled. Run: pnpm add node-cron');
  cron = {
    schedule: () => console.log('Cron scheduling disabled - node-cron not installed')
  };
}
import { Interview, IInterview } from '../models/Interview';
import { User, IUser } from '../models/User';
import { JobApplication, IJobApplication } from '../models/JobApplication';
import { emailService } from './emailService';
import { calendarService } from './calendarService';

interface NotificationJob {
  id: string;
  interviewId: string;
  userId: string;
  type: 'reminder' | 'thank_you' | 'follow_up';
  scheduledFor: Date;
  executed: boolean;
}

class InterviewNotificationService {
  private jobs: Map<string, NotificationJob> = new Map();
  private isRunning = false;

  async startService(): Promise<void> {
    if (this.isRunning) {
      console.log('🔔 Interview notification service already running');
      return;
    }

    console.log('🔔 Starting interview notification service...');
    
    // Check if node-cron is available
    if (!cron || typeof cron.schedule !== 'function') {
      console.warn('⚠️  Interview notification service disabled - node-cron not available');
      console.warn('📦 To enable automatic reminders, install node-cron: pnpm add node-cron');
      return;
    }
    
    try {
      // Schedule the main reminder check to run every 5 minutes
      cron.schedule('*/5 * * * *', async () => {
        await this.processReminderQueue();
      });

      // Schedule thank you reminders to run daily at 9 AM
      cron.schedule('0 9 * * *', async () => {
        await this.processThankYouReminders();
      });

      // Schedule follow-up reminders to run daily at 10 AM
      cron.schedule('0 10 * * *', async () => {
        await this.processFollowUpReminders();
      });

      // Initialize with existing interviews
      await this.initializeExistingInterviews();
      
      this.isRunning = true;
      console.log('✅ Interview notification service started');
    } catch (error) {
      console.error('❌ Failed to start interview notification service:', error);
      console.warn('📦 Make sure node-cron is installed: pnpm add node-cron');
    }
  }

  async stopService(): Promise<void> {
    this.isRunning = false;
    this.jobs.clear();
    console.log('🛑 Interview notification service stopped');
  }

  async scheduleInterviewNotifications(interviewId: string): Promise<void> {
    try {
      const interview = await Interview.findById(interviewId)
        .populate('userId')
        .populate('applicationId') as any;

      if (!interview || !interview.userId || !interview.applicationId) {
        console.error(`❌ Cannot schedule notifications: Interview ${interviewId} not found or missing data`);
        return;
      }

      const user = interview.userId as IUser;
      const application = interview.applicationId as IJobApplication;
      const scheduledDate = new Date(interview.scheduledDate);
      const now = new Date();

      // Skip if interview is in the past
      if (scheduledDate <= now) {
        console.log(`⏭️  Skipping past interview ${interviewId}`);
        return;
      }

      // Send immediate confirmation email with calendar invite
      await this.sendConfirmationEmail(interview, user, application);

      // Schedule reminder notifications
      const reminderTimes = [
        { type: 'one_day', hours: 24 },
        { type: 'four_hours', hours: 4 },
        { type: 'one_hour', hours: 1 },
        { type: 'fifteen_mins', minutes: 15 }
      ];

      for (const reminder of reminderTimes) {
        const reminderTime = new Date(scheduledDate);
        if (reminder.hours) {
          reminderTime.setHours(reminderTime.getHours() - reminder.hours);
        } else if (reminder.minutes) {
          reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
        }

        // Only schedule if reminder time is in the future
        if (reminderTime > now) {
          const jobId = `${interviewId}-${reminder.type}`;
          this.jobs.set(jobId, {
            id: jobId,
            interviewId,
            userId: user._id.toString(),
            type: 'reminder',
            scheduledFor: reminderTime,
            executed: false
          });

          console.log(`📅 Scheduled ${reminder.type} reminder for interview ${interviewId} at ${reminderTime.toISOString()}`);
        }
      }

      // Schedule thank you reminder (24 hours after interview)
      const thankYouTime = new Date(scheduledDate);
      thankYouTime.setHours(thankYouTime.getHours() + 24);
      
      const thankYouJobId = `${interviewId}-thank_you`;
      this.jobs.set(thankYouJobId, {
        id: thankYouJobId,
        interviewId,
        userId: user._id.toString(),
        type: 'thank_you',
        scheduledFor: thankYouTime,
        executed: false
      });

      console.log(`💌 Scheduled thank you reminder for interview ${interviewId} at ${thankYouTime.toISOString()}`);

    } catch (error) {
      console.error(`❌ Failed to schedule notifications for interview ${interviewId}:`, error);
    }
  }

  async cancelInterviewNotifications(interviewId: string): Promise<void> {
    // Remove all jobs for this interview
    const jobsToRemove: string[] = [];
    for (const [jobId, job] of this.jobs) {
      if (job.interviewId === interviewId) {
        jobsToRemove.push(jobId);
      }
    }

    jobsToRemove.forEach(jobId => {
      this.jobs.delete(jobId);
    });

    console.log(`🗑️  Cancelled ${jobsToRemove.length} notifications for interview ${interviewId}`);
  }

  async rescheduleInterviewNotifications(
    interviewId: string,
    oldDate: Date,
    newDate: Date
  ): Promise<void> {
    // Cancel existing notifications
    await this.cancelInterviewNotifications(interviewId);

    // Send reschedule notification
    try {
      const interview = await Interview.findById(interviewId)
        .populate('userId')
        .populate('applicationId') as any;

      if (interview && interview.userId && interview.applicationId) {
        const user = interview.userId as IUser;
        const application = interview.applicationId as IJobApplication;
        
        // Generate new calendar invite
        const icsBuffer = calendarService.generateInterviewICS(interview, user, application);
        
        // Send reschedule email
        await emailService.sendInterviewRescheduled(user, interview, application, oldDate, icsBuffer);
        
        // Update notification tracking
        await Interview.findByIdAndUpdate(interviewId, {
          'notifications.calendarInviteSent': true
        });
      }
    } catch (error) {
      console.error(`❌ Failed to send reschedule notification for interview ${interviewId}:`, error);
    }

    // Schedule new notifications
    await this.scheduleInterviewNotifications(interviewId);
  }

  private async processReminderQueue(): Promise<void> {
    const now = new Date();
    const jobsToProcess: NotificationJob[] = [];

    // Find jobs that need to be executed
    for (const [jobId, job] of this.jobs) {
      if (!job.executed && job.scheduledFor <= now && job.type === 'reminder') {
        jobsToProcess.push(job);
      }
    }

    if (jobsToProcess.length === 0) {
      return;
    }

    console.log(`⏰ Processing ${jobsToProcess.length} reminder notifications`);

    for (const job of jobsToProcess) {
      try {
        const interview = await Interview.findById(job.interviewId)
          .populate('userId')
          .populate('applicationId') as any;

        if (!interview || !interview.userId || !interview.applicationId) {
          console.error(`❌ Interview ${job.interviewId} not found for reminder job ${job.id}`);
          this.jobs.delete(job.id);
          continue;
        }

        // Skip if interview was cancelled or completed
        if (!['scheduled', 'confirmed'].includes(interview.status)) {
          console.log(`⏭️  Skipping reminder for ${interview.status} interview ${job.interviewId}`);
          this.jobs.delete(job.id);
          continue;
        }

        const user = interview.userId as IUser;
        const application = interview.applicationId as IJobApplication;
        
        // Determine reminder type based on job ID
        let reminderType: 'one_day' | 'four_hours' | 'one_hour' | 'fifteen_mins' = 'one_hour';
        if (job.id.includes('one_day')) reminderType = 'one_day';
        else if (job.id.includes('four_hours')) reminderType = 'four_hours';
        else if (job.id.includes('one_hour')) reminderType = 'one_hour';
        else if (job.id.includes('fifteen_mins')) reminderType = 'fifteen_mins';

        // Send reminder email
        const success = await emailService.sendInterviewReminder(
          user,
          interview,
          application,
          reminderType
        );

        if (success) {
          // Update notification tracking in database
          const updateField = `notifications.reminders.${reminderType.replace('_', '')}Before`;
          await Interview.findByIdAndUpdate(job.interviewId, {
            [`${updateField}.sent`]: true,
            [`${updateField}.sentAt`]: new Date()
          });

          console.log(`✅ Sent ${reminderType} reminder for interview ${job.interviewId}`);
        } else {
          console.error(`❌ Failed to send ${reminderType} reminder for interview ${job.interviewId}`);
        }

        // Mark job as executed
        job.executed = true;
        this.jobs.delete(job.id);

      } catch (error) {
        console.error(`❌ Error processing reminder job ${job.id}:`, error);
        this.jobs.delete(job.id);
      }
    }
  }

  private async processThankYouReminders(): Promise<void> {
    const now = new Date();
    const jobsToProcess: NotificationJob[] = [];

    // Find thank you reminder jobs that need to be executed
    for (const [jobId, job] of this.jobs) {
      if (!job.executed && job.scheduledFor <= now && job.type === 'thank_you') {
        jobsToProcess.push(job);
      }
    }

    if (jobsToProcess.length === 0) {
      return;
    }

    console.log(`💌 Processing ${jobsToProcess.length} thank you reminders`);

    for (const job of jobsToProcess) {
      try {
        const interview = await Interview.findById(job.interviewId)
          .populate('userId')
          .populate('applicationId') as any;

        if (!interview || !interview.userId || !interview.applicationId) {
          this.jobs.delete(job.id);
          continue;
        }

        // Skip if thank you already sent
        if (interview.followUp?.thankYouSent) {
          console.log(`⏭️  Thank you already sent for interview ${job.interviewId}`);
          this.jobs.delete(job.id);
          continue;
        }

        // Skip if interview wasn't completed
        if (interview.status !== 'completed') {
          console.log(`⏭️  Interview ${job.interviewId} not completed, skipping thank you reminder`);
          this.jobs.delete(job.id);
          continue;
        }

        const user = interview.userId as IUser;
        const application = interview.applicationId as IJobApplication;

        // Send thank you reminder
        const success = await emailService.sendThankYouReminder(user, interview, application);

        if (success) {
          // Update notification tracking
          await Interview.findByIdAndUpdate(job.interviewId, {
            'notifications.followUpReminders.thankYou.sent': true,
            'notifications.followUpReminders.thankYou.sentAt': new Date()
          });

          console.log(`✅ Sent thank you reminder for interview ${job.interviewId}`);
        }

        // Mark job as executed
        job.executed = true;
        this.jobs.delete(job.id);

      } catch (error) {
        console.error(`❌ Error processing thank you reminder job ${job.id}:`, error);
        this.jobs.delete(job.id);
      }
    }
  }

  private async processFollowUpReminders(): Promise<void> {
    // Find interviews that need follow-up reminders
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago

    try {
      const interviewsNeedingFollowUp = await Interview.find({
        status: 'completed',
        scheduledDate: { $gte: cutoffDate, $lte: new Date() },
        'followUp.thankYouSent': true,
        'followUp.decision': { $ne: 'pending' },
        'notifications.followUpReminders.decisionFollowUp.sent': false
      })
      .populate('userId')
      .populate('applicationId');

      console.log(`📞 Found ${interviewsNeedingFollowUp.length} interviews needing decision follow-up`);

      for (const interview of interviewsNeedingFollowUp) {
        // Implementation for decision follow-up reminders
        // This could remind users to follow up on interview decisions
        // For now, we'll just mark it as processed
        await Interview.findByIdAndUpdate(interview._id, {
          'notifications.followUpReminders.decisionFollowUp.sent': true,
          'notifications.followUpReminders.decisionFollowUp.sentAt': new Date()
        });
      }

    } catch (error) {
      console.error('❌ Error processing follow-up reminders:', error);
    }
  }

  private async sendConfirmationEmail(
    interview: IInterview,
    user: IUser,
    application: IJobApplication
  ): Promise<void> {
    try {
      // Generate calendar invite
      const icsBuffer = calendarService.generateInterviewICS(interview, user, application);
      
      // Send confirmation email with calendar attachment
      const success = await emailService.sendInterviewConfirmation(
        user,
        interview,
        application,
        icsBuffer
      );

      if (success) {
        // Update notification tracking
        await Interview.findByIdAndUpdate(interview._id, {
          'notifications.emailConfirmationSent': true,
          'notifications.calendarInviteSent': true
        });

        console.log(`✅ Sent confirmation email for interview ${interview._id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send confirmation email for interview ${interview._id}:`, error);
    }
  }

  private async initializeExistingInterviews(): Promise<void> {
    try {
      const upcomingInterviews = await Interview.find({
        scheduledDate: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
      });

      console.log(`🔄 Initializing notifications for ${upcomingInterviews.length} existing interviews`);

      for (const interview of upcomingInterviews) {
        await this.scheduleInterviewNotifications(interview._id.toString());
      }

    } catch (error) {
      console.error('❌ Error initializing existing interviews:', error);
    }
  }

  // Public methods for manual triggering
  async sendTestReminder(interviewId: string, reminderType: 'one_day' | 'four_hours' | 'one_hour' | 'fifteen_mins'): Promise<boolean> {
    try {
      const interview = await Interview.findById(interviewId)
        .populate('userId')
        .populate('applicationId') as any;

      if (!interview || !interview.userId || !interview.applicationId) {
        return false;
      }

      const user = interview.userId as IUser;
      const application = interview.applicationId as IJobApplication;

      return await emailService.sendInterviewReminder(user, interview, application, reminderType);
    } catch (error) {
      console.error(`❌ Failed to send test reminder:`, error);
      return false;
    }
  }

  getQueueStatus(): {
    totalJobs: number;
    pendingJobs: number;
    executedJobs: number;
    jobsByType: Record<string, number>;
  } {
    const total = this.jobs.size;
    let pending = 0;
    let executed = 0;
    const byType: Record<string, number> = {};

    for (const job of this.jobs.values()) {
      if (job.executed) {
        executed++;
      } else {
        pending++;
      }

      byType[job.type] = (byType[job.type] || 0) + 1;
    }

    return {
      totalJobs: total,
      pendingJobs: pending,
      executedJobs: executed,
      jobsByType: byType
    };
  }
}

export const interviewNotificationService = new InterviewNotificationService();