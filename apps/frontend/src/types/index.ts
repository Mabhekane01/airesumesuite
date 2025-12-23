export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
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
  coursework?: string[]; // Optional relevant coursework as bullet points
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
  description: string[]; // Changed to array for bullet points
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

export interface Publication {
  title: string;
  publisher: string;
  publicationDate: string;
  url?: string;
  description?: string;
}

export interface Reference {
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
  template: string;
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

// Job Application Types

export interface JobApplication {

  id?: string;

  jobTitle: string;

  companyName: string;

  location: string;

  jobUrl?: string;

  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';

  appliedDate: string;

  salary?: string;

  notes?: string;

  resumeId?: string;

  createdAt?: string;

  updatedAt?: string;

}
