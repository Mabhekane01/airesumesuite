/**
 * Template Conversion Script
 * Converts all 33 templates to standardized placeholder format
 */

const fs = require('fs').promises;
const path = require('path');

class TemplateConverter {
  constructor() {
    this.templatesPath = path.join(__dirname, 'apps', 'frontend', 'public', 'templates');
    this.backupPath = path.join(__dirname, 'template_backups');
  }

  async convertAllTemplates() {
    console.log('🚀 Starting template conversion process...');
    
    try {
      // Step 1: Create backup
      await this.createBackup();
      
      // Step 2: Get all template directories
      const templateDirs = await this.getTemplateDirs();
      console.log(`📁 Found ${templateDirs.length} templates to convert`);
      
      // Step 3: Convert each template
      let successCount = 0;
      let errorCount = 0;
      
      for (const templateDir of templateDirs) {
        try {
          await this.convertTemplate(templateDir);
          successCount++;
          console.log(`✅ Converted ${templateDir}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to convert ${templateDir}:`, error.message);
        }
      }
      
      console.log(`\n🎯 Conversion Summary:`);
      console.log(`✅ Successfully converted: ${successCount} templates`);
      console.log(`❌ Failed conversions: ${errorCount} templates`);
      console.log(`📋 Total templates: ${templateDirs.length}`);
      
      if (successCount > 0) {
        console.log(`\n🎉 Template conversion complete! Your templates now use standardized placeholders.`);
        console.log(`💾 Original templates backed up to: ${this.backupPath}`);
      }
      
    } catch (error) {
      console.error('💥 Template conversion failed:', error);
      process.exit(1);
    }
  }

  async createBackup() {
    console.log('💾 Creating backup of original templates...');
    
    try {
      // Create backup directory
      await fs.mkdir(this.backupPath, { recursive: true });
      
      // Copy all templates to backup
      const templateDirs = await fs.readdir(this.templatesPath);
      
      for (const dir of templateDirs) {
        if (dir.startsWith('template')) {
          const sourcePath = path.join(this.templatesPath, dir);
          const backupDirPath = path.join(this.backupPath, dir);
          
          await fs.mkdir(backupDirPath, { recursive: true });
          
          const files = await fs.readdir(sourcePath);
          for (const file of files) {
            const sourceFile = path.join(sourcePath, file);
            const backupFile = path.join(backupDirPath, file);
            await fs.copyFile(sourceFile, backupFile);
          }
        }
      }
      
      console.log('✅ Backup created successfully');
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  async getTemplateDirs() {
    const dirs = await fs.readdir(this.templatesPath);
    return dirs.filter(dir => dir.startsWith('template'));
  }

  async convertTemplate(templateDir) {
    const templatePath = path.join(this.templatesPath, templateDir);
    const codeFile = path.join(templatePath, 'templatecode.txt');
    
    // Check if template file exists
    try {
      await fs.access(codeFile);
    } catch (error) {
      throw new Error(`Template file not found: ${codeFile}`);
    }
    
    // Read original template
    const originalContent = await fs.readFile(codeFile, 'utf8');
    
    // Convert to standardized format
    const standardizedContent = this.standardizeTemplate(originalContent, templateDir);
    
    // Write back the standardized template
    await fs.writeFile(codeFile, standardizedContent, 'utf8');
  }

  standardizeTemplate(originalContent, templateId) {
    console.log(`🔄 Converting ${templateId}...`);
    
    // Extract the document class and preamble
    const docClassMatch = originalContent.match(/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/);
    if (!docClassMatch) {
      throw new Error('Could not find \\documentclass in template');
    }
    
    const docClassIndex = originalContent.indexOf(docClassMatch[0]);
    const beginDocIndex = originalContent.indexOf('\\begin{document}');
    
    if (beginDocIndex === -1) {
      throw new Error('Could not find \\begin{document} in template');
    }
    
    // Extract preamble (everything before \begin{document})
    let preamble = originalContent.substring(0, beginDocIndex).trim();
    
    // Clean up problematic packages in preamble
    preamble = this.cleanPreamble(preamble);
    
    // Create standardized template
    const standardizedTemplate = `${preamble}

% Template-specific rendering commands
\\newcommand{\\renderWorkItem}[4]{
    \\noindent\\textbf{#1} \\hfill \\textit{#2}\\\\
    \\textit{#3} \\hfill #4\\\\[0.3em]
}

\\newcommand{\\renderEducationItem}[4]{
    \\noindent\\textbf{#1} \\hfill \\textit{#2}\\\\
    \\textit{#3} \\hfill #4\\\\[0.3em]
}

\\newcommand{\\renderSkillCategory}[2]{
    \\noindent\\textbf{#1:} #2\\\\[0.2em]
}

\\begin{document}

% STANDARDIZED PERSONAL INFO SECTION
\\begin{center}
{\\LARGE\\textbf{{{FIRST_NAME}} {{LAST_NAME}}}}\\\\[0.5em]
{{#IF_PROFESSIONAL_TITLE}}{\\large {{PROFESSIONAL_TITLE}}}\\\\[0.3em]{{/IF_PROFESSIONAL_TITLE}}
{{EMAIL}} | {{PHONE}} | {{LOCATION}}\\\\
{{#IF_LINKEDIN}}LinkedIn: {{LINKEDIN}}{{/IF_LINKEDIN}}{{#IF_GITHUB}}{{#IF_LINKEDIN}} | {{/IF_LINKEDIN}}GitHub: {{GITHUB}}{{/IF_GITHUB}}{{#IF_PORTFOLIO}}{{#IF_LINKEDIN}}{{#IF_GITHUB}} | {{/IF_GITHUB}}{{/IF_LINKEDIN}}Portfolio: {{PORTFOLIO}}{{/IF_PORTFOLIO}}{{#IF_WEBSITE}}{{#IF_LINKEDIN}}{{#IF_GITHUB}}{{#IF_PORTFOLIO}} | {{/IF_PORTFOLIO}}{{/IF_GITHUB}}{{/IF_LINKEDIN}}Website: {{WEBSITE}}{{/IF_WEBSITE}}
\\end{center}

\\vspace{1em}

% PROFESSIONAL SUMMARY - Always Present
\\section*{Professional Summary}
{{PROFESSIONAL_SUMMARY}}

\\vspace{0.5em}

% WORK EXPERIENCE - Conditional
{{#IF_WORK_EXPERIENCE}}
\\section*{Professional Experience}
{{WORK_EXPERIENCE}}
\\vspace{0.5em}
{{/IF_WORK_EXPERIENCE}}

% EDUCATION - Conditional
{{#IF_EDUCATION}}
\\section*{Education}
{{EDUCATION}}
\\vspace{0.5em}
{{/IF_EDUCATION}}

% SKILLS - Conditional
{{#IF_SKILLS}}
\\section*{Core Competencies}
{{SKILLS}}
\\vspace{0.5em}
{{/IF_SKILLS}}

% PROJECTS - Conditional
{{#IF_PROJECTS}}
\\section*{Key Projects}
{{PROJECTS}}
\\vspace{0.5em}
{{/IF_PROJECTS}}

% CERTIFICATIONS - Conditional
{{#IF_CERTIFICATIONS}}
\\section*{Certifications}
{{CERTIFICATIONS}}
\\vspace{0.5em}
{{/IF_CERTIFICATIONS}}

% LANGUAGES - Conditional
{{#IF_LANGUAGES}}
\\section*{Languages}
{{LANGUAGES}}
\\vspace{0.5em}
{{/IF_LANGUAGES}}

% VOLUNTEER EXPERIENCE - Conditional
{{#IF_VOLUNTEER_EXPERIENCE}}
\\section*{Volunteer Experience}
{{VOLUNTEER_EXPERIENCE}}
\\vspace{0.5em}
{{/IF_VOLUNTEER_EXPERIENCE}}

% AWARDS - Conditional
{{#IF_AWARDS}}
\\section*{Awards \\& Honors}
{{AWARDS}}
\\vspace{0.5em}
{{/IF_AWARDS}}

% PUBLICATIONS - Conditional
{{#IF_PUBLICATIONS}}
\\section*{Publications}
{{PUBLICATIONS}}
\\vspace{0.5em}
{{/IF_PUBLICATIONS}}

% REFERENCES - Conditional
{{#IF_REFERENCES}}
\\section*{References}
{{REFERENCES}}
\\vspace{0.5em}
{{/IF_REFERENCES}}

% HOBBIES - Conditional
{{#IF_HOBBIES}}
\\section*{Interests \\& Hobbies}
{{HOBBIES}}
\\vspace{0.5em}
{{/IF_HOBBIES}}

% ADDITIONAL SECTIONS - Conditional
{{#IF_ADDITIONAL_SECTIONS}}
{{ADDITIONAL_SECTIONS}}
{{/IF_ADDITIONAL_SECTIONS}}

\\end{document}`;

    return standardizedTemplate;
  }

  cleanPreamble(preamble) {
    // Replace problematic packages with safe alternatives
    let cleaned = preamble;
    
    // Replace banned packages
    cleaned = cleaned.replace(/\\usepackage\{kpfonts\}/g, '\\usepackage{lmodern} % kpfonts replaced');
    cleaned = cleaned.replace(/\\usepackage\{fontspec\}/g, '% fontspec removed - pdflatex incompatible');
    cleaned = cleaned.replace(/\\usepackage\{charter\}/g, '% charter removed');
    cleaned = cleaned.replace(/\\usepackage\{cmbright\}/g, '% cmbright removed');
    cleaned = cleaned.replace(/\\usepackage\{lato\}/g, '% lato removed');
    cleaned = cleaned.replace(/\\usepackage\{sectsty\}/g, '\\usepackage{titlesec} % sectsty replaced');
    
    // Fix hyperref to be consistent
    if (!cleaned.includes('\\usepackage[hidelinks]{hyperref}')) {
      cleaned = cleaned.replace(/\\usepackage(?:\[[^\]]*\])?\{hyperref\}/g, '\\usepackage[hidelinks]{hyperref}');
    }
    
    // Ensure essential packages are present
    const essentialPackages = [
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage[T1]{fontenc}',
      '\\usepackage{geometry}',
      '\\usepackage{enumitem}',
      '\\usepackage{titlesec}',
      '\\usepackage[hidelinks]{hyperref}'
    ];
    
    for (const pkg of essentialPackages) {
      const pkgName = pkg.match(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/)[1];
      if (!cleaned.includes(`{${pkgName}}`)) {
        cleaned += '\n' + pkg;
      }
    }
    
    return cleaned;
  }
}

// Run the conversion if this script is executed directly
if (require.main === module) {
  const converter = new TemplateConverter();
  converter.convertAllTemplates().catch(console.error);
}

module.exports = { TemplateConverter };