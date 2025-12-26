export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  credits: number;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FormFieldError {
  field: string;
  message: string;
}

// Resume Types
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  professionalTitle?: string;
  // South African CV Specific Fields
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  homeLanguage?: string;
  otherLanguages?: string;
  residentialAddress?: string;
}

export interface WorkExperience {
  id?: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  isCurrentJob: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  gpa?: string;
  honors?: string | string[];
  coursework?: string[];
}

export interface Skill {
  id?: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'certification';
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Project {
  id?: string;
  name: string;
  description: string[];
  technologies: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface VolunteerExperience {
  id?: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;
  endDate?: string;
  isCurrentRole: boolean;
  description: string;
  achievements: string[];
}

export interface Award {
  id?: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface Language {
  id?: string;
  name: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  date: string;
  expirationDate?: string;
  credentialId?: string;
  url?: string;
}

export interface AdditionalSection {
  title: string;
  content: string;
}

export interface Publication {
  id?: string;
  title: string;
  publisher: string;
  publicationDate: string;
  url?: string;
  description?: string;
}

export interface Reference {
  id?: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface Hobby {
  id?: string;
  name: string;
  description?: string;
  category: 'creative' | 'sports' | 'technology' | 'volunteer' | 'other';
}

export interface Resume {
  id?: string;
  _id?: string;
  title: string;
  template: string;
  templateId?: string;
  isPublic?: boolean;
  isLatexTemplate?: boolean;
  personalInfo: PersonalInfo;
  professionalSummary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects?: Project[];
  certifications?: Certification[];
  languages?: Language[];
  volunteerExperience?: VolunteerExperience[];
  awards?: Award[];
  publications?: Publication[];
  references?: Reference[];
  hobbies?: Hobby[];
  additionalSections?: AdditionalSection[];
  aiGenerated?: {
    summary: boolean;
    lastOptimized?: string;
    optimizedFor?: string;
    atsScore?: number;
    improvements?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export type ApplicationStatus = 
  | 'applied' 
  | 'under_review' 
  | 'phone_screen' 
  | 'interviewing'
  | 'technical_assessment' 
  | 'first_interview' 
  | 'second_interview' 
  | 'final_interview' 
  | 'offer_received'
  | 'offer_accepted' 
  | 'rejected' 
  | 'withdrawn'
  | 'pending';

export type ApplicationPriority = 'low' | 'medium' | 'high';

export interface JobInterview {
  id: string;
  type: string;
  date: string;
  interviewer: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface JobCommunication {
  id: string;
  type: 'email' | 'call' | 'message';
  date: string;
  subject: string;
  content: string;
}

export interface JobApplication {
  _id: string;
  id?: string;
  jobTitle: string;
  companyName: string;
  company?: string;
  location: string;
  jobUrl?: string;
  status: ApplicationStatus;
  priority?: ApplicationPriority;
  appliedDate: string;
  applicationDate?: Date | string;
  salary?: string;
  notes?: string;
  resumeId?: string;
  jobSource?: string;
  jobLocation?: {
    city?: string;
    state?: string;
    country?: string;
    remote?: boolean;
  };
  documentsUsed?: {
    resumeId?: string;
    trackingShareId?: string;
  };
  interviews?: JobInterview[];
  communications?: JobCommunication[];
  metrics?: {
    applicationScore?: number;
    successProbability?: number;
  };
  tags?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  categories: Record<string, {
    enabled: boolean;
    priority: 'low' | 'medium' | 'high';
    channels: string[];
  }>;
  channels: {
    email: boolean;
    inApp: boolean;
    browser: boolean;
    mobile: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface INotification {
  _id: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'deadline';
  category: 'authentication' | 'payment' | 'resume' | 'application' | 'interview' | 'cover_letter' | 'career_coach' | 'system';
  title: string;
  message: string;
  read: boolean;
  readAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action?: {
    label: string;
    url: string;
    type: 'internal' | 'external';
  };
  metadata?: {
    entityType?: 'resume' | 'application' | 'interview' | 'payment' | 'user';
    entityId?: string;
    source?: string;
    additionalData?: Record<string, any>;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}