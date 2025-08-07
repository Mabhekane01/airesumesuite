import fs from "fs/promises";
import path from "path";
import {
  aiContentEnhancer,
  type ResumeData as AIResumeData,
} from "./aiContentEnhancer"; // Assuming this path is correct

// --- Interface Definition ---
export interface StandardizedResumeData {
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
  workExperience: Array<{
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    isCurrentJob: boolean;
    responsibilities: string[];
    achievements: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    location?: string;
    graduationDate: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills: Array<{
    name: string;
    category: string;
    proficiencyLevel?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expirationDate?: string;
    url?: string;
  }>;
  languages?: Array<{
    name: string;
    proficiency: string;
  }>;
  volunteerExperience?: Array<{
    organization: string;
    role: string;
    location: string;
    startDate: string;
    endDate?: string;
    isCurrentRole: boolean;
    description: string;
    achievements: string[];
  }>;
  awards?: Array<{
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  publications?: Array<{
    title: string;
    publisher: string;
    publicationDate: string;
    url?: string;
    description?: string;
  }>;
  references?: Array<{
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  hobbies?: Array<{
    name: string;
    description?: string;
    category: string;
  }>;
  additionalSections?: Array<{
    title: string;
    content: string;
  }>;
}

// --- Service Class Definition ---
export class StandardizedTemplateService {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(
      process.cwd(),
      "..",
      "frontend",
      "public",
      "templates"
    );
  }

  /**
   * Main method: Generate LaTeX from standardized template
   */
  async generateLatex(
    templateId: string,
    resumeData: StandardizedResumeData,
    options: {
      enhanceWithAI?: boolean;
      jobDescription?: string;
      customTemplateCode?: string;
    } = {}
  ): Promise<string> {
    console.log(
      `🎯 Generating LaTeX with standardized template: ${templateId}`
    );
    try {
      // Step 1: Validate input data
      this.validateResumeData(resumeData);

      // Step 2: Use provided template code or load from file
      const templateCode =
        options.customTemplateCode || (await this.loadTemplate(templateId));

      // Step 3: Enhance content with AI (optional)
      const enhancedData = options.enhanceWithAI
        ? await this.enhanceContent(resumeData, options.jobDescription)
        : resumeData;

      // Step 4: Render template with data
      const result = await this.renderTemplate(templateCode, enhancedData);

      console.log(
        `✅ LaTeX generated successfully (${result.length} characters)`
      );
      return result;
    } catch (error) {
      console.error(`❌ Standardized template generation failed:`, error);
      // Provide a more informative error message without exposing internal details
      throw new Error(
        `Failed to generate LaTeX resume. Please check your data and try again.`
      );
    }
  }

  /**
   * Validate resume data to prevent LaTeX errors
   */
  private validateResumeData(data: StandardizedResumeData): void {
    // Ensure required fields are present
    if (!data.personalInfo?.firstName || !data.personalInfo?.lastName) {
      throw new Error("First name and last name are required");
    }
    if (!data.personalInfo?.email) {
      throw new Error("Email is required");
    }

    // Ensure arrays are properly initialized (defensive programming)
    data.workExperience = Array.isArray(data.workExperience)
      ? data.workExperience
      : [];
    data.education = Array.isArray(data.education) ? data.education : [];
    data.skills = Array.isArray(data.skills) ? data.skills : [];
    data.projects = Array.isArray(data.projects) ? data.projects : [];
    data.certifications = Array.isArray(data.certifications)
      ? data.certifications
      : [];
    data.languages = Array.isArray(data.languages) ? data.languages : [];
    data.volunteerExperience = Array.isArray(data.volunteerExperience)
      ? data.volunteerExperience
      : [];
    data.awards = Array.isArray(data.awards) ? data.awards : [];
    data.publications = Array.isArray(data.publications)
      ? data.publications
      : [];
    data.references = Array.isArray(data.references) ? data.references : [];
    data.hobbies = Array.isArray(data.hobbies) ? data.hobbies : [];
    data.additionalSections = Array.isArray(data.additionalSections)
      ? data.additionalSections
      : [];

    // Ensure professional summary exists
    if (!data.professionalSummary) {
      data.professionalSummary = "Professional seeking new opportunities.";
    }
  }

  /**
   * Load template from file system - prioritizes standardized templates
   */
  private async loadTemplate(templateId: string): Promise<string> {
    // Handle special case for template21 which has a space in directory name
    const directoryName =
      templateId === "template21" ? "template 21" : templateId;

    // First try to load standardized template
    const standardizedPath = path.join(
      this.templatesPath,
      directoryName,
      `${templateId}-standardized.tex`
    );

    try {
      const template = await fs.readFile(standardizedPath, "utf8");
      console.log(`✅ Loaded standardized template: ${templateId}`);
      return template;
    } catch (error) {
      console.log(
        `⚠️ No standardized template found for ${templateId}, falling back to templatecode.txt`
      );

      // Fallback to original template file
      const originalPath = path.join(
        this.templatesPath,
        directoryName,
        "templatecode.txt"
      );

      try {
        const template = await fs.readFile(originalPath, "utf8");
        console.log(`✅ Loaded original template: ${templateId}`);
        return template;
      } catch (fallbackError) {
        throw new Error(
          `Template ${templateId} not found - neither standardized nor original version exists`
        );
      }
    }
  }

  /**
   * Enhanced content enhancement with error handling
   */
  private async enhanceContent(
    resumeData: StandardizedResumeData,
    jobDescription?: string
  ): Promise<StandardizedResumeData> {
    console.log("🤖 Enhancing content with new AI Content Enhancer...");
    try {
      // Convert to AI enhancer format (defensive copy)
      const aiResumeData: AIResumeData = {
        personalInfo: { ...resumeData.personalInfo },
        professionalSummary: resumeData.professionalSummary || "",
        workExperience: [...(resumeData.workExperience || [])],
        education: [...(resumeData.education || [])],
        skills: [...(resumeData.skills || [])],
        projects: [...(resumeData.projects || [])],
        certifications: [...(resumeData.certifications || [])],
        languages: [...(resumeData.languages || [])],
        volunteerExperience: [...(resumeData.volunteerExperience || [])],
        awards: [...(resumeData.awards || [])],
        publications: [...(resumeData.publications || [])],
        references: [...(resumeData.references || [])],
        hobbies: [...(resumeData.hobbies || [])],
        additionalSections: [...(resumeData.additionalSections || [])],
      };

      // Use the new AI content enhancer
      const enhancementResult = jobDescription
        ? await aiContentEnhancer.optimizeForJob(aiResumeData, jobDescription)
        : await aiContentEnhancer.enhanceResumeContent(aiResumeData);

      console.log(
        `✅ Content enhanced with AI. ATS Score: ${enhancementResult.atsScore}%`
      );
      console.log(
        `🔧 Improvements made: ${enhancementResult.improvements.join(", ")}`
      );
      if (enhancementResult.keywordsAdded?.length > 0) {
        console.log(
          `🎯 Keywords added: ${enhancementResult.keywordsAdded.join(", ")}`
        );
      }

      // Convert back to StandardizedResumeData format (defensive copy)
      return {
        personalInfo: { ...enhancementResult.enhancedContent.personalInfo },
        professionalSummary:
          enhancementResult.enhancedContent.professionalSummary,
        workExperience: [...enhancementResult.enhancedContent.workExperience],
        education: [...enhancementResult.enhancedContent.education],
        skills: [...enhancementResult.enhancedContent.skills],
        projects: [...enhancementResult.enhancedContent.projects],
        certifications: [...enhancementResult.enhancedContent.certifications],
        languages: [...enhancementResult.enhancedContent.languages],
        volunteerExperience: [
          ...enhancementResult.enhancedContent.volunteerExperience,
        ],
        awards: [...enhancementResult.enhancedContent.awards],
        publications: [...enhancementResult.enhancedContent.publications],
        references: [...enhancementResult.enhancedContent.references],
        hobbies: [...enhancementResult.enhancedContent.hobbies],
        additionalSections: [
          ...enhancementResult.enhancedContent.additionalSections,
        ],
      };
    } catch (error) {
      console.warn(
        "⚠️ AI content enhancement failed, using original content:",
        error
      );
      return resumeData; // Return original data on AI failure
    }
  }

  /**
   * Enhanced template rendering with better error handling
   */
  private async renderTemplate(
    template: string,
    data: StandardizedResumeData
  ): Promise<string> {
    let result = template;
    try {
      // Personal Information (always present)
      result = this.injectPersonalInfo(result, data.personalInfo);

      // Professional Summary (always present)
      result = result.replace(
        /\{\{PROFESSIONAL_SUMMARY\}\}/g,
        this.escapeLatex(
          data.professionalSummary || "Professional seeking new opportunities."
        )
      );

      // Check if template uses handlebars-style loops and process accordingly
      if (this.hasHandlebarsLoops(result)) {
        console.log(
          "🔄 Template uses handlebars-style loops, processing with handlebars renderer"
        );
        result = this.renderHandlebarsTemplate(result, data);
      } else {
        console.log(
          "📝 Template uses simple placeholders, processing with standard renderer"
        );
        // Conditional sections - with enhanced error handling
        result = this.injectConditionalSection(
          result,
          "WORK_EXPERIENCE",
          data.workExperience,
          this.renderWorkExperience
        );
        result = this.injectConditionalSection(
          result,
          "EDUCATION",
          data.education,
          this.renderEducation
        );
        result = this.injectConditionalSection(
          result,
          "SKILLS",
          data.skills,
          this.renderSkills
        );
        result = this.injectConditionalSection(
          result,
          "PROJECTS",
          data.projects,
          this.renderProjects
        );
        result = this.injectConditionalSection(
          result,
          "CERTIFICATIONS",
          data.certifications,
          this.renderCertifications
        );
        result = this.injectConditionalSection(
          result,
          "LANGUAGES",
          data.languages,
          this.renderLanguages
        );
        result = this.injectConditionalSection(
          result,
          "VOLUNTEER_EXPERIENCE",
          data.volunteerExperience,
          this.renderVolunteerExperience
        );
        result = this.injectConditionalSection(
          result,
          "AWARDS",
          data.awards,
          this.renderAwards
        );
        result = this.injectConditionalSection(
          result,
          "PUBLICATIONS",
          data.publications,
          this.renderPublications
        );
        result = this.injectConditionalSection(
          result,
          "REFERENCES",
          data.references,
          this.renderReferences
        );
        result = this.injectConditionalSection(
          result,
          "HOBBIES",
          data.hobbies,
          this.renderHobbies
        );
        result = this.injectConditionalSection(
          result,
          "ADDITIONAL_SECTIONS",
          data.additionalSections,
          this.renderAdditionalSections
        );
      }

      // Handle single TEMPLATE_CONTENT placeholder (some templates use this instead of individual placeholders)
      if (result.includes('{{TEMPLATE_CONTENT}}')) {
        console.log('📋 Processing {{TEMPLATE_CONTENT}} placeholder...');
        const content = this.generateFullResumeContent(data);
        result = result.replace(/\{\{TEMPLATE_CONTENT\}\}/g, content);
      }

      // CRITICAL: Clean up any remaining unprocessed placeholders
      result = this.cleanupRemainingPlaceholders(result);

      // Final validation
      this.validateLatexOutput(result);

      return result;
    } catch (error) {
      console.error("❌ Template rendering failed:", error);
      throw new Error(`Template rendering failed. Please check your data.`);
    }
  }

  /**
   * Generate full resume content for TEMPLATE_CONTENT placeholder
   */
  private generateFullResumeContent(data: StandardizedResumeData): string {
    console.log('🔍 Generating full resume content with sections:', {
      languages: data.languages?.length || 0,
      hobbies: data.hobbies?.length || 0,
      volunteerExperience: data.volunteerExperience?.length || 0,
      awards: data.awards?.length || 0,
      publications: data.publications?.length || 0,
      references: data.references?.length || 0,
      additionalSections: data.additionalSections?.length || 0,
      certifications: data.certifications?.length || 0,
      workExperience: data.workExperience?.length || 0,
      education: data.education?.length || 0,
      skills: data.skills?.length || 0,
      projects: data.projects?.length || 0
    });
    
    const sections: string[] = [];

    // Personal Information Header - using the template's custom commands
    const name = `${data.personalInfo.firstName} ${data.personalInfo.lastName}`;
    const email = data.personalInfo.email;
    const phone = data.personalInfo.phone;
    const website = data.personalInfo.websiteUrl || data.personalInfo.portfolioUrl || '';
    const github = data.personalInfo.githubUrl || '';
    
    sections.push(`\\NameEmailPhoneSiteGithub{${this.escapeLatex(name)}}{${this.escapeLatex(email)}}{${this.escapeLatex(phone)}}{${this.escapeLatex(website)}}{${this.escapeLatex(github)}}`);
    sections.push('\\sepspace');

    // Professional Summary
    if (data.professionalSummary) {
      sections.push(`\\NewPart{Professional Summary}`);
      sections.push(this.escapeLatex(data.professionalSummary));
      sections.push('\\sepspace');
    }

    // Work Experience
    if (data.workExperience && data.workExperience.length > 0) {
      sections.push(`\\NewPart{Work Experience}`);
      data.workExperience.forEach(exp => {
        const endDate = exp.endDate || 'Present';
        sections.push(`\\textbf{${this.escapeLatex(exp.jobTitle)}} \\hfill ${this.escapeLatex(exp.startDate)} - ${this.escapeLatex(endDate)}`);
        sections.push(`\\textit{${this.escapeLatex(exp.company)}} \\hfill ${this.escapeLatex(exp.location)}`);
        
        if (exp.achievements && exp.achievements.length > 0) {
          sections.push('\\begin{itemize}');
          exp.achievements.forEach(achievement => {
            sections.push(`\\item ${this.escapeLatex(achievement)}`);
          });
          sections.push('\\end{itemize}');
        }
        sections.push('\\sepspace');
      });
    }

    // Education
    if (data.education && data.education.length > 0) {
      sections.push(`\\NewPart{Education}`);
      data.education.forEach(edu => {
        sections.push(`\\textbf{${this.escapeLatex(edu.degree)}} \\hfill ${this.escapeLatex(edu.graduationDate)}`);
        sections.push(`\\textit{${this.escapeLatex(edu.institution)}} ${edu.location ? `\\hfill ${this.escapeLatex(edu.location)}` : ''}`);
        if (edu.gpa) {
          sections.push(`GPA: ${this.escapeLatex(edu.gpa)}`);
        }
        sections.push('\\sepspace');
      });
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      sections.push(`\\NewPart{Skills}`);
      const skillsByCategory = data.skills.reduce((acc, skill) => {
        const category = skill.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(skill.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        sections.push(`\\SkillsEntry{${this.escapeLatex(category)}}{${this.escapeLatex(skills.join(', '))}}`);
      });
      sections.push('\\sepspace');
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      sections.push(`\\NewPart{Projects}`);
      data.projects.forEach(project => {
        sections.push(`\\textbf{${this.escapeLatex(project.name)}} ${project.url ? `\\hfill \\url{${this.escapeLatex(project.url)}}` : ''}`);
        sections.push(this.escapeLatex(project.description));
        if (project.technologies && project.technologies.length > 0) {
          sections.push(`\\textit{Technologies: ${this.escapeLatex(project.technologies.join(', '))}}`);
        }
        sections.push('\\sepspace');
      });
    }

    // Certifications
    if (data.certifications && data.certifications.length > 0) {
      sections.push(`\\NewPart{Certifications}`);
      data.certifications.forEach(cert => {
        sections.push(`\\textbf{${this.escapeLatex(cert.name)}} \\hfill ${this.escapeLatex(cert.date)}`);
        sections.push(`\\textit{${this.escapeLatex(cert.issuer)}}`);
        if (cert.expirationDate) {
          sections.push(`\\textit{Expires: ${this.escapeLatex(cert.expirationDate)}}`);
        }
        sections.push('\\sepspace');
      });
    }

    // Languages
    if (data.languages && data.languages.length > 0) {
      sections.push(`\\NewPart{Languages}`);
      data.languages.forEach(lang => {
        sections.push(`\\textbf{${this.escapeLatex(lang.name)}} \\hfill ${this.escapeLatex(lang.proficiency)}`);
      });
      sections.push('\\sepspace');
    }

    // Volunteer Experience
    if (data.volunteerExperience && data.volunteerExperience.length > 0) {
      sections.push(`\\NewPart{Volunteer Experience}`);
      data.volunteerExperience.forEach(vol => {
        const endDate = vol.endDate || 'Present';
        sections.push(`\\textbf{${this.escapeLatex(vol.role)}} \\hfill ${this.escapeLatex(vol.startDate)} - ${this.escapeLatex(endDate)}`);
        sections.push(`\\textit{${this.escapeLatex(vol.organization)}} \\hfill ${this.escapeLatex(vol.location)}`);
        sections.push(this.escapeLatex(vol.description));
        
        if (vol.achievements && vol.achievements.length > 0) {
          sections.push('\\begin{itemize}');
          vol.achievements.forEach(achievement => {
            sections.push(`\\item ${this.escapeLatex(achievement)}`);
          });
          sections.push('\\end{itemize}');
        }
        sections.push('\\sepspace');
      });
    }

    // Awards
    if (data.awards && data.awards.length > 0) {
      sections.push(`\\NewPart{Awards \\& Honors}`);
      data.awards.forEach(award => {
        sections.push(`\\textbf{${this.escapeLatex(award.title)}} \\hfill ${this.escapeLatex(award.date)}`);
        sections.push(`\\textit{${this.escapeLatex(award.issuer)}}`);
        if (award.description) {
          sections.push(this.escapeLatex(award.description));
        }
        sections.push('\\sepspace');
      });
    }

    // Publications
    if (data.publications && data.publications.length > 0) {
      sections.push(`\\NewPart{Publications}`);
      data.publications.forEach(pub => {
        sections.push(`\\textbf{${this.escapeLatex(pub.title)}} \\hfill ${this.escapeLatex(pub.publicationDate)}`);
        sections.push(`\\textit{${this.escapeLatex(pub.publisher)}}`);
        if (pub.url) {
          sections.push(`\\url{${this.escapeLatex(pub.url)}}`);
        }
        if (pub.description) {
          sections.push(this.escapeLatex(pub.description));
        }
        sections.push('\\sepspace');
      });
    }

    // Hobbies
    if (data.hobbies && data.hobbies.length > 0) {
      sections.push(`\\NewPart{Interests \\& Hobbies}`);
      const hobbiesByCategory = data.hobbies.reduce((acc, hobby) => {
        const category = hobby.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(hobby.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(hobbiesByCategory).forEach(([category, hobbies]) => {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        sections.push(`\\SkillsEntry{${this.escapeLatex(categoryName)}}{${this.escapeLatex(hobbies.join(', '))}}`);
      });
      sections.push('\\sepspace');
    }

    // References
    if (data.references && data.references.length > 0) {
      sections.push(`\\NewPart{References}`);
      data.references.forEach(ref => {
        sections.push(`\\textbf{${this.escapeLatex(ref.name)}} - ${this.escapeLatex(ref.title)}`);
        sections.push(`\\textit{${this.escapeLatex(ref.company)}}`);
        sections.push(`${this.escapeLatex(ref.email)} $\\bullet$ ${this.escapeLatex(ref.phone)}`);
        sections.push(`\\textit{Relationship: ${this.escapeLatex(ref.relationship)}}`);
        sections.push('\\sepspace');
      });
    } else {
      // Add standard references available upon request
      sections.push(`\\NewPart{References}`);
      sections.push('References available upon request.');
      sections.push('\\sepspace');
    }

    // Additional Sections
    if (data.additionalSections && data.additionalSections.length > 0) {
      data.additionalSections.forEach(section => {
        sections.push(`\\NewPart{${this.escapeLatex(section.title)}}`);
        sections.push(this.escapeLatex(section.content));
        sections.push('\\sepspace');
      });
    }

    return sections.join('\n');
  }

  /**
   * Check if template uses handlebars-style loops
   */
  private hasHandlebarsLoops(template: string): boolean {
    const handlebarsPatterns = [
      /\{\{#WORK_EXPERIENCE\}\}/,
      /\{\{#EDUCATION\}\}/,
      /\{\{#SKILLS\}\}/,
      /\{\{#PROJECTS\}\}/,
      /\{\{#CERTIFICATIONS\}\}/,
      /\{\{#LANGUAGES\}\}/,
      /\{\{#VOLUNTEER_EXPERIENCE\}\}/,
      /\{\{#AWARDS\}\}/,
      /\{\{#PUBLICATIONS\}\}/,
      /\{\{#REFERENCES\}\}/,
      /\{\{#HOBBIES\}\}/,
    ];
    return handlebarsPatterns.some((pattern) => pattern.test(template));
  }

  /**
   * Render template with handlebars-style loops
   * This is the core logic for processing complex templates
   */
  private renderHandlebarsTemplate(
    template: string,
    data: StandardizedResumeData
  ): string {
    let result = template;

    // Process work experience handlebars loops
    result = this.processHandlebarsSection(
      result,
      "WORK_EXPERIENCE",
      data.workExperience,
      (exp) => {
        const endDate = exp.isCurrentJob ? "Present" : exp.endDate || "";
        const responsibilities = (exp.responsibilities || [])
          .map((r) => `\\item ${this.escapeLatex(r)}`)
          .join("\n  ");
        const achievements = (exp.achievements || [])
          .map((a) => `\\item \\textit{${this.escapeLatex(a)}}`)
          .join("\n  "); // Italicize achievements
        let itemsContent = "";
        if (responsibilities || achievements) {
          itemsContent = `\\begin{itemize}\n  ${responsibilities}${responsibilities && achievements ? "\n  " : ""}${achievements}\n\\end{itemize}`;
        }
        return {
          jobTitle: this.escapeLatex(exp.jobTitle || ""),
          company: this.escapeLatex(exp.company || ""),
          location: this.escapeLatex(exp.location || ""),
          startDate: this.escapeLatex(exp.startDate || ""),
          endDate: this.escapeLatex(endDate),
          isCurrentJob: exp.isCurrentJob,
          responsibilities: exp.responsibilities || [],
          achievements: exp.achievements || [],
          itemsContent,
        };
      }
    );

    // Process education handlebars loops
    result = this.processHandlebarsSection(
      result,
      "EDUCATION",
      data.education,
      (edu) => {
        return {
          degree: this.escapeLatex(edu.degree || ""),
          institution: this.escapeLatex(edu.institution || ""),
          fieldOfStudy: edu.fieldOfStudy
            ? this.escapeLatex(edu.fieldOfStudy)
            : "",
          location: edu.location ? this.escapeLatex(edu.location) : "",
          startDate: this.escapeLatex(edu.graduationDate || ""), // Note: using graduationDate as startDate for compatibility
          endDate: this.escapeLatex(edu.graduationDate || ""),
          gpa: edu.gpa ? this.escapeLatex(edu.gpa) : "",
          honors: edu.honors || [],
          courses: [], // Add courses if needed in future
        };
      }
    );

    // Process skills handlebars loops
    result = this.processHandlebarsSection(
      result,
      "SKILLS",
      data.skills,
      (skill) => {
        return {
          name: this.escapeLatex(skill.name || ""),
          category: this.escapeLatex(skill.category || ""),
          proficiencyLevel: skill.proficiencyLevel
            ? this.escapeLatex(skill.proficiencyLevel)
            : "",
        };
      }
    );

    // Process languages handlebars loops
    result = this.processHandlebarsSection(
      result,
      "LANGUAGES",
      data.languages,
      (lang) => {
        return {
          name: this.escapeLatex(lang.name || ""),
          proficiency: this.escapeLatex(lang.proficiency || ""),
        };
      }
    );

    // Process projects handlebars loops
    result = this.processHandlebarsSection(
      result,
      "PROJECTS",
      data.projects,
      (project) => {
        return {
          name: this.escapeLatex(project.name || ""),
          description: this.escapeLatex(project.description || ""),
          technologies: project.technologies || [],
          url: project.url || "",
          startDate: project.startDate || "",
          endDate: project.endDate || "",
        };
      }
    );

    // Process certifications handlebars loops
    result = this.processHandlebarsSection(
      result,
      "CERTIFICATIONS",
      data.certifications,
      (cert) => {
        return {
          name: this.escapeLatex(cert.name || ""),
          issuer: this.escapeLatex(cert.issuer || ""),
          date: this.escapeLatex(cert.date || ""),
          expirationDate: cert.expirationDate || "",
          credentialId: cert.url || "", // Using url as credentialId for compatibility
          url: cert.url || "",
        };
      }
    );

    // Process volunteer experience handlebars loops
    result = this.processHandlebarsSection(
      result,
      "VOLUNTEER_EXPERIENCE",
      data.volunteerExperience,
      (vol) => {
        const endDate = vol.isCurrentRole ? "Present" : vol.endDate || "";
        const achievements = (vol.achievements || [])
          .map((a) => `\\item ${this.escapeLatex(a)}`)
          .join("\n  ");
        const achievementsList = achievements
          ? `\\begin{itemize}\n  ${achievements}\n\\end{itemize}`
          : "";
        return {
          organization: this.escapeLatex(vol.organization || ""),
          role: this.escapeLatex(vol.role || ""),
          location: this.escapeLatex(vol.location || ""),
          startDate: this.escapeLatex(vol.startDate || ""),
          endDate: this.escapeLatex(endDate),
          isCurrentRole: vol.isCurrentRole,
          description: this.escapeLatex(vol.description || ""),
          achievements: vol.achievements || [],
          achievementsList, // Pre-rendered achievements list
        };
      }
    );

    // Process awards handlebars loops
    result = this.processHandlebarsSection(
      result,
      "AWARDS",
      data.awards,
      (award) => {
        return {
          title: this.escapeLatex(award.title || ""),
          issuer: this.escapeLatex(award.issuer || ""),
          date: this.escapeLatex(award.date || ""),
          description: award.description
            ? this.escapeLatex(award.description)
            : "",
        };
      }
    );

    // Process publications handlebars loops
    result = this.processHandlebarsSection(
      result,
      "PUBLICATIONS",
      data.publications,
      (pub) => {
        return {
          title: this.escapeLatex(pub.title || ""),
          publisher: this.escapeLatex(pub.publisher || ""),
          publicationDate: this.escapeLatex(pub.publicationDate || ""),
          url: pub.url || "",
          description: pub.description ? this.escapeLatex(pub.description) : "",
        };
      }
    );

    // Process references handlebars loops
    result = this.processHandlebarsSection(
      result,
      "REFERENCES",
      data.references,
      (ref) => {
        return {
          name: this.escapeLatex(ref.name || ""),
          title: this.escapeLatex(ref.title || ""),
          company: this.escapeLatex(ref.company || ""),
          email: this.escapeLatex(ref.email || ""),
          phone: this.escapeLatex(ref.phone || ""),
          relationship: this.escapeLatex(ref.relationship || ""),
        };
      }
    );

    // Process hobbies handlebars loops
    result = this.processHandlebarsSection(
      result,
      "HOBBIES",
      data.hobbies,
      (hobby) => {
        return {
          name: this.escapeLatex(hobby.name || ""),
          description: hobby.description
            ? this.escapeLatex(hobby.description)
            : "",
          category: this.escapeLatex(hobby.category || ""),
        };
      }
    );

    return result;
  }

  /**
   * Process a handlebars section with loop support
   * This is the core engine for handling {{#SECTION}}...{{/SECTION}} blocks
   */
  private processHandlebarsSection<T>(
    template: string,
    sectionName: string,
    data: T[] | undefined,
    transformer: (item: T) => Record<string, any> // Return a record for easier placeholder replacement
  ): string {
    if (!data || data.length === 0) {
      // Remove the entire conditional section if no data
      const sectionRegex = new RegExp(
        `\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`,
        "g"
      );
      return template.replace(sectionRegex, "");
    }

    // Find and process the handlebars loop
    const loopRegex = new RegExp(
      `\\{\\{#${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/${sectionName}\\}\\}`,
      "g"
    );
    return template.replace(loopRegex, (match, loopContent) => {
      return data
        .map((item) => {
          const transformedItem = transformer(item);
          let renderedItem = loopContent;

          // --- 1. Handle array fields (e.g., {{#responsibilities}}...{{/responsibilities}}) ---
          Object.entries(transformedItem).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              // Handle array fields like responsibilities, achievements, technologies, honors
              const arrayRegex = new RegExp(
                `\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`,
                "g"
              );
              renderedItem = renderedItem.replace(
                arrayRegex,
                (arrayMatch, arrayContent) => {
                  // If the array is empty, remove the block entirely
                  if (value.length === 0) {
                    return "";
                  }
                  return value
                    .map((arrayItem) => {
                      // Handle {{.}} for current item in iteration
                      // Also handle simple placeholders like {{this}} if used
                      let processedArrayItemContent = arrayContent
                        .replace(
                          /\{\{\.\}\}/g,
                          this.escapeLatex(String(arrayItem))
                        )
                        .replace(
                          /\{\{this\}\}/g,
                          this.escapeLatex(String(arrayItem))
                        );
                      return processedArrayItemContent;
                    })
                    .join("\n"); // Join array items with newlines
                }
              );
            }
            // Simple field replacements are handled later
          });

          // --- 2. Handle conditional fields like {{#if isCurrentJob}}...{{/if}} ---
          renderedItem = renderedItem.replace(
            /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
            (m, fieldName, content) => {
              const fieldValue = transformedItem[fieldName];
              // If field is truthy (and not false/0/""), include the content
              if (fieldValue) {
                return content;
              }
              // Otherwise, remove the block
              return "";
            }
          );

          // --- 3. Handle {{#unless fieldName}}...{{/unless}} ---
          renderedItem = renderedItem.replace(
            /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
            (m, fieldName, content) => {
              const fieldValue = transformedItem[fieldName];
              // If field is falsy, include the content
              if (!fieldValue) {
                return content;
              }
              // Otherwise, remove the block
              return "";
            }
          );

          // --- 4. Handle {{#fieldName}}...{{/fieldName}} for optional content ---
          // If the field has a value, replace the block content with the content inside.
          // If not, remove the block entirely.
          renderedItem = renderedItem.replace(
            /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
            (m, fieldName, content) => {
              const fieldValue = transformedItem[fieldName];
              // If field exists and is not empty/falsy, return the content inside the block
              if (
                fieldValue !== undefined &&
                fieldValue !== null &&
                fieldValue !== ""
              ) {
                // Replace the placeholder inside the block content if it matches the field name
                return content.replace(
                  new RegExp(`\\{\\{${fieldName}\\}\\}`, "g"),
                  String(fieldValue)
                );
              }
              // Otherwise, remove the block
              return "";
            }
          );

          // --- 5. Handle simple field replacements (e.g., {{jobTitle}}, {{company}}) ---
          Object.entries(transformedItem).forEach(([key, value]) => {
            // Only replace simple fields, not arrays (already handled) or complex objects
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              const fieldRegex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
              renderedItem = renderedItem.replace(fieldRegex, String(value));
            }
          });

          return renderedItem;
        })
        .join("\n"); // Join individual items with a newline
    });
  }

  /**
   * Validate LaTeX output for common errors (basic checks)
   */
  private validateLatexOutput(latex: string): void {
    // Check for remaining placeholders (this should ideally be empty after cleanup)
    const remainingPlaceholders = latex.match(/\{\{[^}]+\}\}/g);
    if (remainingPlaceholders) {
      console.warn("⚠️ Found unprocessed placeholders:", remainingPlaceholders);
      // In production, you might want to throw an error or log this more prominently
    }

    // Check for unmatched braces (very basic check)
    const openBraces = (latex.match(/\{/g) || []).length;
    const closeBraces = (latex.match(/\}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 5) {
      // Allow small discrepancies due to complex templates
      console.warn(
        `⚠️ Potential unmatched braces detected: ${openBraces} open, ${closeBraces} close`
      );
    }
  }

  /**
   * Enhanced placeholder cleanup - more robust and iterative
   */
  private cleanupRemainingPlaceholders(template: string): string {
    console.log("🧹 Cleaning up remaining placeholders...");
    let result = template;
    let iterations = 0;
    const maxIterations = 15; // Increased iterations for complex templates

    while (iterations < maxIterations) {
      const originalLength = result.length;

      // 1. Remove complex conditional blocks first (these can contain problematic characters)
      result = result.replace(
        /\{\{#IF_[^}]+\}\}[\s\S]*?\{\{\/IF_[^}]+\}\}/g,
        ""
      );

      // 2. Remove remaining simple placeholders
      result = result.replace(/\{\{[^}]+\}\}/g, "");

      // 3. Remove empty lines that might have been left, but be careful not to remove intentional spacing
      // Only collapse multiple consecutive newlines, not single ones
      result = result.replace(/\n{3,}/g, "\n\n"); // Reduce excessive newlines

      // If no changes made, break
      if (result.length === originalLength) {
        break;
      }
      iterations++;
    }

    const removedCount = (template.match(/\{\{[^}]+\}\}/g) || []).length;
    if (removedCount > 0) {
      console.log(
        `🧹 Removed ${removedCount} unprocessed placeholders in ${iterations} iterations`
      );
    }

    return result;
  }

  /**
   * Enhanced personal info injection with better validation
   */
  private injectPersonalInfo(template: string, personalInfo: any): string {
    let result = template;
    if (!personalInfo) {
        // Clean up all possible personal info placeholders if no data is provided
        result = result.replace(/\{\{\{?PERSONAL_INFO\.\w+\}?}\}\}/g, '');
        result = result.replace(/\{\{[A-Z_]+\}\}/g, '');
        return result;
    }

    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    const phone = personalInfo.phone || '';
    const email = personalInfo.email || '';
    const portfolioUrl = personalInfo.portfolioUrl ? `\\href{${personalInfo.portfolioUrl}}{${personalInfo.portfolioUrl}}` : '';
    const githubUrl = personalInfo.githubUrl ? `\\href{${personalInfo.githubUrl}}{${personalInfo.githubUrl}}` : '';

    // This regex is designed to find the \NameEmailPhoneSiteGithub command and its placeholders
    const commandRegex = /\\NameEmailPhoneSiteGithub\{[^\{\}]*\}\{[^\{\}]*\}\{[^\{\}]*\}\{[^\{\}]*\}\{[^\{\}]*\}/;

    result = result.replace(commandRegex, `\\NameEmailPhoneSiteGithub{${this.escapeLatex(fullName)}}{${this.escapeLatex(phone)}}{${this.escapeLatex(email)}}{${portfolioUrl}}{${githubUrl}}`);

    // Handle simple placeholders like {{FIRST_NAME}} for backward compatibility
    result = result.replace(/\{\{FIRST_NAME\}\}/g, this.escapeLatex(personalInfo.firstName || ""));
    result = result.replace(/\{\{LAST_NAME\}\}/g, this.escapeLatex(personalInfo.lastName || ""));
    result = result.replace(/\{\{EMAIL\}\}/g, this.escapeLatex(personalInfo.email || ""));
    result = result.replace(/\{\{PHONE\}\}/g, this.escapeLatex(personalInfo.phone || ""));
    result = result.replace(/\{\{LOCATION\}\}/g, this.escapeLatex(personalInfo.location || ""));

    // Conditional personal info fields (for {{#IF_...}} blocks)
    result = this.handleConditionalField(
      result,
      "LOCATION",
      personalInfo.location
    );
    result = this.handleConditionalField(
      result,
      "PROFESSIONAL_TITLE",
      personalInfo.professionalTitle
    );
    result = this.handleConditionalField(
      result,
      "LINKEDIN",
      personalInfo.linkedinUrl
    );
    result = this.handleConditionalField(
      result,
      "GITHUB",
      personalInfo.githubUrl
    );
    result = this.handleConditionalField(
      result,
      "PORTFOLIO",
      personalInfo.portfolioUrl
    );
    result = this.handleConditionalField(
      result,
      "WEBSITE",
      personalInfo.websiteUrl
    );

    return result;
  }

  /**
   * Enhanced conditional section handling
   */
  private injectConditionalSection(
    template: string,
    sectionName: string,
    data: any,
    renderer: (data: any) => string
  ): string {
    try {
      const hasData =
        data &&
        ((Array.isArray(data) && data.length > 0) ||
          (!Array.isArray(data) && data));

      if (hasData) {
        // Render content first to check if it's valid
        const renderedContent = renderer.call(this, data);

        // Remove conditional tags and inject content
        // This regex looks for {{#IF_SECTION}}...{{SECTION}}...{{/IF_SECTION}}
        const conditionalRegex = new RegExp(
          `\\{\\{#IF_${sectionName}\\}\\}([\\s\\S]*?)\\{\\{${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/IF_${sectionName}\\}\\}`,
          "g"
        );
        template = template.replace(
          conditionalRegex,
          (match, beforeContent, afterContent) => {
            // Only include the section if rendered content is not empty and doesn't contain obvious errors
            if (
              renderedContent &&
              renderedContent.trim() &&
              !this.containsCriticalLatexErrors(renderedContent)
            ) {
              return beforeContent + renderedContent + afterContent;
            } else {
              console.log(
                `⚠️ Skipping ${sectionName} section due to rendering issues or no content`
              );
              return ""; // Remove section if content has issues or is empty
            }
          }
        );
      } else {
        // Remove entire conditional section if no data
        const conditionalRegex = new RegExp(
          `\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`,
          "g"
        );
        template = template.replace(conditionalRegex, "");
      }

      return template;
    } catch (error) {
      console.error(`❌ Error processing section ${sectionName}:`, error);
      // Remove the problematic section entirely to prevent LaTeX errors
      const conditionalRegex = new RegExp(
        `\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`,
        "g"
      );
      return template.replace(conditionalRegex, "");
    }
  }

  /**
   * Check if content contains critical LaTeX errors that would prevent compilation
   * This is a heuristic, not exhaustive.
   */
  private containsCriticalLatexErrors(content: string): boolean {
    // Check for unescaped special characters that are very likely to cause errors
    // We are more lenient here than in escapeLatex, focusing on the most problematic ones
    const criticalPatterns = [
      /(?<!\\)[%$#_{}&]/, // Most critical unescaped chars (excluding ^~ which are less common in data)
      // A very basic check for malformed LaTeX commands (e.g., \itemnotcommand)
      // This is tricky, but looking for common commands followed by letters without space/line break
      /\\(textbf|textit|underline|href|url|begin|end)\w/, // e.g., \textbfsomething
    ];
    return criticalPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Enhanced conditional field handling with better error recovery
   */
  private handleConditionalField(
    template: string,
    fieldName: string,
    value?: string
  ): string {
    try {
      return this.processNestedConditionals(template, fieldName, value);
    } catch (error) {
      console.error(
        `❌ Error processing conditional field ${fieldName}:`,
        error
      );
      // Remove the problematic conditional blocks to prevent template corruption
      const regex = new RegExp(
        `\\{\\{#IF_${fieldName}\\}\\}[\\s\\S]*?\\{\\{/IF_${fieldName}\\}\\}`,
        "g"
      );
      return template.replace(regex, "");
    }
  }

  /**
   * Enhanced nested conditionals processing
   * Handles {{#IF_FIELD}}...{{FIELD}}...{{/IF_FIELD}} blocks
   */
  private processNestedConditionals(
    template: string,
    fieldName: string,
    value?: string
  ): string {
    let result = template;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const originalResult = result;

      // Find all conditional blocks for this field
      const startTag = `{{#IF_${fieldName}}}`;
      const endTag = `{{/IF_${fieldName}}}`;
      let startIndex = result.indexOf(startTag);

      while (startIndex !== -1) {
        // Find the matching end tag (simple approach, might need refinement for deeply nested identical tags)
        let depth = 1;
        let pos = startIndex + startTag.length;
        let endIndex = -1;

        while (pos < result.length && depth > 0) {
          const nextStart = result.indexOf(startTag, pos);
          const nextEnd = result.indexOf(endTag, pos);

          if (nextEnd === -1) break;

          if (nextStart !== -1 && nextStart < nextEnd) {
            depth++;
            pos = nextStart + startTag.length;
          } else {
            depth--;
            if (depth === 0) {
              endIndex = nextEnd;
              break;
            }
            pos = nextEnd + endTag.length;
          }
        }

        if (endIndex !== -1) {
          const content = result.substring(
            startIndex + startTag.length,
            endIndex
          );

          if (value && value.trim()) {
            // Replace field placeholder and keep content
            const processedContent = content.replace(
              new RegExp(`\\{\\{${fieldName}\\}\\}`, "g"),
              this.escapeLatex(value)
            );
            result =
              result.substring(0, startIndex) +
              processedContent +
              result.substring(endIndex + endTag.length);
          } else {
            // Remove the entire block if no value
            result =
              result.substring(0, startIndex) +
              result.substring(endIndex + endTag.length);
          }
        } else {
          // Malformed conditional, remove it to prevent errors
          console.warn(`⚠️ Malformed conditional for ${fieldName}, removing`);
          result =
            result.substring(0, startIndex) +
            result.substring(startIndex + startTag.length);
        }

        // Find next occurrence
        startIndex = result.indexOf(startTag, startIndex);
      }

      // If no changes were made, break
      if (result === originalResult) {
        break;
      }
      iterations++;
    }

    return result;
  }

  // --- Renderer Functions ---
  // These are used for templates that do NOT use handlebars-style loops

  private renderWorkExperience = (experiences: any[]): string => {
    if (!Array.isArray(experiences) || experiences.length === 0) {
      return "";
    }

    return experiences
      .filter((exp) => exp && exp.jobTitle && exp.company)
      .map((exp) => {
        try {
          const endDate = exp.isCurrentJob ? "Present" : exp.endDate || "";

          const responsibilities = (exp.responsibilities || [])
            .filter((r) => r && r.trim())
            .map((r) => `\\item ${this.escapeLatex(r)}`)
            .join("\n");

          const achievements = (exp.achievements || [])
            .filter((a) => a && a.trim())
            .map((a) => `\\item \\textit{${this.escapeLatex(a)}}`) // Italicize achievements
            .join("\n");

          const allItems = [responsibilities, achievements]
            .filter((item) => item.trim())
            .join("\n");

          const itemsList = allItems
            ? `\\begin{itemize}\n${allItems}\n\\end{itemize}`
            : "";

          return `\\noindent\\textbf{${this.escapeLatex(exp.jobTitle)}} \\hfill \\textit{${this.escapeLatex(exp.startDate || "")} - ${this.escapeLatex(endDate)}}\\\\
\\textit{${this.escapeLatex(exp.company)}, ${this.escapeLatex(exp.location || "")}}\\\\[0.3em]
${itemsList}${itemsList ? "\\vspace{0.5em}" : ""}`;
        } catch (error) {
          console.error("❌ Error rendering work experience item:", error);
          return ""; // Skip problematic items gracefully
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderEducation = (education: any[]): string => {
    if (!Array.isArray(education) || education.length === 0) {
      return "";
    }

    return education
      .filter((edu) => edu && edu.degree && edu.institution)
      .map((edu) => {
        try {
          const gpaText = edu.gpa ? ` (GPA: ${this.escapeLatex(edu.gpa)})` : "";
          const honorsText =
            edu.honors && edu.honors.length > 0
              ? `\\\\Honors: ${edu.honors.map((h) => this.escapeLatex(h)).join(", ")}`
              : "";

          return `\\noindent\\textbf{${this.escapeLatex(edu.degree)}} \\hfill \\textit{${this.escapeLatex(edu.graduationDate || "")}}\\\\
\\textit{${this.escapeLatex(edu.institution)}, ${this.escapeLatex(edu.location || "")}}${gpaText}${honorsText}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering education item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderSkills = (skills: any[]): string => {
    if (!Array.isArray(skills) || skills.length === 0) {
      return "";
    }
    try {
      const validSkills = skills.filter(
        (skill) => skill && skill.name && skill.name.trim()
      );

      if (validSkills.length === 0) {
        return "";
      }

      const skillsByCategory = validSkills.reduce(
        (acc, skill) => {
          const category = skill.category || "Other";
          if (!acc[category]) acc[category] = [];
          acc[category].push(this.escapeLatex(skill.name));
          return acc;
        },
        {} as Record<string, string[]>
      );

      return (Object.entries(skillsByCategory) as [string, string[]][])
        .filter(([category, skillNames]) => skillNames.length > 0)
        .map(([category, skillNames]) => {
          const categoryName =
            category.charAt(0).toUpperCase() + category.slice(1);
          return `\\noindent\\textbf{${this.escapeLatex(categoryName)}:} ${skillNames.join(", ")}\\\\[0.2em]`;
        })
        .join("\n");
    } catch (error) {
      console.error("❌ Error rendering skills:", error);
      return "";
    }
  };

  private renderProjects = (projects: any[]): string => {
    if (!Array.isArray(projects) || projects.length === 0) {
      return "";
    }

    return projects
      .filter((project) => project && project.name && project.description)
      .map((project) => {
        try {
          const dateRange =
            project.startDate && project.endDate
              ? ` \\hfill \\textit{${this.escapeLatex(project.startDate)} - ${this.escapeLatex(project.endDate)}}`
              : "";
          const url = project.url
            ? `\\\\URL: \\url{${this.escapeLatex(project.url)}}`
            : ""; // Escape URL
          const technologies = (project.technologies || [])
            .filter((t) => t && t.trim())
            .map((t) => this.escapeLatex(t))
            .join(", ");

          return `\\noindent\\textbf{${this.escapeLatex(project.name)}}${dateRange}\\\\
${this.escapeLatex(project.description)}\\\\
${technologies ? `\\textit{Technologies:} ${technologies}` : ""}${url}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering project item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderCertifications = (certifications: any[]): string => {
    if (!Array.isArray(certifications) || certifications.length === 0) {
      return "";
    }

    return certifications
      .filter((cert) => cert && cert.name && cert.issuer)
      .map((cert) => {
        try {
          const expiration = cert.expirationDate
            ? ` (Expires: ${this.escapeLatex(cert.expirationDate)})`
            : "";
          const url = cert.url
            ? `\\\\URL: \\url{${this.escapeLatex(cert.url)}}`
            : ""; // Escape URL

          return `\\noindent\\textbf{${this.escapeLatex(cert.name)}} \\hfill \\textit{${this.escapeLatex(cert.date || "")}}\\\\
\\textit{${this.escapeLatex(cert.issuer)}}${expiration}${url}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering certification item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderLanguages = (languages: any[]): string => {
    if (!Array.isArray(languages) || languages.length === 0) {
      return "";
    }

    return languages
      .filter((lang) => lang && lang.name && lang.proficiency)
      .map((lang) => {
        try {
          return `\\noindent\\textbf{${this.escapeLatex(lang.name)}}: ${this.escapeLatex(lang.proficiency)}\\\\[0.2em]`;
        } catch (error) {
          console.error("❌ Error rendering language item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n");
  };

  private renderVolunteerExperience = (volunteer: any[]): string => {
    if (!Array.isArray(volunteer) || volunteer.length === 0) {
      return "";
    }

    return volunteer
      .filter((vol) => vol && vol.role && vol.organization)
      .map((vol) => {
        try {
          const endDate = vol.isCurrentRole ? "Present" : vol.endDate || "";
          const achievements = (vol.achievements || [])
            .filter((a) => a && a.trim())
            .map((a) => `\\item ${this.escapeLatex(a)}`)
            .join("\n");

          const achievementsList = achievements
            ? `\\begin{itemize}\n${achievements}\n\\end{itemize}`
            : "";

          return `\\noindent\\textbf{${this.escapeLatex(vol.role)}} \\hfill \\textit{${this.escapeLatex(vol.startDate || "")} - ${this.escapeLatex(endDate)}}\\\\
\\textit{${this.escapeLatex(vol.organization)}, ${this.escapeLatex(vol.location || "")}}\\\\[0.3em]
${vol.description ? this.escapeLatex(vol.description) + "\\\\[0.2em]" : ""}
${achievementsList}${achievementsList ? "\\vspace{0.5em}" : ""}`;
        } catch (error) {
          console.error("❌ Error rendering volunteer experience item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderAwards = (awards: any[]): string => {
    if (!Array.isArray(awards) || awards.length === 0) {
      return "";
    }

    return awards
      .filter((award) => award && award.title && award.issuer)
      .map((award) => {
        try {
          const description = award.description
            ? `\\\\${this.escapeLatex(award.description)}`
            : "";

          return `\\noindent\\textbf{${this.escapeLatex(award.title)}} \\hfill \\textit{${this.escapeLatex(award.date || "")}}\\\\
\\textit{${this.escapeLatex(award.issuer)}}${description}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering award item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderPublications = (publications: any[]): string => {
    if (!Array.isArray(publications) || publications.length === 0) {
      return "";
    }

    return publications
      .filter((pub) => pub && pub.title && pub.publisher)
      .map((pub) => {
        try {
          const url = pub.url
            ? `\\\\URL: \\url{${this.escapeLatex(pub.url)}}`
            : ""; // Escape URL
          const description = pub.description
            ? `\\\\${this.escapeLatex(pub.description)}`
            : "";

          return `\\noindent\\textbf{${this.escapeLatex(pub.title)}} \\hfill \\textit{${this.escapeLatex(pub.publicationDate || "")}}\\\\
\\textit{${this.escapeLatex(pub.publisher)}}${description}${url}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering publication item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderReferences = (references: any[]): string => {
    if (!Array.isArray(references) || references.length === 0) {
      return "";
    }

    return references
      .filter((ref) => ref && ref.name && ref.email)
      .map((ref) => {
        try {
          // Escape all reference fields
          const name = this.escapeLatex(ref.name);
          const title = this.escapeLatex(ref.title || "");
          const company = this.escapeLatex(ref.company || "");
          const email = this.escapeLatex(ref.email);
          const phone = this.escapeLatex(ref.phone || "");
          const relationship = this.escapeLatex(ref.relationship || "");

          return `\\noindent\\textbf{${name}}\\\\
\\textit{${title}, ${company}}\\\\
Email: ${email} ${phone ? `| Phone: ${phone}` : ""}\\\\
\\textit{Relationship: ${relationship}}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering reference item:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  private renderHobbies = (hobbies: any[]): string => {
    if (!Array.isArray(hobbies) || hobbies.length === 0) {
      return "";
    }
    try {
      const validHobbies = hobbies.filter(
        (hobby) => hobby && hobby.name && hobby.name.trim()
      );

      if (validHobbies.length === 0) {
        return "";
      }

      const hobbiesByCategory = validHobbies.reduce(
        (acc, hobby) => {
          const category = hobby.category || "Other";
          if (!acc[category]) acc[category] = [];
          const hobbyText = hobby.description
            ? `${this.escapeLatex(hobby.name)} (${this.escapeLatex(hobby.description)})`
            : this.escapeLatex(hobby.name);
          acc[category].push(hobbyText);
          return acc;
        },
        {} as Record<string, string[]>
      );

      return Object.entries(hobbiesByCategory)
        .filter(
          ([category, hobbyNames]: [string, string[]]) => hobbyNames.length > 0
        )
        .map(([category, hobbyNames]: [string, string[]]) => {
          const categoryName =
            category.charAt(0).toUpperCase() + category.slice(1);
          return `\\noindent\\textbf{${this.escapeLatex(categoryName)}:} ${hobbyNames.join(", ")}\\\\[0.2em]`;
        })
        .join("\n");
    } catch (error) {
      console.error("❌ Error rendering hobbies:", error);
      return "";
    }
  };

  private renderAdditionalSections = (sections: any[]): string => {
    if (!Array.isArray(sections) || sections.length === 0) {
      return "";
    }

    return sections
      .filter((section) => section && section.title && section.content)
      .map((section) => {
        try {
          return `\\noindent\\textbf{${this.escapeLatex(section.title)}}\\\\[0.2em]
${this.escapeLatex(section.content)}\\\\[0.3em]`;
        } catch (error) {
          console.error("❌ Error rendering additional section:", error);
          return "";
        }
      })
      .filter((item) => item.trim())
      .join("\n\n");
  };

  /**
   * Enhanced LaTeX escaping function to handle special characters
   * This is crucial for preventing LaTeX compilation errors.
   * Focuses on characters that are most likely to break LaTeX.
   */
  private escapeLatex(text: string): string {
    if (text === null || text === undefined) {
      return ""; // Handle null/undefined gracefully
    }
    if (typeof text !== "string") {
      text = String(text); // Convert numbers, booleans to string
    }

    return (
      text
        // Escape backslashes first
        .replace(/\\/g, "\\textbackslash{}")
        // Escape braces
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}")
        // Escape other critical special LaTeX characters
        .replace(/\$/g, "\\$")
        .replace(/&/g, "\\&")
        .replace(/%/g, "\\%")
        .replace(/#/g, "\\#")
        .replace(/\^/g, "\\textasciicircum{}")
        .replace(/_/g, "\\_")
        .replace(/~/g, "\\textasciitilde{}")
        // Handle quotes (simple approach)
        .replace(/"/g, "''")
        .replace(/'/g, "'") // Apostrophes usually okay
        // Handle en/em dashes and ellipsis
        .replace(/[–—]/g, "--") // En/em dash to double hyphen
        .replace(/…/g, "...")
        // Remove or replace other very problematic unicode characters
        // This is a balance between data preservation and preventing errors
        .replace(
          // Matches a range of punctuation/symbols, but excludes common safe ones like ,.!?;:()
          // Also excludes space (\s) and basic word characters (\w)
          /[^\w\s,.\-:;!?()]/g,
          (match) => {
            // Keep basic punctuation that is generally safe
            if (/[,.\-:;!?()]/.test(match)) return match;
            // For other characters, replace with a space or remove
            // Using space is often safer than removal to avoid word concatenation
            return " ";
          }
        )
        // Trim leading/trailing whitespace that might have been introduced
        .trim()
    );
  }

  /**
   * Get available LaTeX templates
   */
  async getAvailableTemplates(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      screenshotUrl?: string;
      category: string;
    }>
  > {
    try {
      console.log(
        "📋 Getting available LaTeX templates from:",
        this.templatesPath
      );

      // Read templates directory
      const templateDirs = await fs.readdir(this.templatesPath);
      const templates = [];

      for (const dir of templateDirs) {
        try {
          const templatePath = path.join(this.templatesPath, dir);
          const stats = await fs.stat(templatePath);

          if (stats.isDirectory()) {
            // Check if template has required files
            const hasStandardized = await this.fileExists(
              path.join(templatePath, `${dir}-standardized.tex`)
            );
            const hasOriginal = await this.fileExists(
              path.join(templatePath, "templatecode.txt")
            );

            if (hasStandardized || hasOriginal) {
              // Find the preview image file (could be .jpeg, .jpg, .png, etc.)
              const previewImage = await this.findPreviewImage(
                templatePath,
                dir
              );

              templates.push({
                id: dir,
                name: this.formatTemplateName(dir),
                description: `Professional LaTeX template - ${dir}`,
                screenshotUrl: previewImage,
                category: "professional",
              });
            }
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to process template directory ${dir}:`,
            error
          );
        }
      }

      console.log(`✅ Found ${templates.length} available templates`);
      return templates;
    } catch (error) {
      console.error("❌ Failed to get available templates:", error);
      return [];
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find preview image file in template directory
   */
  private async findPreviewImage(
    templatePath: string,
    templateId: string
  ): Promise<string | undefined> {
    try {
      const files = await fs.readdir(templatePath);

      // Look for common image file extensions
      const imageExtensions = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
      for (const file of files) {
        const fileExt = path.extname(file).toLowerCase();
        if (imageExtensions.includes(fileExt)) {
          // Found an image file, return the public URL path
          const relativePath = `/templates/${templateId}/${file}`;
          console.log(
            `📸 Found preview image for ${templateId}: ${relativePath}`
          );
          return relativePath;
        }
      }

      console.log(`⚠️ No preview image found for template ${templateId}`);
      return undefined;
    } catch (error) {
      console.warn(`❌ Error finding preview image for ${templateId}:`, error);
      return undefined;
    }
  }

  /**
   * Format template name for display
   */
  private formatTemplateName(templateId: string): string {
    return templateId
      .replace(/template(\d+)/i, "Template $1")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
}

// Export singleton instance
export const standardizedTemplateService = new StandardizedTemplateService();
