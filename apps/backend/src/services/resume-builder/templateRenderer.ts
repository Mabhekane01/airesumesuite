import puppeteer from 'puppeteer';

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern-creative' | 'professional-corporate' | 'technical-functional' | 'minimalist';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  layout: 'single-column' | 'two-column' | 'multi-section';
  fontStyle: 'modern' | 'classic' | 'serif' | 'sans-serif';
}

export class TemplateRenderer {
  private static browserInstance: any = null;
  
  private async getBrowser() {
    if (!TemplateRenderer.browserInstance) {
      console.log('🚀 Launching new browser instance...');
      TemplateRenderer.browserInstance = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.NODE_ENV === 'production' ? '/usr/bin/chromium-browser' : undefined,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      // Close browser gracefully on process exit
      process.on('exit', () => {
        if (TemplateRenderer.browserInstance) {
          TemplateRenderer.browserInstance.close();
        }
      });
    }
    return TemplateRenderer.browserInstance;
  }

  private getTemplateById(templateId: string): ResumeTemplate {
    // Define the exact same templates as frontend
    const templates: { [key: string]: ResumeTemplate } = {
      'modern-creative-1': {
        id: 'modern-creative-1',
        name: 'Tech Innovator',
        description: 'Modern design with clean lines perfect for tech startups and creative roles',
        category: 'modern-creative',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#06d6a0',
          text: '#1e293b',
          background: '#ffffff'
        },
        layout: 'two-column',
        fontStyle: 'modern'
      },
      'professional-corporate-1': {
        id: 'professional-corporate-1',
        name: 'Executive Pro',
        description: 'Traditional corporate design ideal for executive and management positions',
        category: 'professional-corporate',
        colors: {
          primary: '#1e40af',
          secondary: '#475569',
          accent: '#0f766e',
          text: '#334155',
          background: '#ffffff'
        },
        layout: 'single-column',
        fontStyle: 'classic'
      }
    };

    return templates[templateId] || templates['modern-creative-1'];
  }

  private generateResumeHTML(resumeData: any, template: ResumeTemplate): string {
    // Use exact same font mapping as frontend
    const fontFamily = template.fontStyle === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif';
    
    // Extract personal info safely
    const personalInfo = resumeData.personalInfo || {};
    const { firstName = '', lastName = '', email = '', phone = '', location = '', linkedinUrl = '', portfolioUrl = '', githubUrl = '', professionalTitle = '' } = personalInfo;

    const styles = `
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          font-family: ${fontFamily}; 
          font-size: 10px; 
          line-height: 1.2; 
          color: ${template.colors.text};
          background: ${template.colors.background};
          width: 100vw;
          height: 100vh;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .resume-container { 
          width: 100%; 
          height: 100%; 
          background: white; 
          box-shadow: none;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        .two-column-layout { 
          display: flex; 
          height: 100%; 
        }
        .sidebar { 
          width: 35%; 
          padding: 16px;
          background-color: ${template.colors.secondary}15;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .main-content { 
          width: 65%; 
          padding: 16px; 
        }
        .profile-section { 
          text-align: center; 
        }
        .profile-avatar { 
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin: 0 auto 8px;
          background-color: ${template.colors.primary};
        }
        .profile-name { 
          font-weight: bold; 
          font-size: 12px; 
          margin: 0 0 4px 0;
          color: ${template.colors.text};
        }
        .profile-title { 
          font-size: 10px; 
          font-weight: 500;
          color: ${template.colors.secondary};
          margin: 0;
        }
        .section-title { 
          font-weight: bold; 
          font-size: 10px; 
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${template.colors.primary};
        }
        .contact-info { 
          font-size: 9px; 
          color: ${template.colors.text}; 
        }
        .contact-item { 
          margin-bottom: 2px; 
        }
        .skills-category { 
          font-weight: bold; 
          font-size: 9px; 
          margin-bottom: 4px;
          color: ${template.colors.text};
        }
        .skills-list { 
          font-size: 9px; 
          margin-bottom: 8px;
          color: ${template.colors.text};
        }
        .language-item { 
          font-size: 9px; 
          margin-bottom: 2px;
          color: ${template.colors.text};
        }
        .certification-item { 
          font-size: 9px; 
          margin-bottom: 2px;
          color: ${template.colors.text};
        }
        .main-section { 
          margin-bottom: 16px; 
        }
        .main-section-title { 
          font-weight: bold; 
          font-size: 11px; 
          margin-bottom: 8px;
          color: ${template.colors.primary};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid ${template.colors.primary};
          padding-bottom: 2px;
        }
        .work-item { 
          margin-bottom: 12px; 
        }
        .work-title { 
          font-weight: bold; 
          font-size: 10px;
          color: ${template.colors.primary};
          margin-bottom: 2px;
        }
        .work-company { 
          font-weight: 500; 
          font-size: 10px;
          color: ${template.colors.text};
          margin-bottom: 2px;
        }
        .work-date { 
          font-size: 9px; 
          color: ${template.colors.secondary};
          margin-bottom: 4px;
        }
        .work-description { 
          font-size: 9px; 
          color: ${template.colors.text};
        }
        .work-item-bullet { 
          margin-left: 10px; 
          margin-bottom: 2px; 
        }
        .education-item { 
          margin-bottom: 8px; 
        }
        .education-degree { 
          font-weight: bold; 
          font-size: 10px;
          color: ${template.colors.primary};
        }
        .education-school { 
          font-weight: 500; 
          font-size: 10px;
          color: ${template.colors.text};
        }
        .education-date { 
          font-size: 9px; 
          color: ${template.colors.secondary};
        }
        .project-item { 
          margin-bottom: 8px; 
        }
        .project-name { 
          font-weight: bold; 
          font-size: 10px;
          color: ${template.colors.primary};
        }
        .project-description { 
          font-size: 9px; 
          color: ${template.colors.text};
        }
      </style>
    `;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Resume - ${firstName} ${lastName}</title>
        ${styles}
      </head>
      <body>
        <div class="resume-container">
    `;

    if (template.layout === 'two-column') {
      html += `
        <div class="two-column-layout">
          <!-- Left Sidebar -->
          <div class="sidebar">
            <!-- Profile Section -->
            <div class="profile-section">
              <div class="profile-avatar"></div>
              <h1 class="profile-name">${firstName} ${lastName}</h1>
              <p class="profile-title">${professionalTitle || 'Professional'}</p>
            </div>

            <!-- Contact Info -->
            <div>
              <h3 class="section-title">CONTACT</h3>
              <div class="contact-info">
                <div class="contact-item">${email}</div>
                <div class="contact-item">${phone}</div>
                <div class="contact-item">${location}</div>
                ${linkedinUrl ? `<div class="contact-item">linkedin.com/in/${linkedinUrl.split('/').pop()}</div>` : ''}
                ${portfolioUrl ? `<div class="contact-item">${portfolioUrl}</div>` : ''}
                ${githubUrl ? `<div class="contact-item">${githubUrl}</div>` : ''}
              </div>
            </div>
      `;

      // Skills Section
      if (resumeData.skills && resumeData.skills.length > 0) {
        html += `
          <div>
            <h3 class="section-title">SKILLS</h3>
        `;
        
        const skillsByCategory: { [key: string]: string[] } = {};
        resumeData.skills.forEach((skill: any) => {
          const category = skill.category || 'technical';
          if (!skillsByCategory[category]) skillsByCategory[category] = [];
          skillsByCategory[category].push(skill.name);
        });
        
        Object.entries(skillsByCategory).forEach(([category, skills]) => {
          html += `
            <div class="skills-category">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
            <div class="skills-list">${skills.join(', ')}</div>
          `;
        });
        
        html += '</div>';
      }

      // Languages Section
      if (resumeData.languages && resumeData.languages.length > 0) {
        html += `
          <div>
            <h3 class="section-title">LANGUAGES</h3>
        `;
        resumeData.languages.forEach((lang: any) => {
          const name = typeof lang === 'string' ? lang : lang.name;
          const proficiency = typeof lang === 'object' ? lang.proficiency : '';
          html += `<div class="language-item">${name}${proficiency ? ` (${proficiency})` : ''}</div>`;
        });
        html += '</div>';
      }

      // Certifications Section
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        html += `
          <div>
            <h3 class="section-title">CERTIFICATIONS</h3>
        `;
        resumeData.certifications.forEach((cert: string) => {
          html += `<div class="certification-item">• ${cert}</div>`;
        });
        html += '</div>';
      }

      html += `
          </div>
          <!-- Main Content -->
          <div class="main-content">
      `;
    } else {
      // Single column layout
      html += '<div style="padding: 16px;">';
      
      // Header for single column
      html += `
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 18px; font-weight: bold; color: ${template.colors.primary}; margin-bottom: 4px;">${firstName} ${lastName}</h1>
          <p style="font-size: 12px; color: ${template.colors.secondary}; margin-bottom: 8px;">${professionalTitle || 'Professional'}</p>
          <div style="font-size: 10px; color: ${template.colors.text};">${email} • ${phone} • ${location}</div>
        </div>
      `;
    }

    // Professional Summary
    if (resumeData.professionalSummary) {
      html += `
        <div class="main-section">
          <h2 class="main-section-title">PROFESSIONAL SUMMARY</h2>
          <p style="font-size: 10px; color: ${template.colors.text};">${resumeData.professionalSummary}</p>
        </div>
      `;
    }

    // Work Experience
    if (resumeData.workExperience && resumeData.workExperience.length > 0) {
      html += `
        <div class="main-section">
          <h2 class="main-section-title">WORK EXPERIENCE</h2>
      `;
      
      resumeData.workExperience.forEach((job: any) => {
        const endDate = job.isCurrentJob ? 'Present' : job.endDate;
        html += `
          <div class="work-item">
            <div class="work-title">${job.jobTitle}</div>
            <div class="work-company">${job.company} • ${job.location}</div>
            <div class="work-date">${job.startDate} - ${endDate}</div>
            <div class="work-description">
        `;
        
        if (job.responsibilities && job.responsibilities.length > 0) {
          job.responsibilities.forEach((resp: string) => {
            html += `<div class="work-item-bullet">• ${resp}</div>`;
          });
        }
        
        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach((achievement: string) => {
            html += `<div class="work-item-bullet">• ${achievement}</div>`;
          });
        }
        
        html += '</div></div>';
      });
      
      html += '</div>';
    }

    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      html += `
        <div class="main-section">
          <h2 class="main-section-title">EDUCATION</h2>
      `;
      
      resumeData.education.forEach((edu: any) => {
        html += `
          <div class="education-item">
            <div class="education-degree">${edu.degree} in ${edu.fieldOfStudy}</div>
            <div class="education-school">${edu.institution}</div>
            <div class="education-date">${new Date(edu.graduationDate).getFullYear()}</div>
            ${edu.gpa ? `<div style="font-size: 9px; color: ${template.colors.text};">GPA: ${edu.gpa}</div>` : ''}
          </div>
        `;
      });
      
      html += '</div>';
    }

    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      html += `
        <div class="main-section">
          <h2 class="main-section-title">PROJECTS</h2>
      `;
      
      resumeData.projects.forEach((project: any) => {
        html += `
          <div class="project-item">
            <div class="project-name">${project.name}</div>
            <div class="project-description">${project.description}</div>
            ${project.technologies && project.technologies.length > 0 ? 
              `<div style="font-size: 9px; color: ${template.colors.secondary};">Technologies: ${project.technologies.join(', ')}</div>` : ''}
            ${project.url ? `<div style="font-size: 9px; color: ${template.colors.secondary};">URL: ${project.url}</div>` : ''}
          </div>
        `;
      });
      
      html += '</div>';
    }

    // For single column, add skills at the end
    if (template.layout === 'single-column' && resumeData.skills && resumeData.skills.length > 0) {
      html += `
        <div class="main-section">
          <h2 class="main-section-title">SKILLS</h2>
      `;
      
      const skillsByCategory: { [key: string]: string[] } = {};
      resumeData.skills.forEach((skill: any) => {
        const category = skill.category || 'technical';
        if (!skillsByCategory[category]) skillsByCategory[category] = [];
        skillsByCategory[category].push(skill.name);
      });
      
      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        html += `
          <div style="margin-bottom: 8px;">
            <div style="font-weight: bold; font-size: 10px; color: ${template.colors.text};">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
            <div style="font-size: 9px; color: ${template.colors.text};">${skills.join(', ')}</div>
          </div>
        `;
      });
      
      html += '</div>';
    }

    if (template.layout === 'two-column') {
      html += '</div></div>'; // Close main-content and two-column-layout
    } else {
      html += '</div>'; // Close single column padding
    }

    html += '</div></body></html>'; // Close container

    return html;
  }

  async generatePDF(resumeData: any): Promise<Buffer> {
    const startTime = Date.now();
    let page;
    
    try {
      // Get template info from resumeData
      const templateId = resumeData.templateId || resumeData.template || 'modern-creative-1';
      const template = this.getTemplateById(templateId);
      
      console.log('🎨 Generating PDF with template:', template.name, 'ID:', templateId);
      
      const html = this.generateResumeHTML(resumeData, template);
      
      // Use pooled browser instance
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      // Optimize page settings for faster rendering
      await page.setViewport({ width: 794, height: 1123 }); // A4 in pixels at 96 DPI
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded', // Don't wait for images/external resources
        timeout: 5000 
      });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });
      
      const duration = Date.now() - startTime;
      console.log(`⚡ PDF generated in ${duration}ms`);
      
      return Buffer.from(pdf);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async generateDOCX(resumeData: any): Promise<Buffer> {
    // For DOCX, we'll generate clean text content
    // In production, you might want to use a library like docx to create proper styled DOCX files
    const textContent = this.generatePlainText(resumeData);
    return Buffer.from(textContent, 'utf8');
  }

  private generatePlainText(resumeData: any): string {
    const lines: string[] = [];
    
    // Header
    if (resumeData.personalInfo) {
      const { firstName, lastName, email, phone, location, linkedinUrl, portfolioUrl, githubUrl } = resumeData.personalInfo;
      lines.push(`${firstName} ${lastName}`);
      lines.push(''.padEnd(50, '='));
      lines.push(`Email: ${email}`);
      lines.push(`Phone: ${phone}`);
      lines.push(`Location: ${location}`);
      if (linkedinUrl) lines.push(`LinkedIn: ${linkedinUrl}`);
      if (portfolioUrl) lines.push(`Portfolio: ${portfolioUrl}`);
      if (githubUrl) lines.push(`GitHub: ${githubUrl}`);
      lines.push('');
    }

    // Professional Summary
    if (resumeData.professionalSummary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push(''.padEnd(30, '-'));
      lines.push(resumeData.professionalSummary);
      lines.push('');
    }

    // Work Experience
    if (resumeData.workExperience && resumeData.workExperience.length > 0) {
      lines.push('WORK EXPERIENCE');
      lines.push(''.padEnd(30, '-'));
      resumeData.workExperience.forEach((job: any) => {
        const endDate = job.isCurrentJob ? 'Present' : job.endDate;
        lines.push(`${job.jobTitle}`);
        lines.push(`${job.company} | ${job.location}`);
        lines.push(`${job.startDate} - ${endDate}`);
        
        if (job.responsibilities && job.responsibilities.length > 0) {
          job.responsibilities.forEach((resp: string) => {
            lines.push(`• ${resp}`);
          });
        }
        
        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach((achievement: string) => {
            lines.push(`• ${achievement}`);
          });
        }
        lines.push('');
      });
    }

    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      lines.push('EDUCATION');
      lines.push(''.padEnd(30, '-'));
      resumeData.education.forEach((edu: any) => {
        lines.push(`${edu.degree} in ${edu.fieldOfStudy}`);
        lines.push(`${edu.institution}`);
        lines.push(`Graduated: ${edu.graduationDate}`);
        if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
        if (edu.honors && edu.honors.length > 0) lines.push(`Honors: ${edu.honors.join(', ')}`);
        lines.push('');
      });
    }

    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      lines.push('SKILLS');
      lines.push(''.padEnd(30, '-'));
      const skillsByCategory: { [key: string]: string[] } = {};
      resumeData.skills.forEach((skill: any) => {
        const category = skill.category || 'technical';
        if (!skillsByCategory[category]) skillsByCategory[category] = [];
        skillsByCategory[category].push(skill.name);
      });
      
      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${skills.join(', ')}`);
      });
      lines.push('');
    }

    // Languages
    if (resumeData.languages && resumeData.languages.length > 0) {
      lines.push('LANGUAGES');
      lines.push(''.padEnd(30, '-'));
      resumeData.languages.forEach((lang: any) => {
        const name = typeof lang === 'string' ? lang : lang.name;
        const proficiency = typeof lang === 'object' ? lang.proficiency : '';
        lines.push(`${name}${proficiency ? ` (${proficiency})` : ''}`);
      });
      lines.push('');
    }

    // Certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      lines.push('CERTIFICATIONS');
      lines.push(''.padEnd(30, '-'));
      resumeData.certifications.forEach((cert: string) => {
        lines.push(`• ${cert}`);
      });
      lines.push('');
    }

    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      lines.push('PROJECTS');
      lines.push(''.padEnd(30, '-'));
      resumeData.projects.forEach((project: any) => {
        lines.push(`${project.name}`);
        lines.push(`${project.description}`);
        if (project.technologies && project.technologies.length > 0) {
          lines.push(`Technologies: ${project.technologies.join(', ')}`);
        }
        if (project.url) lines.push(`URL: ${project.url}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  }
}

export const templateRenderer = new TemplateRenderer();