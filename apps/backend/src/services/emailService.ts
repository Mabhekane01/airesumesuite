// Import nodemailer conditionally to handle missing dependency gracefully
let nodemailer: any;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  console.warn('⚠️  nodemailer not found. Email notifications will be disabled. Run: pnpm add nodemailer');
  nodemailer = {
    createTransporter: () => ({
      sendMail: () => Promise.resolve({ messageId: 'test' }),
      verify: () => Promise.resolve(true)
    })
  };
}
import { IInterview } from '../models/Interview';
import { IUser } from '../models/User';
import { IJobApplication } from '../models/JobApplication';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  SMTP credentials not configured - using mock email service');
      // Create a mock transporter that doesn't actually send emails
      this.transporter = {
        sendMail: async () => {
          console.log('📧 Mock email sent (nodemailer not configured)');
          return { messageId: 'mock-' + Date.now() };
        },
        verify: async () => {
          console.log('📧 Mock email verification (nodemailer not configured)');
          return false;
        }
      };
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } catch (error) {
      console.warn('⚠️  Failed to create email transporter:', error);
      // Create a mock transporter that doesn't actually send emails
      this.transporter = {
        sendMail: async () => {
          console.log('📧 Mock email sent (nodemailer not configured)');
          return { messageId: 'mock-' + Date.now() };
        },
        verify: async () => {
          console.log('📧 Mock email verification (nodemailer not configured)');
          return false;
        }
      };
    }
  }

  async sendInterviewConfirmation(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    icsAttachment?: Buffer
  ): Promise<boolean> {
    try {
      const template = this.generateConfirmationTemplate(user, interview, application);
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${process.env.APP_NAME || 'Job Suite'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: icsAttachment ? [{
          filename: 'interview.ics',
          content: icsAttachment,
          contentType: 'text/calendar'
        }] : []
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Interview confirmation sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send interview confirmation:', error);
      return false;
    }
  }

  async sendInterviewReminder(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    reminderType: 'one_day' | 'four_hours' | 'one_hour' | 'fifteen_mins'
  ): Promise<boolean> {
    try {
      const template = this.generateReminderTemplate(user, interview, application, reminderType);
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${process.env.APP_NAME || 'Job Suite'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`⏰ Interview reminder (${reminderType}) sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error(`Failed to send interview reminder (${reminderType}):`, error);
      return false;
    }
  }

  async sendInterviewRescheduled(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    oldDate: Date,
    icsAttachment?: Buffer
  ): Promise<boolean> {
    try {
      const template = this.generateRescheduledTemplate(user, interview, application, oldDate);
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${process.env.APP_NAME || 'Job Suite'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: icsAttachment ? [{
          filename: 'interview-updated.ics',
          content: icsAttachment,
          contentType: 'text/calendar'
        }] : []
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📅 Interview reschedule notification sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send interview rescheduled notification:', error);
      return false;
    }
  }

  async sendInterviewCancellation(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    reason?: string
  ): Promise<boolean> {
    try {
      const template = this.generateCancellationTemplate(user, interview, application, reason);
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${process.env.APP_NAME || 'Job Suite'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`❌ Interview cancellation sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send interview cancellation:', error);
      return false;
    }
  }

  async sendThankYouReminder(
    user: IUser,
    interview: IInterview,
    application: IJobApplication
  ): Promise<boolean> {
    try {
      const template = this.generateThankYouReminderTemplate(user, interview, application);
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${process.env.APP_NAME || 'Job Suite'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`💌 Thank you reminder sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send thank you reminder:', error);
      return false;
    }
  }

  private generateConfirmationTemplate(
    user: IUser,
    interview: IInterview,
    application: IJobApplication
  ): EmailTemplate {
    const interviewDate = new Date(interview.scheduledDate);
    const formattedDate = interviewDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = interviewDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const subject = `Interview Confirmed: ${application.jobTitle} at ${application.companyName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Confirmation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
          .details { background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Interview Confirmed!</h1>
            <p>Your interview has been successfully scheduled</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName || user.email.split('@')[0]},</p>
            
            <p>Great news! Your interview has been confirmed for the <strong>${application.jobTitle}</strong> position at <strong>${application.companyName}</strong>.</p>
            
            <div class="card">
              <h3>📅 Interview Details</h3>
              <div class="details">
                <p><strong>Position:</strong> ${application.jobTitle}</p>
                <p><strong>Company:</strong> ${application.companyName}</p>
                <p><strong>Type:</strong> ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview (Round ${interview.round})</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Duration:</strong> ${interview.duration} minutes</p>
                ${interview.timezone ? `<p><strong>Timezone:</strong> ${interview.timezone}</p>` : ''}
              </div>
              
              ${interview.meetingDetails?.meetingUrl ? `
                <h4>🔗 Meeting Information</h4>
                <p><strong>Join URL:</strong> <a href="${interview.meetingDetails.meetingUrl}">${interview.meetingDetails.meetingUrl}</a></p>
                ${interview.meetingDetails.meetingId ? `<p><strong>Meeting ID:</strong> ${interview.meetingDetails.meetingId}</p>` : ''}
                ${interview.meetingDetails.passcode ? `<p><strong>Passcode:</strong> ${interview.meetingDetails.passcode}</p>` : ''}
              ` : ''}
              
              ${interview.location?.address ? `
                <h4>📍 Location</h4>
                <p>${interview.location.address}</p>
                ${interview.location.building ? `<p><strong>Building:</strong> ${interview.location.building}</p>` : ''}
                ${interview.location.room ? `<p><strong>Room:</strong> ${interview.location.room}</p>` : ''}
                ${interview.location.instructions ? `<p><strong>Instructions:</strong> ${interview.location.instructions}</p>` : ''}
              ` : ''}
            </div>
            
            ${interview.interviewers?.length > 0 ? `
              <div class="card">
                <h3>👥 Interviewers</h3>
                ${interview.interviewers.map(interviewer => `
                  <div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                    <p><strong>${interviewer.name}</strong></p>
                    ${interviewer.title ? `<p>${interviewer.title}</p>` : ''}
                    ${interviewer.department ? `<p>Department: ${interviewer.department}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${interview.preparationMaterials?.questionsToAsk?.length > 0 ? `
              <div class="card">
                <h3>❓ Suggested Questions to Ask</h3>
                <ul>
                  ${interview.preparationMaterials.questionsToAsk.map(q => `<li>${q}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div class="card">
              <h3>📋 Preparation Tips</h3>
              <ul>
                <li>Research the company and role thoroughly</li>
                <li>Prepare specific examples using the STAR method</li>
                <li>Test your technology (if virtual) 15 minutes before</li>
                <li>Prepare thoughtful questions about the role and company</li>
                <li>Have copies of your resume and portfolio ready</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard/interviews" class="btn">View Interview Details</a>
            </div>
            
            <p>You'll receive automatic reminders before your interview. Good luck!</p>
            
            <div class="footer">
              <p>This interview was scheduled through ${process.env.APP_NAME || 'Job Suite'}</p>
              <p>Need to reschedule? <a href="${process.env.FRONTEND_URL}/dashboard/interviews">Manage your interviews</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Interview Confirmed: ${application.jobTitle} at ${application.companyName}
      
      Hi ${user.firstName || user.email.split('@')[0]},
      
      Your interview has been confirmed for ${formattedDate} at ${formattedTime}.
      
      Interview Details:
      - Position: ${application.jobTitle}
      - Company: ${application.companyName}
      - Type: ${interview.type} Interview (Round ${interview.round})
      - Duration: ${interview.duration} minutes
      
      ${interview.meetingDetails?.meetingUrl ? `Meeting URL: ${interview.meetingDetails.meetingUrl}` : ''}
      ${interview.location?.address ? `Location: ${interview.location.address}` : ''}
      
      You'll receive reminders before your interview. Good luck!
      
      View details: ${process.env.FRONTEND_URL}/dashboard/interviews
    `;

    return { subject, html, text };
  }

  private generateReminderTemplate(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    reminderType: string
  ): EmailTemplate {
    const timeMap = {
      'one_day': '24 hours',
      'four_hours': '4 hours',
      'one_hour': '1 hour',
      'fifteen_mins': '15 minutes'
    };

    const interviewDate = new Date(interview.scheduledDate);
    const formattedTime = interviewDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const subject = `Reminder: Interview in ${timeMap[reminderType as keyof typeof timeMap]} - ${application.companyName}`;

    const urgencyClass = reminderType === 'fifteen_mins' ? 'urgent' : reminderType === 'one_hour' ? 'warning' : 'info';
    const urgencyColor = urgencyClass === 'urgent' ? '#ff4444' : urgencyClass === 'warning' ? '#ffa726' : '#2196f3';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Reminder</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .reminder-badge { background: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
          .quick-actions { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px; }
          .btn-secondary { background: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Interview Reminder</h1>
            <div class="reminder-badge">In ${timeMap[reminderType as keyof typeof timeMap]}</div>
          </div>
          <div class="content">
            <p>Hi ${user.firstName || user.email.split('@')[0]},</p>
            
            <p>This is a friendly reminder that your interview is coming up!</p>
            
            <div class="quick-actions">
              <h3>📅 Interview Details</h3>
              <p><strong>${application.jobTitle}</strong> at <strong>${application.companyName}</strong></p>
              <p><strong>When:</strong> ${formattedTime}</p>
              <p><strong>Type:</strong> ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview (Round ${interview.round})</p>
              
              ${interview.meetingDetails?.meetingUrl ? `
                <div style="margin: 15px 0; padding: 15px; background: #e8f5e8; border-radius: 6px;">
                  <p><strong>Ready to join?</strong></p>
                  <a href="${interview.meetingDetails.meetingUrl}" class="btn">Join Meeting Now</a>
                </div>
              ` : ''}
              
              ${interview.location?.address ? `
                <p><strong>Location:</strong> ${interview.location.address}</p>
                ${interview.location.instructions ? `<p><strong>Instructions:</strong> ${interview.location.instructions}</p>` : ''}
              ` : ''}
              
              <div style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL}/dashboard/interviews" class="btn">View Full Details</a>
                <a href="${process.env.FRONTEND_URL}/dashboard/interviews" class="btn btn-secondary">Reschedule</a>
              </div>
            </div>
            
            ${reminderType === 'one_day' ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>🎯 Last-minute preparation checklist:</h4>
                <ul>
                  <li>Review the job description and your application</li>
                  <li>Research recent company news and developments</li>
                  <li>Prepare your portfolio and examples</li>
                  <li>Plan your outfit and route (if in-person)</li>
                  <li>Prepare thoughtful questions to ask</li>
                </ul>
              </div>
            ` : ''}
            
            ${reminderType === 'fifteen_mins' ? `
              <div style="background: #ffebee; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>🚀 Final check:</h4>
                <ul>
                  <li>Test your camera and microphone (if virtual)</li>
                  <li>Have a glass of water ready</li>
                  <li>Turn off notifications on your devices</li>
                  <li>Have your resume and notes handy</li>
                  <li>Take a deep breath - you've got this!</li>
                </ul>
              </div>
            ` : ''}
            
            <p>Good luck with your interview! 🍀</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Interview Reminder - In ${timeMap[reminderType as keyof typeof timeMap]}
      
      Hi ${user.firstName || user.email.split('@')[0]},
      
      Your interview is coming up in ${timeMap[reminderType as keyof typeof timeMap]}!
      
      Interview: ${application.jobTitle} at ${application.companyName}
      When: ${formattedTime}
      Type: ${interview.type} Interview (Round ${interview.round})
      
      ${interview.meetingDetails?.meetingUrl ? `Meeting URL: ${interview.meetingDetails.meetingUrl}` : ''}
      ${interview.location?.address ? `Location: ${interview.location.address}` : ''}
      
      View details: ${process.env.FRONTEND_URL}/dashboard/interviews
      
      Good luck!
    `;

    return { subject, html, text };
  }

  private generateRescheduledTemplate(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    oldDate: Date
  ): EmailTemplate {
    const newDate = new Date(interview.scheduledDate);
    const formattedOldDate = oldDate.toLocaleString();
    const formattedNewDate = newDate.toLocaleString();

    const subject = `Interview Rescheduled: ${application.jobTitle} at ${application.companyName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Rescheduled</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffa726; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .date-change { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffa726; }
          .old-date { text-decoration: line-through; color: #666; }
          .new-date { color: #2e7d32; font-weight: bold; }
          .btn { display: inline-block; background: #ffa726; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Interview Rescheduled</h1>
            <p>Your interview time has been updated</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName || user.email.split('@')[0]},</p>
            
            <p>Your interview for the <strong>${application.jobTitle}</strong> position at <strong>${application.companyName}</strong> has been rescheduled.</p>
            
            <div class="date-change">
              <h3>📅 Schedule Change</h3>
              <p><strong>Previous time:</strong> <span class="old-date">${formattedOldDate}</span></p>
              <p><strong>New time:</strong> <span class="new-date">${formattedNewDate}</span></p>
              <p><strong>Duration:</strong> ${interview.duration} minutes</p>
            </div>
            
            <p>All other interview details remain the same. You'll receive new reminders based on the updated schedule.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard/interviews" class="btn">View Updated Details</a>
            </div>
            
            <p>Please update your calendar accordingly. If you have any questions or conflicts with the new time, please reach out as soon as possible.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Interview Rescheduled: ${application.jobTitle} at ${application.companyName}
      
      Hi ${user.firstName || user.email.split('@')[0]},
      
      Your interview has been rescheduled.
      
      Previous time: ${formattedOldDate}
      New time: ${formattedNewDate}
      Duration: ${interview.duration} minutes
      
      Please update your calendar accordingly.
      
      View details: ${process.env.FRONTEND_URL}/dashboard/interviews
    `;

    return { subject, html, text };
  }

  private generateCancellationTemplate(
    user: IUser,
    interview: IInterview,
    application: IJobApplication,
    reason?: string
  ): EmailTemplate {
    const interviewDate = new Date(interview.scheduledDate);
    const formattedDate = interviewDate.toLocaleString();

    const subject = `Interview Cancelled: ${application.jobTitle} at ${application.companyName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Cancelled</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .cancellation-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336; }
          .btn { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Interview Cancelled</h1>
            <p>Your scheduled interview has been cancelled</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName || user.email.split('@')[0]},</p>
            
            <p>We wanted to inform you that your interview for the <strong>${application.jobTitle}</strong> position at <strong>${application.companyName}</strong> has been cancelled.</p>
            
            <div class="cancellation-info">
              <h3>📅 Cancelled Interview</h3>
              <p><strong>Position:</strong> ${application.jobTitle}</p>
              <p><strong>Company:</strong> ${application.companyName}</p>
              <p><strong>Originally scheduled:</strong> ${formattedDate}</p>
              <p><strong>Type:</strong> ${interview.type} Interview (Round ${interview.round})</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <p>This interview has been removed from your schedule and you will not receive any further reminders for it.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard/interviews" class="btn">View Interview Schedule</a>
            </div>
            
            <p>If you believe this cancellation was made in error or if you'd like to reschedule, please contact the hiring team directly.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Interview Cancelled: ${application.jobTitle} at ${application.companyName}
      
      Hi ${user.firstName || user.email.split('@')[0]},
      
      Your interview has been cancelled.
      
      Details:
      - Position: ${application.jobTitle}
      - Company: ${application.companyName}
      - Originally scheduled: ${formattedDate}
      - Type: ${interview.type} Interview (Round ${interview.round})
      ${reason ? `- Reason: ${reason}` : ''}
      
      This interview has been removed from your schedule.
      
      View schedule: ${process.env.FRONTEND_URL}/dashboard/interviews
    `;

    return { subject, html, text };
  }

  private generateThankYouReminderTemplate(
    user: IUser,
    interview: IInterview,
    application: IJobApplication
  ): EmailTemplate {
    const subject = `Reminder: Send thank you note for ${application.companyName} interview`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You Note Reminder</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .tip-box { background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .btn { display: inline-block; background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💌 Thank You Note Reminder</h1>
            <p>A follow-up can make all the difference</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName || user.email.split('@')[0]},</p>
            
            <p>Your interview for the <strong>${application.jobTitle}</strong> position at <strong>${application.companyName}</strong> was completed. Now is a great time to send a thank you note!</p>
            
            <div class="tip-box">
              <h3>✨ Thank You Note Tips</h3>
              <ul>
                <li>Send within 24 hours of your interview</li>
                <li>Personalize each note for different interviewers</li>
                <li>Mention specific topics you discussed</li>
                <li>Reiterate your interest in the role</li>
                <li>Address any concerns that came up</li>
                <li>Keep it concise but meaningful</li>
              </ul>
            </div>
            
            ${interview.interviewers?.length > 0 ? `
              <h3>📧 Suggested Recipients</h3>
              ${interview.interviewers.map(interviewer => `
                <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                  <p><strong>${interviewer.name}</strong></p>
                  ${interviewer.title ? `<p>${interviewer.title}</p>` : ''}
                  ${interviewer.email ? `<p>Email: ${interviewer.email}</p>` : ''}
                </div>
              `).join('')}
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard/interviews" class="btn">Mark Thank You Sent</a>
            </div>
            
            <p>Good luck with your follow-up! 🤞</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Thank You Note Reminder
      
      Hi ${user.firstName || user.email.split('@')[0]},
      
      Your interview for ${application.jobTitle} at ${application.companyName} was completed.
      
      Consider sending a thank you note to:
      ${interview.interviewers?.map(i => `- ${i.name} (${i.title})`).join('\n') || '- Your interviewer(s)'}
      
      Tips:
      - Send within 24 hours
      - Mention specific discussion points
      - Reiterate your interest
      - Keep it concise
      
      Track your follow-up: ${process.env.FRONTEND_URL}/dashboard/interviews
    `;

    return { subject, html, text };
  }

  async sendVerificationEmail(user: IUser, token: string): Promise<boolean> {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
      const userName = `${user.firstName} ${user.lastName}`;
      
      const template = this.generateVerificationTemplate(userName, verificationUrl);

      const mailOptions = {
        from: {
          name: 'AI Job Suite',
          address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aijobsuite.com'
        },
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'List-Unsubscribe': `<${baseUrl}/unsubscribe>`,
          'X-Entity-ID': user._id.toString(),
          'X-Email-Type': 'verification',
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(user: IUser): Promise<boolean> {
    try {
      const welcomeTemplate = this.generateWelcomeTemplate(user);

      const mailOptions = {
        from: {
          name: 'AI Job Suite',
          address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aijobsuite.com'
        },
        to: user.email,
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        text: welcomeTemplate.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', user.email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  private generateVerificationTemplate(name: string, verificationUrl: string): EmailTemplate {
    const subject = 'Welcome to AI Job Suite - Verify Your Email';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background-color: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #333333; }
          .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #808080; font-size: 14px; }
          .logo { font-size: 24px; font-weight: 800; color: white; }
          .security-notice { background-color: #2a2a2a; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #06b6d4; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ AI Job Suite</div>
            <h1 style="margin: 10px 0 0 0; font-size: 28px;">Welcome aboard!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}! 👋</h2>
            <p>Thank you for joining AI Job Suite, the enterprise-grade AI-powered job search platform. We're excited to help you accelerate your career journey.</p>
            
            <p>To complete your registration and secure your account, please verify your email address:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <div class="security-notice">
              <strong>🔒 Security Notice:</strong><br>
              This verification link will expire in 24 hours for your security. If you didn't create this account, please ignore this email.
            </div>
            
            <p>Once verified, you'll have access to:</p>
            <ul>
              <li>AI-powered resume builder and optimization</li>
              <li>Intelligent job matching and recommendations</li>
              <li>Application tracking and analytics</li>
              <li>Personalized career coaching</li>
              <li>Enterprise-grade security and privacy</li>
            </ul>
            
            <p>If the button doesn't work, copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #06b6d4;">${verificationUrl}</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Job Suite. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to AI Job Suite!

Hi ${name},

Thank you for joining AI Job Suite. To complete your registration, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours for security reasons.

If you didn't create this account, please ignore this email.

Best regards,
The AI Job Suite Team
    `;

    return { subject, html, text };
  }

  private generateWelcomeTemplate(user: IUser): EmailTemplate {
    const subject = 'Welcome to AI Job Suite - Let\'s Get Started! 🚀';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AI Job Suite</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background-color: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #333333; }
          .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #808080; font-size: 14px; }
          .logo { font-size: 24px; font-weight: 800; color: white; }
          .feature-box { background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ AI Job Suite</div>
            <h1 style="margin: 10px 0 0 0;">Email Verified Successfully!</h1>
          </div>
          <div class="content">
            <h2>Congratulations ${user.firstName}! 🎉</h2>
            <p>Your email has been verified and your AI Job Suite account is now fully activated. You're ready to supercharge your job search with AI!</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">Access Your Dashboard</a>
            </div>
            
            <div class="feature-box">
              <h3>🚀 What's Next?</h3>
              <ul>
                <li><strong>Build Your AI Resume:</strong> Create ATS-optimized resumes in minutes</li>
                <li><strong>Smart Job Matching:</strong> Get personalized job recommendations</li>
                <li><strong>Track Applications:</strong> Monitor your job search progress</li>
                <li><strong>AI Career Coach:</strong> Get expert guidance and insights</li>
              </ul>
            </div>
            
            <p>Need help getting started? Our AI-powered platform is designed to be intuitive, but if you have any questions, our support team is here to help.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Job Suite. All rights reserved.</p>
            <p>Welcome to the future of job searching!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to AI Job Suite!

Congratulations ${user.firstName}!

Your email has been verified and your AI Job Suite account is now fully activated.

Access your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard

What's Next:
- Build Your AI Resume: Create ATS-optimized resumes in minutes
- Smart Job Matching: Get personalized job recommendations  
- Track Applications: Monitor your job search progress
- AI Career Coach: Get expert guidance and insights

Welcome to the future of job searching!

Best regards,
The AI Job Suite Team
    `;

    return { subject, html, text };
  }

  async sendOTPEmail(email: string, otp: string, firstName?: string): Promise<boolean> {
    try {
      const { subject, html, text } = this.createOTPEmailTemplate(email, otp, firstName);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject,
        html,
        text
      });
      
      console.log('📧 OTP email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return false;
    }
  }

  private createOTPEmailTemplate(email: string, otp: string, firstName?: string) {
    const subject = 'Your Login Verification Code - AI Job Suite';
    const name = firstName || 'User';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔐 AI Job Suite</h1>
    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Login Verification Code</p>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-bottom: 20px;">Hi ${name}! 👋</h2>
    
    <p style="font-size: 16px; margin-bottom: 25px;">
      You're trying to log in to your AI Job Suite account. Here's your verification code:
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 15px; padding: 25px; display: inline-block;">
        <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">
          Enter this code to complete your login
        </p>
      </div>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⏰ Important:</strong> This code expires in <strong>10 minutes</strong> for your security.
      </p>
    </div>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        <strong>🔒 Security Note:</strong> Never share this code with anyone. AI Job Suite will never ask for your verification code.
      </p>
      <p style="font-size: 14px; color: #666;">
        If you didn't try to log in, please ignore this email and consider changing your password.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2024 AI Job Suite. All rights reserved.</p>
    <p>This code was sent to ${email}</p>
  </div>
</body>
</html>
    `;
    
    const text = `
Hi ${name}!

You're trying to log in to your AI Job Suite account. Here's your verification code:

${otp}

⏰ This code expires in 10 minutes for your security.

🔒 Security Note: Never share this code with anyone. AI Job Suite will never ask for your verification code.

If you didn't try to log in, please ignore this email and consider changing your password.

Best regards,
The AI Job Suite Team

© 2024 AI Job Suite. All rights reserved.
This code was sent to ${email}
    `;

    return { subject, html, text };
  }

  private createVerificationEmailTemplate(user: IUser, verificationUrl: string) {
    const subject = 'Verify Your Email - AI Job Suite';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚀 AI Job Suite</h1>
    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Verify Your Email Address</p>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.firstName}! 👋</h2>
    
    <p style="font-size: 16px; margin-bottom: 25px;">
      Welcome to AI Job Suite! You're just one step away from transforming your job search with the power of AI.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Please click the button below to verify your email address and activate your account:
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${verificationUrl}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 25px; 
                font-size: 16px; 
                font-weight: bold; 
                display: inline-block;
                transition: transform 0.2s;">
        ✅ Verify Email Address
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 14px; color: #667eea; word-break: break-all; margin-bottom: 30px;">
      ${verificationUrl}
    </p>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        <strong>🔒 Security Note:</strong> This verification link will expire in 24 hours for your security.
      </p>
      <p style="font-size: 14px; color: #666;">
        If you didn't create an account with AI Job Suite, please ignore this email.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2024 AI Job Suite. All rights reserved.</p>
  </div>
</body>
</html>
    `;
    
    const text = `
Hi ${user.firstName}!

Welcome to AI Job Suite! You're just one step away from transforming your job search with the power of AI.

Please verify your email address by clicking the link below:
${verificationUrl}

This verification link will expire in 24 hours for your security.

If you didn't create an account with AI Job Suite, please ignore this email.

Best regards,
The AI Job Suite Team

© 2024 AI Job Suite. All rights reserved.
    `;

    return { subject, html, text };
  }

  async sendOTPEmail(email: string, otp: string, firstName: string): Promise<boolean> {
    try {
      const template = this.generateOTPTemplate(otp, firstName);
      
      const mailOptions: any = {
        from: `"${process.env.APP_NAME || 'AI Job Suite'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Registration OTP sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send registration OTP:', error);
      return false;
    }
  }

  private generateOTPTemplate(otp: string, firstName: string): EmailTemplate {
    const subject = `Your AI Job Suite Verification Code: ${otp}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { background: #4f46e5; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 4px; margin: 20px 0; }
          .warning { background: #fef3c7; border: 1px solid #d97706; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Verification Code</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName}!</h2>
          
          <p>Your verification code for AI Job Suite registration is:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p><strong>This code will expire in 10 minutes.</strong></p>
          
          <div class="warning">
            <p><strong>⚠️ Security Notice:</strong></p>
            <ul>
              <li>Never share this code with anyone</li>
              <li>AI Job Suite will never ask for this code via phone or email</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          
          <p>Simply enter this code in the verification form to complete your registration.</p>
          
          <p>Welcome to AI Job Suite! 🎉</p>
          
          <div class="footer">
            <p>© 2024 AI Job Suite. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      AI Job Suite - Verification Code
      
      Hi ${firstName}!
      
      Your verification code is: ${otp}
      
      This code will expire in 10 minutes.
      
      Enter this code in the verification form to complete your registration.
      
      Security Notice:
      - Never share this code with anyone
      - AI Job Suite will never ask for this code via phone or email
      - If you didn't request this code, please ignore this email
      
      Welcome to AI Job Suite!
      
      © 2024 AI Job Suite. All rights reserved.
    `;

    return { subject, html, text };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('📧 Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();