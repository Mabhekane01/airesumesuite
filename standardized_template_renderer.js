/**
 * Standardized Template Renderer
 * Works with all 33 templates using unified placeholder system
 */

class StandardizedTemplateRenderer {
  
  /**
   * Main render method - converts resume data to LaTeX
   */
  async render(templateCode, resumeData) {
    console.log('🎯 Rendering standardized template...');
    
    // Step 1: Enhance content with AI (optional)
    const enhancedContent = await this.enhanceContent(resumeData);
    
    // Step 2: Inject all placeholders
    let result = templateCode;
    
    // Personal Information (always present)
    result = this.injectPersonalInfo(result, enhancedContent.personalInfo);
    
    // Professional Summary (always present)
    result = this.injectProfessionalSummary(result, enhancedContent.professionalSummary);
    
    // Conditional sections
    result = this.injectConditionalSection(result, 'WORK_EXPERIENCE', enhancedContent.workExperience, this.renderWorkExperience);
    result = this.injectConditionalSection(result, 'EDUCATION', enhancedContent.education, this.renderEducation);
    result = this.injectConditionalSection(result, 'SKILLS', enhancedContent.skills, this.renderSkills);
    result = this.injectConditionalSection(result, 'PROJECTS', enhancedContent.projects, this.renderProjects);
    result = this.injectConditionalSection(result, 'CERTIFICATIONS', enhancedContent.certifications, this.renderCertifications);
    result = this.injectConditionalSection(result, 'LANGUAGES', enhancedContent.languages, this.renderLanguages);
    result = this.injectConditionalSection(result, 'VOLUNTEER_EXPERIENCE', enhancedContent.volunteerExperience, this.renderVolunteerExperience);
    result = this.injectConditionalSection(result, 'AWARDS', enhancedContent.awards, this.renderAwards);
    result = this.injectConditionalSection(result, 'PUBLICATIONS', enhancedContent.publications, this.renderPublications);
    result = this.injectConditionalSection(result, 'REFERENCES', enhancedContent.references, this.renderReferences);
    result = this.injectConditionalSection(result, 'HOBBIES', enhancedContent.hobbies, this.renderHobbies);
    result = this.injectConditionalSection(result, 'ADDITIONAL_SECTIONS', enhancedContent.additionalSections, this.renderAdditionalSections);
    
    console.log('✅ Template rendering complete');
    return result;
  }
  
  /**
   * Enhance content with AI (optional step)
   */
  async enhanceContent(resumeData) {
    // This is where you'd call your AI services
    // For now, return the data as-is
    return {
      personalInfo: resumeData.personalInfo,
      professionalSummary: resumeData.professionalSummary, // Could enhance with AI
      workExperience: resumeData.workExperience, // Could enhance with AI
      education: resumeData.education,
      skills: resumeData.skills, // Could enhance with AI
      projects: resumeData.projects,
      certifications: resumeData.certifications,
      languages: resumeData.languages,
      volunteerExperience: resumeData.volunteerExperience,
      awards: resumeData.awards,
      publications: resumeData.publications,
      references: resumeData.references,
      hobbies: resumeData.hobbies,
      additionalSections: resumeData.additionalSections
    };
  }
  
  /**
   * Inject personal information (always present)
   */
  injectPersonalInfo(template, personalInfo) {
    let result = template;
    
    result = result.replace(/\{\{FIRST_NAME\}\}/g, personalInfo.firstName || '');
    result = result.replace(/\{\{LAST_NAME\}\}/g, personalInfo.lastName || '');
    result = result.replace(/\{\{EMAIL\}\}/g, personalInfo.email || '');
    result = result.replace(/\{\{PHONE\}\}/g, personalInfo.phone || '');
    result = result.replace(/\{\{LOCATION\}\}/g, personalInfo.location || '');
    
    // Conditional personal info fields
    result = this.handleConditionalField(result, 'PROFESSIONAL_TITLE', personalInfo.professionalTitle);
    result = this.handleConditionalField(result, 'LINKEDIN', personalInfo.linkedinUrl);
    result = this.handleConditionalField(result, 'GITHUB', personalInfo.githubUrl);
    result = this.handleConditionalField(result, 'PORTFOLIO', personalInfo.portfolioUrl);
    result = this.handleConditionalField(result, 'WEBSITE', personalInfo.websiteUrl);
    
    return result;
  }
  
  /**
   * Inject professional summary (always present)
   */
  injectProfessionalSummary(template, summary) {
    return template.replace(/\{\{PROFESSIONAL_SUMMARY\}\}/g, summary || 'Professional seeking new opportunities.');
  }
  
  /**
   * Handle conditional sections (only appear if data exists)
   */
  injectConditionalSection(template, sectionName, data, renderer) {
    const hasData = data && ((Array.isArray(data) && data.length > 0) || (!Array.isArray(data) && data));
    
    if (hasData) {
      // Remove conditional tags and inject content
      const conditionalRegex = new RegExp(`\\{\\{#IF_${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/IF_${sectionName}\\}\\}`, 'g');
      template = template.replace(conditionalRegex, (match, beforeContent, afterContent) => {
        const renderedContent = renderer.call(this, data);
        return beforeContent + renderedContent + afterContent;
      });
    } else {
      // Remove entire conditional section
      const conditionalRegex = new RegExp(`\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`, 'g');
      template = template.replace(conditionalRegex, '');
    }
    
    return template;
  }
  
  /**
   * Handle conditional fields (like LinkedIn, GitHub, etc.)
   */
  handleConditionalField(template, fieldName, value) {
    if (value) {
      // Remove conditional tags and inject value
      const conditionalRegex = new RegExp(`\\{\\{#IF_${fieldName}\\}\\}([\\s\\S]*?)\\{\\{${fieldName}\\}\\}([\\s\\S]*?)\\{\\{/IF_${fieldName}\\}\\}`, 'g');
      template = template.replace(conditionalRegex, `$1${value}$2`);
    } else {
      // Remove entire conditional block
      const conditionalRegex = new RegExp(`\\{\\{#IF_${fieldName}\\}\\}[\\s\\S]*?\\{\\{/IF_${fieldName}\\}\\}`, 'g');
      template = template.replace(conditionalRegex, '');
    }
    return template;
  }
  
  /**
   * Content renderers for each section
   */
  renderWorkExperience(experiences) {
    return experiences.map(exp => {
      const endDate = exp.isCurrentJob ? 'Present' : exp.endDate;
      const responsibilities = exp.responsibilities.map(r => `\\item ${r}`).join('\n');
      const achievements = exp.achievements.map(a => `\\item ${a}`).join('\n');
      
      return `\\noindent\\textbf{${exp.jobTitle}} \\hfill \\textit{${exp.startDate} - ${endDate}}\\\\
\\textit{${exp.company}, ${exp.location}}\\\\[0.3em]
\\begin{itemize}[leftmargin=1em]
${responsibilities}
${achievements}
\\end{itemize}\\vspace{0.5em}`;
    }).join('\n\n');
  }
  
  renderEducation(education) {
    return education.map(edu => {
      const gpaText = edu.gpa ? ` (GPA: ${edu.gpa})` : '';
      const honorsText = edu.honors && edu.honors.length > 0 ? `\\\\Honors: ${edu.honors.join(', ')}` : '';
      
      return `\\noindent\\textbf{${edu.degree}} \\hfill \\textit{${edu.graduationDate}}\\\\
\\textit{${edu.institution}, ${edu.location || ''}}${gpaText}${honorsText}\\\\[0.3em]`;
    }).join('\n\n');
  }
  
  renderSkills(skills) {
    const skillsByCategory = skills.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill.name);
      return acc;
    }, {});
    
    return Object.entries(skillsByCategory).map(([category, skillNames]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      return `\\noindent\\textbf{${categoryName}:} ${skillNames.join(', ')}\\\\[0.2em]`;
    }).join('\n');
  }
  
  renderProjects(projects) {
    return projects.map(project => {
      const dateRange = project.startDate && project.endDate ? 
        ` \\hfill \\textit{${project.startDate} - ${project.endDate}}` : '';
      const url = project.url ? `\\\\URL: \\url{${project.url}}` : '';
      
      return `\\noindent\\textbf{${project.name}}${dateRange}\\\\
${project.description}\\\\
\\textit{Technologies:} ${project.technologies.join(', ')}${url}\\\\[0.3em]`;
    }).join('\n\n');
  }
  
  renderCertifications(certifications) {
    return certifications.map(cert => {
      const expiration = cert.expirationDate ? ` (Expires: ${cert.expirationDate})` : '';
      const credential = cert.credentialId ? `\\\\Credential ID: ${cert.credentialId}` : '';
      
      return `\\noindent\\textbf{${cert.name}} \\hfill \\textit{${cert.date}}\\\\
\\textit{${cert.issuer}}${expiration}${credential}\\\\[0.3em]`;
    }).join('\n\n');
  }
  
  renderLanguages(languages) {
    return languages.map(lang => 
      `\\noindent\\textbf{${lang.name}}: ${lang.proficiency}\\\\[0.2em]`
    ).join('\n');
  }
  
  renderVolunteerExperience(volunteer) {
    return volunteer.map(vol => {
      const endDate = vol.isCurrentRole ? 'Present' : vol.endDate;
      const achievements = vol.achievements.map(a => `\\item ${a}`).join('\n');
      
      return `\\noindent\\textbf{${vol.role}} \\hfill \\textit{${vol.startDate} - ${endDate}}\\\\
\\textit{${vol.organization}, ${vol.location}}\\\\[0.3em]
${vol.description}\\\\
\\begin{itemize}[leftmargin=1em]
${achievements}
\\end{itemize}\\vspace{0.5em}`;
    }).join('\n\n');
  }
  
  renderAwards(awards) {
    return awards.map(award => {
      const description = award.description ? `\\\\${award.description}` : '';
      
      return `\\noindent\\textbf{${award.title}} \\hfill \\textit{${award.date}}\\\\
\\textit{${award.issuer}}${description}\\\\[0.3em]`;
    }).join('\n\n');
  }
  
  renderPublications(publications) {
    return publications.map(pub => {
      const url = pub.url ? `\\\\URL: \\url{${pub.url}}` : '';
      const description = pub.description ? `\\\\${pub.description}` : '';
      
      return `\\noindent\\textbf{${pub.title}} \\hfill \\textit{${pub.publicationDate}}\\\\
\\textit{${pub.publisher}}${description}${url}\\\\[0.3em]`;
    }).join('\n\n');
  }
  
  renderReferences(references) {
    return references.map(ref => 
      `\\noindent\\textbf{${ref.name}}\\\\
${ref.title}, ${ref.company}\\\\
Email: ${ref.email} | Phone: ${ref.phone}\\\\
Relationship: ${ref.relationship}\\\\[0.5em]`
    ).join('\n\n');
  }
  
  renderHobbies(hobbies) {
    const hobbiesByCategory = hobbies.reduce((acc, hobby) => {
      if (!acc[hobby.category]) acc[hobby.category] = [];
      acc[hobby.category].push(hobby.name);
      return acc;
    }, {});
    
    return Object.entries(hobbiesByCategory).map(([category, hobbyNames]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      return `\\noindent\\textbf{${categoryName}:} ${hobbyNames.join(', ')}\\\\[0.2em]`;
    }).join('\n');
  }
  
  renderAdditionalSections(sections) {
    return sections.map(section => 
      `\\section*{${section.title.toUpperCase()}}
${section.content}\\\\[0.5em]`
    ).join('\n\n');
  }
}

module.exports = { StandardizedTemplateRenderer };