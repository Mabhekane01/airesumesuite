const { standardizedTemplateService } = require('./dist/services/resume-builder/standardizedTemplateService');

async function testTemplate(templateId) {
  console.log(`🧪 Testing ${templateId} with real data...`);
  
  const testData = {
    personalInfo: {
      firstName: 'Bheki',
      lastName: 'Ngwenya',
      email: 'ngwenyabheki276@gmail.com',
      phone: '0797394470',
      location: 'Johannesburg',
      professionalTitle: 'Software Engineer',
      linkedinUrl: 'https://www.linkedin.com/in/bheki-ntando-ngwenya01',
      githubUrl: 'https://github.com/Mabhekane0100000',
      websiteUrl: 'https://bankhosa.com'
    },
    professionalSummary: 'Software Engineer with 5+ years experience',
    workExperience: [{
      jobTitle: 'Network Engineer & Software Developer',
      company: 'TechCorp',
      location: 'Sandton',
      startDate: '2023-07-01',
      endDate: null,
      isCurrentJob: true,
      responsibilities: ['Network management', 'Software development'],
      achievements: ['Reduced downtime by 30%', 'Improved system performance']
    }],
    education: [{
      degree: 'BSc Computer Science',
      institution: 'North-West University',
      location: 'Potchefstroom',
      graduationDate: '2022-12-01',
      gpa: '65'
    }],
    skills: [{
      name: 'JavaScript',
      category: 'Programming'
    }, {
      name: 'Node.js',
      category: 'Backend'
    }]
  };

  try {
    const latex = await standardizedTemplateService.generateLatex(templateId, testData, {
      enhanceWithAI: false // Don't use AI to isolate template issues
    });
    
    console.log(`✅ ${templateId} generated successfully!`);
    console.log(`📊 LaTeX length: ${latex.length} characters`);
    
    // Check for remaining placeholders
    const remainingPlaceholders = latex.match(/\{\{[^}]+\}\}/g) || [];
    if (remainingPlaceholders.length > 0) {
      console.log('❌ Found unprocessed placeholders:', remainingPlaceholders);
    } else {
      console.log('✅ No unprocessed placeholders found');
    }
    
    // Check for problematic # characters (excluding legitimate command parameters #1, #2, etc.)
    const problematicHashes = latex.split('\n').filter(line => {
      const hasHash = line.includes('#');
      const isCommandParam = line.match(/#[1-9]/); // #1, #2, etc. are legitimate
      const isNewCommand = line.includes('\\newcommand') || line.includes('\\renewcommand');
      return hasHash && !isCommandParam && !isNewCommand;
    });
    
    if (problematicHashes.length > 0) {
      console.log('❌ Found problematic # characters that could cause LaTeX errors');
      console.log('🔍 First few occurrences:');
      problematicHashes.slice(0, 3).forEach(line => console.log(`   ${line.trim()}`));
    } else {
      console.log('✅ No problematic # characters found');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ ${templateId} test failed:`, error.message);
    return false;
  }
}

async function testAllStandardizedTemplates() {
  const templates = ['template01', 'template02', 'template03', 'template21'];
  const results = {};
  
  for (const templateId of templates) {
    console.log(`\n${'='.repeat(50)}`);
    const success = await testTemplate(templateId);
    results[templateId] = success;
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 FINAL RESULTS:');
  Object.entries(results).forEach(([template, success]) => {
    console.log(`   ${template}: ${success ? '✅ WORKING' : '❌ FAILED'}`);
  });
  
  const allWorking = Object.values(results).every(success => success);
  console.log(`\n${allWorking ? '🎉 ALL 4 STANDARDIZED TEMPLATES WORKING!' : '❌ Some templates still have issues'}`);
  
  return allWorking;
}

testAllStandardizedTemplates().then(success => {
  process.exit(success ? 0 : 1);
});