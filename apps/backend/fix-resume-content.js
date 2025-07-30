const mongoose = require('mongoose');

async function fixResumeContent() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-job-suite');
    console.log('Connected to database');
    
    // Update the first resume with meaningful work experience
    const Resume = mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));
    const resume = await Resume.findOne({});
    
    if (!resume) {
      console.log('❌ No resume found');
      process.exit(1);
    }
    
    console.log(`📄 Updating resume: ${resume._id}`);
    
    // Add meaningful work experience
    resume.workExperience = [
      {
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-01-01'),
        isCurrent: false,
        responsibilities: [
          'Developed and maintained React applications using TypeScript and modern hooks',
          'Built scalable Node.js APIs and microservices with Express.js',
          'Worked with MongoDB and PostgreSQL databases for data storage solutions',
          'Implemented CI/CD pipelines using GitHub Actions and AWS services',
          'Led code reviews and mentored 3 junior developers',
          'Collaborated with cross-functional teams to deliver features on time'
        ],
        achievements: [
          'Reduced application load time by 40% through code optimization',
          'Successfully migrated legacy codebase to TypeScript',
          'Led implementation of automated testing, increasing coverage to 85%'
        ]
      },
      {
        jobTitle: 'Software Engineer',
        company: 'Startup Inc',
        location: 'Remote',
        startDate: new Date('2018-06-01'),
        endDate: new Date('2019-12-31'),
        isCurrent: false,
        responsibilities: [
          'Built responsive web applications using React and JavaScript',
          'Developed RESTful APIs using Node.js and Express',
          'Integrated third-party APIs and payment systems',
          'Participated in agile development processes and daily standups',
          'Wrote unit and integration tests using Jest and Cypress'
        ],
        achievements: [
          'Delivered 15+ features that improved user engagement by 25%',
          'Optimized database queries reducing response time by 30%'
        ]
      }
    ];
    
    // Enhance skills with more detailed information
    resume.skills = [
      { name: 'JavaScript', category: 'technical', proficiencyLevel: 'expert', yearsOfExperience: 6 },
      { name: 'TypeScript', category: 'technical', proficiencyLevel: 'expert', yearsOfExperience: 4 },
      { name: 'React', category: 'technical', proficiencyLevel: 'expert', yearsOfExperience: 5 },
      { name: 'Node.js', category: 'technical', proficiencyLevel: 'expert', yearsOfExperience: 5 },
      { name: 'Express.js', category: 'technical', proficiencyLevel: 'advanced', yearsOfExperience: 4 },
      { name: 'MongoDB', category: 'technical', proficiencyLevel: 'advanced', yearsOfExperience: 4 },
      { name: 'PostgreSQL', category: 'technical', proficiencyLevel: 'intermediate', yearsOfExperience: 3 },
      { name: 'AWS', category: 'technical', proficiencyLevel: 'intermediate', yearsOfExperience: 2 },
      { name: 'Git', category: 'technical', proficiencyLevel: 'expert', yearsOfExperience: 6 },
      { name: 'Jest', category: 'technical', proficiencyLevel: 'advanced', yearsOfExperience: 3 },
      { name: 'Problem Solving', category: 'soft', proficiencyLevel: 'expert' },
      { name: 'Team Leadership', category: 'soft', proficiencyLevel: 'advanced' },
      { name: 'Communication', category: 'soft', proficiencyLevel: 'expert' }
    ];
    
    // Improve professional summary
    resume.professionalSummary = 'Experienced Full-Stack Software Engineer with 6+ years of expertise in JavaScript, TypeScript, React, and Node.js. Proven track record of building scalable web applications, leading development teams, and delivering high-quality software solutions. Strong background in modern development practices including CI/CD, automated testing, and agile methodologies. Passionate about clean code, performance optimization, and mentoring junior developers.';
    
    // Add education if missing
    if (!resume.education || resume.education.length === 0) {
      resume.education = [
        {
          institution: 'University of Technology',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          graduationDate: new Date('2018-05-01'),
          gpa: '3.7',
          honors: ['Magna Cum Laude', 'Dean\'s List']
        }
      ];
    }
    
    // Add projects
    resume.projects = [
      {
        name: 'E-commerce Platform',
        description: 'Full-stack e-commerce application built with React, Node.js, and MongoDB',
        technologies: ['React', 'Node.js', 'MongoDB', 'Express.js', 'TypeScript'],
        url: 'https://github.com/example/ecommerce',
        startDate: new Date('2022-01-01'),
        endDate: new Date('2022-06-01')
      },
      {
        name: 'Task Management API',
        description: 'RESTful API for task management with user authentication and real-time updates',
        technologies: ['Node.js', 'PostgreSQL', 'Socket.io', 'JWT'],
        url: 'https://github.com/example/task-api',
        startDate: new Date('2021-08-01'),
        endDate: new Date('2021-12-01')
      }
    ];
    
    await resume.save();
    
    console.log('✅ Resume updated successfully!');
    console.log(`📊 New content:`, {
      workExperience: resume.workExperience.length,
      skills: resume.skills.length,
      projects: resume.projects.length,
      summaryLength: resume.professionalSummary.length
    });
    
    // Test the content size
    const resumeContent = JSON.stringify(resume.toObject());
    console.log(`📄 Total resume content: ${resumeContent.length} characters`);
    
    if (resumeContent.length > 100) {
      console.log('✅ Resume now has sufficient content for AI analysis!');
    } else {
      console.log('❌ Resume still needs more content');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix resume:', error.message);
  }
  
  process.exit(0);
}

fixResumeContent();