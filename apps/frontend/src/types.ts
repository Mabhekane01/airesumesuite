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

export interface Resume {
  id?: string;
  _id?: string;
  title: string;
  template: string;
  templateId?: string;
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
  hobbies?: Array<{ id?: string; name: string; category?: string }>;
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

export interface JobApplication {
  _id: string;
  id?: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobUrl?: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn' | 'pending';
  appliedDate: string;
  applicationDate?: Date;
  salary?: string;
  notes?: string;
  resumeId?: string;
  jobSource?: string;
  jobLocation?: {
    country?: string;
    city?: string;
    remote?: boolean;
  };
  documentsUsed?: {
    resumeId?: string;
    trackingShareId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
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