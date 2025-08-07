// Since modules use ES6 imports, we'll use dynamic imports
let aiLatexGenerator, latexService;

// Test data
const testResumeData = {
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    portfolioUrl: 'https://johndoe.dev',
    githubUrl: 'https://github.com/johndoe'
  },
  professionalSummary: 'Experienced software engineer with 5+ years in full-stack development.',
  workExperience: [
    {
      jobTitle: 'Senior Software Engineer',
      companyName: 'Tech Corp',
      location: 'San Francisco, CA',
      startDate: 'Jan 2020',
      endDate: 'Present',
      isCurrentJob: true,
      achievements: [
        'Led development of microservices architecture serving 1M+ users',
        'Improved system performance by 40% through optimization initiatives'
      ],
      responsibilities: [
        'Designed and implemented scalable backend systems',
        'Mentored junior developers and established coding standards'
      ]
    }
  ],
  education: [
    {
      degree: 'Bachelor of Science in Computer Science',
      institution: 'University of Technology',
      location: 'Boston, MA',
      graduationDate: 'May 2018',
      gpa: '3.8/4.0'
    }
  ],
  skills: [
    { name: 'JavaScript', category: 'Programming Languages' },
    { name: 'Python', category: 'Programming Languages' },
    { name: 'React', category: 'Frontend' },
    { name: 'Node.js', category: 'Backend' }
  ],
  projects: [
    {
      name: 'E-commerce Platform',
      description: 'Full-stack web application with payment processing',
      technologies: ['React', 'Node.js', 'PostgreSQL'],
      url: 'https://github.com/johndoe/ecommerce'
    }
  ],
  certifications: [
    'AWS Certified Solutions Architect',
    'Google Cloud Professional Developer'
  ]
};

async function testLatexGeneration() {
  try {
    console.log('🚀 Testing LaTeX generation with improved syntax fixing...');
    
    // Dynamic imports for ES6 modules
    console.log('📦 Loading modules...');
    const aiLatexModule = await import('./src/services/resume-builder/aiLatexGenerator.js');
    const latexServiceModule = await import('./src/services/resume-builder/latexService.js');
    
    aiLatexGenerator = aiLatexModule.aiLatexGenerator;
    latexService = latexServiceModule.latexService;
    
    console.log('✅ Modules loaded successfully');
    
    // Get available templates
    const templates = await aiLatexGenerator.loadAvailableTemplates();
    console.log(`📁 Found ${templates.length} templates`);
    
    if (templates.length === 0) {
      console.log('❌ No templates found. Please ensure templates are available.');
      return;
    }
    
    // Test with first template
    const templateId = templates[0].id;
    console.log(`🎯 Testing with template: ${templateId}`);
    
    // Generate LaTeX
    console.log('🤖 Generating LaTeX with AI...');
    const latexCode = await aiLatexGenerator.generateLatexFromTemplate(templateId, testResumeData);
    
    console.log('📝 Generated LaTeX code length:', latexCode.length);
    console.log('📄 First 500 characters of generated LaTeX:');
    console.log('═'.repeat(60));
    console.log(latexCode.substring(0, 500));
    console.log('═'.repeat(60));
    
    // Validate the LaTeX
    const validation = await aiLatexGenerator.validateLatexCode(latexCode);
    console.log('✅ LaTeX validation result:', validation);
    
    if (validation.isValid) {
      console.log('🎉 SUCCESS: Generated LaTeX is syntactically valid!');
      
      // Test PDF compilation
      console.log('📄 Testing PDF compilation...');
      try {
        const pdfBuffer = await latexService.compileResume(testResumeData, {
          templateId: templateId,
          outputFormat: 'pdf',
          cleanup: false
        });
        
        console.log('🎉 SUCCESS: PDF compilation completed!');
        console.log('📄 PDF size:', pdfBuffer.length, 'bytes');
        
        // Save PDF for inspection
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, 'test-output.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('💾 PDF saved to:', outputPath);
        
      } catch (compilationError) {
        console.error('❌ PDF compilation failed:', compilationError.message);
        if (compilationError.logs) {
          console.error('📝 Compilation logs:', compilationError.logs);
        }
      }
    } else {
      console.error('❌ LaTeX validation failed:', validation.errors);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

// Run the test
testLatexGeneration().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});