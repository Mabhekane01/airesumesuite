/**
 * Utility script to create standardized versions of existing templates
 * This helps migrate from AI-generated LaTeX to the hybrid standardized system
 */

const fs = require('fs').promises;
const path = require('path');

// Template categories for automatic classification
const TEMPLATE_CATEGORIES = {
  'modern': ['modern', 'contemporary', 'sleek', 'clean'],
  'professional': ['professional', 'business', 'corporate', 'formal'],
  'creative': ['creative', 'artistic', 'unique', 'colorful', 'anti'],
  'academic': ['academic', 'research', 'cv', 'scholar'],
  'minimalist': ['minimal', 'simple', 'basic', 'clean'],
  'classic': ['classic', 'traditional', 'standard', 'timeless']
};

// Base configuration template
const BASE_CONFIG = {
  isStandardized: true,
  requiredFields: [
    "personalInfo.firstName",
    "personalInfo.lastName",
    "personalInfo.email",
    "personalInfo.phone",
    "professionalSummary"
  ],
  optionalFields: [
    "personalInfo.professionalTitle",
    "personalInfo.linkedinUrl",
    "personalInfo.portfolioUrl",
    "personalInfo.githubUrl",
    "personalInfo.websiteUrl",
    "personalInfo.location",
    "workExperience",
    "education",
    "skills",
    "projects",
    "certifications",
    "languages",
    "volunteerExperience",
    "awards",
    "publications",
    "references",
    "hobbies",
    "additionalSections"
  ],
  placeholders: {
    personalInfo: [
      "FIRST_NAME",
      "LAST_NAME",
      "EMAIL",
      "PHONE",
      "LOCATION",
      "PROFESSIONAL_TITLE",
      "LINKEDIN",
      "GITHUB",
      "PORTFOLIO",
      "WEBSITE"
    ],
    sections: [
      "PROFESSIONAL_SUMMARY",
      "WORK_EXPERIENCE",
      "EDUCATION",
      "SKILLS",
      "PROJECTS",
      "CERTIFICATIONS",
      "LANGUAGES",
      "VOLUNTEER_EXPERIENCE",
      "AWARDS",
      "PUBLICATIONS",
      "REFERENCES",
      "HOBBIES",
      "ADDITIONAL_SECTIONS"
    ]
  },
  conditionalSections: {
    workExperience: { ifTag: "IF_WORK_EXPERIENCE", endIfTag: "/IF_WORK_EXPERIENCE", required: false },
    education: { ifTag: "IF_EDUCATION", endIfTag: "/IF_EDUCATION", required: false },
    skills: { ifTag: "IF_SKILLS", endIfTag: "/IF_SKILLS", required: false },
    projects: { ifTag: "IF_PROJECTS", endIfTag: "/IF_PROJECTS", required: false },
    certifications: { ifTag: "IF_CERTIFICATIONS", endIfTag: "/IF_CERTIFICATIONS", required: false },
    languages: { ifTag: "IF_LANGUAGES", endIfTag: "/IF_LANGUAGES", required: false },
    volunteerExperience: { ifTag: "IF_VOLUNTEER_EXPERIENCE", endIfTag: "/IF_VOLUNTEER_EXPERIENCE", required: false },
    awards: { ifTag: "IF_AWARDS", endIfTag: "/IF_AWARDS", required: false },
    publications: { ifTag: "IF_PUBLICATIONS", endIfTag: "/IF_PUBLICATIONS", required: false },
    references: { ifTag: "IF_REFERENCES", endIfTag: "/IF_REFERENCES", required: false },
    hobbies: { ifTag: "IF_HOBBIES", endIfTag: "/IF_HOBBIES", required: false },
    additionalSections: { ifTag: "IF_ADDITIONAL_SECTIONS", endIfTag: "/IF_ADDITIONAL_SECTIONS", required: false }
  },
  compilationSettings: {
    compiler: "pdflatex",
    passes: 2,
    specialPackages: []
  }
};

/**
 * Analyze template content to determine category and features
 */
function analyzeTemplate(templateContent, templateName) {
  const content = templateContent.toLowerCase();
  const name = templateName.toLowerCase();
  
  // Determine category
  let category = 'professional'; // default
  for (const [cat, keywords] of Object.entries(TEMPLATE_CATEGORIES)) {
    if (keywords.some(keyword => content.includes(keyword) || name.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Determine tags
  const tags = [];
  if (content.includes('multicol') || content.includes('minipage') || content.includes('paracol')) {
    tags.push('two-column');
  } else {
    tags.push('single-column');
  }
  
  if (content.includes('xcolor') || content.includes('color{')) {
    tags.push('colorful');
  }
  
  if (content.includes('minimal') || content.includes('simple')) {
    tags.push('minimal');
  }
  
  if (content.includes('includegraphics') || content.includes('photo')) {
    tags.push('photo-ready');
  }
  
  // Always add ATS-friendly for standardized templates
  tags.push('ats-friendly');
  
  // Detect required compiler
  let compiler = 'pdflatex';
  if (content.includes('fontspec') || content.includes('xelatex')) {
    compiler = 'xelatex';
  } else if (content.includes('lualatex') || content.includes('luatex')) {
    compiler = 'lualatex';
  }
  
  // Detect special packages
  const specialPackages = [];
  const packageRegex = /\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let match;
  while ((match = packageRegex.exec(content)) !== null) {
    const pkg = match[1];
    if (['tikz', 'pgf', 'fontspec', 'biblatex', 'beamer'].includes(pkg)) {
      specialPackages.push(pkg);
    }
  }
  
  return { category, tags, compiler, specialPackages };
}

/**
 * Create standardized LaTeX template from original
 */
function createStandardizedLatex(originalContent, templateId) {
  let latex = originalContent;
  
  // Replace problematic packages
  latex = latex.replace(/\\usepackage\{kpfonts\}/g, '\\usepackage{lmodern} % kpfonts replaced');
  latex = latex.replace(/\\usepackage\{sectsty\}/g, '\\usepackage{titlesec} % sectsty replaced');
  latex = latex.replace(/\\usepackage\[utf8x\]\{inputenc\}/g, '\\usepackage[utf8]{inputenc}');
  
  // Fix units
  latex = latex.replace(/(\d+)px/g, '$1pt');
  
  // Add standardized header comment
  const header = `% ${templateId} - Standardized Version
% Maintains original styling but uses unified placeholders
% Compatible with standardizedTemplateService.ts

`;
  
  // Find document start and add placeholders
  const docStart = latex.indexOf('\\begin{document}');
  if (docStart > -1) {
    const preamble = latex.substring(0, docStart);
    const document = latex.substring(docStart);
    
    // Add personal info section after \\begin{document}
    const personalInfoSection = `
% STANDARDIZED PERSONAL INFO SECTION
\\begin{center}
\\Huge \\textbf{{{FIRST_NAME}} {{LAST_NAME}}}\\\\[0.5em]
{{#IF_PROFESSIONAL_TITLE}}\\large \\textit{{{PROFESSIONAL_TITLE}}}\\\\[0.3em]{{/IF_PROFESSIONAL_TITLE}}
\\normalsize {{EMAIL}} | {{PHONE}}{{#IF_LOCATION}} | {{LOCATION}}{{/IF_LOCATION}}\\\\
{{#IF_LINKEDIN}}\\textit{LinkedIn: }{{LINKEDIN}}{{/IF_LINKEDIN}}{{#IF_GITHUB}}{{#IF_LINKEDIN}} | {{/IF_LINKEDIN}}\\textit{GitHub: }{{GITHUB}}{{/IF_GITHUB}}{{#IF_PORTFOLIO}}{{#IF_LINKEDIN}}{{#IF_GITHUB}} | {{/IF_GITHUB}}{{/IF_LINKEDIN}}\\textit{Portfolio: }{{PORTFOLIO}}{{/IF_PORTFOLIO}}{{#IF_WEBSITE}}{{#IF_LINKEDIN}}{{#IF_GITHUB}}{{#IF_PORTFOLIO}} | {{/IF_PORTFOLIO}}{{/IF_GITHUB}}{{/IF_LINKEDIN}}\\textit{Website: }{{WEBSITE}}{{/IF_WEBSITE}}
\\end{center}

\\vspace{1em}

% PROFESSIONAL SUMMARY - Always Present
\\section*{PROFESSIONAL SUMMARY}
{{PROFESSIONAL_SUMMARY}}

% STANDARDIZED SECTIONS WITH CONDITIONAL RENDERING
{{#IF_WORK_EXPERIENCE}}
\\section*{PROFESSIONAL EXPERIENCE}
{{WORK_EXPERIENCE}}
{{/IF_WORK_EXPERIENCE}}

{{#IF_EDUCATION}}
\\section*{EDUCATION}
{{EDUCATION}}
{{/IF_EDUCATION}}

{{#IF_SKILLS}}
\\section*{SKILLS}
{{SKILLS}}
{{/IF_SKILLS}}

{{#IF_PROJECTS}}
\\section*{PROJECTS}
{{PROJECTS}}
{{/IF_PROJECTS}}

{{#IF_CERTIFICATIONS}}
\\section*{CERTIFICATIONS}
{{CERTIFICATIONS}}
{{/IF_CERTIFICATIONS}}

{{#IF_LANGUAGES}}
\\section*{LANGUAGES}
{{LANGUAGES}}
{{/IF_LANGUAGES}}

{{#IF_VOLUNTEER_EXPERIENCE}}
\\section*{VOLUNTEER EXPERIENCE}
{{VOLUNTEER_EXPERIENCE}}
{{/IF_VOLUNTEER_EXPERIENCE}}

{{#IF_AWARDS}}
\\section*{AWARDS \\& HONORS}
{{AWARDS}}
{{/IF_AWARDS}}

{{#IF_PUBLICATIONS}}
\\section*{PUBLICATIONS}
{{PUBLICATIONS}}
{{/IF_PUBLICATIONS}}

{{#IF_REFERENCES}}
\\section*{REFERENCES}
{{REFERENCES}}
{{/IF_REFERENCES}}

{{#IF_HOBBIES}}
\\section*{INTERESTS \\& HOBBIES}
{{HOBBIES}}
{{/IF_HOBBIES}}

{{#IF_ADDITIONAL_SECTIONS}}
{{ADDITIONAL_SECTIONS}}
{{/IF_ADDITIONAL_SECTIONS}}

`;
    
    latex = header + preamble + '\\begin{document}' + personalInfoSection + '\\end{document}';
  }
  
  return latex;
}

/**
 * Generate configuration for a template
 */
function generateConfig(templateId, originalContent, screenshotPath) {
  const analysis = analyzeTemplate(originalContent, templateId);
  
  const config = {
    templateId,
    templateName: `Professional Template ${templateId.replace('template', '').replace(/^0+/, '')}`,
    description: `A ${analysis.category} template with ${analysis.tags.join(', ')} design features.`,
    category: analysis.category,
    tags: analysis.tags,
    ...BASE_CONFIG,
    compilationSettings: {
      ...BASE_CONFIG.compilationSettings,
      compiler: analysis.compiler,
      specialPackages: analysis.specialPackages
    },
    metadata: {
      author: "AI Job Suite",
      version: "1.0.0",
      lastUpdated: new Date().toISOString().split('T')[0],
      screenshotPath: screenshotPath || `/templates/${templateId}/screenshot.jpeg`,
      previewUrl: screenshotPath || `/templates/${templateId}/screenshot.jpeg`
    }
  };
  
  return config;
}

/**
 * Main function to process all templates
 */
async function processAllTemplates() {
  const templatesDir = path.join(__dirname, 'apps', 'frontend', 'public', 'templates');
  
  try {
    const entries = await fs.readdir(templatesDir);
    const templateDirs = entries.filter(entry => entry.startsWith('template') && /^template\d+$/.test(entry));
    
    console.log(`Found ${templateDirs.length} template directories to process`);
    
    for (const templateDir of templateDirs) {
      try {
        const templatePath = path.join(templatesDir, templateDir);
        const templateCodePath = path.join(templatePath, 'templatecode.txt');
        
        // Skip if already has standardized version
        const standardizedPath = path.join(templatePath, `${templateDir}-standardized.tex`);
        const configPath = path.join(templatePath, `${templateDir}-config.json`);
        
        if (await fs.access(standardizedPath).then(() => true).catch(() => false)) {
          console.log(`✓ ${templateDir} already has standardized version, skipping`);
          continue;
        }
        
        // Read original template
        const originalContent = await fs.readFile(templateCodePath, 'utf8').catch(() => null);
        if (!originalContent) {
          console.log(`⚠ ${templateDir} has no templatecode.txt, skipping`);
          continue;
        }
        
        // Find screenshot
        const files = await fs.readdir(templatePath);
        const screenshotFile = files.find(f => f.match(/\.(jpg|jpeg|png)$/i));
        const screenshotPath = screenshotFile ? `/templates/${templateDir}/${screenshotFile}` : null;
        
        // Generate standardized version
        const standardizedLatex = createStandardizedLatex(originalContent, templateDir);
        const config = generateConfig(templateDir, originalContent, screenshotPath);
        
        // Write files
        await fs.writeFile(standardizedPath, standardizedLatex, 'utf8');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        
        console.log(`✅ Created standardized version for ${templateDir}`);
        
      } catch (error) {
        console.error(`❌ Failed to process ${templateDir}:`, error.message);
      }
    }
    
    console.log('✅ Template standardization complete!');
  } catch (error) {
    console.error('❌ Failed to process templates:', error);
  }
}

// Run if called directly
if (require.main === module) {
  processAllTemplates();
}

module.exports = {
  processAllTemplates,
  analyzeTemplate,
  createStandardizedLatex,
  generateConfig
};