import fs from "fs/promises";
import path from "path";
import {
  aiContentEnhancer,
  type ResumeData as AIResumeData,
} from "./aiContentEnhancer";

// Template style detection and custom rendering
interface TemplateStyle {
  hasCustomCommands: boolean;
  customCommands: string[];
  usesSections: boolean;
  usesItemize: boolean;
  spacing: "compact" | "normal" | "spacious";
  headerStyle: "simple" | "custom" | "complex";
}

export class StandardizedTemplateService {
  private templatesPath: string;
  private templateCache: Map<string, string> = new Map();
  private styleCache: Map<string, TemplateStyle> = new Map();

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
   * Main method: Generate LaTeX preserving original template style
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
      `🎯 Generating LaTeX with style-preserving template: ${templateId}`
    );

    try {
      this.validateResumeData(resumeData);

      const templateCode =
        options.customTemplateCode || (await this.loadTemplate(templateId));

      // Analyze template style to determine rendering approach
      const templateStyle = this.analyzeTemplateStyle(templateCode, templateId);
      console.log(`🎨 Detected template style:`, templateStyle);

      const enhancedData = options.enhanceWithAI
        ? await this.enhanceContent(resumeData, options.jobDescription)
        : resumeData;

      // Use style-aware rendering
      const result = await this.renderWithStylePreservation(
        templateCode,
        enhancedData,
        templateStyle
      );

      console.log(
        `✅ LaTeX generated successfully (${result.length} characters)`
      );
      return result;
    } catch (error) {
      console.error(`❌ Style-preserving template generation failed:`, error);
      throw new Error(
        `Failed to generate LaTeX resume. Please check your data and try again.`
      );
    }
  }

  /**
   * Analyze template to detect its specific style and commands
   */
  private analyzeTemplateStyle(
    template: string,
    templateId: string
  ): TemplateStyle {
    if (this.styleCache.has(templateId)) {
      return this.styleCache.get(templateId)!;
    }

    const style: TemplateStyle = {
      hasCustomCommands: false,
      customCommands: [],
      usesSections: false,
      usesItemize: true, // default to true unless we detect otherwise
      spacing: "normal",
      headerStyle: "simple",
    };

    // Detect custom commands
    const customCommandMatches =
      template.match(/\\newcommand\{\\(\w+)\}/g) || [];
    style.customCommands = customCommandMatches.map((match) =>
      match.replace(/\\newcommand\{\\(\w+)\}/, "$1")
    );
    style.hasCustomCommands = style.customCommands.length > 0;

    // Detect specific custom commands we know about
    if (template.includes("\\NameEmailPhoneSiteGithub")) {
      style.headerStyle = "custom";
      style.customCommands.push("NameEmailPhoneSiteGithub");
    }
    if (template.includes("\\NewPart")) {
      style.usesSections = true;
      style.customCommands.push("NewPart");
    }
    if (template.includes("\\SkillsEntry")) {
      style.customCommands.push("SkillsEntry");
    }

    // Detect spacing style
    if (
      template.includes("\\sepspace") ||
      template.includes("vspace*{0.5em}")
    ) {
      style.spacing = "compact";
    } else if (
      template.includes("\\bigskip") ||
      template.includes("vspace{2em}")
    ) {
      style.spacing = "spacious";
    }

    // Check if template avoids itemize (some templates use custom formatting)
    if (
      template.includes("\\noindent\\hangindent") ||
      template.includes("\\parbox") ||
      style.customCommands.includes("SkillsEntry")
    ) {
      style.usesItemize = false;
    }

    console.log(`🔍 Template ${templateId} style analysis:`, style);
    this.styleCache.set(templateId, style);
    return style;
  }

  /**
   * Render template with style preservation
   */
  private async renderWithStylePreservation(
    template: string,
    data: StandardizedResumeData,
    style: TemplateStyle
  ): Promise<string> {
    let result = template;

    // Handle personal information with style-aware approach
    result = this.injectPersonalInfoStyleAware(
      result,
      data.personalInfo,
      style
    );

    // Handle professional summary
    result = result.replace(
      /\{\{PROFESSIONAL_SUMMARY\}\}/g,
      this.escapeLatex(
        data.professionalSummary || "Professional seeking new opportunities."
      )
    );

    // Check for template content placeholder
    if (result.includes("{{TEMPLATE_CONTENT}}")) {
      console.log(
        "📋 Processing {{TEMPLATE_CONTENT}} with style preservation..."
      );
      const content = this.generateStyleAwareContent(data, style);
      result = result.replace(/\{\{TEMPLATE_CONTENT\}\}/g, content);
    } else {
      // Process individual sections with style awareness
      result = this.injectStyleAwareSection(
        result,
        "WORK_EXPERIENCE",
        data.workExperience,
        style,
        this.renderWorkExperienceStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "EDUCATION",
        data.education,
        style,
        this.renderEducationStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "SKILLS",
        data.skills,
        style,
        this.renderSkillsStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "PROJECTS",
        data.projects,
        style,
        this.renderProjectsStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "CERTIFICATIONS",
        data.certifications,
        style,
        this.renderCertificationsStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "LANGUAGES",
        data.languages,
        style,
        this.renderLanguagesStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "VOLUNTEER_EXPERIENCE",
        data.volunteerExperience,
        style,
        this.renderVolunteerStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "AWARDS",
        data.awards,
        style,
        this.renderAwardsStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "PUBLICATIONS",
        data.publications,
        style,
        this.renderPublicationsStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "REFERENCES",
        data.references,
        style,
        this.renderReferencesStyleAware
      );
      result = this.injectStyleAwareSection(
        result,
        "HOBBIES",
        data.hobbies,
        style,
        this.renderHobbiesStyleAware
      );
    }

    // Handle handlebars if present
    if (this.hasHandlebarsLoops(result)) {
      result = this.renderHandlebarsTemplate(result, data);
    }

    // Clean up remaining placeholders
    result = this.cleanupRemainingPlaceholders(result);

    return result;
  }

  /**
   * Generate full resume content with style awareness
   */
  private generateStyleAwareContent(
    data: StandardizedResumeData,
    style: TemplateStyle
  ): string {
    const sections: string[] = [];

    // Personal Information Header - use template's custom commands if available
    if (style.customCommands.includes("NameEmailPhoneSiteGithub")) {
      const name = `${data.personalInfo.firstName} ${data.personalInfo.lastName}`;
      const phone = data.personalInfo.phone || "";
      const email = data.personalInfo.email || "";
      const website =
        data.personalInfo.websiteUrl || data.personalInfo.portfolioUrl || "";
      const github = data.personalInfo.githubUrl || "";

      sections.push(
        `\\NameEmailPhoneSiteGithub{${this.escapeLatex(name)}}{${this.escapeLatex(email)}}{${this.escapeLatex(phone)}}{${this.escapeLatex(website)}}{${this.escapeLatex(github)}}`
      );
    } else {
      // Fallback to generic header
      sections.push(`\\begin{center}`);
      sections.push(
        `{\\Huge \\textbf{${this.escapeLatex(data.personalInfo.firstName)} ${this.escapeLatex(data.personalInfo.lastName)}}}\\\\[0.5em]`
      );
      sections.push(
        `${this.escapeLatex(data.personalInfo.email)} $\\bullet$ ${this.escapeLatex(data.personalInfo.phone)}`
      );
      if (data.personalInfo.location) {
        sections.push(
          ` $\\bullet$ ${this.escapeLatex(data.personalInfo.location)}`
        );
      }
      sections.push(`\\end{center}`);
    }

    this.addSpacing(sections, style);

    // Professional Summary
    if (data.professionalSummary) {
      this.addSectionHeader(sections, "Professional Summary", style);
      sections.push(this.escapeLatex(data.professionalSummary));
      this.addSpacing(sections, style);
    }

    // Work Experience
    if (data.workExperience?.length > 0) {
      this.addSectionHeader(sections, "Work Experience", style);
      data.workExperience.forEach((exp) => {
        const content = this.renderWorkExperienceStyleAware([exp], style);
        if (content.trim()) {
          sections.push(content);
        }
      });
      this.addSpacing(sections, style);
    }

    // Education
    if (data.education?.length > 0) {
      this.addSectionHeader(sections, "Education", style);
      data.education.forEach((edu) => {
        const content = this.renderEducationStyleAware([edu], style);
        if (content.trim()) {
          sections.push(content);
        }
      });
      this.addSpacing(sections, style);
    }

    // Skills - use template's custom formatting if available
    if (data.skills?.length > 0) {
      this.addSectionHeader(sections, "Skills", style);
      const skillsContent = this.renderSkillsStyleAware(data.skills, style);
      if (skillsContent.trim()) {
        sections.push(skillsContent);
      }
      this.addSpacing(sections, style);
    }

    // Continue with other sections...
    this.addRemainingSection(
      sections,
      data.projects,
      "Projects",
      style,
      this.renderProjectsStyleAware
    );
    this.addRemainingSection(
      sections,
      data.certifications,
      "Certifications",
      style,
      this.renderCertificationsStyleAware
    );
    this.addRemainingSection(
      sections,
      data.languages,
      "Languages",
      style,
      this.renderLanguagesStyleAware
    );
    this.addRemainingSection(
      sections,
      data.volunteerExperience,
      "Volunteer Experience",
      style,
      this.renderVolunteerStyleAware
    );
    this.addRemainingSection(
      sections,
      data.awards,
      "Awards & Honors",
      style,
      this.renderAwardsStyleAware
    );
    this.addRemainingSection(
      sections,
      data.publications,
      "Publications",
      style,
      this.renderPublicationsStyleAware
    );
    this.addRemainingSection(
      sections,
      data.hobbies,
      "Interests & Hobbies",
      style,
      this.renderHobbiesStyleAware
    );

    // References
    if (data.references?.length > 0) {
      this.addSectionHeader(sections, "References", style);
      const referencesContent = this.renderReferencesStyleAware(
        data.references,
        style
      );
      if (referencesContent.trim()) {
        sections.push(referencesContent);
      }
    } else {
      this.addSectionHeader(sections, "References", style);
      sections.push("References available upon request.");
    }

    return sections.join("\n");
  }

  /**
   * Helper method to add remaining sections
   */
  private addRemainingSection(
    sections: string[],
    data: any[] | undefined,
    title: string,
    style: TemplateStyle,
    renderer: (data: any[], style: TemplateStyle) => string
  ): void {
    if (data?.length > 0) {
      this.addSectionHeader(sections, title, style);
      const content = renderer.call(this, data, style);
      if (content.trim()) {
        sections.push(content);
      }
      this.addSpacing(sections, style);
    }
  }

  /**
   * Add section header using template's style
   */
  private addSectionHeader(
    sections: string[],
    title: string,
    style: TemplateStyle
  ): void {
    if (style.customCommands.includes("NewPart")) {
      sections.push(`\\NewPart{${this.escapeLatex(title)}}`);
    } else if (style.usesSections) {
      sections.push(`\\section*{${this.escapeLatex(title).toUpperCase()}}`);
    } else {
      sections.push(
        `{\\large \\textbf{${this.escapeLatex(title)}}}\\\\[0.3em]`
      );
    }
  }

  /**
   * Add appropriate spacing based on template style
   */
  private addSpacing(sections: string[], style: TemplateStyle): void {
    switch (style.spacing) {
      case "compact":
        if (style.customCommands.includes("sepspace")) {
          sections.push("\\sepspace");
        } else {
          sections.push("\\vspace{0.5em}");
        }
        break;
      case "spacious":
        sections.push("\\bigskip");
        break;
      default:
        sections.push("\\medskip");
    }
  }

  /**
   * Style-aware work experience renderer
   */
  private renderWorkExperienceStyleAware = (
    experiences: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(experiences) || experiences.length === 0) return "";

    return experiences
      .filter((exp) => exp?.jobTitle && exp?.company)
      .map((exp) => {
        const endDate = exp.isCurrentJob ? "Present" : exp.endDate || "";

        let result = "";

        // Use template-appropriate formatting
        if (style.spacing === "compact") {
          result += `\\textbf{${this.escapeLatex(exp.jobTitle)}} \\hfill ${this.escapeLatex(exp.startDate)} - ${this.escapeLatex(endDate)}\\\\`;
          result += `\\textit{${this.escapeLatex(exp.company)}} \\hfill ${this.escapeLatex(exp.location)}\\\\[0.3em]`;
        } else {
          result += `{\\large \\textbf{${this.escapeLatex(exp.jobTitle)}}}\\\\`;
          result += `\\textit{${this.escapeLatex(exp.company)}, ${this.escapeLatex(exp.location)}} \\hfill ${this.escapeLatex(exp.startDate)} - ${this.escapeLatex(endDate)}\\\\[0.5em]`;
        }

        // Handle responsibilities and achievements
        const allItems = [
          ...(exp.responsibilities || []),
          ...(exp.achievements || []),
        ];
        if (allItems.length > 0) {
          if (style.usesItemize) {
            result += `\\begin{itemize}[leftmargin=*, parsep=0pt, itemsep=0pt]`;
            allItems.forEach((item) => {
              result += `\\item ${this.escapeLatex(item)}`;
            });
            result += `\\end{itemize}`;
          } else {
            // Use paragraph-style formatting for templates that avoid itemize
            allItems.forEach((item) => {
              result += `\\noindent $\\bullet$ ${this.escapeLatex(item)}\\\\`;
            });
          }
        }

        return result;
      })
      .join("\n\n");
  };

  /**
   * Style-aware skills renderer
   */
  private renderSkillsStyleAware = (
    skills: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(skills) || skills.length === 0) return "";

    const skillsByCategory = skills.reduce(
      (acc, skill) => {
        const category = skill.category || "General";
        if (!acc[category]) acc[category] = [];
        acc[category].push(skill.name);
        return acc;
      },
      {} as Record<string, string[]>
    );

    // Use SkillsEntry command if available
    if (style.customCommands.includes("SkillsEntry")) {
      return Object.entries(skillsByCategory)
        .map(
          ([category, skillNames]: [string, string[]]) =>
            `\\SkillsEntry{${this.escapeLatex(category)}}{${this.escapeLatex(skillNames.join(", "))}}`
        )
        .join("\n");
    } else {
      // Fallback formatting
      return Object.entries(skillsByCategory)
        .map(
          ([category, skillNames]: [string, string[]]) =>
            `\\textbf{${this.escapeLatex(category)}:} ${this.escapeLatex(skillNames.join(", "))}\\\\[0.2em]`
        )
        .join("\n");
    }
  };

  /**
   * Style-aware personal info injection
   */
  private injectPersonalInfoStyleAware(
    template: string,
    personalInfo: any,
    style: TemplateStyle
  ): string {
    if (!personalInfo) return template;

    let result = template;

    // Handle custom NameEmailPhoneSiteGithub command
    if (style.customCommands.includes("NameEmailPhoneSiteGithub")) {
      const fullName =
        `${personalInfo.firstName || ""} ${personalInfo.lastName || ""}`.trim();
      const email = personalInfo.email || "";
      const phone = personalInfo.phone || "";
      const website =
        personalInfo.websiteUrl || personalInfo.portfolioUrl || "";
      const github = personalInfo.githubUrl || "";

      // Find and replace the command with proper escaping
      const commandRegex =
        /\\NameEmailPhoneSiteGithub\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}/;
      result = result.replace(
        commandRegex,
        `\\NameEmailPhoneSiteGithub{${this.escapeLatex(fullName)}}{${this.escapeLatex(email)}}{${this.escapeLatex(phone)}}{${this.escapeLatex(website)}}{${this.escapeLatex(github)}}`
      );
    }

    // Handle other personal info placeholders
    result = result.replace(
      /\{\{FIRST_NAME\}\}/g,
      this.escapeLatex(personalInfo.firstName || "")
    );
    result = result.replace(
      /\{\{LAST_NAME\}\}/g,
      this.escapeLatex(personalInfo.lastName || "")
    );
    result = result.replace(
      /\{\{EMAIL\}\}/g,
      this.escapeLatex(personalInfo.email || "")
    );
    result = result.replace(
      /\{\{PHONE\}\}/g,
      this.escapeLatex(personalInfo.phone || "")
    );

    return result;
  }

  // Add style-aware renderers for other sections
  private renderEducationStyleAware = (
    education: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(education) || education.length === 0) return "";

    return education
      .filter((edu) => edu?.degree && edu?.institution)
      .map((edu) => {
        // Deduplicate degree and field of study
        const programParts = [edu.degree, edu.fieldOfStudy].filter(p => p && String(p).trim().length > 0);
        const uniqueProgramParts: string[] = [];
        for (const p of programParts) {
          const trimmed = String(p).trim();
          const lower = trimmed.toLowerCase();
          const isDuplicate = uniqueProgramParts.some((existing, idx) => {
            const exLower = existing.toLowerCase();
            if (exLower.includes(lower)) return true;
            if (lower.includes(exLower)) {
              uniqueProgramParts[idx] = trimmed;
              return true;
            }
            return false;
          });
          if (!isDuplicate) {
            uniqueProgramParts.push(trimmed);
          }
        }
        const program = uniqueProgramParts.join(", ");

        if (style.spacing === "compact") {
          const loc = (edu.location && String(edu.location).trim().length > 0) ? ` \\hfill ${this.escapeLatex(edu.location)}` : "";
          return (
            `\\textbf{${this.escapeLatex(program)}} \\hfill ${this.escapeLatex(edu.graduationDate)}\\\\` +
            `\\textit{${this.escapeLatex(edu.institution)}}${loc}\\\\[0.3em]`
          );
        } else {
          const loc = (edu.location && String(edu.location).trim().length > 0) ? `, ${this.escapeLatex(edu.location)}` : "";
          return (
            `{\\textbf{${this.escapeLatex(program)}}}\\\\` +
            `${this.escapeLatex(edu.institution)}${loc} \\hfill ${this.escapeLatex(edu.graduationDate)}\\\\[0.5em]`
          );
        }
      })
      .join("\n\n");
  };

  private renderProjectsStyleAware = (
    projects: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(projects) || projects.length === 0) return "";

    return projects
      .filter((project) => project?.name)
      .map((project) => {
        let result = `\\textbf{${this.escapeLatex(project.name)}}`;
        if (project.url) {
          result += ` \\hfill \\url{${this.escapeLatex(project.url)}}`;
        }
        result += "\\\\";

        if (
          Array.isArray(project.description) &&
          project.description.length > 0
        ) {
          if (style.usesItemize) {
            result += "\\begin{itemize}[leftmargin=*, parsep=0pt, itemsep=0pt]";
            project.description.forEach((desc) => {
              result += `\\item ${this.escapeLatex(desc)}`;
            });
            result += "\\end{itemize}";
          } else {
            project.description.forEach((desc) => {
              result += `$\\bullet$ ${this.escapeLatex(desc)}\\\\`;
            });
          }
        }

        if (project.technologies?.length > 0) {
          result += `\\textit{Technologies: ${this.escapeLatex(project.technologies.join(", "))}}\\\\[0.3em]`;
        }

        return result;
      })
      .join("\n\n");
  };

  // Add other style-aware renderers...
  private renderCertificationsStyleAware = (
    certifications: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(certifications) || certifications.length === 0)
      return "";

    return certifications
      .filter((cert) => cert?.name && cert?.issuer)
      .map((cert) => {
        return (
          `\\textbf{${this.escapeLatex(cert.name)}} \\hfill ${this.escapeLatex(cert.date)}\\\\` +
          `\\textit{${this.escapeLatex(cert.issuer)}}\\\\[0.3em]`
        );
      })
      .join("\n");
  };

  private renderLanguagesStyleAware = (
    languages: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(languages) || languages.length === 0) return "";

    if (style.customCommands.includes("SkillsEntry")) {
      return `\\SkillsEntry{Languages}{${languages.map((lang) => `${this.escapeLatex(lang.name)} (${this.escapeLatex(lang.proficiency)})`).join(", ")}}`;
    } else {
      return languages
        .map(
          (lang) =>
            `\\textbf{${this.escapeLatex(lang.name)}}: ${this.escapeLatex(lang.proficiency)}\\\\[0.2em]`
        )
        .join("\n");
    }
  };

  private renderVolunteerStyleAware = (
    volunteer: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(volunteer) || volunteer.length === 0) return "";

    return volunteer
      .filter((vol) => vol?.role && vol?.organization)
      .map((vol) => {
        const endDate = vol.isCurrentRole ? "Present" : vol.endDate || "";
        return (
          `\\textbf{${this.escapeLatex(vol.role)}} \\hfill ${this.escapeLatex(vol.startDate)} - ${this.escapeLatex(endDate)}\\\\` +
          `\\textit{${this.escapeLatex(vol.organization)}, ${this.escapeLatex(vol.location)}}\\\\` +
          (vol.description
            ? `${this.escapeLatex(vol.description)}\\\\[0.3em]`
            : "")
        );
      })
      .join("\n\n");
  };

  private renderAwardsStyleAware = (
    awards: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(awards) || awards.length === 0) return "";

    return awards
      .filter((award) => award?.title && award?.issuer)
      .map((award) => {
        return (
          `\\textbf{${this.escapeLatex(award.title)}} \\hfill ${this.escapeLatex(award.date)}\\\\` +
          `\\textit{${this.escapeLatex(award.issuer)}}\\\\[0.3em]`
        );
      })
      .join("\n");
  };

  private renderPublicationsStyleAware = (
    publications: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(publications) || publications.length === 0) return "";

    return publications
      .filter((pub) => pub?.title && pub?.publisher)
      .map((pub) => {
        return (
          `\\textbf{${this.escapeLatex(pub.title)}} \\hfill ${this.escapeLatex(pub.publicationDate)}\\\\` +
          `\\textit{${this.escapeLatex(pub.publisher)}}\\\\[0.3em]`
        );
      })
      .join("\n");
  };

  private renderReferencesStyleAware = (
    references: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(references) || references.length === 0) return "";

    return references
      .filter((ref) => ref?.name && ref?.email)
      .map((ref) => {
        return (
          `\\textbf{${this.escapeLatex(ref.name)}} - ${this.escapeLatex(ref.title)}\\\\` +
          `\\textit{${this.escapeLatex(ref.company)}}\\\\` +
          `${this.escapeLatex(ref.email)} $\\bullet$ ${this.escapeLatex(ref.phone)}\\\\[0.3em]`
        );
      })
      .join("\n");
  };

  private renderHobbiesStyleAware = (
    hobbies: any[],
    style: TemplateStyle
  ): string => {
    if (!Array.isArray(hobbies) || hobbies.length === 0) return "";

    const hobbiesByCategory = hobbies.reduce(
      (acc, hobby) => {
        const category = hobby.category || "other";
        if (!acc[category]) acc[category] = [];
        acc[category].push(hobby.name);
        return acc;
      },
      {} as Record<string, string[]>
    );

    if (style.customCommands.includes("SkillsEntry")) {
      return Object.entries(hobbiesByCategory)
        .map(([category, hobbyNames]: [string, string[]]) => {
          const categoryName =
            category.charAt(0).toUpperCase() + category.slice(1);
          return `\\SkillsEntry{${this.escapeLatex(categoryName)}}{${this.escapeLatex(hobbyNames.join(", "))}}`;
        })
        .join("\n");
    } else {
      return Object.entries(hobbiesByCategory)
        .map(([category, hobbyNames]: [string, string[]]) => {
          const categoryName =
            category.charAt(0).toUpperCase() + category.slice(1);
          return `\\textbf{${this.escapeLatex(categoryName)}:} ${this.escapeLatex(hobbyNames.join(", "))}\\\\[0.2em]`;
        })
        .join("\n");
    }
  };

  // Include all the other existing methods...
  private validateResumeData(data: StandardizedResumeData): void {
    if (!data.personalInfo?.firstName || !data.personalInfo?.lastName) {
      throw new Error("First name and last name are required");
    }
    if (!data.personalInfo?.email) {
      throw new Error("Email is required");
    }

    // Initialize arrays
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

    if (!data.professionalSummary) {
      data.professionalSummary = "Professional seeking new opportunities.";
    }
  }

  private async loadTemplate(templateId: string): Promise<string> {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    const directoryName =
      templateId === "template21" ? "template 21" : templateId;

    // Try standardized first
    const standardizedPath = path.join(
      this.templatesPath,
      directoryName,
      `${templateId}-standardized.tex`
    );

    try {
      const template = await fs.readFile(standardizedPath, "utf8");
      console.log(`✅ Loaded standardized template: ${templateId}`);
      this.templateCache.set(templateId, template);
      return template;
    } catch (error) {
      // Fallback to original
      const originalPath = path.join(
        this.templatesPath,
        directoryName,
        "templatecode.txt"
      );

      try {
        const template = await fs.readFile(originalPath, "utf8");
        console.log(`✅ Loaded original template: ${templateId}`);
        this.templateCache.set(templateId, template);
        return template;
      } catch (fallbackError) {
        throw new Error(
          `Template ${templateId} not found - neither standardized nor original version exists`
        );
      }
    }
  }

  private async enhanceContent(
    resumeData: StandardizedResumeData,
    jobDescription?: string
  ): Promise<StandardizedResumeData> {
    console.log("🤖 Enhancing content with AI Content Enhancer...");
    try {
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

      const enhancementResult = jobDescription
        ? await aiContentEnhancer.optimizeForJob(aiResumeData, jobDescription)
        : await aiContentEnhancer.enhanceResumeContent(aiResumeData);

      console.log(
        `✅ Content enhanced with AI. ATS Score: ${enhancementResult.atsScore}%`
      );

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
      return resumeData;
    }
  }

  private injectStyleAwareSection(
    template: string,
    sectionName: string,
    data: any,
    style: TemplateStyle,
    renderer: (data: any, style: TemplateStyle) => string
  ): string {
    try {
      const hasData =
        data &&
        ((Array.isArray(data) && data.length > 0) ||
          (!Array.isArray(data) && data));

      if (hasData) {
        const renderedContent = renderer.call(this, data, style);

        const conditionalRegex = new RegExp(
          `\\{\\{#IF_${sectionName}\\}\\}([\\s\\S]*?)\\{\\{${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/IF_${sectionName}\\}\\}`,
          "g"
        );

        template = template.replace(
          conditionalRegex,
          (match, beforeContent, afterContent) => {
            if (renderedContent && renderedContent.trim()) {
              return beforeContent + renderedContent + afterContent;
            } else {
              return "";
            }
          }
        );
      } else {
        const conditionalRegex = new RegExp(
          `\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`,
          "g"
        );
        template = template.replace(conditionalRegex, "");
      }

      return template;
    } catch (error) {
      console.error(`❌ Error processing section ${sectionName}:`, error);
      const conditionalRegex = new RegExp(
        `\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`,
        "g"
      );
      return template.replace(conditionalRegex, "");
    }
  }

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
          .join("\n  ");
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
          startDate: this.escapeLatex(edu.graduationDate || ""),
          endDate: this.escapeLatex(edu.graduationDate || ""),
          gpa: edu.gpa ? this.escapeLatex(edu.gpa) : "",
          honors: edu.coursework || [],
          courses: [],
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
          description: this.escapeLatex(
            Array.isArray(project.description)
              ? project.description.join(". ")
              : project.description || ""
          ),
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
          credentialId: cert.url || "",
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
          achievementsList,
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

  private processHandlebarsSection<T>(
    template: string,
    sectionName: string,
    data: T[] | undefined,
    transformer: (item: T) => Record<string, any>
  ): string {
    if (!data || data.length === 0) {
      const sectionRegex = new RegExp(
        `\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`,
        "g"
      );
      return template.replace(sectionRegex, "");
    }

    const loopRegex = new RegExp(
      `\\{\\{#${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/${sectionName}\\}\\}`,
      "g"
    );

    return template.replace(loopRegex, (match, loopContent) => {
      return data
        .map((item) => {
          const transformedItem = transformer(item);
          let renderedItem = loopContent;

          // Handle array fields
          Object.entries(transformedItem).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              const arrayRegex = new RegExp(
                `\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`,
                "g"
              );
              renderedItem = renderedItem.replace(
                arrayRegex,
                (arrayMatch, arrayContent) => {
                  if (value.length === 0) {
                    return "";
                  }
                  return value
                    .map((arrayItem) => {
                      const processedArrayItemContent = arrayContent
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
                    .join("\n");
                }
              );
            }
          });

          // Handle conditional fields
          renderedItem = renderedItem.replace(
            /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
            (m, fieldName, content) => {
              const fieldValue = transformedItem[fieldName];
              if (fieldValue) {
                return content;
              }
              return "";
            }
          );

          renderedItem = renderedItem.replace(
            /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
            (m, fieldName, content) => {
              const fieldValue = transformedItem[fieldName];
              if (!fieldValue) {
                return content;
              }
              return "";
            }
          );

          // Handle optional content blocks
          renderedItem = renderedItem.replace(
            /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
            (m, fieldName, content) => {
              const fieldValue = transformedItem[fieldName];
              if (
                fieldValue !== undefined &&
                fieldValue !== null &&
                fieldValue !== ""
              ) {
                return content.replace(
                  new RegExp(`\\{\\{${fieldName}\\}\\}`, "g"),
                  String(fieldValue)
                );
              }
              return "";
            }
          );

          // Handle simple field replacements
          Object.entries(transformedItem).forEach(([key, value]) => {
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
        .join("\n");
    });
  }

  private cleanupRemainingPlaceholders(template: string): string {
    console.log("🧹 Cleaning up remaining placeholders...");
    let result = template;
    let iterations = 0;
    const maxIterations = 15;

    while (iterations < maxIterations) {
      const originalLength = result.length;

      // Remove complex conditional blocks first
      result = result.replace(
        /\{\{#IF_[^}]+\}\}[\s\S]*?\{\{\/IF_[^}]+\}\}/g,
        ""
      );

      // Remove remaining simple placeholders
      result = result.replace(/\{\{[^}]+\}\}/g, "");

      // Clean up excessive newlines
      result = result.replace(/\n{3,}/g, "\n\n");

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

  private escapeLatex(text: string): string {
    if (text === null || text === undefined) {
      return "";
    }
    if (typeof text !== "string") {
      text = String(text);
    }

    return text
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\$/g, "\\$")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/#/g, "\\#")
      .replace(/\^/g, "\\textasciicircum{}")
      .replace(/_/g, "\\_")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/"/g, "''")
      .replace(/'/g, "'")
      .replace(/[–—]/g, "--")
      .replace(/…/g, "...")
      .replace(/[^\w\s,.\-:;!?()]/g, (match) => {
        if (/[,.\-:;!?()]/.test(match)) return match;
        return " ";
      })
      .trim();
  }

  /**
   * Generate PDF from standardized data using LaTeX service
   */
  async generatePDF(
    resumeData: StandardizedResumeData,
    templateId: string = "modern-1"
  ): Promise<Buffer> {
    console.log(
      `🎯 Generating PDF with style-preserving template: ${templateId}`
    );
    try {
      const latexCode = await this.generateLatex(templateId, resumeData, {
        enhanceWithAI: false,
      });

      const { latexService } = await import("./latexService");
      const pdfBuffer = await latexService.compileLatexToPDF(
        latexCode,
        templateId,
        "pdf"
      );

      console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
      return pdfBuffer;
    } catch (error) {
      console.error(`❌ PDF generation failed:`, error);
      throw new Error(
        `Failed to generate PDF. Please check your data and try again.`
      );
    }
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

      const templateDirs = await fs.readdir(this.templatesPath);
      const templates = [];

      for (const dir of templateDirs) {
        try {
          const templatePath = path.join(this.templatesPath, dir);
          const stats = await fs.stat(templatePath);

          if (stats.isDirectory()) {
            const hasStandardized = await this.fileExists(
              path.join(templatePath, `${dir}-standardized.tex`)
            );
            const hasOriginal = await this.fileExists(
              path.join(templatePath, "templatecode.txt")
            );

            if (hasStandardized || hasOriginal) {
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

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findPreviewImage(
    templatePath: string,
    templateId: string
  ): Promise<string | undefined> {
    try {
      const files = await fs.readdir(templatePath);

      const imageExtensions = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
      for (const file of files) {
        const fileExt = path.extname(file).toLowerCase();
        if (imageExtensions.includes(fileExt)) {
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

// Keep original interface for backwards compatibility
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
    id?: string;
    degree: string;
    institution: string;
    fieldOfStudy: string;
    location?: string;
    graduationDate: string;
    gpa?: string;
    coursework?: string[];
  }>;
  skills: Array<{
    id?: string;
    name: string;
    category: 'technical' | 'soft' | 'language' | 'certification';
    proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  projects?: Array<{
    name: string;
    description: string[];
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
    id?: string;
    name: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
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
    id?: string;
    name: string;
    description?: string;
    category: 'creative' | 'sports' | 'technology' | 'volunteer' | 'other';
  }>;
  additionalSections?: Array<{
    title: string;
    content: string;
  }>;
}
