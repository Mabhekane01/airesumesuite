export { User, IUser } from './User';
export { UserSession, IUserSession } from './UserSession';
export { Resume, IResume, IWorkExperience, IEducation, ISkill } from './Resume';
export { CoverLetter, ICoverLetter } from './CoverLetter';
export { JobApplication, IJobApplication } from './JobApplication';
export { Location, ILocation } from './Location';
export { Company, ICompany } from './Company';
export { Currency, ICurrency } from './Currency';
export { Interview, IInterview } from './Interview';
export { Notification, INotification } from './Notification';
export { NotificationPreferences, INotificationPreferences } from './NotificationPreferences';

// Basic UserProfile interface for AI optimization services
export interface IUserProfile {
  preferredRoles: string[];
  yearsOfExperience: number;
  technicalSkills: Array<{ name: string; level?: string }>;
  industries?: string[];
  salaryExpectation?: {
    min: number;
    max: number;
    currency: string;
  };
  workPreferences?: {
    remote: boolean;
    partTime: boolean;
    contract: boolean;
  };
  // Additional properties for job matching
  openToRemote?: boolean;
  currentLocation?: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  preferredLocations?: Array<{
    city: string;
    country: string;
  }>;
  openToRelocation?: boolean;
  expectedSalary?: {
    min: number;
    max: number;
    currency: string;
  };
  workType?: 'full_time' | 'part_time' | 'contract' | 'freelance';
  preferredIndustries?: string[];
}