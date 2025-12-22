import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkExperience {
  jobTitle: string;
  company: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  isCurrentJob: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: Date; // Made required to match frontend
  startDate?: Date;
  endDate?: Date;
  location?: string;
  gpa?: string;
  coursework?: string[]; // Optional relevant coursework as bullet points
}

export interface ISkill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'certification';
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface IVolunteerExperience {
  organization: string;
  role: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  isCurrentRole: boolean;
  description: string;
  achievements: string[];
}

export interface IAward {
  title: string;
  issuer: string;
  date: Date;
  description?: string;
}

export interface IPublication {
  title: string;
  publisher: string;
  publicationDate: Date;
  url?: string;
  description?: string;
}

export interface IReference {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface IHobby {
  name: string;
  description?: string;
  category: 'creative' | 'sports' | 'technology' | 'volunteer' | 'other';
}

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  personalInfo: {
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
  };
  professionalSummary: string;
  workExperience: IWorkExperience[];
  education: IEducation[];
  skills: ISkill[];
  certifications?: {
    name: string;
    issuer: string;
    date: Date;
    expirationDate?: Date;
    credentialId?: string;
    url?: string;
  }[];
  languages?: {
    name: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  }[];
  projects?: {
    name: string;
    description: string[]; // Changed to array for bullet points
    technologies: string[];
    url?: string;
    startDate?: Date;
    endDate?: Date;
  }[];
  volunteerExperience?: IVolunteerExperience[];
  awards?: IAward[];
  publications?: IPublication[];
  references?: IReference[];
  hobbies?: IHobby[];
  additionalSections?: {
    title: string;
    content: string;
  }[];
  templateId: string;
  isPublic: boolean;
  aiGenerated?: {
    summary: boolean;
    lastOptimized?: Date;
    optimizedFor?: string; // job title or company
    atsScore?: number;
    improvements?: string[];
    optimizedLatexCode?: string;
    lastJobOptimization?: {
      jobUrl: string;
      jobTitle: string;
      companyName: string;
      optimizedAt: Date;
    };
  };
  // PDF Storage for generated resumes
  generatedFiles?: {
    pdf?: {
      data: Buffer;
      filename: string;
      generatedAt: Date;
      templateId: string;
      isOptimized: boolean;
      jobOptimized?: {
        jobUrl: string;
        jobTitle: string;
        companyName: string;
      };
    };
    docx?: {
      data: Buffer;
      filename: string;
      generatedAt: Date;
    };
    lastGenerated?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorkExperienceSchema = new Schema<IWorkExperience>({
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isCurrentJob: { type: Boolean, default: false },
  responsibilities: [{ type: String }],
  achievements: [{ type: String }]
});

const EducationSchema = new Schema<IEducation>({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  fieldOfStudy: { type: String, required: true },
  graduationDate: { type: Date, required: true }, // Made required to match frontend
  startDate: { type: Date },
  endDate: { type: Date },
  location: { type: String },
  gpa: { type: String },
  coursework: [{ type: String }] // Optional relevant coursework as bullet points
});

const SkillSchema = new Schema<ISkill>({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['technical', 'soft', 'language', 'certification'],
    required: true
  },
  proficiencyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert']
  }
});

const VolunteerExperienceSchema = new Schema<IVolunteerExperience>({
  organization: { type: String, required: true },
  role: { type: String, required: true },
  location: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isCurrentRole: { type: Boolean, default: false },
  description: { type: String, required: true },
  achievements: [{ type: String }]
});

const AwardSchema = new Schema<IAward>({
  title: { type: String, required: true },
  issuer: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String }
});

const PublicationSchema = new Schema<IPublication>({
  title: { type: String, required: true },
  publisher: { type: String, required: true },
  publicationDate: { type: Date, required: true },
  url: { type: String },
  description: { type: String }
});

const ReferenceSchema = new Schema<IReference>({
  name: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  relationship: { type: String, required: true }
});

const HobbySchema = new Schema<IHobby>({
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['creative', 'sports', 'technology', 'volunteer', 'other'],
    required: true
  }
});

const ResumeSchema = new Schema<IResume>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    linkedinUrl: { type: String },
    portfolioUrl: { type: String },
    githubUrl: { type: String },
    websiteUrl: { type: String },
    professionalTitle: { type: String }
  },
  professionalSummary: {
    type: String,
    required: true
  },
  workExperience: [WorkExperienceSchema],
  education: [EducationSchema],
  skills: [SkillSchema],
  certifications: [{
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    date: { type: Date, required: true },
    expirationDate: { type: Date },
    credentialId: { type: String },
    url: { type: String },
    description: { type: String }
  }],
  languages: [{
    name: { type: String, required: true },
    proficiency: {
      type: String,
      enum: ['native', 'fluent', 'conversational', 'basic'],
      required: true
    }
  }],
  projects: [{
    name: { type: String, required: true },
    description: [{ type: String }], // Changed to array for bullet points
    technologies: [{ type: String }],
    url: { type: String },
    startDate: { type: Date },
    endDate: { type: Date }
  }],
  volunteerExperience: [VolunteerExperienceSchema],
  awards: [AwardSchema],
  publications: [PublicationSchema],
  references: [ReferenceSchema],
  hobbies: [HobbySchema],
  additionalSections: [{
    title: { type: String, required: true },
    content: { type: String, required: true }
  }],
  templateId: {
    type: String,
    required: true,
    default: 'modern-1'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  aiGenerated: {
    summary: { type: Boolean, default: false },
    lastOptimized: { type: Date },
    optimizedFor: { type: String },
    atsScore: { type: Number, min: 0, max: 100 },
    improvements: [{ type: String }],
    optimizedLatexCode: { type: String },
    lastJobOptimization: {
      jobUrl: { type: String },
      jobTitle: { type: String },
      companyName: { type: String },
      optimizedAt: { type: Date }
    }
  },
  // PDF Storage schema
  generatedFiles: {
    pdf: {
      data: { type: Buffer },
      filename: { type: String },
      generatedAt: { type: Date },
      templateId: { type: String },
      isOptimized: { type: Boolean, default: false },
      jobOptimized: {
        jobUrl: { type: String },
        jobTitle: { type: String },
        companyName: { type: String }
      }
    },
    docx: {
      data: { type: Buffer },
      filename: { type: String },
      generatedAt: { type: Date }
    },
    lastGenerated: { type: Date }
  }
}, {
  timestamps: true
});

ResumeSchema.index({ userId: 1 });
ResumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.model<IResume>('Resume', ResumeSchema);