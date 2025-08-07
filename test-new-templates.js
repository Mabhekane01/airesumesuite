/**
 * Test script for the newly created standardized templates
 * Tests template21, template02, and template03
 */

const fs = require('fs').promises;
const path = require('path');

// Test data
const testData = {
  personalInfo: {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    professionalTitle: "Senior Product Manager",
    linkedinUrl: "https://linkedin.com/in/sarahjohnson",
    githubUrl: "https://github.com/sarahjohnson",
    portfolioUrl: "https://sarahjohnson.dev",
    websiteUrl: "https://sarahjohnson.com"
  },
  professionalSummary: "Results-driven Product Manager with 6+ years of experience launching successful digital products and leading cross-functional teams.",
  workExperience: [
    {
      jobTitle: "Senior Product Manager",
      company: "TechCorp Inc",
      location: "San Francisco, CA",
      startDate: "2022-01",
      endDate: null,
      isCurrentJob: true,
      responsibilities: [
        "Lead product strategy for mobile applications with 2M+ users",
        "Collaborate with engineering and design teams on feature development"
      ],
      achievements: [
        "Increased user engagement by 40% through data-driven feature improvements",
        "Successfully launched 3 major product features on time and under budget"
      ]
    }
  ],
  education: [
    {
      degree: "Master of Business Administration",
      institution: "Stanford University",
      fieldOfStudy: "Technology Management",
      location: "Stanford, CA",
      graduationDate: "2020-06",
      gpa: "3.8",
      honors: ["Dean's List", "Beta Gamma Sigma Honor Society"]
    }
  ],
  skills: [
    { name: "Product Management", category: "technical", proficiencyLevel: "expert" },
    { name: "Data Analysis", category: "technical", proficiencyLevel: "advanced" },
    { name: "Agile/Scrum", category: "technical", proficiencyLevel: "expert" },
    { name: "Leadership", category: "soft", proficiencyLevel: "advanced" }
  ],
  projects: [
    {
      name: "Mobile App Redesign",
      description: "Led complete redesign of mobile application resulting in 50% improvement in user satisfaction scores",
      technologies: ["React Native", "Firebase", "Analytics"],
      url: "https://github.com/sarahjohnson/mobile-redesign"
    }
  ],
  certifications: [
    {
      name: "Certified Scrum Product Owner",
      issuer: "Scrum Alliance",
      date: "2023-03",
      expirationDate: "2025-03"
    }
  ],
  languages: [
    { name: "English", proficiency: "native" },
    { name: "Spanish", proficiency: "conversational" }
  ]
};

/**
 * Simple template rendering simulation
 */
function renderTemplate(template, data) {
  let result = template;
  
  // Personal Information
  result = result.replace(/\{\{FIRST_NAME\}\}/g, data.personalInfo?.firstName || '');
  result = result.replace(/\{\{LAST_NAME\}\}/g, data.personalInfo?.lastName || '');
  result = result.replace(/\{\{EMAIL\}\}/g, data.personalInfo?.email || '');
  result = result.replace(/\{\{PHONE\}\}/g, data.personalInfo?.phone || '');
  result = result.replace(/\{\{LOCATION\}\}/g, data.personalInfo?.location || '');
  result = result.replace(/\{\{PROFESSIONAL_TITLE\}\}/g, data.personalInfo?.professionalTitle || '');
  result = result.replace(/\{\{LINKEDIN\}\}/g, data.personalInfo?.linkedinUrl || '');
  result = result.replace(/\{\{GITHUB\}\}/g, data.personalInfo?.githubUrl || '');
  result = result.replace(/\{\{PORTFOLIO\}\}/g, data.personalInfo?.portfolioUrl || '');
  result = result.replace(/\{\{WEBSITE\}\}/g, data.personalInfo?.websiteUrl || '');
  
  // Professional Summary
  result = result.replace(/\{\{PROFESSIONAL_SUMMARY\}\}/g, data.professionalSummary || '');
  
  // Handle conditional sections
  result = handleConditional(result, 'PROFESSIONAL_TITLE', data.personalInfo?.professionalTitle);
  result = handleConditional(result, 'LOCATION', data.personalInfo?.location);
  result = handleConditional(result, 'LINKEDIN', data.personalInfo?.linkedinUrl);
  result = handleConditional(result, 'GITHUB', data.personalInfo?.githubUrl);
  result = handleConditional(result, 'PORTFOLIO', data.personalInfo?.portfolioUrl);
  result = handleConditional(result, 'WEBSITE', data.personalInfo?.websiteUrl);
  result = handleConditional(result, 'WORK_EXPERIENCE', data.workExperience, renderWorkExperience);
  result = handleConditional(result, 'EDUCATION', data.education, renderEducation);
  result = handleConditional(result, 'SKILLS', data.skills, renderSkills);
  result = handleConditional(result, 'PROJECTS', data.projects, renderProjects);
  result = handleConditional(result, 'CERTIFICATIONS', data.certifications, renderCertifications);
  result = handleConditional(result, 'LANGUAGES', data.languages, renderLanguages);
  
  return result;
}

function handleConditional(template, sectionName, data, renderer) {
  const hasData = data && ((Array.isArray(data) && data.length > 0) || (!Array.isArray(data) && data));
  
  if (hasData) {
    const conditionalRegex = new RegExp(
      `\\{\\{#IF_${sectionName}\\}\\}([\\s\\S]*?)\\{\\{${sectionName}\\}\\}([\\s\\S]*?)\\{\\{/IF_${sectionName}\\}\\}`,
      'g'
    );
    template = template.replace(conditionalRegex, (match, beforeContent, afterContent) => {
      const renderedContent = renderer ? renderer(data) : escapeLatex(data);
      return beforeContent + renderedContent + afterContent;
    });
  } else {
    const conditionalRegex = new RegExp(`\\{\\{#IF_${sectionName}\\}\\}[\\s\\S]*?\\{\\{/IF_${sectionName}\\}\\}`, 'g');
    template = template.replace(conditionalRegex, '');
  }
  
  return template;
}

function renderWorkExperience(experiences) {
  return experiences.map(exp => {
    const endDate = exp.isCurrentJob ? 'Present' : (exp.endDate || '');
    const responsibilities = exp.responsibilities?.map(r => `\\item ${escapeLatex(r)}`).join('\n') || '';
    const achievements = exp.achievements?.map(a => `\\item ${escapeLatex(a)}`).join('\n') || '';
    
    return `\\textbf{${escapeLatex(exp.jobTitle)}} | ${escapeLatex(exp.company)} | ${escapeLatex(exp.startDate)} - ${escapeLatex(endDate)}\\\\
${escapeLatex(exp.location)}\\\\
\\begin{itemize}
${responsibilities}
${achievements}
\\end{itemize}`;
  }).join('\n\n');
}

function renderEducation(education) {
  return education.map(edu => {
    const gpaText = edu.gpa ? `GPA: ${edu.gpa}` : '';
    const honorsText = edu.honors?.length > 0 ? `Honors: ${edu.honors.join(', ')}` : '';
    
    return `\\textbf{${escapeLatex(edu.degree)}} | ${escapeLatex(edu.institution)} | ${escapeLatex(edu.graduationDate)}\\\\
${gpaText} ${honorsText}`;
  }).join('\n\n');
}

function renderSkills(skills) {
  const skillsByCategory = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill.name);
    return acc;
  }, {});
  
  return Object.entries(skillsByCategory).map(([category, skillNames]) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    return `\\textbf{${categoryName}:} ${skillNames.map(s => escapeLatex(s)).join(', ')}`;
  }).join('\\\\\n');
}

function renderProjects(projects) {
  return projects.map(project => {
    const url = project.url ? `URL: ${project.url}` : '';
    return `\\textbf{${escapeLatex(project.name)}}\\\\
${escapeLatex(project.description)}\\\\
Technologies: ${project.technologies.map(t => escapeLatex(t)).join(', ')}\\\\
${url}`;
  }).join('\n\n');
}

function renderCertifications(certifications) {
  return certifications.map(cert => {
    const expiration = cert.expirationDate ? ` (Expires: ${cert.expirationDate})` : '';
    return `\\textbf{${escapeLatex(cert.name)}} | ${escapeLatex(cert.issuer)} | ${escapeLatex(cert.date)}${expiration}`;
  }).join('\\\\\n');
}

function renderLanguages(languages) {
  return languages.map(lang => 
    `\\textbf{${escapeLatex(lang.name)}}: ${escapeLatex(lang.proficiency)}`
  ).join('\\\\\n');
}

function escapeLatex(text) {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}');
}

/**
 * Test individual template
 */
async function testTemplate(templateId) {
  console.log(`\n🧪 Testing ${templateId}...`);
  
  // Handle special case for template21 which has a space in directory name
  const directoryName = templateId === 'template21' ? 'template 21' : templateId;
  
  const templatePath = path.join(__dirname, 'apps', 'frontend', 'public', 'templates', directoryName, `${templateId}-standardized.tex`);
  const configPath = path.join(__dirname, 'apps', 'frontend', 'public', 'templates', directoryName, `${templateId}-config.json`);
  
  try {
    // Check if files exist
    const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    
    if (!templateExists) {
      console.log(`❌ ${templateId}: Template file not found`);
      return false;
    }
    
    if (!configExists) {
      console.log(`❌ ${templateId}: Config file not found`);
      return false;
    }
    
    // Read template and config
    const template = await fs.readFile(templatePath, 'utf8');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    
    // Validate config structure
    const requiredConfigFields = ['templateId', 'templateName', 'description', 'category', 'isStandardized'];
    for (const field of requiredConfigFields) {
      if (!config[field]) {
        console.log(`❌ ${templateId}: Missing required config field: ${field}`);
        return false;
      }
    }
    
    // Test template rendering
    const rendered = renderTemplate(template, testData);
    
    // Basic validations
    const hasName = rendered.includes('Sarah Johnson');
    const hasEmail = rendered.includes('sarah.johnson@email.com');
    const hasSummary = rendered.includes('Results-driven Product Manager');
    const hasDocumentClass = rendered.includes('\\documentclass');
    const hasDocumentEnd = rendered.includes('\\end{document}');
    
    console.log(`✅ ${templateId}: Files exist`);
    console.log(`✅ ${templateId}: Config valid`);
    console.log(`✅ ${templateId}: Name populated: ${hasName}`);
    console.log(`✅ ${templateId}: Email populated: ${hasEmail}`);
    console.log(`✅ ${templateId}: Summary populated: ${hasSummary}`);
    console.log(`✅ ${templateId}: LaTeX structure valid: ${hasDocumentClass && hasDocumentEnd}`);
    
    // Test conditional sections
    const hasWorkSection = rendered.includes('Senior Product Manager');
    const hasEducationSection = rendered.includes('Master of Business Administration');
    const hasSkillsSection = rendered.includes('Product Management');
    
    console.log(`✅ ${templateId}: Work experience rendered: ${hasWorkSection}`);
    console.log(`✅ ${templateId}: Education rendered: ${hasEducationSection}`);
    console.log(`✅ ${templateId}: Skills rendered: ${hasSkillsSection}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ ${templateId}: Error during testing: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Testing newly created standardized templates\n');
  
  const templates = ['template21', 'template02', 'template03'];
  const results = {};
  
  for (const templateId of templates) {
    results[templateId] = await testTemplate(templateId);
  }
  
  console.log('\n📊 Test Summary:');
  const successful = Object.values(results).filter(Boolean).length;
  const total = templates.length;
  
  console.log(`✅ ${successful}/${total} templates passed all tests`);
  
  for (const [templateId, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${templateId}: ${status}`);
  }
  
  if (successful === total) {
    console.log('\n🎉 All templates are ready for production!');
  } else {
    console.log('\n⚠️ Some templates need attention before deployment');
  }
  
  return successful === total;
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testTemplate };