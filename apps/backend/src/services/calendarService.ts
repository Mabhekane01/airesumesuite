import { IInterview } from '../models/Interview';
import { IUser } from '../models/User';
import { IJobApplication } from '../models/JobApplication';

interface CalendarEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: {
    name: string;
    email: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT';
  }[];
  url?: string;
  reminder?: {
    minutes: number;
  }[];
}

class CalendarService {
  generateICS(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');
    };

    const formatDescription = (text: string): string => {
      // Split long lines for ICS format compliance
      return text.replace(/(.{70})/g, '$1\r\n ');
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Job Suite//Interview Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${formatDescription(escapeText(event.description))}`
    ];

    if (event.location) {
      icsContent.push(`LOCATION:${escapeText(event.location)}`);
    }

    if (event.organizer) {
      icsContent.push(`ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`);
    }

    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(attendee => {
        const role = attendee.role || 'REQ-PARTICIPANT';
        icsContent.push(`ATTENDEE;CN=${escapeText(attendee.name)};ROLE=${role};PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}`);
      });
    }

    if (event.url) {
      icsContent.push(`URL:${event.url}`);
    }

    // Add reminders
    if (event.reminder && event.reminder.length > 0) {
      event.reminder.forEach(reminder => {
        icsContent.push('BEGIN:VALARM');
        icsContent.push('ACTION:DISPLAY');
        icsContent.push(`TRIGGER:-PT${reminder.minutes}M`);
        icsContent.push(`DESCRIPTION:Reminder: ${escapeText(event.summary)}`);
        icsContent.push('END:VALARM');
      });
    }

    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('TRANSP:OPAQUE');
    icsContent.push('END:VEVENT');
    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  generateInterviewICS(
    interview: IInterview,
    user: IUser,
    application: IJobApplication
  ): Buffer {
    const uid = `interview-${interview._id}@jobsuite.com`;
    const summary = `Interview: ${application.jobTitle} at ${application.companyName}`;
    
    let description = `Interview Details:\n`;
    description += `Position: ${application.jobTitle}\n`;
    description += `Company: ${application.companyName}\n`;
    description += `Type: ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview\n`;
    description += `Round: ${interview.round}\n`;
    description += `Duration: ${interview.duration} minutes\n\n`;

    if (interview.interviewers && interview.interviewers.length > 0) {
      description += `Interviewers:\n`;
      interview.interviewers.forEach(interviewer => {
        description += `- ${interviewer.name}`;
        if (interviewer.title) description += ` (${interviewer.title})`;
        description += `\n`;
      });
      description += `\n`;
    }

    if (interview.meetingDetails?.meetingUrl) {
      description += `Meeting URL: ${interview.meetingDetails.meetingUrl}\n`;
      if (interview.meetingDetails.meetingId) {
        description += `Meeting ID: ${interview.meetingDetails.meetingId}\n`;
      }
      if (interview.meetingDetails.passcode) {
        description += `Passcode: ${interview.meetingDetails.passcode}\n`;
      }
      description += `\n`;
    }

    if (interview.preparationMaterials?.questionsToAsk && interview.preparationMaterials.questionsToAsk.length > 0) {
      description += `Questions to ask:\n`;
      interview.preparationMaterials.questionsToAsk.forEach(question => {
        description += `- ${question}\n`;
      });
      description += `\n`;
    }

    if (interview.preparationMaterials?.researchNotes) {
      description += `Preparation notes:\n${interview.preparationMaterials.researchNotes}\n\n`;
    }

    description += `Created via Job Suite - ${process.env.FRONTEND_URL}/dashboard/interviews`;

    let location = '';
    if (interview.location?.type === 'virtual' && interview.meetingDetails?.meetingUrl) {
      location = interview.meetingDetails.meetingUrl;
    } else if (interview.location?.address) {
      location = interview.location.address;
      if (interview.location.building) location += `, ${interview.location.building}`;
      if (interview.location.room) location += `, ${interview.location.room}`;
    }

    const attendees: any[] = [];
    if (interview.interviewers) {
      interview.interviewers.forEach(interviewer => {
        if (interviewer.email) {
          attendees.push({
            name: interviewer.name,
            email: interviewer.email,
            role: interviewer.isLead ? 'REQ-PARTICIPANT' : 'OPT-PARTICIPANT'
          });
        }
      });
    }

    const event: CalendarEvent = {
      uid,
      start: new Date(interview.scheduledDate),
      end: new Date(interview.endDate),
      summary,
      description,
      location,
      organizer: {
        name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : user.email,
        email: user.email
      },
      attendees,
      url: interview.meetingDetails?.meetingUrl,
      reminder: [
        { minutes: 15 },    // 15 minutes before
        { minutes: 60 },    // 1 hour before
        { minutes: 1440 }   // 24 hours before
      ]
    };

    const icsContent = this.generateICS(event);
    return Buffer.from(icsContent, 'utf8');
  }

  generateCancellationICS(
    interview: IInterview,
    user: IUser,
    application: IJobApplication
  ): Buffer {
    const uid = `interview-${interview._id}@jobsuite.com`;
    const summary = `CANCELLED: Interview - ${application.jobTitle} at ${application.companyName}`;
    
    const description = `This interview has been cancelled.\n\n` +
      `Original Details:\n` +
      `Position: ${application.jobTitle}\n` +
      `Company: ${application.companyName}\n` +
      `Type: ${interview.type} Interview (Round ${interview.round})\n` +
      `Originally scheduled: ${new Date(interview.scheduledDate).toLocaleString()}\n\n` +
      `Please remove this event from your calendar.`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Job Suite//Interview Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:CANCEL',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${new Date(interview.scheduledDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`,
      `DTEND:${new Date(interview.endDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `ORGANIZER;CN=${user.profile?.firstName || user.email}:mailto:${user.email}`,
      'STATUS:CANCELLED',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return Buffer.from(icsContent.join('\r\n'), 'utf8');
  }

  generateGoogleCalendarUrl(interview: IInterview, application: IJobApplication): string {
    const startDate = new Date(interview.scheduledDate);
    const endDate = new Date(interview.endDate);
    
    const formatGoogleDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(`Interview: ${application.jobTitle} at ${application.companyName}`);
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    
    let details = `Position: ${application.jobTitle}\\n`;
    details += `Company: ${application.companyName}\\n`;
    details += `Type: ${interview.type} Interview (Round ${interview.round})\\n`;
    details += `Duration: ${interview.duration} minutes\\n\\n`;
    
    if (interview.meetingDetails?.meetingUrl) {
      details += `Meeting URL: ${interview.meetingDetails.meetingUrl}\\n`;
    }
    
    if (interview.interviewers && interview.interviewers.length > 0) {
      details += `\\nInterviewers:\\n`;
      interview.interviewers.forEach(interviewer => {
        details += `- ${interviewer.name}`;
        if (interviewer.title) details += ` (${interviewer.title})`;
        details += `\\n`;
      });
    }

    const encodedDetails = encodeURIComponent(details);
    
    let location = '';
    if (interview.meetingDetails?.meetingUrl) {
      location = encodeURIComponent(interview.meetingDetails.meetingUrl);
    } else if (interview.location?.address) {
      location = encodeURIComponent(interview.location.address);
    }

    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE`;
    url += `&text=${title}`;
    url += `&dates=${dates}`;
    url += `&details=${encodedDetails}`;
    if (location) url += `&location=${location}`;
    
    return url;
  }

  generateOutlookCalendarUrl(interview: IInterview, application: IJobApplication): string {
    const startDate = new Date(interview.scheduledDate);
    const endDate = new Date(interview.endDate);
    
    const formatOutlookDate = (date: Date): string => {
      return date.toISOString();
    };

    const title = encodeURIComponent(`Interview: ${application.jobTitle} at ${application.companyName}`);
    const startTime = formatOutlookDate(startDate);
    const endTime = formatOutlookDate(endDate);
    
    let body = `Position: ${application.jobTitle}%0A`;
    body += `Company: ${application.companyName}%0A`;
    body += `Type: ${interview.type} Interview (Round ${interview.round})%0A`;
    body += `Duration: ${interview.duration} minutes%0A%0A`;
    
    if (interview.meetingDetails?.meetingUrl) {
      body += `Meeting URL: ${interview.meetingDetails.meetingUrl}%0A`;
    }

    let location = '';
    if (interview.meetingDetails?.meetingUrl) {
      location = encodeURIComponent(interview.meetingDetails.meetingUrl);
    } else if (interview.location?.address) {
      location = encodeURIComponent(interview.location.address);
    }

    let url = `https://outlook.live.com/calendar/0/deeplink/compose?`;
    url += `subject=${title}`;
    url += `&startdt=${startTime}`;
    url += `&enddt=${endTime}`;
    url += `&body=${body}`;
    if (location) url += `&location=${location}`;
    
    return url;
  }

  generateAppleCalendarUrl(interview: IInterview, application: IJobApplication): string {
    // Apple Calendar uses data URLs with ICS content
    const icsBuffer = this.generateInterviewICS(interview, {} as IUser, application);
    const icsContent = icsBuffer.toString('utf8');
    const dataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
    return dataUrl;
  }

  async saveCalendarFile(
    interview: IInterview,
    user: IUser,
    application: IJobApplication
  ): Promise<string> {
    try {
      const icsBuffer = this.generateInterviewICS(interview, user, application);
      
      // In a real implementation, you would save this to a file storage service
      // For now, we'll return a data URL that can be downloaded
      const dataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsBuffer.toString('utf8'))}`;
      
      console.log(`📅 Calendar file generated for interview ${interview._id}`);
      return dataUrl;
    } catch (error) {
      console.error('Failed to save calendar file:', error);
      throw error;
    }
  }

  getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      return (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
    } catch (error) {
      console.error('Error calculating timezone offset:', error);
      return 0;
    }
  }

  convertToTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      // Convert to target timezone
      const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const target = new Date(utc.toLocaleString('en-US', { timeZone: toTimezone }));
      return target;
    } catch (error) {
      console.error('Error converting timezone:', error);
      return date;
    }
  }

  validateTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  getCommonTimezones(): { value: string; label: string; offset: string }[] {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland'
    ];

    return timezones.map(tz => {
      const now = new Date();
      const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const offset = (timeInZone.getTime() - now.getTime()) / (1000 * 60 * 60);
      const offsetString = offset >= 0 ? `+${offset}` : `${offset}`;
      
      return {
        value: tz,
        label: tz.replace('_', ' ').replace('/', ' / '),
        offset: `UTC${offsetString}`
      };
    });
  }
}

export const calendarService = new CalendarService();