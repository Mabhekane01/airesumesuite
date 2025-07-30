import { Request, Response } from 'express';
import { Interview, IInterview } from '../models/Interview';
import { InterviewTask } from '../models/InterviewTask';
import { InterviewCommunication } from '../models/InterviewCommunication';
import { JobApplication } from '../models/JobApplication';
import { User } from '../models/User';
// Import interview notification service with error handling
let interviewNotificationService: any;
try {
  const { interviewNotificationService: service } = require('../services/interviewNotificationService');
  interviewNotificationService = service;
} catch (error) {
  console.warn('⚠️  Interview notification service not available:', error);
  // Create a mock service that doesn't crash
  interviewNotificationService = {
    scheduleInterviewNotifications: async () => console.log('Mock: Interview notifications not available'),
    cancelInterviewNotifications: async () => console.log('Mock: Cancel notifications not available'),
    rescheduleInterviewNotifications: async () => console.log('Mock: Reschedule notifications not available'),
    sendTestReminder: async () => false,
    getQueueStatus: () => ({ totalJobs: 0, pendingJobs: 0, executedJobs: 0, jobsByType: {} })
  };
}
import { calendarService } from '../services/calendarService';
import { emailService } from '../services/emailService';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export class InterviewController {
  async createInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const interviewData = req.body;

      // Validate application belongs to user
      const application = await JobApplication.findOne({
        _id: interviewData.applicationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!application) {
        res.status(404).json({
          success: false,
          message: 'Job application not found'
        });
        return;
      }

      // Validate timezone
      if (interviewData.timezone && !calendarService.validateTimezone(interviewData.timezone)) {
        res.status(400).json({
          success: false,
          message: 'Invalid timezone'
        });
        return;
      }

      // Calculate end date
      const scheduledDate = new Date(interviewData.scheduledDate);
      const endDate = new Date(scheduledDate.getTime() + (interviewData.duration || 60) * 60 * 1000);

      // Create interview
      const interview = new Interview({
        userId: new mongoose.Types.ObjectId(userId),
        applicationId: new mongoose.Types.ObjectId(interviewData.applicationId),
        title: interviewData.title || `${interviewData.type} Interview - Round ${interviewData.round || 1}`,
        type: interviewData.type,
        round: interviewData.round || 1,
        scheduledDate,
        endDate,
        duration: interviewData.duration || 60,
        timezone: interviewData.timezone || 'America/New_York',
        status: 'scheduled',
        location: interviewData.location,
        meetingDetails: interviewData.meetingDetails,
        interviewers: interviewData.interviewers || [],
        preparationMaterials: interviewData.preparationMaterials,
        agenda: interviewData.agenda,
        source: 'manual',
        notifications: {
          emailConfirmationSent: false,
          calendarInviteSent: false,
          reminders: {
            oneDayBefore: { sent: false },
            fourHoursBefore: { sent: false },
            oneHourBefore: { sent: false },
            fifteenMinsBefore: { sent: false }
          },
          followUpReminders: {
            thankYou: { sent: false },
            decisionFollowUp: { sent: false }
          }
        },
        calendar: {
          icsFileGenerated: false
        },
        history: [{
          action: 'created',
          timestamp: new Date(),
          userId: new mongoose.Types.ObjectId(userId),
          details: 'Interview created'
        }]
      });

      const savedInterview = await interview.save();

      // Schedule notifications
      await interviewNotificationService.scheduleInterviewNotifications(savedInterview._id.toString());

      // Populate for response
      const populatedInterview = await Interview.findById(savedInterview._id)
        .populate('applicationId', 'jobTitle companyName')
        .populate('userId', 'email profile');

      res.status(201).json({
        success: true,
        data: { interview: populatedInterview },
        message: 'Interview scheduled successfully'
      });

    } catch (error) {
      console.error('Create interview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const {
        status,
        type,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'scheduledDate',
        sortOrder = 'asc'
      } = req.query;

      // Build query
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };

      if (status && status !== 'all') {
        if (typeof status === 'string') {
          query.status = status;
        } else {
          query.status = { $in: status };
        }
      }

      if (type && type !== 'all') {
        if (typeof type === 'string') {
          query.type = type;
        } else {
          query.type = { $in: type };
        }
      }

      if (startDate || endDate) {
        query.scheduledDate = {};
        if (startDate) query.scheduledDate.$gte = new Date(startDate as string);
        if (endDate) query.scheduledDate.$lte = new Date(endDate as string);
      }

      // Build sort
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const [interviews, total] = await Promise.all([
        Interview.find(query)
          .populate('applicationId', 'jobTitle companyName status')
          .sort(sortOptions)
          .limit(parseInt(limit as string))
          .skip(parseInt(offset as string)),
        Interview.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          interviews,
          pagination: {
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: parseInt(offset as string) + parseInt(limit as string) < total
          }
        }
      });

    } catch (error) {
      console.error('Get interviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getUpcomingInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(days as string));

      const interviews = await Interview.find({
        userId: new mongoose.Types.ObjectId(userId),
        scheduledDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate('applicationId', 'jobTitle companyName')
      .sort({ scheduledDate: 1 });

      res.status(200).json({
        success: true,
        data: { upcomingInterviews: interviews }
      });

    } catch (error) {
      console.error('Get upcoming interviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getInterviewById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      })
      .populate('applicationId', 'jobTitle companyName status')
      .populate('userId', 'email profile');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { interview }
      });

    } catch (error) {
      console.error('Get interview by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const oldDate = interview.scheduledDate;
      const isRescheduling = updateData.scheduledDate && 
        new Date(updateData.scheduledDate).getTime() !== oldDate.getTime();

      // Store previous data for history
      const previousData = {
        scheduledDate: interview.scheduledDate,
        duration: interview.duration,
        status: interview.status,
        type: interview.type
      };

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
          (interview as any)[key] = updateData[key];
        }
      });

      // Recalculate end date if duration or scheduled date changed
      if (updateData.scheduledDate || updateData.duration) {
        const scheduledDate = new Date(interview.scheduledDate);
        interview.endDate = new Date(scheduledDate.getTime() + interview.duration * 60 * 1000);
      }

      // Add to history
      interview.history.push({
        action: isRescheduling ? 'rescheduled' : 'updated',
        timestamp: new Date(),
        userId: new mongoose.Types.ObjectId(userId),
        details: isRescheduling ? `Rescheduled from ${oldDate.toISOString()}` : 'Interview updated',
        previousData
      });

      // Increment version if rescheduling
      if (isRescheduling) {
        interview.version += 1;
      }

      const updatedInterview = await interview.save();

      // Handle rescheduling notifications
      if (isRescheduling) {
        await interviewNotificationService.rescheduleInterviewNotifications(
          interviewId,
          oldDate,
          new Date(updateData.scheduledDate)
        );
      }

      const populatedInterview = await Interview.findById(updatedInterview._id)
        .populate('applicationId', 'jobTitle companyName')
        .populate('userId', 'email profile');

      res.status(200).json({
        success: true,
        data: { interview: populatedInterview },
        message: isRescheduling ? 'Interview rescheduled successfully' : 'Interview updated successfully'
      });

    } catch (error) {
      console.error('Update interview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      // Cancel notifications
      await interviewNotificationService.cancelInterviewNotifications(interviewId);

      // Send cancellation email if interview was scheduled
      if (['scheduled', 'confirmed'].includes(interview.status)) {
        try {
          const user = await User.findById(userId);
          const application = await JobApplication.findById(interview.applicationId);
          
          if (user && application) {
            await emailService.sendInterviewCancellation(user, interview, application, 'Interview cancelled by user');
          }
        } catch (emailError) {
          console.error('Failed to send cancellation email:', emailError);
        }
      }

      await Interview.findByIdAndDelete(interviewId);

      res.status(200).json({
        success: true,
        message: 'Interview deleted successfully'
      });

    } catch (error) {
      console.error('Delete interview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async downloadCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      })
      .populate('applicationId', 'jobTitle companyName');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Generate ICS file
      const icsBuffer = calendarService.generateInterviewICS(
        interview,
        user,
        interview.applicationId as any
      );

      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="interview-${interview._id}.ics"`);
      res.send(icsBuffer);

    } catch (error) {
      console.error('Download calendar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getCalendarUrls(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      })
      .populate('applicationId', 'jobTitle companyName');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const googleUrl = calendarService.generateGoogleCalendarUrl(interview, interview.applicationId as any);
      const outlookUrl = calendarService.generateOutlookCalendarUrl(interview, interview.applicationId as any);
      const appleUrl = calendarService.generateAppleCalendarUrl(interview, interview.applicationId as any);

      res.status(200).json({
        success: true,
        data: {
          google: googleUrl,
          outlook: outlookUrl,
          apple: appleUrl
        }
      });

    } catch (error) {
      console.error('Get calendar URLs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getTimezones(req: Request, res: Response): Promise<void> {
    try {
      const timezones = calendarService.getCommonTimezones();
      
      res.status(200).json({
        success: true,
        data: { timezones }
      });

    } catch (error) {
      console.error('Get timezones error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async sendTestReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { reminderType } = req.body;

      if (!['one_day', 'four_hours', 'one_hour', 'fifteen_mins'].includes(reminderType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid reminder type'
        });
        return;
      }

      const success = await interviewNotificationService.sendTestReminder(interviewId, reminderType);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Test reminder sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send test reminder'
        });
      }

    } catch (error) {
      console.error('Send test reminder error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getNotificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = interviewNotificationService.getQueueStatus();
      
      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Get notification status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ===== ENHANCED SCHEDULING FEATURES =====
  
  async rescheduleInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { scheduledDate, duration, reason, notifyParticipants = true } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('applicationId');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      // Store original data for history
      const originalData = {
        scheduledDate: interview.scheduledDate,
        duration: interview.duration
      };

      // Update interview
      interview.scheduledDate = new Date(scheduledDate);
      interview.duration = duration || interview.duration;
      interview.status = 'rescheduled';
      interview.version += 1;
      
      // Add to history
      interview.history.push({
        action: 'rescheduled',
        timestamp: new Date(),
        userId: new mongoose.Types.ObjectId(userId),
        details: reason || 'Interview rescheduled',
        previousData: originalData
      });

      await interview.save();

      // Cancel old notifications and schedule new ones
      if (notifyParticipants) {
        try {
          await interviewNotificationService.rescheduleInterviewNotifications(interview._id, interview);
          
          // Send reschedule emails
          const user = await User.findById(userId);
          if (user) {
            await emailService.sendInterviewRescheduled(user, interview, interview.applicationId, originalData.scheduledDate);
          }
        } catch (notificationError) {
          console.warn('Failed to send reschedule notifications:', notificationError);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Interview rescheduled successfully',
        data: interview
      });

    } catch (error) {
      console.error('Reschedule interview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async confirmInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { confirmationNotes } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('applicationId');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      interview.status = 'confirmed';
      interview.history.push({
        action: 'updated',
        timestamp: new Date(),
        userId: new mongoose.Types.ObjectId(userId),
        details: `Interview confirmed${confirmationNotes ? ': ' + confirmationNotes : ''}`
      });

      await interview.save();

      // Send confirmation notification
      try {
        const user = await User.findById(userId);
        if (user) {
          await emailService.sendInterviewConfirmation(user, interview, interview.applicationId);
        }
      } catch (notificationError) {
        console.warn('Failed to send confirmation notification:', notificationError);
      }

      res.status(200).json({
        success: true,
        message: 'Interview confirmed successfully',
        data: interview
      });

    } catch (error) {
      console.error('Confirm interview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getAvailabilitySuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { startDate, endDate, duration = 60, timezone = 'America/New_York' } = req.query;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      // Generate availability suggestions based on existing interviews
      const existingInterviews = await Interview.find({
        userId: new mongoose.Types.ObjectId(userId),
        scheduledDate: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        },
        status: { $in: ['scheduled', 'confirmed'] }
      });

      // Simple availability logic - suggest slots between 9 AM and 5 PM
      const suggestions = [];
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const durationMs = parseInt(duration as string) * 60 * 1000;

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (let hour = 9; hour < 17; hour++) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + durationMs);

          // Check if slot conflicts with existing interviews
          const hasConflict = existingInterviews.some(existing => {
            const existingStart = new Date(existing.scheduledDate);
            const existingEnd = new Date(existing.endDate);
            return (slotStart < existingEnd && slotEnd > existingStart);
          });

          if (!hasConflict) {
            suggestions.push({
              startTime: slotStart,
              endTime: slotEnd,
              duration: parseInt(duration as string),
              timezone
            });
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          suggestions: suggestions.slice(0, 20) // Limit to 20 suggestions
        }
      });

    } catch (error) {
      console.error('Get availability suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ===== COMMUNICATION FEATURES =====

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { to, subject, body, type = 'message', priority = 'normal', threadId } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const communication = new InterviewCommunication({
        interviewId: new mongoose.Types.ObjectId(interviewId),
        userId: new mongoose.Types.ObjectId(userId),
        type,
        direction: 'outbound',
        from: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: 'candidate',
          userId: new mongoose.Types.ObjectId(userId)
        },
        to: Array.isArray(to) ? to : [to],
        subject,
        body,
        priority,
        threadId: threadId || undefined,
        isThreadStart: !threadId,
        isAutomated: false
      });

      await communication.save();

      // Send the message via email service
      try {
        if (emailService.sendInterviewCancellation) {
          await emailService.sendInterviewCancellation({
            from: user.email,
            to: communication.to.map(recipient => recipient.email),
            subject: subject || `Message regarding ${interview.title}`,
            text: body,
            html: body
          });

          communication.status = 'sent';
          communication.sentAt = new Date();
          await communication.save();
        }
      } catch (emailError) {
        console.warn('Failed to send email:', emailError);
        communication.status = 'failed';
        await communication.save();
      }

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: communication
      });

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { page = 1, limit = 20, type } = req.query;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const filter: any = { interviewId: new mongoose.Types.ObjectId(interviewId) };
      if (type) {
        filter.type = type;
      }

      const messages = await InterviewCommunication.find(filter)
        .populate('from.userId', 'firstName lastName')
        .populate('to.userId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

      const total = await InterviewCommunication.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async sendInterviewEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { templateType, recipients, customSubject, customBody, includeCalendar = true } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('applicationId');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Generate email based on template type
      let emailContent = {};
      switch (templateType) {
        case 'confirmation':
          emailContent = {
            subject: customSubject || `Interview Confirmation - ${interview.title}`,
            body: customBody || `Dear Interviewer,\n\nI am writing to confirm our interview scheduled for ${interview.scheduledDate}.\n\nBest regards,\n${user.firstName} ${user.lastName}`
          };
          break;
        case 'thank_you':
          emailContent = {
            subject: customSubject || `Thank you - ${interview.title}`,
            body: customBody || `Dear Interviewer,\n\nThank you for taking the time to interview me today. I enjoyed our conversation and learning more about the role.\n\nBest regards,\n${user.firstName} ${user.lastName}`
          };
          break;
        case 'follow_up':
          emailContent = {
            subject: customSubject || `Following up - ${interview.title}`,
            body: customBody || `Dear Interviewer,\n\nI wanted to follow up on our interview and express my continued interest in the position.\n\nBest regards,\n${user.firstName} ${user.lastName}`
          };
          break;
        default:
          emailContent = {
            subject: customSubject || `Regarding ${interview.title}`,
            body: customBody || ''
          };
      }

      // Create communication record
      const communication = new InterviewCommunication({
        interviewId: new mongoose.Types.ObjectId(interviewId),
        userId: new mongoose.Types.ObjectId(userId),
        type: 'email',
        direction: 'outbound',
        from: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: 'candidate',
          userId: new mongoose.Types.ObjectId(userId)
        },
        to: recipients.map((recipient: any) => ({
          name: recipient.name,
          email: recipient.email,
          role: recipient.role || 'interviewer'
        })),
        subject: (emailContent as any).subject,
        body: (emailContent as any).body,
        templateId: templateType,
        isAutomated: false,
        isThreadStart: true
      });

      await communication.save();

      // Send email with optional calendar attachment
      try {
        const emailOptions: any = {
          from: user.email,
          to: recipients.map((r: any) => r.email),
          subject: (emailContent as any).subject,
          text: (emailContent as any).body,
          html: (emailContent as any).body
        };

        if (includeCalendar) {
          const icsContent = calendarService.generateInterviewICS(interview, user, interview.applicationId as any);
          emailOptions.attachments = [{
            filename: `interview-${interview._id}.ics`,
            content: icsContent,
            contentType: 'text/calendar'
          }];
        }

        if (emailService.sendInterviewCancellation) {
          await emailService.sendInterviewCancellation(emailOptions);
          communication.status = 'sent';
          communication.sentAt = new Date();
        } else {
          throw new Error('Email service not available');
        }
      } catch (emailError) {
        console.warn('Failed to send email:', emailError);
        communication.status = 'failed';
      }

      await communication.save();

      res.status(201).json({
        success: true,
        message: 'Email sent successfully',
        data: communication
      });

    } catch (error) {
      console.error('Send interview email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async inviteInterviewer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { name, email, title, department, message } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('applicationId');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      // Add interviewer to interview
      interview.interviewers.push({
        name,
        title,
        email,
        department
      });

      await interview.save();

      // Send invitation email
      const user = await User.findById(userId);
      if (user) {
        const communication = new InterviewCommunication({
          interviewId: new mongoose.Types.ObjectId(interviewId),
          userId: new mongoose.Types.ObjectId(userId),
          type: 'calendar_invite',
          direction: 'outbound',
          from: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: 'candidate',
            userId: new mongoose.Types.ObjectId(userId)
          },
          to: [{
            name,
            email,
            role: 'interviewer'
          }],
          subject: `Interview Invitation - ${interview.title}`,
          body: message || `Hello ${name},\n\nYou have been invited to participate in an interview.\n\nInterview Details:\n- Position: ${(interview.applicationId as any)?.jobTitle}\n- Date: ${interview.scheduledDate}\n- Duration: ${interview.duration} minutes\n\nBest regards,\n${user.firstName} ${user.lastName}`,
          isAutomated: false,
          isThreadStart: true
        });

        await communication.save();

        try {
          const icsContent = calendarService.generateInterviewICS(interview, user, interview.applicationId as any);
          
          if (emailService.sendInterviewCancellation) {
            await emailService.sendInterviewCancellation({
              from: user.email,
              to: email,
              subject: `Interview Invitation - ${interview.title}`,
              text: communication.body,
              html: communication.body,
              attachments: [{
                filename: `interview-${interview._id}.ics`,
                content: icsContent,
                contentType: 'text/calendar'
              }]
            });

            communication.status = 'sent';
            communication.sentAt = new Date();
          }
        } catch (emailError) {
          console.warn('Failed to send invitation email:', emailError);
          communication.status = 'failed';
        }

        await communication.save();
      }

      res.status(201).json({
        success: true,
        message: 'Interviewer invited successfully',
        data: interview
      });

    } catch (error) {
      console.error('Invite interviewer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ===== TASK MANAGEMENT FEATURES =====

  async createInterviewTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { 
        title, 
        description, 
        type, 
        priority = 'medium', 
        dueDate, 
        estimatedDuration,
        assignedTo = 'candidate',
        checklist,
        tags,
        reminderSettings
      } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const task = new InterviewTask({
        interviewId: new mongoose.Types.ObjectId(interviewId),
        userId: new mongoose.Types.ObjectId(userId),
        title,
        description,
        type,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedDuration,
        assignedTo,
        assignedBy: new mongoose.Types.ObjectId(userId),
        checklist: checklist || [],
        tags: tags || [],
        reminderSettings: reminderSettings || { enabled: false, intervals: [], sent: [] },
        isAutomated: false
      });

      await task.save();

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
      });

    } catch (error) {
      console.error('Create interview task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getInterviewTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { status, type, priority, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const filter: any = { interviewId: new mongoose.Types.ObjectId(interviewId) };
      
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (priority) filter.priority = priority;

      const tasks = await InterviewTask.find(filter)
        .sort({ dueDate: 1, priority: -1, createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

      const total = await InterviewTask.countDocuments(filter);

      // Group tasks by status for better organization
      const tasksByStatus = tasks.reduce((acc: any, task) => {
        if (!acc[task.status]) acc[task.status] = [];
        acc[task.status].push(task);
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: {
          tasks,
          tasksByStatus,
          summary: {
            total,
            pending: await InterviewTask.countDocuments({ ...filter, status: 'pending' }),
            inProgress: await InterviewTask.countDocuments({ ...filter, status: 'in_progress' }),
            completed: await InterviewTask.countDocuments({ ...filter, status: 'completed' }),
            overdue: await InterviewTask.countDocuments({ ...filter, status: 'overdue' })
          },
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });

    } catch (error) {
      console.error('Get interview tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateInterviewTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId, taskId } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const task = await InterviewTask.findOne({
        _id: taskId,
        interviewId: new mongoose.Types.ObjectId(interviewId)
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      // Update allowed fields
      const allowedUpdates = [
        'title', 'description', 'type', 'priority', 'status', 'dueDate', 
        'estimatedDuration', 'actualDuration', 'assignedTo', 'checklist', 
        'progress', 'notes', 'tags', 'category', 'reminderSettings'
      ];

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          if (key === 'dueDate' && updates[key]) {
            task[key] = new Date(updates[key]);
          } else {
            task[key] = updates[key];
          }
        }
      });

      await task.save();

      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task
      });

    } catch (error) {
      console.error('Update interview task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteInterviewTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId, taskId } = req.params;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const task = await InterviewTask.findOneAndDelete({
        _id: taskId,
        interviewId: new mongoose.Types.ObjectId(interviewId)
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error) {
      console.error('Delete interview task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async completeInterviewTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId, taskId } = req.params;
      const { notes, actualDuration } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const task = await InterviewTask.findOne({
        _id: taskId,
        interviewId: new mongoose.Types.ObjectId(interviewId)
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;
      
      if (notes) task.notes = notes;
      if (actualDuration) task.actualDuration = actualDuration;

      await task.save();

      res.status(200).json({
        success: true,
        message: 'Task completed successfully',
        data: task
      });

    } catch (error) {
      console.error('Complete interview task error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ===== PREPARATION & FOLLOW-UP FEATURES =====

  async updatePreparation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { preparationMaterials } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      interview.preparationMaterials = {
        ...interview.preparationMaterials,
        ...preparationMaterials
      };

      interview.history.push({
        action: 'updated',
        timestamp: new Date(),
        userId: new mongoose.Types.ObjectId(userId),
        details: 'Preparation materials updated'
      });

      await interview.save();

      res.status(200).json({
        success: true,
        message: 'Preparation materials updated successfully',
        data: interview
      });

    } catch (error) {
      console.error('Update preparation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async submitFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { feedback } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      interview.feedback = {
        ...interview.feedback,
        ...feedback
      };

      interview.status = 'completed';
      interview.history.push({
        action: 'completed',
        timestamp: new Date(),
        userId: new mongoose.Types.ObjectId(userId),
        details: 'Interview feedback submitted'
      });

      await interview.save();

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: interview
      });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async sendFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { interviewId } = req.params;
      const { type, message, recipients } = req.body;
      const userId = req.user.id;

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('applicationId');

      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Create communication record
      const communication = new InterviewCommunication({
        interviewId: new mongoose.Types.ObjectId(interviewId),
        userId: new mongoose.Types.ObjectId(userId),
        type: 'follow_up',
        direction: 'outbound',
        from: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: 'candidate',
          userId: new mongoose.Types.ObjectId(userId)
        },
        to: recipients.map((recipient: any) => ({
          name: recipient.name,
          email: recipient.email,
          role: recipient.role || 'interviewer'
        })),
        subject: `Follow-up: ${interview.title}`,
        body: message,
        isAutomated: false,
        isThreadStart: true
      });

      await communication.save();

      // Send follow-up email
      try {
        if (emailService.sendInterviewCancellation) {
          await emailService.sendInterviewCancellation({
            from: user.email,
            to: recipients.map((r: any) => r.email),
            subject: `Follow-up: ${interview.title}`,
            text: message,
            html: message
          });

          communication.status = 'sent';
          communication.sentAt = new Date();
        }
      } catch (emailError) {
        console.warn('Failed to send follow-up email:', emailError);
        communication.status = 'failed';
      }

      await communication.save();

      // Update interview follow-up status
      if (type === 'thank_you') {
        interview.followUp = {
          ...interview.followUp,
          thankYouSent: true,
          thankYouSentDate: new Date()
        };
        interview.notifications.followUpReminders.thankYou = {
          sent: true,
          sentAt: new Date()
        };
      }

      await interview.save();

      res.status(201).json({
        success: true,
        message: 'Follow-up sent successfully',
        data: communication
      });

    } catch (error) {
      console.error('Send follow-up error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

// Validation rules
export const interviewValidation = {
  createInterview: [
    body('applicationId')
      .notEmpty()
      .withMessage('Application ID is required')
      .isMongoId()
      .withMessage('Invalid application ID'),
    body('type')
      .isIn(['phone', 'video', 'on_site', 'technical', 'behavioral', 'case_study', 'presentation', 'panel', 'final', 'hr_screen'])
      .withMessage('Invalid interview type'),
    body('round')
      .isInt({ min: 1 })
      .withMessage('Round must be a positive integer'),
    body('scheduledDate')
      .isISO8601()
      .withMessage('Invalid scheduled date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Scheduled date must be in the future');
        }
        return true;
      }),
    body('duration')
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('timezone')
      .optional()
      .isString()
      .withMessage('Timezone must be a string'),
    body('interviewers')
      .optional()
      .isArray()
      .withMessage('Interviewers must be an array'),
    body('interviewers.*.name')
      .optional()
      .isString()
      .withMessage('Interviewer name must be a string'),
    body('interviewers.*.email')
      .optional()
      .isEmail()
      .withMessage('Invalid interviewer email')
  ],

  updateInterview: [
    body('type')
      .optional()
      .isIn(['phone', 'video', 'on_site', 'technical', 'behavioral', 'case_study', 'presentation', 'panel', 'final', 'hr_screen'])
      .withMessage('Invalid interview type'),
    body('round')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Round must be a positive integer'),
    body('scheduledDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid scheduled date'),
    body('duration')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('status')
      .optional()
      .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show', 'pending_confirmation'])
      .withMessage('Invalid status')
  ],

  getInterviews: [
    query('status')
      .optional()
      .custom((value) => {
        const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show', 'pending_confirmation', 'all'];
        if (Array.isArray(value)) {
          return value.every((s: string) => validStatuses.includes(s));
        }
        return validStatuses.includes(value);
      })
      .withMessage('Invalid status filter'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative')
  ],

  // Enhanced Scheduling Validations
  rescheduleInterview: [
    body('scheduledDate')
      .isISO8601()
      .withMessage('Invalid scheduled date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Scheduled date must be in the future');
        }
        return true;
      }),
    body('duration')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be a string with max 500 characters'),
    body('notifyParticipants')
      .optional()
      .isBoolean()
      .withMessage('notifyParticipants must be boolean')
  ],

  // Communication Validations
  sendMessage: [
    body('to')
      .isArray({ min: 1 })
      .withMessage('Recipients (to) must be a non-empty array'),
    body('to.*.name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Recipient name is required and must be max 100 characters'),
    body('to.*.email')
      .isEmail()
      .withMessage('Valid recipient email is required'),
    body('to.*.role')
      .optional()
      .isIn(['candidate', 'interviewer', 'hr', 'recruiter'])
      .withMessage('Invalid recipient role'),
    body('subject')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Subject must be max 500 characters'),
    body('body')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message body is required and must be max 10000 characters'),
    body('type')
      .optional()
      .isIn(['message', 'email', 'calendar_invite', 'reminder', 'confirmation', 'reschedule', 'cancellation', 'follow_up'])
      .withMessage('Invalid message type'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('threadId')
      .optional()
      .isString()
      .withMessage('Thread ID must be a string')
  ],

  sendEmail: [
    body('templateType')
      .isIn(['confirmation', 'thank_you', 'follow_up', 'custom'])
      .withMessage('Invalid template type'),
    body('recipients')
      .isArray({ min: 1 })
      .withMessage('Recipients must be a non-empty array'),
    body('recipients.*.name')
      .isString()
      .withMessage('Recipient name is required'),
    body('recipients.*.email')
      .isEmail()
      .withMessage('Valid recipient email is required'),
    body('customSubject')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Custom subject must be max 500 characters'),
    body('customBody')
      .optional()
      .isString()
      .isLength({ max: 10000 })
      .withMessage('Custom body must be max 10000 characters'),
    body('includeCalendar')
      .optional()
      .isBoolean()
      .withMessage('includeCalendar must be boolean')
  ],

  inviteInterviewer: [
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Interviewer name is required and must be max 100 characters'),
    body('email')
      .isEmail()
      .withMessage('Valid interviewer email is required'),
    body('title')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Title must be max 100 characters'),
    body('department')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Department must be max 100 characters'),
    body('message')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Message must be max 2000 characters')
  ],

  // Task Management Validations
  createTask: [
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Task title is required and must be max 200 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Description must be max 2000 characters'),
    body('type')
      .isIn(['preparation', 'research', 'practice', 'documentation', 'follow_up', 'reminder', 'custom'])
      .withMessage('Invalid task type'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date'),
    body('estimatedDuration')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Estimated duration must be between 1 and 1440 minutes'),
    body('assignedTo')
      .optional()
      .isIn(['candidate', 'interviewer', 'hr', 'recruiter'])
      .withMessage('Invalid assignedTo value'),
    body('checklist')
      .optional()
      .isArray()
      .withMessage('Checklist must be an array'),
    body('checklist.*.item')
      .optional()
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Checklist item must be 1-500 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be 1-50 characters')
  ],

  updateTask: [
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Task title must be max 200 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Description must be max 2000 characters'),
    body('type')
      .optional()
      .isIn(['preparation', 'research', 'practice', 'documentation', 'follow_up', 'reminder', 'custom'])
      .withMessage('Invalid task type'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    body('status')
      .optional()
      .isIn(['pending', 'in_progress', 'completed', 'cancelled', 'overdue'])
      .withMessage('Invalid status'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date'),
    body('progress')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Notes must be max 2000 characters')
  ],

  // Preparation & Follow-up Validations
  updatePreparation: [
    body('preparationMaterials')
      .isObject()
      .withMessage('Preparation materials must be an object'),
    body('preparationMaterials.documents')
      .optional()
      .isArray()
      .withMessage('Documents must be an array'),
    body('preparationMaterials.websites')
      .optional()
      .isArray()
      .withMessage('Websites must be an array'),
    body('preparationMaterials.questionsToAsk')
      .optional()
      .isArray()
      .withMessage('Questions to ask must be an array'),
    body('preparationMaterials.researchNotes')
      .optional()
      .isString()
      .isLength({ max: 5000 })
      .withMessage('Research notes must be max 5000 characters')
  ],

  submitFeedback: [
    body('feedback')
      .isObject()
      .withMessage('Feedback must be an object'),
    body('feedback.overallRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Overall rating must be between 1 and 5'),
    body('feedback.technicalSkills')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Technical skills rating must be between 1 and 5'),
    body('feedback.communicationSkills')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Communication skills rating must be between 1 and 5'),
    body('feedback.culturalFit')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Cultural fit rating must be between 1 and 5'),
    body('feedback.notes')
      .optional()
      .isString()
      .isLength({ max: 5000 })
      .withMessage('Feedback notes must be max 5000 characters'),
    body('feedback.recommendation')
      .optional()
      .isIn(['strong_hire', 'hire', 'no_hire', 'strong_no_hire'])
      .withMessage('Invalid recommendation')
  ],

  sendFollowUp: [
    body('type')
      .isIn(['thank_you', 'decision_inquiry', 'additional_info', 'custom'])
      .withMessage('Invalid follow-up type'),
    body('message')
      .isString()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Message is required and must be max 5000 characters'),
    body('recipients')
      .isArray({ min: 1 })
      .withMessage('Recipients must be a non-empty array'),
    body('recipients.*.name')
      .isString()
      .withMessage('Recipient name is required'),
    body('recipients.*.email')
      .isEmail()
      .withMessage('Valid recipient email is required'),
    body('recipients.*.role')
      .optional()
      .isIn(['interviewer', 'hr', 'recruiter'])
      .withMessage('Invalid recipient role')
  ]
};

export const interviewController = new InterviewController();