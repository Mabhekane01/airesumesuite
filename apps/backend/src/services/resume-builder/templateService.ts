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
  };
  professionalSummary: string;
  workExperience: Array<{ 
    id?: string;
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
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationDate: string;
    startDate: string;
    endDate?: string;
    location?: string;
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
    id?: string;
    name: string;
    description: string[];
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{ 
    id?: string;
    name: string;
    issuer: string;
    date: string;
    expirationDate?: string;
    credentialId?: string;
    url?: string;
    description?: string;
  }>;
  languages?: Array<{ 
    id?: string;
    name: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  }>;
  volunteerExperience?: Array<{ 
    id?: string;
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
    id?: string;
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  publications?: Array<{ 
    id?: string;
    title: string;
    publisher: string;
    publicationDate: string;
    url?: string;
    description?: string;
  }>;
  references?: Array<{ 
    id?: string;
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
  trackingUrl?: string;
}

/**
 * -------- Template service --------
 * Generates EXACT ASU Sparky Sundevil LaTeX markup while making ALL keys optional.
 * Critically, this never emits empty key/value pairs (e.g., `coursework=`), which
 * would break xkeyval/etoolbox with "Invalid boolean expression".
 */
export class TemplateService {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "frontend",
      "public",
      "templates"
    );
    console.log('📂 [TemplateService] Templates path (resolved via __dirname):', this.templatesPath);
  }

  /**
   * Generate LaTeX for the specified template.
   * Attempts to load the requested template, falling back to template01 if not found.
   */
  async generateLatex(
    templateId: string,
    resumeData: ResumeData
  ): Promise<string> {
    // Attempt to load the requested template
    let template: string;
    try {
      template = await this.loadTemplate(templateId);
    } catch (error) {
      console.warn(`⚠️ Template ${templateId} not found or failed to load. Falling back to template01.`);
      template = await this.loadTemplate("template01");
    }
    
    // Inject custom command definitions to ensure compatibility with all templates
    // SKIP for template01 as it has its own strict definitions in resume.cls
    if (templateId !== 'template01') {
      const definitions = `
% ------------ AI Resume Suite Custom Commands ------------
\\ifx\\introduction\\undefined
  \\usepackage{etoolbox}
  \\usepackage{keycommand}
  \\usepackage{xstring}

  \\def \\separator { \\textbf{\\Large\\textbullet} }

  \\newkeycommand{\\introduction}[fullname,email,phone,linkedin,github]{%
      \\begin{center}
          {\\Huge\\bfseries \\commandkey{fullname}} \\\\
          \\vspace{0.5em}
          \\ifcommandkey{phone}{\\commandkey{phone}}{}
          \\ifcommandkey{email}{\\ifcommandkey{phone}{ \\separator }{} \\href{mailto:\\commandkey{email}}{\\commandkey{email}}}{}
          \\ifcommandkey{linkedin}{\\ifcommandkey{email}{ \\separator }{\\ifcommandkey{phone}{ \\separator }{}} \\href{https://\\commandkey{linkedin}}{\\commandkey{linkedin}}}{}
          \\ifcommandkey{github}{\\ifcommandkey{linkedin}{ \\separator }{\\ifcommandkey{email}{ \\separator }{\\ifcommandkey{phone}{ \\separator }{}}}} \\href{https://\\commandkey{github}}{\\commandkey{github}}{}
      \\end{center}
  }

  \\providecommand{\\summary}[1]{ \\section{Summary} #1 }

  \\ifx\\educationSection\\undefined
    \\newenvironment{educationSection}[1]{ \\section{#1} }{}
  \\fi

  \\newkeycommand{\\educationItem}[university,college,program,graduation,grade,coursework]{%
      {\\bfseries \\commandkey{program}} \\hfill \\commandkey{graduation} \\\\
      \\ifcommandkey{university}{\\commandkey{university} \\ifcommandkey{grade}{\\hfill \\commandkey{grade}}{} \\\\ }{}
      \\ifcommandkey{college}{\\commandkey{college} \\\\ }{}
      \\ifcommandkey{coursework}{{\\small \\commandkey{coursework}} \\\\ }{}
      \\vspace{0.5em}
  }

  \\ifx\\skillsSection\\undefined
    \\newenvironment{skillsSection}[1]{ \\section{#1} }{}
  \\fi

  \\newkeycommand{\\skillItem}[category,skills]{%
      {\\bfseries \\commandkey{category}:} \\commandkey{skills}
  }

  \\ifx\\experienceSection\\undefined
    \\newenvironment{experienceSection}[1]{ \\section{#1} }{}
  \\fi

  \\newkeycommand{\\experienceItem}[company,position,location,duration]{%
      {\\bfseries \\commandkey{company}} \\ifcommandkey{location}{, \\commandkey{location}}{} \\hfill \\commandkey{duration} \\\\
      {\\itshape \\commandkey{position}}%
  }

  \\newkeycommand{\\projectItem}[title,duration,keyHighlight]{%
      {\\bfseries \\commandkey{title}} \\hfill \\commandkey{duration} \\\\
      \\commandkey{keyHighlight}%
  }
\\fi
% ---------------------------------------------------------
`;

      // Inject packages and definitions after \documentclass or at top
      if (template.includes("\\documentclass")) {
        template = template.replace(/(\\documentclass.*)/, `$1\n${definitions}`);
      } else {
        template = definitions + "\n" + template;
      }
    }

    // Use specialized renderer for basic_sa if requested
    const body = templateId === 'basic_sa' 
      ? await this.renderBasicSA(resumeData)
      : await this.renderTemplate01(resumeData);
      
    return template.replace("{{TEMPLATE_CONTENT}}", body);
  }

  /**
   * Specialized renderer for South African Basic CV style
   */
  private async renderBasicSA(data: ResumeData): Promise<string> {
    const out: string[] = [];
    const info = data.personalInfo;

    // ---------- HEADING -----------------
    const fullName = `${info.firstName || ''} ${info.lastName || ''}`.trim();
    out.push(`\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}`);
    out.push(`  \\textbf{{\\LARGE ${this.escapeLatex(fullName)}}} & Email: ${this.escapeLatex(info.email || 'Available upon request')}\\\\`);
    
    // Address handling
    const address = info.residentialAddress || info.location || '';
    const addressLines = address.split('\n').filter(l => l.trim().length > 0);
    const line1 = addressLines[0] || '';
    const line2 = addressLines.slice(1).join(', ') || '';
    const phone = info.phone || 'Available upon request';
    const idNum = info.identityNumber || 'Available upon request';
    
    out.push(`  ${this.escapeLatex(line1)} & Mobile: ${this.escapeLatex(phone)} \\\\`);
    out.push(`  ${this.escapeLatex(line2)} & ID: ${this.escapeLatex(idNum)} \\\\`);
    out.push(`\\end{tabular*}`);
    out.push(``);

    // ----------- EDUCATION -----------------
    if (data.education && data.education.length > 0) {
      out.push(`\\section{Education}`);
      out.push(`  \\resumeSubHeadingListStart`);
      
      for (const edu of data.education) {
        const institution = edu.institution || '';
        const location = edu.location || 'South Africa';
        const degree = edu.degree || '';
        const dateRange = this.buildDateRange(edu.startDate, edu.graduationDate || edu.endDate);
        
        out.push(`    \\resumeSubheading`);
        out.push(`      {${this.escapeLatex(institution)}}{${this.escapeLatex(location)}}`);
        out.push(`      {${this.escapeLatex(degree)}}{${this.escapeLatex(dateRange)}}`);
        
        // Subjects and details
        const details: string[] = [];
        if (edu.fieldOfStudy) details.push(`\\textbf{Field:} ${this.escapeLatex(edu.fieldOfStudy)}`);
        if (edu.coursework && edu.coursework.length > 0) {
          details.push(`\\textbf{Subjects:} ${this.escapeLatex(edu.coursework.join(', '))}`);
        }
        
        if (details.length > 0) {
          out.push(`      \\resumeItemListStart`);
          out.push(`        \\resumeItemWithoutTitle{${details.join(', ')}}`);
          out.push(`      \\resumeItemListEnd`);
        }
      }
      out.push(`  \\resumeSubHeadingListEnd`);
      out.push(``);
    }

    // ----------- SKILLS SUMMARY -----------------
    if (data.skills && data.skills.length > 0) {
      out.push(`\\section{Skills Summary}`);
      out.push(`  \\resumeSubHeadingListStart`);
      
      // Group skills by category if possible, or just list them
      const skillsByCategory: Record<string, string[]> = {};
      data.skills.forEach(s => {
        const cat = s.category || 'General';
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        if (!skillsByCategory[catName]) skillsByCategory[catName] = [];
        skillsByCategory[catName].push(s.name);
      });
      
      for (const [cat, names] of Object.entries(skillsByCategory)) {
        out.push(`    \\resumeSubItem{${this.escapeLatex(cat)}}{${this.escapeLatex(names.join(', '))}}`);
      }
      
      // Add languages here if present
      if (info.homeLanguage || info.otherLanguages) {
        const langs = [info.homeLanguage, info.otherLanguages].filter(Boolean).join(', ');
        out.push(`    \\resumeSubItem{Languages}{${this.escapeLatex(langs)}}`);
      }
      
      out.push(`  \\resumeSubHeadingListEnd`);
      out.push(``);
    }

    // ----------- PROFESSIONAL EXPERIENCE -----------------
    if (data.workExperience && data.workExperience.length > 0) {
      out.push(`\\section{Professional Experience}`);
      out.push(`  \\resumeSubHeadingListStart`);
      
      for (const exp of data.workExperience) {
        const company = exp.company || '';
        const location = exp.location || 'South Africa';
        const role = exp.jobTitle || '';
        const duration = this.buildDateRange(exp.startDate, exp.endDate, exp.isCurrentJob);
        
        out.push(`    \\resumeSubheading`);
        out.push(`      {${this.escapeLatex(company)}}{${this.escapeLatex(location)}}`);
        out.push(`      {${this.escapeLatex(role)}}{${this.escapeLatex(duration)}}`);
        
        if (exp.responsibilities && exp.responsibilities.length > 0) {
          out.push(`      \\resumeItemListStart`);
          for (const resp of exp.responsibilities) {
            if (this.nonEmpty(resp)) {
              // Split by newline in case multiple items were entered in one block
              const lines = resp.split('\n').filter(l => l.trim().length > 0);
              for (const line of lines) {
                out.push(`        \\resumeItemWithoutTitle{${this.escapeLatex(line)}}`);
              }
            }
          }
          out.push(`      \\resumeItemListEnd`);
        }
      }
      out.push(`  \\resumeSubHeadingListEnd`);
      out.push(``);
    }

    // ----------- PERSONAL INFORMATION -----------------
    out.push(`\\section{Personal Information}`);
    out.push(`  \\resumeSubHeadingListStart`);
    if (info.nationality) out.push(`    \\resumeSubItem{Nationality}{${this.escapeLatex(info.nationality)}}`);
    if (info.gender) out.push(`    \\resumeSubItem{Gender}{${this.escapeLatex(info.gender)}}`);
    if (info.maritalStatus) out.push(`    \\resumeSubItem{Marital Status}{${this.escapeLatex(info.maritalStatus)}}`);
    out.push(`    \\resumeSubItem{Health Status}{Excellent}`);
    out.push(`    \\resumeSubItem{Availability}{Immediate}`);
    out.push(`  \\resumeSubHeadingListEnd`);
    out.push(``);

    // ----------- REFERENCES -----------------
    if (data.references && data.references.length > 0) {
      out.push(`\\section{References}`);
      out.push(`  \\resumeSubHeadingListStart`);
      for (const ref of data.references) {
        const title = ref.title || 'Reference';
        const company = ref.company || '';
        const contact = ref.phone || ref.email || 'Available upon request';
        
        out.push(`    \\resumeSubheading`);
        out.push(`      {${this.escapeLatex(ref.name)} - ${this.escapeLatex(title)}}{${this.escapeLatex(company)}}`);
        out.push(`      {Contact: ${this.escapeLatex(contact)}}{Available upon request}`);
      }
      out.push(`  \\resumeSubHeadingListEnd`);
      out.push(``);
    }

    // ----------- DECLARATION -----------------
    out.push(`\\section{Declaration}`);
    out.push(`\\small{I, ${this.escapeLatex(fullName)}, hereby declare that the above information is true and correct to the best of my knowledge.}`);

    return out.join('\n');
  }

  /**
   * Renders the content block for template01.
   * All sections/fields are optional. Key–value lists never include empty entries.
   */
  private async renderTemplate01(data: ResumeData): Promise<string> {
    const out: string[] = [];

    // --------- Contact Information -----------
    const phoneDisplay = data?.personalInfo?.phone;

    let githubDisplay = this.stripScheme(data?.personalInfo?.githubUrl);
    const siteUrl = this.stripScheme(data?.personalInfo?.portfolioUrl || data?.personalInfo?.websiteUrl);
    
    if (this.nonEmpty(siteUrl)) {
      if (this.nonEmpty(githubDisplay)) {
        githubDisplay = `${githubDisplay} | ${siteUrl}`;
      } else {
        githubDisplay = siteUrl;
      }
    }

    let fullName = this.trimJoin(
      [data?.personalInfo?.firstName, data?.personalInfo?.lastName].filter(
        Boolean
      ),
      " "
    );

    // Append professional title if present (not supported natively by template01)
    if (this.nonEmpty(data?.personalInfo?.professionalTitle)) {
       fullName += `, ${data!.personalInfo!.professionalTitle}`;
    }

    const introArgs = this.kvs([
      this.kv("fullname", fullName),
      this.kv("email", data?.personalInfo?.email),
      this.kv("phone", phoneDisplay),
      this.kv("linkedin", this.stripScheme(data?.personalInfo?.linkedinUrl)),
      this.kv("github", githubDisplay),
    ]);

    if (introArgs) {
      out.push("% --------- Contact Information -----------");
      out.push(`\\introduction[${introArgs}]`);
      out.push("");
    }

    // --------- Summary -----------
    const summaryText = this.singleLine(data?.professionalSummary || "");
    if (this.nonEmpty(summaryText)) {
      out.push("% --------- Summary -----------");
      out.push(
        `\\summary{${this.escapeLatex(summaryText)}}`
      );
      out.push("");
    }

    // --------- Education ---------
    if (Array.isArray(data?.education) && data!.education!.length > 0) {
      const eduBlocks: string[] = [];
      for (let i = 0; i < data!.education!.length; i++) {
        const edu = data!.education![i];
        
        // Deduplicate degree and field of study (more aggressively)
        const programParts = [edu?.degree, edu?.fieldOfStudy].filter(p => this.nonEmpty(p));
        const uniqueProgramParts: string[] = [];
        for (const p of programParts) {
          const trimmed = p!.trim();
          const lower = trimmed.toLowerCase();
          // If this part is already included in another part (e.g. "Computer Science" in "B.S. Computer Science")
          // or vice versa, we keep only the longer/more specific one.
          const isDuplicate = uniqueProgramParts.some((existing, idx) => {
            const exLower = existing.toLowerCase();
            if (exLower.includes(lower)) return true; // Already covered
            if (lower.includes(exLower)) {
              uniqueProgramParts[idx] = trimmed; // Current is more specific
              return true;
            }
            return false;
          });
          if (!isDuplicate) {
            uniqueProgramParts.push(trimmed);
          }
        }
        const program = uniqueProgramParts.join(", ");

        const university = edu?.institution;
        const college = edu?.location;
        const grade = this.nonEmpty(edu?.gpa) ? `${edu!.gpa} GPA` : "";
        let courseworkDisplay = "";
        if (edu?.coursework && edu.coursework.length > 0) {
          const validCoursework = edu.coursework.filter((s) => this.nonEmpty(s));
          if (validCoursework.length > 0) {
            courseworkDisplay = validCoursework.join(", ");
          }
        }

        // Graduation Date logic
        let graduationDisplay = "";
        const graduationDate = edu?.graduationDate || edu?.endDate;
        if (graduationDate) {
          let isFutureGraduation = false;
          try {
            if ((graduationDate as unknown) instanceof Date) {
              isFutureGraduation = (graduationDate as unknown as Date) > new Date();
            } else if (typeof graduationDate === 'string' && graduationDate.includes('/')) {
              const [month, year] = graduationDate.split('/');
              const gradDate = new Date(parseInt(year), parseInt(month) - 1, 1);
              isFutureGraduation = gradDate > new Date();
            }
          } catch (error) {}

          if (isFutureGraduation) {
            const dateStr = (graduationDate as unknown) instanceof Date 
              ? `${((graduationDate as unknown as Date).getMonth() + 1).toString().padStart(2, '0')}/${(graduationDate as unknown as Date).getFullYear()}`
              : graduationDate;
            graduationDisplay = `Graduating ${dateStr}`;
          } else {
            graduationDisplay = this.buildDateRange(edu?.startDate, graduationDate, false);
            if (!edu?.startDate && graduationDisplay) {
              graduationDisplay = `Graduated ${graduationDisplay}`;
            }
          }
        } else if (edu?.startDate) {
          graduationDisplay = this.buildDateRange(edu.startDate, undefined, true).replace('Present', 'In Progress');
        }

        // Build args list manually
        const argsList: string[] = [];
        const universityVal = this.kv("university", university);
        if (universityVal) argsList.push(universityVal);

        const collegeVal = this.kv("college", college);
        if (collegeVal) argsList.push(collegeVal);
        
        const programVal = this.kv("program", program);
        if (programVal) argsList.push(programVal);
        
        const gradVal = this.kv("graduation", graduationDisplay);
        if (gradVal) argsList.push(gradVal);
        
        const gradeVal = this.kv("grade", grade);
        if (gradeVal) argsList.push(gradeVal);
        
        const courseworkVal = this.kv("coursework", courseworkDisplay);
        if (courseworkVal) argsList.push(courseworkVal);

        if (argsList.length > 0) {
          const args = argsList.join(", ");
          const isLast = i === data!.education!.length - 1;
          // Use blank line between items for better robustness than \\
          eduBlocks.push(`    \\educationItem[${args}]`);
          if (!isLast) eduBlocks.push("");
        }
      }

      if (eduBlocks.length > 0) {
        out.push("% --------- Education -----------");
        out.push(`\\begin{educationSection}{Education}`);
        out.push(...eduBlocks);
        out.push(`\\end{educationSection}`);
        out.push("");
      }
    }

    // --------- Skills -----------
    if (Array.isArray(data?.skills) && data!.skills!.length > 0) {
      const byCat: Record<string, string[]> = {};
      for (const s of data!.skills!) {
        if (!this.nonEmpty(s?.name)) continue;
        const catRaw = this.nonEmpty(s?.category) ? s!.category!.trim() : "General";
        const cat = catRaw.charAt(0).toUpperCase() + catRaw.slice(1);
        byCat[cat] = byCat[cat] || [];
        byCat[cat].push(s!.name!.trim());
      }

      const cats = Object.entries(byCat);
      if (cats.length > 0) {
        out.push("% --------- Skills -----------");
        out.push(`\\begin{skillsSection}{Technical Skills}`);
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
        out.push(`\\end{skillsSection}`);
        out.push("");
      }
    }

    // --------- Professional Experience -----------
    if (Array.isArray(data?.workExperience) && data!.workExperience!.length > 0) {
      const blocks: string[] = [];
      for (const exp of data!.workExperience!) {
        const duration = this.buildDateRange(exp?.startDate, exp?.endDate, exp?.isCurrentJob);
        
        const argsList: string[] = [];
        if (exp?.company) argsList.push(this.kv("company", exp.company)!);
        if (exp?.location) argsList.push(this.kv("location", exp.location)!);
        if (exp?.jobTitle) argsList.push(this.kv("position", exp.jobTitle)!);
        if (duration) argsList.push(this.kv("duration", duration)!);

        if (argsList.length === 0) continue;
        
        const args = argsList.join(", ");
        blocks.push(`    \\experienceItem[${args}]`);

        const bullets = [
          ...(exp?.responsibilities || []),
          ...(exp?.achievements || []),
        ].map((t) => this.singleLine(t || "")).filter((t) => this.nonEmpty(t));

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
        out.push(`\\begin{experienceSection}{Professional Experience}`);
        out.push(...blocks);
        out.push(`\\end{experienceSection}`);
        out.push("");
      }
    }

    // --------- Projects -----------
    if (Array.isArray(data?.projects) && data!.projects!.length > 0) {
      const blocks: string[] = [];
      for (const proj of data!.projects!) {
        let title = proj?.name || "";
        if (proj?.url) {
            title += ` (${this.stripScheme(proj.url)})`;
        }

        const duration = this.buildDateRange(proj?.startDate, proj?.endDate, false);
        const keyHighlight = (proj?.description || []).map((s) => this.singleLine(s || "")).filter((s) => this.nonEmpty(s))[0];

        const argsList: string[] = [];
        if (title) argsList.push(this.kv("title", title)!);
        if (duration) argsList.push(this.kv("duration", duration)!);
        if (keyHighlight) argsList.push(this.kv("keyHighlight", keyHighlight)!);

        if (argsList.length === 0) continue;
        
        const args = argsList.join(", ");
        blocks.push(`    \\projectItem[${args}]`);

        const extra: string[] = [];
        const rest = (proj?.description || []).map((s) => this.singleLine(s || "")).filter((s) => this.nonEmpty(s)).slice(keyHighlight ? 1 : 0);
        extra.push(...rest);

        const techs = (proj?.technologies || []).map((t) => (t ?? "").trim()).filter((t) => !!t);
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
        out.push(`\\begin{experienceSection}{Projects}`);
        out.push(...blocks);
        out.push(`\\end{experienceSection}`);
        out.push("");
      }
    }

    // --------- Certifications -----------
    if (Array.isArray(data?.certifications) && data!.certifications!.length > 0) {
      const blocks: string[] = [];
      for (const cert of data!.certifications!) {
        let title = cert?.name || "";
        if (cert?.url) {
           title += ` (${this.stripScheme(cert.url)})`; 
        }

        const argsList: string[] = [];
        if (title) argsList.push(this.kv("title", title)!);
        if (cert?.date) argsList.push(this.kv("duration", this.buildDateRange(cert.date))!);
        if (cert?.issuer) argsList.push(this.kv("keyHighlight", `Issued by ${cert.issuer}`)!);

        if (argsList.length > 0) {
          blocks.push(`    \\projectItem[${argsList.join(", ")}]`);
          
          if (cert?.description) {
            blocks.push("    \\begin{itemize}");
            blocks.push("        \\vspace{-0.5em}");
            blocks.push("        \\itemsep -6pt {}");
            blocks.push(`        \\item ${this.escapeLatex(cert.description)}`);
            blocks.push("    \\end{itemize}");
          }
          blocks.push("");
        }
      }

      if (blocks.length > 0) {
        out.push("% --------- Certifications -----------");
        out.push(`\\begin{experienceSection}{Certifications}`);
        out.push(...blocks);
        out.push(`\\end{experienceSection}`);
        out.push("");
      }
    }

    // --------- Publications -----------
    if (Array.isArray(data?.publications) && data!.publications!.length > 0) {
      const blocks: string[] = [];
      for (const pub of data!.publications!) {
        let title = pub?.title || "";
        if (pub?.url) {
           title += ` (${this.stripScheme(pub.url)})`; 
        }

        const argsList: string[] = [];
        if (title) argsList.push(this.kv("title", title)!);
        if (pub?.publicationDate) argsList.push(this.kv("duration", this.buildDateRange(pub.publicationDate))!);
        if (pub?.publisher) argsList.push(this.kv("keyHighlight", `Published by ${pub.publisher}`)!);

        if (argsList.length > 0) {
          blocks.push(`    \\projectItem[${argsList.join(", ")}]`);
          
          if (pub?.description) {
            blocks.push("    \\begin{itemize}");
            blocks.push("        \\vspace{-0.5em}");
            blocks.push("        \\itemsep -6pt {}");
            blocks.push(`        \\item ${this.escapeLatex(pub.description)}`);
            blocks.push("    \\end{itemize}");
          }
          blocks.push("");
        }
      }

      if (blocks.length > 0) {
        out.push("% --------- Publications -----------");
        out.push(`\\begin{experienceSection}{Publications}`);
        out.push(...blocks);
        out.push(`\\end{experienceSection}`);
        out.push("");
      }
    }

    // --------- Languages -----------
    if (Array.isArray(data?.languages) && data!.languages!.length > 0) {
        const byProf: Record<string, string[]> = {};
        for (const l of data!.languages!) {
            if (!this.nonEmpty(l?.name)) continue;
            const prof = this.nonEmpty(l?.proficiency) ? l!.proficiency : "Languages";
            byProf[prof] = byProf[prof] || [];
            byProf[prof].push(l!.name!);
        }
        const profs = Object.entries(byProf);
        if (profs.length > 0) {
            out.push("% --------- Languages -----------");
            out.push(`\\begin{skillsSection}{Languages}`);
            profs.forEach(([prof, names], idx) => {
                const profLabel = prof.charAt(0).toUpperCase() + prof.slice(1);
                const args = this.kvs([
                    this.kv("category", profLabel),
                    this.kv("skills", names.join(", ")),
                ]);
                if (args) {
                    const isLast = idx === profs.length - 1;
                    out.push(`    \\skillItem[${args}]${isLast ? "" : " \\\\"}`);
                }
            });
            out.push(`\\end{skillsSection}`);
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
        if (!vol?.organization && !vol?.role) continue;
        const duration = this.buildDateRange(vol?.startDate, vol?.endDate, vol?.isCurrentRole);
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
        ].map((s) => this.singleLine(s || "")).filter((s) => this.nonEmpty(s));

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
        out.push(`\\begin{experienceSection}{Other work experience}`);
        out.push(...blocks);
        out.push(`\\end{experienceSection}`);
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
            this.nonEmpty(a?.issuer) ? `Issued by ${a!.issuer}` : ""
          ),
          this.kv("duration", a?.date),
        ]);
        if (args) {
          blocks.push(`    \\projectItem[${args}]`);
          
          if (a?.description && a.description !== a.title) {
             blocks.push("    \\begin{itemize}");
             blocks.push("        \\vspace{-0.5em}");
             blocks.push("        \\itemsep -6pt {}");
             blocks.push(`        \\item ${this.escapeLatex(a.description)}`);
             blocks.push("    \\end{itemize}");
          }
          blocks.push("");
        }
      }

      if (blocks.length > 0) {
        out.push("% --------- Activities -----------");
        out.push(`\\begin{experienceSection}{Activities}`);
        out.push(...blocks);
        out.push(`\\end{experienceSection}`);
        out.push("");
      }
    }
    
    // --------- Hobbies -----------
    if (Array.isArray(data?.hobbies) && data!.hobbies!.length > 0) {
        const hobbyList = data!.hobbies!.map(h => h.name).filter(Boolean).join(", ");
        if (hobbyList) {
             out.push("% --------- Hobbies -----------");
             out.push(`\\begin{skillsSection}{Interests}`);
             out.push(`    \\skillItem[category={Hobbies}, skills={${this.escapeLatex(hobbyList)}}]`);
             out.push(`\\end{skillsSection}`);
             out.push("");
        }
    }
    
    // --------- References -----------
    if (Array.isArray(data?.references) && data!.references!.length > 0) {
         const blocks: string[] = [];
         for (const ref of data!.references!) {
             const args = this.kvs([
                 this.kv("title", ref?.name),
                 this.kv("keyHighlight", `${ref?.title}, ${ref?.company}`),
             ]);
              if (args) {
                blocks.push(`    \\projectItem[${args}]`);
                if (ref?.email || ref?.phone || ref?.relationship) {
                    blocks.push("    \\begin{itemize}");
                    blocks.push("        \\vspace{-0.5em}");
                    blocks.push("        \\itemsep -6pt {}");
                    if (ref.email) blocks.push(`        \\item Email: ${this.escapeLatex(ref.email)}`);
                    if (ref.phone) blocks.push(`        \\item Phone: ${this.escapeLatex(ref.phone)}`);
                    if (ref.relationship) blocks.push(`        \\item Relationship: ${this.escapeLatex(ref.relationship)}`);
                    blocks.push("    \\end{itemize}");
                }
                blocks.push("");
              }
         }
         if (blocks.length > 0) {
            out.push("% --------- References -----------");
            out.push(`\\begin{experienceSection}{References}`);
            out.push(...blocks);
            out.push(`\\end{experienceSection}`);
            out.push("");
         }
    }

    // --------- Additional Sections -----------
    if (Array.isArray(data?.additionalSections) && data!.additionalSections!.length > 0) {
      const blocks: string[] = [];
      for (const section of data!.additionalSections!) {
        blocks.push(`    \\begin{experienceSection}{${this.escapeLatex(section.title)}}`);
        blocks.push(`    ${this.escapeLatex(section.content)}`);
        blocks.push(`    \\end{experienceSection}`);
        blocks.push("");
      }
      if (blocks.length > 0) {
          out.push("% --------- Additional Sections -----------");
          out.push(...blocks);
          out.push("");
      }
    }

    // --------- Tracking Footer -----------
    if (this.nonEmpty(data.trackingUrl)) {
      out.push("");
      out.push("% --------- Tracking Footer -----------");
      out.push("\\vfill");
      out.push("\\begin{center}");
      out.push(`\\footnotesize \\color{gray} View the latest version of this architecture at \\href{${data.trackingUrl}}{${this.escapeLatex(data.trackingUrl)}}`);
      out.push("\\end{center}");
    }

    if (out.length === 0) {
      out.push("% (intentionally left blank — no resume fields provided)");
      out.push("\\begin{center}");
      out.push("  \\Large Resume Data Not Provided");
      out.push("  \\\\ \\vspace{1em}");
      out.push("  \\small Please fill in your details to generate a preview.");
      out.push("\\end{center}");
    }

    return out.join("\n");
  }

  private async loadTemplate(templateId: string): Promise<string> {
    const templatePath = path.join(this.templatesPath, templateId, `${templateId}-standardized.tex`);
    console.log(`📄 [TemplateService] Reading template from: ${templatePath}`);
    try {
      await fs.access(templatePath);
    } catch {
      console.error(`❌ [TemplateService] Template not found: ${templatePath}`);
      throw new Error(`Template file not found: ${templatePath}`);
    }
    const template = await fs.readFile(templatePath, "utf8");
    console.log(`✅ [TemplateService] Loaded template ${templateId}, length: ${template.length}`);
    return template;
  }

  private escapeLatex(input: string | number | null | undefined): string {
    if (input === null || input === undefined) return "";
    let text = String(input);
    if (text.trim().length === 0) return "";
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/[–—]/g, "--").replace(/…/g, "\\ldots{}");
    const map: Array<[RegExp, string]> = [
      [/\\/g, "\\textbackslash{}"],
      [/{/g, "\\\\{"],
      [/}/g, "\\\\}"],
      [/\$/g, "\\$"],
      [/&/g, "\\&"],
      [/%/g, "\\%"],
      [/#/g, "\\#"],
      [/_/g, "\\_"],
      [/\\^/g, "\\\\textasciicircum{}"],
      [/~/g, "\\\\textasciitilde{}"],
    ];
    for (const [re, rep] of map) text = text.replace(re, rep);
    return text;
  }

  private nonEmpty = (v?: string | number | null): boolean => {
    if (v === null || v === undefined) return false;
    return String(v).trim().length > 0;
  }

  private trimJoin(parts: (string | number | undefined | null)[], sep: string): string {
    return parts.map((s) => (s ?? "").toString().trim()).filter((s) => s.length > 0).join(sep);
  }

  private singleLine(s: string | number | null | undefined): string {
    return (String(s || "")).replace(/\s+/g, " ").trim();
  }

  private stripScheme(url?: string): string {
    if (!url || typeof url !== 'string' || url.trim().length === 0) return "";
    return url.replace(/^https?:\/\//i, "");
  }

  private kv(key: string, value?: string | number | null): string | null {
    if (!this.nonEmpty(value)) return null;
    return `${key}={${this.escapeLatex(value)}}`;
  }

  private kvs(items: Array<string | null | undefined>): string {
    return items.filter((x): x is string => typeof x === "string" && x.length > 0).join(", ");
  }

  private buildDateRange(start?: string | Date, end?: string | Date, isCurrent?: boolean): string {
    const formatDateForResume = (date: string | Date | undefined): string => {
      if (!date) return "";
      if (typeof date === 'string') return date;
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
    if (s && e) return `${s} -- ${e}`;
    if (s && !e) return s;
    if (!s && e) return e;
    return "";
  }

  async getAvailableTemplates(): Promise<Array<{id: string; name: string; description: string; screenshotUrl?: string; category: string; enabled?: boolean;}>> {
    try {
      const templateDirs = await fs.readdir(this.templatesPath);
      const templates = [];
      for (const dir of templateDirs) {
        if (!dir.startsWith('template')) continue;
        const templatePath = path.join(this.templatesPath, dir);
        try {
          const stat = await fs.stat(templatePath);
          if (!stat.isDirectory()) continue;
          const configPath = path.join(templatePath, `${dir}-config.json`);
          let config = null;
          try {
            const configData = await fs.readFile(configPath, 'utf8');
            config = JSON.parse(configData);
          } catch {}
          const files = await fs.readdir(templatePath);
          const screenshotFile = files.find(file => file.match(/\.(jpeg|jpg|png)$/i));
          const screenshotUrl = screenshotFile ? `/templates/${dir}/${screenshotFile}` : undefined;
          const templateName = config?.templateName || config?.name || `Template ${dir.replace('template', '')}`;
          templates.push({
            id: dir,
            name: templateName,
            description: config?.description || `Professional resume template with modern design.`,
            screenshotUrl,
            category: config?.category || "professional",
            enabled: dir === "template01" || dir === "template02"
          });
        } catch (error) {
          continue;
        }
      }
      templates.sort((a, b) => {
        const numA = parseInt(a.id.replace('template', '') || '0');
        const numB = parseInt(b.id.replace('template', '') || '0');
        return numA - numB;
      });
      return templates;
    } catch (error) {
      return [
        {
          id: "template01",
          name: "ASU Sparky Sundevil Resume",
          description: "Professional academic resume template designed at Arizona State University featuring clean sections and excellent readability. Perfect for students and early career professionals in technical fields.",
          screenshotUrl: "/templates/template01/33592.jpeg",
          category: "academic",
          enabled: true,
        },
      ];
    }
  }
}

export const templateService = new TemplateService();
