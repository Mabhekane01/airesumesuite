// apps/backend/src/services/resume-builder/templateService.ts
import fs from "fs/promises";
import path from "path";

/**
 * -------- Data contracts --------
 * Keep this in sync with the frontend form.
 */
export interface ResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    websiteUrl?: string;
    professionalTitle?: string;
  };
  professionalSummary?: string;
  workExperience?: Array<{
    jobTitle?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrentJob?: boolean;
    responsibilities?: string[];
    achievements?: string[];
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    fieldOfStudy?: string;
    location?: string;
    graduationDate?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    coursework?: string[];
  }>;
  skills?: Array<{
    name?: string;
    category?: string;
    proficiencyLevel?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string[]; // first element used as keyHighlight
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    expirationDate?: string;
    credentialId?: string;
    url?: string;
  }>;
  languages?: Array<{
    name?: string;
    proficiency?: string;
  }>;
  volunteerExperience?: Array<{
    organization?: string;
    role?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrentRole?: boolean;
    description?: string;
    achievements?: string[];
  }>;
  awards?: Array<{
    title?: string;
    issuer?: string;
    date?: string;
    description?: string;
  }>;
  publications?: Array<{
    title?: string;
    publisher?: string;
    publicationDate?: string;
    url?: string;
    description?: string;
  }>;
  references?: Array<{
    name?: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  }>;
  hobbies?: Array<{
    name?: string;
    description?: string;
    category?: string;
  }>;
  additionalSections?: Array<{
    title?: string;
    content?: string;
  }>;
}

/**
 * -------- Template service --------
 * Generates EXACT ASU Sparky Sundevil LaTeX markup while making ALL keys optional.
 * Critically, this never emits empty key/value pairs (e.g., `coursework=`), which
 * would break xkeyval/etoolbox with "Invalid boolean expression".
 */
export class TemplateService {
  private templatesPath: string;
  private templateCache: Map<string, string> = new Map();

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
   * Generate LaTeX for template01 ONLY (ASU Sparky Sundevil).
   */
  async generateLatex(
    templateId: string,
    resumeData: ResumeData
  ): Promise<string> {
    if (templateId !== "template01") {
      throw new Error(
        `Only template01 is currently supported. Received: ${templateId}`
      );
    }
    const template = await this.loadTemplate(templateId);
    const body = await this.renderTemplate01(resumeData);
    return template.replace("{{TEMPLATE_CONTENT}}", body);
  }

  /**
   * Renders the content block for template01.
   * All sections/fields are optional. Key–value lists never include empty entries.
   */
  private async renderTemplate01(data: ResumeData): Promise<string> {
    const out: string[] = [];

    // --------- Contact Information -----------
    const fullName = this.trimJoin(
      [data?.personalInfo?.firstName, data?.personalInfo?.lastName].filter(
        Boolean
      ),
      " "
    );

    const introArgs = this.kvs([
      this.kv("fullname", fullName),
      this.kv("email", data?.personalInfo?.email),
      this.kv("phone", data?.personalInfo?.phone),
      this.kv("linkedin", this.stripScheme(data?.personalInfo?.linkedinUrl)),
      this.kv("github", this.stripScheme(data?.personalInfo?.githubUrl)),
    ]);

    if (introArgs) {
      out.push("% --------- Contact Information -----------");
      out.push(`\\introduction[${introArgs}]`);
      out.push("");
    }

    // --------- Summary -----------
    if (this.nonEmpty(data?.professionalSummary)) {
      out.push("% --------- Summary -----------");
      out.push(
        `\\summary{${this.escapeLatex(this.singleLine(data!.professionalSummary!))}}`
      );
      out.push("");
    }

    // --------- Education ---------
    if (Array.isArray(data?.education) && data!.education!.length > 0) {
      const eduBlocks: string[] = [];
      for (const edu of data!.education!) {
        // Map to ASU keys:
        const program = this.trimJoin(
          [edu?.degree, edu?.fieldOfStudy].filter(Boolean),
          ", "
        );
        const universityLocation = this.trimJoin(
          [edu?.institution, edu?.location].filter(Boolean),
          ", "
        );
        const grade = this.nonEmpty(edu?.gpa) ? `${edu!.gpa} GPA` : "";
        // Handle coursework - include label if there are courses
        let courseworkDisplay = "";
        if (edu?.coursework && edu.coursework.length > 0) {
          const validCoursework = edu.coursework.filter((s) => this.nonEmpty(s));
          if (validCoursework.length > 0) {
            courseworkDisplay = `Relevant coursework: ${validCoursework.join(", ")}`;
          }
        }

        // Build args list manually to ensure proper conditional handling
        const argsList: string[] = [];
        if (universityLocation) argsList.push(this.kv("university", universityLocation)!);
        if (edu?.fieldOfStudy) argsList.push(this.kv("college", edu.fieldOfStudy)!);
        if (program) argsList.push(this.kv("program", program)!);
        // Handle graduation date - determine if "Graduating" or date range
        let graduationDisplay = "";
        // Handle graduation date using same buildDateRange logic as work experience
        const graduationDate = edu?.graduationDate || edu?.endDate;
        if (graduationDate) {
          // Check if it's a future graduation
          let isFutureGraduation = false;
          try {
            if (graduationDate instanceof Date) {
              isFutureGraduation = graduationDate > new Date();
            } else if (typeof graduationDate === 'string' && graduationDate.includes('/')) {
              const [month, year] = graduationDate.split('/');
              const gradDate = new Date(parseInt(year), parseInt(month) - 1, 1);
              isFutureGraduation = gradDate > new Date();
            }
          } catch (error) {
            // Ignore parsing errors
          }

          if (isFutureGraduation) {
            // Future graduation - show "Graduating [date]"
            const dateStr = graduationDate instanceof Date 
              ? `${(graduationDate.getMonth() + 1).toString().padStart(2, '0')}/${graduationDate.getFullYear()}`
              : graduationDate;
            graduationDisplay = `Graduating ${dateStr}`;
          } else {
            // Past graduation - use buildDateRange like work experience
            graduationDisplay = this.buildDateRange(
              edu?.startDate,
              graduationDate,
              false // Never current for education
            );
            
            // If no start date, just show "Graduated [date]"
            if (!edu?.startDate && graduationDisplay) {
              graduationDisplay = `Graduated ${graduationDisplay}`;
            }
          }
        } else if (edu?.startDate) {
          // Currently enrolled without graduation date
          graduationDisplay = this.buildDateRange(
            edu.startDate,
            undefined,
            true // Current = "In Progress" 
          ).replace('Present', 'In Progress');
        }
        
        if (graduationDisplay) argsList.push(this.kv("graduation", graduationDisplay)!);
        if (grade) argsList.push(this.kv("grade", grade)!);
        if (courseworkDisplay) argsList.push(this.kv("coursework", courseworkDisplay)!);

        console.log(`📚 [TEMPLATE-DEBUG] Education block data:`, {
          graduationDate: edu?.graduationDate,
          graduationDateType: typeof edu?.graduationDate,
          startDate: edu?.startDate,
          startDateType: typeof edu?.startDate,
          endDate: edu?.endDate,
          endDateType: typeof edu?.endDate,
          graduationDisplay: graduationDisplay,
          coursework: edu?.coursework,
          courseworkDisplay: courseworkDisplay,
          hasCoursework: !!courseworkDisplay,
          argsList: argsList
        });

        if (argsList.length > 0) {
          const args = argsList.join(", ");
          eduBlocks.push(`    \\educationItem[${args}]`);
        }
      }

      if (eduBlocks.length > 0) {
        out.push("% --------- Education ---------");
        out.push("\\begin{educationSection}{Education}");
        out.push(...eduBlocks);
        out.push("\\end{educationSection}");
        out.push("");
      }
    }

    // --------- Skills -----------
    if (Array.isArray(data?.skills) && data!.skills!.length > 0) {
      // Group skills by category
      const byCat: Record<string, string[]> = {};
      for (const s of data!.skills!) {
        if (!this.nonEmpty(s?.name)) continue;
        const cat = this.nonEmpty(s?.category)
          ? s!.category!.trim()
          : "General";
        byCat[cat] = byCat[cat] || [];
        byCat[cat].push(s!.name!.trim());
      }

      const cats = Object.entries(byCat);
      if (cats.length > 0) {
        out.push("% --------- Skills -----------");
        out.push("\\begin{skillsSection}{Technical Skills}");
        cats.forEach(([cat, names], idx) => {
          const args = this.kvs([
            this.kv("category", cat),
            this.kv("skills", names.filter(this.nonEmpty).join(", ")),
          ]);
          if (args) {
            const isLast = idx === cats.length - 1;
            out.push(`    \\skillItem[${args}]${isLast ? "" : " \\\\"}`);
          }
        });
        out.push("\\end{skillsSection}");
        out.push("");
      }
    }

    // --------- Professional Experience -----------
    if (
      Array.isArray(data?.workExperience) &&
      data!.workExperience!.length > 0
    ) {
      const blocks: string[] = [];
      for (const exp of data!.workExperience!) {
        // \experienceItem[company, location, position, duration]
        const duration = this.buildDateRange(
          exp?.startDate,
          exp?.endDate,
          exp?.isCurrentJob
        );
        
        // Build args list manually to ensure proper conditional handling
        const argsList: string[] = [];
        if (exp?.company) argsList.push(this.kv("company", exp.company)!);
        if (exp?.location) argsList.push(this.kv("location", exp.location)!);
        if (exp?.jobTitle) argsList.push(this.kv("position", exp.jobTitle)!);
        if (duration) argsList.push(this.kv("duration", duration)!);

        console.log(`💼 [TEMPLATE-DEBUG] Work experience data:`, {
          startDate: exp?.startDate,
          startDateType: typeof exp?.startDate,
          endDate: exp?.endDate,
          endDateType: typeof exp?.endDate,
          isCurrentJob: exp?.isCurrentJob,
          duration: duration,
          hasDuration: !!duration,
          argsList: argsList
        });

        if (argsList.length === 0) continue;
        
        const args = argsList.join(", ");

        blocks.push(`    \\experienceItem[${args}]`);

        const bullets = [
          ...(exp?.responsibilities || []),
          ...(exp?.achievements || []),
        ]
          .map((t) => this.singleLine(t || ""))
          .filter((t) => this.nonEmpty(t));

        if (bullets.length > 0) {
          blocks.push("    \\begin{itemize}");
          blocks.push("        \\itemsep -6pt {}");
          for (const b of bullets) {
            blocks.push(`        \\item ${this.escapeLatex(b)}`);
          }
          blocks.push("    \\end{itemize}");
        }
        blocks.push("");
      }

      if (blocks.length > 0) {
        out.push("% --------- Experience -----------");
        out.push("\\begin{experienceSection}{Professional Experience}");
        out.push(...blocks);
        out.push("\\end{experienceSection}");
        out.push("");
      }
    }

    // --------- Projects -----------
    if (Array.isArray(data?.projects) && data!.projects!.length > 0) {
      const blocks: string[] = [];
      for (const proj of data!.projects!) {
        const title = proj?.name;
        const duration = this.buildDateRange(
          proj?.startDate,
          proj?.endDate,
          false
        );
        const keyHighlight = (proj?.description || [])
          .map((s) => this.singleLine(s || ""))
          .filter((s) => this.nonEmpty(s))[0];

        // Build args list manually to ensure proper conditional handling
        const argsList: string[] = [];
        if (title) argsList.push(this.kv("title", title)!);
        if (duration) argsList.push(this.kv("duration", duration)!);
        if (keyHighlight) argsList.push(this.kv("keyHighlight", keyHighlight)!);

        if (argsList.length === 0) continue;
        
        const args = argsList.join(", ");

        blocks.push(`    \\projectItem[${args}]`);

        // additional details
        const extra: string[] = [];
        // remaining description lines (beyond keyHighlight)
        const rest = (proj?.description || [])
          .map((s) => this.singleLine(s || ""))
          .filter((s) => this.nonEmpty(s))
          .slice(keyHighlight ? 1 : 0);
        extra.push(...rest);

        const techs = (proj?.technologies || [])
          .map((t) => (t ?? "").trim())
          .filter((t) => !!t);

        if (techs.length > 0) {
          extra.push(`Technologies used: ${techs.join(", ")}`);
        }

        if (extra.length > 0) {
          blocks.push("    \\begin{itemize}");
          blocks.push("        \\vspace{-0.5em}");
          blocks.push("        \\itemsep -6pt {}");
          for (const e of extra) {
            blocks.push(`        \\item ${this.escapeLatex(e)}`);
          }
          blocks.push("    \\end{itemize}");
        }
        blocks.push("");
      }

      if (blocks.length > 0) {
        out.push("% --------- Projects -----------");
        out.push("\\begin{experienceSection}{Projects}");
        out.push(...blocks);
        out.push("\\end{experienceSection}");
        out.push("");
      }
    }

    // --------- Other work experience / Volunteer -----------
    if (
      Array.isArray(data?.volunteerExperience) &&
      data!.volunteerExperience!.length > 0 &&
      data!.volunteerExperience!.some(vol => vol?.organization && vol?.role)
    ) {
      const blocks: string[] = [];
      for (const vol of data!.volunteerExperience!) {
        // Skip empty volunteer experiences
        if (!vol?.organization && !vol?.role) continue;
        const duration = this.buildDateRange(
          vol?.startDate,
          vol?.endDate,
          vol?.isCurrentRole
        );
        const args = this.kvs([
          this.kv("company", vol?.organization),
          this.kv("location", vol?.location),
          this.kv("position", vol?.role),
          this.kv("duration", duration),
        ]);
        if (!args) continue;

        blocks.push(`    \\experienceItem[${args}]`);

        const details = [
          ...(this.nonEmpty(vol?.description) ? [vol!.description!] : []),
          ...(vol?.achievements || []),
        ]
          .map((s) => this.singleLine(s || ""))
          .filter((s) => this.nonEmpty(s));

        if (details.length > 0) {
          blocks.push("    \\begin{itemize}");
          blocks.push("        \\vspace{-0.2em}");
          blocks.push("        \\itemsep -6pt {}");
          for (const d of details) {
            blocks.push(`        \\item ${this.escapeLatex(d)}`);
          }
          blocks.push("    \\end{itemize}");
        }
        blocks.push("");
      }

      if (blocks.length > 0) {
        out.push("% --------- Other work experience -----------");
        out.push("\\begin{experienceSection}{Other work experience}");
        out.push(...blocks);
        out.push("\\end{experienceSection}");
        out.push("");
      }
    }

    // --------- Activities / Awards -----------
    if (Array.isArray(data?.awards) && data!.awards!.length > 0) {
      const blocks: string[] = [];
      for (const a of data!.awards!) {
        const args = this.kvs([
          this.kv("title", a?.title),
          this.kv(
            "keyHighlight",
            this.nonEmpty(a?.description)
              ? a!.description!
              : this.nonEmpty(a?.issuer)
                ? `Award from ${a!.issuer}`
                : ""
          ),
          this.kv("duration", a?.date),
        ]);
        if (args) {
          blocks.push(`    \\projectItem[${args}]`);
          blocks.push("");
        }
      }

      if (blocks.length > 0) {
        out.push("% --------- Activities -----------");
        out.push("\\begin{experienceSection}{Activities}");
        out.push(...blocks);
        out.push("\\end{experienceSection}");
        out.push("");
      }
    }

    // If nothing was emitted, keep a harmless comment so the template compiles.
    if (out.length === 0) {
      out.push("% (intentionally left blank — no resume fields provided)");
    }

    return out.join("\n");
  }

  /**
   * Loads the .tex template shell that contains {{TEMPLATE_CONTENT}}.
   */
  private async loadTemplate(templateId: string): Promise<string> {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }
    const templatePath = path.join(
      this.templatesPath,
      "template01",
      "template01-standardized.tex"
    );
    const template = await fs.readFile(templatePath, "utf8");
    this.templateCache.set(templateId, template);
    return template;
  }

  /**
   * Escape LaTeX special characters for safe insertion in key values / text.
   * Keep this conservative—do not strip useful punctuation.
   */
  private escapeLatex(input: string): string {
    if (!this.nonEmpty(input)) return "";
    let text = String(input);

    // Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();

    // Replace common unicode punctuation
    text = text.replace(/[–—]/g, "--").replace(/…/g, "\\ldots{}");

    // Escape LaTeX specials
    const map: Array<[RegExp, string]> = [
      [/\\/g, "\\textbackslash{}"],
      [/{/g, "\\{"],
      [/}/g, "\\}"],
      [/\$/g, "\\$"],
      [/&/g, "\\&"],
      [/%/g, "\\%"],
      [/#/g, "\\#"],
      [/_/g, "\\_"],
      [/\^/g, "\\textasciicircum{}"],
      [/~/g, "\\textasciitilde{}"],
    ];
    for (const [re, rep] of map) text = text.replace(re, rep);

    return text;
  }

  /** Helper: is non-empty string after trim */
  private nonEmpty = (v?: string | null): v is string =>
    typeof v === "string" && v.trim().length > 0;

  /** Helper: join with sep, skipping empties */
  private trimJoin(parts: string[], sep: string): string {
    return parts
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(sep);
  }

  /** Helper: single line */
  private singleLine(s: string): string {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  /** Helper: remove scheme for \profilelink{...} which adds https:// itself */
  private stripScheme(url?: string): string {
    if (!this.nonEmpty(url)) return "";
    return url!.replace(/^https?:\/\//i, "");
  }

  /**
   * Build a single key=value pair (escaped) or return null if value is empty.
   * This is CRITICAL: we never output empty keys like `coursework=` which break xkeyval.
   */
  private kv(key: string, value?: string | null): string | null {
    if (!this.nonEmpty(value)) return null;
    return `${key}={${this.escapeLatex(value!)}}`;
  }

  /** Join non-empty kv pairs with ", " or return "" if none. */
  private kvs(items: Array<string | null | undefined>): string {
    return items
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .join(", ");
  }

  /** Build a human-friendly date range and escape safely. */
  private buildDateRange(
    start?: string | Date,
    end?: string | Date,
    isCurrent?: boolean
  ): string {
    console.log('🔍 [TEMPLATE-DEBUG] buildDateRange input:', {
      start: start,
      startType: typeof start,
      end: end,
      endType: typeof end,
      isCurrent: isCurrent
    });
    
    // Handle Date objects by converting to MM/YYYY format for resumes
    const formatDateForResume = (date: string | Date | undefined): string => {
      if (!date) return "";
      
      if (typeof date === 'string') {
        return date; // Already formatted
      }
      
      if (date instanceof Date) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return `${month}/${year}`;
      }
      
      return "";
    };
    
    const startStr = formatDateForResume(start);
    const endStr = formatDateForResume(end);
    
    const s = this.nonEmpty(startStr) ? startStr!.trim() : "";
    const e = isCurrent ? "Present" : this.nonEmpty(endStr) ? endStr!.trim() : "";
    
    console.log('🔍 [TEMPLATE-DEBUG] buildDateRange processing:', {
      startStr: startStr,
      endStr: endStr,
      s: s,
      e: e,
      result: s && e ? `${s} -- ${e}` : s && !e ? s : !s && e ? e : ""
    });
    
    if (s && e) return `${s} -- ${e}`;
    if (s && !e) return s;
    if (!s && e) return e;
    return "";
  }

  /**
   * Returns all available templates, but only template01 is enabled for LaTeX generation.
   */
  async getAvailableTemplates(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      screenshotUrl?: string;
      category: string;
      enabled?: boolean;
    }>
  > {
    try {
      // Get all template directories
      const templateDirs = await fs.readdir(this.templatesPath);
      const templates = [];

      for (const dir of templateDirs) {
        // Skip files (only process directories)
        if (!dir.startsWith('template')) continue;

        const templatePath = path.join(this.templatesPath, dir);
        
        try {
          const stat = await fs.stat(templatePath);
          if (!stat.isDirectory()) continue;

          // Try to read config file if it exists
          const configPath = path.join(templatePath, `${dir}-config.json`);
          let config = null;
          try {
            const configData = await fs.readFile(configPath, 'utf8');
            config = JSON.parse(configData);
          } catch {
            // Config file doesn't exist or is invalid, continue with defaults
          }

          // Look for screenshot image
          const files = await fs.readdir(templatePath);
          const screenshotFile = files.find(file => file.match(/\.(jpeg|jpg|png)$/i));
          const screenshotUrl = screenshotFile ? `/templates/${dir}/${screenshotFile}` : undefined;

          templates.push({
            id: dir,
            name: config?.name || `Template ${dir.replace('template', '')}`,
            description: config?.description || `Professional resume template with modern design.`,
            screenshotUrl,
            category: config?.category || "professional",
            enabled: dir === "template01" // Only template01 is enabled for LaTeX generation
          });
        } catch (error) {
          console.warn(`Failed to process template ${dir}:`, error);
          continue;
        }
      }

      // Sort by template number
      templates.sort((a, b) => {
        const numA = parseInt(a.id.replace('template', '') || '0');
        const numB = parseInt(b.id.replace('template', '') || '0');
        return numA - numB;
      });

      return templates;
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Fallback to template01 only
      return [
        {
          id: "template01",
          name: "ASU Sparky Sundevil Resume",
          description:
            "Professional academic resume template designed at Arizona State University featuring clean sections and excellent readability. Perfect for students and early career professionals in technical fields.",
          screenshotUrl: "/templates/template01/33592.jpeg",
          category: "academic",
          enabled: true,
        },
      ];
    }
  }
}

// Export singleton instance
export const templateService = new TemplateService();
