export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern-creative' | 'professional-corporate' | 'technical-functional' | 'minimalist';
  industry: string[];
  previewImage: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  features: string[];
  atsCompatibility: 'high' | 'medium' | 'low';
  layout: 'single-column' | 'two-column' | 'multi-section';
  fontStyle: 'modern' | 'classic' | 'serif' | 'sans-serif';
  isPopular?: boolean;
  isNew?: boolean;
  isPremium?: boolean;
  engine: 'latex'; // Explicit engine definition - forced to LaTeX for all
  sampleData?: {
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      location?: string;
      website?: string;
      linkedin?: string;
      github?: string;
      orcid?: string;
    };
    professionalSummary?: string;
    workExperience?: Array<{ 
      position: string;
      company: string;
      location: string;
      startDate: string;
      endDate: string;
      description: string;
      achievements?: string[];
    }>;
    education?: Array<{ 
      degree: string;
      institution: string;
      location: string;
      startDate: string;
      endDate: string;
      gpa?: string;
      thesis?: string;
      honors?: string[];
    }>;
    skills?: Array<{ 
      name: string;
      level: number;
      category: string;
    }>;
    projects?: Array<{ 
      name: string;
      description: string;
      technologies: string[];
      startDate: string;
      endDate: string;
      url?: string;
    }>;
    certifications?: Array<{ 
      name: string;
      issuer: string;
      date: string;
      expiryDate?: string;
    }>;
    languages?: Array<{ 
      name: string;
      proficiency: string;
    }>;
    awards?: Array<{ 
      name: string;
      issuer: string;
      date: string;
      description?: string;
    }>;
    publications?: string[];
    references?: Array<{ 
      name: string;
      position: string;
      institution: string;
      email: string;
      phone?: string;
    }>;
  };
}

export const resumeTemplates: ResumeTemplate[] = [
  // Modern & Creative Templates
  {
    id: 'template01', // Was modern-creative-1
    name: 'Tech Innovator',
    description: 'Modern design with clean lines perfect for tech startups and creative roles',
    category: 'modern-creative',
    industry: ['Technology', 'Startups', 'Digital Marketing', 'UX/UI Design'],
    previewImage: '/templates/modern-creative-1.png',
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#3b82f6',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Two-column layout', 'Icon integration', 'Skills visualization', 'Project showcase'],
    atsCompatibility: 'high',
    layout: 'two-column',
    fontStyle: 'modern',
    isPopular: true,
    engine: 'latex'
  },
  {
    id: 'template02', // Was modern-creative-2
    name: 'Creative Portfolio',
    description: 'Vibrant layout with color accents for designers and creative professionals',
    category: 'modern-creative',
    industry: ['Graphic Design', 'Marketing', 'Advertising', 'Media & Entertainment'],
    previewImage: '/templates/modern-creative-2.png',
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      accent: '#34d399',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Creative sections', 'Portfolio showcase', 'Visual elements', 'Brand integration'],
    atsCompatibility: 'medium',
    layout: 'multi-section',
    fontStyle: 'modern',
    isNew: true,
    engine: 'latex'
  },
  // Professional & Corporate Templates
  {
    id: 'template03', // Was professional-corporate-1
    name: 'Corporate Executive',
    description: 'Traditional, conservative layout for finance, law, and executive roles',
    category: 'professional-corporate',
    industry: ['Finance', 'Law', 'Banking', 'Consulting', 'Government'],
    previewImage: '/templates/professional-corporate-1.png',
    colors: {
      primary: '#1e40af',
      secondary: '#1e3a8a',
      accent: '#3b82f6',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Single-column layout', 'Times New Roman font', 'Conservative design', 'Professional authority'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'serif',
    isPopular: true,
    engine: 'latex'
  },
  {
    id: 'template04', // Was professional-corporate-2
    name: 'Investment Banking',
    description: 'Premium corporate design for high-level finance and investment roles',
    category: 'professional-corporate',
    industry: ['Investment Banking', 'Private Equity', 'Corporate Finance', 'Management Consulting'],
    previewImage: '/templates/professional-corporate-2.png',
    colors: {
      primary: '#374151',
      secondary: '#4b5563',
      accent: '#6b7280',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Formal structure', 'Garamond typography', 'Executive presence', 'Trust-building design'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'serif',
    engine: 'latex'
  },
  
  // Technical & Functional Templates
  {
    id: 'template05', // Was technical-functional-1
    name: 'Software Engineer',
    description: 'Skills-focused layout emphasizing technical competencies and projects',
    category: 'technical-functional',
    industry: ['Software Development', 'Engineering', 'DevOps', 'Data Science'],
    previewImage: '/templates/technical-functional-1.png',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#10b981',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Technical skills emphasis', 'Project showcase', 'GitHub integration', 'Code-friendly layout'],
    atsCompatibility: 'high',
    layout: 'two-column',
    fontStyle: 'sans-serif',
    isPopular: true,
    engine: 'latex'
  },
  {
    id: 'technical-functional-2',
    name: 'Data Scientist Pro',
    description: 'Analytics-focused design with metrics and technical project highlights',
    category: 'technical-functional',
    industry: ['Data Science', 'Machine Learning', 'Analytics', 'Research'],
    previewImage: '/templates/technical-functional-2.png',
    colors: {
      primary: '#0d9488',
      secondary: '#0f766e',
      accent: '#14b8a6',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Skills visualization', 'Project metrics', 'Technical achievements', 'Research highlights'],
    atsCompatibility: 'high',
    layout: 'multi-section',
    fontStyle: 'modern',
    isNew: true,
    engine: 'latex'
  },
  
  // Minimalist Templates
  {
    id: 'minimalist-1',
    name: 'ATS Optimized',
    description: 'Ultra-clean design optimized for ATS systems and content focus',
    category: 'minimalist',
    industry: ['All Industries', 'Career Transitions', 'Entry Level', 'ATS-Heavy Companies'],
    previewImage: '/templates/minimalist-1.png',
    colors: {
      primary: '#000000',
      secondary: '#374151',
      accent: '#6b7280',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Maximum ATS compatibility', 'Content-focused', 'Clean typography', 'Simple structure'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    isPopular: true,
    engine: 'latex'
  },
  {
    id: 'minimalist-2',
    name: 'Swiss Professional',
    description: 'Swiss design principles with perfect spacing and minimal elegance',
    category: 'minimalist',
    industry: ['Architecture', 'Design', 'Academia', 'Non-profit'],
    previewImage: '/templates/minimalist-2.png',
    colors: {
      primary: '#0f172a',
      secondary: '#1e293b',
      accent: '#334155',
      text: '#1f2937',
      background: '#ffffff'
    },
    features: ['Swiss typography', 'Grid system', 'Minimal elegance', 'Perfect spacing'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    engine: 'latex'
  },
  
  // Marissa Mayer AltaCV Template
  {
    id: 'altacv-marissa-mayer',
    name: 'AltaCV Executive',
    description: 'Executive CV template inspired by Marissa Mayer with vivid emerald accents and professional layout',
    category: 'professional-corporate',
    industry: ['Technology', 'Executive', 'Management', 'Startups', 'Leadership'],
    previewImage: '/templates/altacv-marissa-mayer.png',
    colors: {
      primary: '#059669',   // VividEmerald
      secondary: '#059669', // VividEmerald
      accent: '#059669',    // VividEmerald
      text: '#2E2E2E',      // SlateGrey
      background: '#ffffff'
    },
    features: ['Executive presence', 'Two-column layout', 'Life philosophy section', 'Achievement highlights', 'Professional photo', 'Publications ready'],
    atsCompatibility: 'high',
    layout: 'two-column',
    fontStyle: 'sans-serif',
    isNew: true,
    engine: 'latex',
    sampleData: {
      personalInfo: {
        firstName: 'Marissa',
        lastName: 'Mayer',
        email: 'mmayer@yahoo-inc.com',
        phone: '',
        location: 'Sunnyvale, CA',
        website: 'marissamayr.tumblr.com',
        linkedin: 'marissamayer',
        github: '',
        orcid: ''
      },
      professionalSummary: 'Business Woman & Proud Geek',
      workExperience: [
        {
          position: 'President & CEO',
          company: 'Yahoo!',
          location: 'Sunnyvale, CA',
          startDate: 'July 2012',
          endDate: 'Ongoing',
          description: 'Led the $5 billion acquisition of the company with Verizon',
          achievements: [
            'Led the $5 billion acquisition of the company with Verizon -- the entity which believed most in the immense value Yahoo! has created',
            'Acquired Tumblr for $1.1 billion and moved the company\'s blog there',
            'Built Yahoo\'s mobile, video and social businesses from nothing in 2011 to $1.6 billion in GAAP revenue in 2015',
            'Tripled the company\'s mobile base to over 600 million monthly active users and generated over $1 billion of mobile advertising revenue last year'
          ]
        },
        {
          position: 'Vice President of Location & Services',
          company: 'Google',
          location: 'Palo Alto, CA',
          startDate: 'Oct 2010',
          endDate: 'July 2012',
          description: 'Position Google Maps as the world leader in mobile apps and navigation',
          achievements: [
            'Position Google Maps as the world leader in mobile apps and navigation',
            'Oversaw 1000+ engineers and product managers working on Google Maps, Google Places and Google Earth'
          ]
        },
        {
          position: 'Vice President of Search Products & UX',
          company: 'Google',
          location: 'Palo Alto, CA',
          startDate: '2005',
          endDate: '2010',
          description: 'Led search products and user experience initiatives'
        },
        {
          position: 'Product Manager & UI Lead',
          company: 'Google',
          location: 'Palo Alto, CA',
          startDate: 'Oct 2001',
          endDate: 'July 2005',
          description: 'Appointed by the founder Larry Page in 2001 to lead the Product Management and User Interaction teams',
          achievements: [
            'Appointed by the founder Larry Page in 2001 to lead the Product Management and User Interaction teams',
            'Optimized Google\'s homepage and A/B tested every minor detail to increase usability (incl. spacing between words, color schemes and pixel-by-pixel element alignment)'
          ]
        }
      ],
      education: [
        {
          degree: 'M.S. in Computer Science',
          institution: 'Stanford University',
          location: '',
          startDate: 'Sept 1997',
          endDate: 'June 1999'
        },
        {
          degree: 'B.S. in Symbolic Systems',
          institution: 'Stanford University',
          location: '',
          startDate: 'Sept 1993',
          endDate: 'June 1997'
        }
      ],
      skills: [
        { name: 'English', level: 5, category: 'Languages' },
        { name: 'Spanish', level: 4, category: 'Languages' },
        { name: 'German', level: 3.5, category: 'Languages' },
        { name: 'Hard-working', level: 5, category: 'Strengths' },
        { name: 'Eye for detail', level: 5, category: 'Strengths' },
        { name: 'Motivator & Leader', level: 5, category: 'Strengths' },
        { name: 'UX', level: 5, category: 'Technical' },
        { name: 'Mobile Devices & Applications', level: 5, category: 'Technical' },
        { name: 'Product Management & Marketing', level: 5, category: 'Technical' }
      ],
      awards: [
        {
          name: 'Courage I had',
          issuer: '',
          date: '',
          description: 'to take a sinking ship and try to make it float'
        },
        {
          name: 'Persistence & Loyalty',
          issuer: '',
          date: '',
          description: 'I showed despite the hard moments and my willingness to stay with Yahoo after the acquisition'
        },
        {
          name: 'Google\'s Growth',
          issuer: '',
          date: '',
          description: 'from a hundred thousand searches per day to over a billion'
        },
        {
          name: 'Inspiring women in tech',
          issuer: '',
          date: '',
          description: 'Youngest CEO on Fortune\'s list of 50 most powerful women'
        }
      ],
      publications: [
        'Books publications will appear here',
        'Journal Articles will appear here', 
        'Conference Proceedings will appear here'
      ],
      references: [
        {
          name: 'Prof. Alpha Beta',
          position: '',
          institution: 'Institute',
          email: 'a.beta@university.edu',
          phone: ''
        }
      ]
    }
  },
  
  // AltaCV Overleaf Template - Exact Match
  {
    id: 'altacv-overleaf-exact',
    name: 'AltaCV Overleaf',
    description: 'Exact replica of the AltaCV LaTeX template from Overleaf with two-column layout and academic styling',
    category: 'professional-corporate',
    industry: ['Academia', 'Research', 'Engineering', 'Science', 'Technology', 'Consulting'],
    previewImage: '/templates/altacv-overleaf-exact.png',
    colors: {
      primary: '#450808',   // DarkPastelRed from LaTeX
      secondary: '#8F0D0D', // PastelRed from LaTeX
      accent: '#E7D192',    // GoldenEarth from LaTeX
      text: '#2E2E2E',      // SlateGrey from LaTeX
      background: '#ffffff'
    },
    features: ['Two-column paracol layout', 'Academic CV sections', 'Publications with bibliography', 'Skills with rating circles', 'Photo support', 'FontAwesome icons'],
    atsCompatibility: 'high',
    layout: 'two-column',
    fontStyle: 'serif',
    isNew: true,
    engine: 'latex',
    sampleData: {
      personalInfo: {
        firstName: 'Your Name',
        lastName: 'Here',
        email: 'your_name@email.com',
        phone: '000-00-0000',
        location: 'Location, COUNTRY',
        website: 'www.homepage.com',
        linkedin: 'your_id',
        github: 'your_id',
        orcid: '0000-0000-0000-0000'
      },
      professionalSummary: 'Your Position or Tagline Here',
      workExperience: [
        {
          position: 'Job Title 1',
          company: 'Company 1',
          location: 'Location',
          startDate: 'Month 20XX',
          endDate: 'Ongoing',
          description: 'Job description 1',
          achievements: [
            'Job description 1',
            'Job description 2'
          ]
        },
        {
          position: 'Job Title 2',
          company: 'Company 2',
          location: 'Location',
          startDate: 'Month 20XX',
          endDate: 'Ongoing',
          description: 'Job description 1',
          achievements: [
            'Job description 1',
            'Job description 2'
          ]
        }
      ],
      education: [
        {
          degree: 'Ph.D. in Your Discipline',
          institution: 'Your University',
          location: '',
          startDate: 'Sept 2002',
          endDate: 'June 2006',
          thesis: 'Thesis title: Wonderful Research'
        },
        {
          degree: 'M.Sc. in Your Discipline',
          institution: 'Your University',
          location: '',
          startDate: 'Sept 2001',
          endDate: 'June 2002'
        },
        {
          degree: 'B.Sc. in Your Discipline',
          institution: 'Stanford University',
          location: '',
          startDate: 'Sept 1998',
          endDate: 'June 2001'
        }
      ],
      skills: [
        { name: 'English', level: 5, category: 'Languages' },
        { name: 'Spanish', level: 4, category: 'Languages' },
        { name: 'German', level: 3.5, category: 'Languages' },
        { name: 'Hard-working', level: 5, category: 'Strengths' },
        { name: 'Eye for detail', level: 5, category: 'Strengths' },
        { name: 'Motivator & Leader', level: 5, category: 'Strengths' },
        { name: 'C++', level: 4, category: 'Technical' },
        { name: 'Embedded Systems', level: 4, category: 'Technical' },
        { name: 'Statistical Analysis', level: 4, category: 'Technical' }
      ],
      projects: [
        {
          name: 'Project 1',
          description: 'Details',
          technologies: [],
          startDate: '',
          endDate: '',
          url: ''
        },
        {
          name: 'Project 2',
          description: 'A short abstract would also work.',
          technologies: [],
          startDate: 'Project duration',
          endDate: '',
          url: ''
        }
      ],
      awards: [
        {
          name: 'Fantastic Achievement',
          issuer: '',
          date: '',
          description: 'and some details about it'
        },
        {
          name: 'Another achievement',
          issuer: '',
          date: '',
          description: 'more details about it of course'
        },
        {
          name: 'Another achievement',
          issuer: '',
          date: '',
          description: 'more details about it of course'
        }
      ],
      publications: [
        'Books publications will appear here',
        'Journal Articles will appear here', 
        'Conference Proceedings will appear here'
      ],
      references: [
        {
          name: 'Prof. Alpha Beta',
          position: '',
          institution: 'Institute',
          email: 'a.beta@university.edu',
          phone: ''
        },
        {
          name: 'Prof. Gamma Delta',
          position: '',
          institution: 'Institute',
          email: 'g.delta@university.edu',
          phone: ''
        }
      ]
    }
  },
  
  // Additional CV Templates based on Overleaf Styles
  {
    id: 'simple-hipster-cv',
    name: 'Simple Hipster CV',
    description: 'Clean, modern design with subtle color accents inspired by Overleaf\'s Simple Hipster CV',
    category: 'modern-creative',
    industry: ['Technology', 'Design', 'Marketing', 'Startups', 'Creative'],
    previewImage: '/templates/simple-hipster-cv.png',
    colors: {
      primary: '#2B83BA',
      secondary: '#54C7EC',
      accent: '#FFCC5C',
      text: '#2E2E2E',
      background: '#ffffff'
    },
    features: ['Clean typography', 'Color coding sections', 'Timeline layout', 'Skills bars'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    isPopular: true,
    engine: 'latex'
  },
  
  {
    id: 'deedy-resume',
    name: 'Deedy Resume',
    description: 'Sharp, professional layout with clear section divisions inspired by Deedy Resume template',
    category: 'technical-functional',
    industry: ['Software Engineering', 'Computer Science', 'Technology', 'Engineering'],
    previewImage: '/templates/deedy-resume.png',
    colors: {
      primary: '#2B2B2B',
      secondary: '#666666',
      accent: '#0066CC',
      text: '#2B2B2B',
      background: '#ffffff'
    },
    features: ['Technical focus', 'Clean sections', 'Skills emphasis', 'Project highlights'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    engine: 'latex'
  },
  
  
  {
    id: 'sb2nov-resume',
    name: 'SB2Nov Resume',
    description: 'Clean, minimalist resume template popular among software engineers',
    category: 'technical-functional',
    industry: ['Software Engineering', 'Technology', 'Computer Science', 'Data Science'],
    previewImage: '/templates/sb2nov-resume.png',
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#0066CC',
      text: '#000000',
      background: '#ffffff'
    },
    features: ['Minimalist design', 'Technical focus', 'GitHub integration', 'Project showcase'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    isPopular: true,
    engine: 'latex'
  },
  
  
  {
    id: 'awesome-cv',
    name: 'Awesome CV',
    description: 'Professional CV template with elegant typography and clean structure',
    category: 'professional-corporate',
    industry: ['Corporate', 'Finance', 'Consulting', 'Management', 'Business'],
    previewImage: '/templates/awesome-cv.png',
    colors: {
      primary: '#0395DE',
      secondary: '#027BB7',
      accent: '#FF6B35',
      text: '#2B2B2B',
      background: '#ffffff'
    },
    features: ['Professional layout', 'Clean typography', 'Section dividers', 'Contact highlights'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    engine: 'latex'
  },
  
  
  
  {
    id: 'classic-thesis-cv',
    name: 'Classic Thesis CV',
    description: 'Traditional academic CV with classic typography and formal structure',
    category: 'minimalist',
    industry: ['Academia', 'Research', 'Education', 'Science', 'Literature'],
    previewImage: '/templates/classic-thesis-cv.png',
    colors: {
      primary: '#800020',
      secondary: '#A0002A',
      accent: '#C0003E',
      text: '#2E2E2E',
      background: '#ffffff'
    },
    features: ['Classic typography', 'Formal structure', 'Academic sections', 'Bibliography ready'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'serif',
    engine: 'latex'
  },
  
  {
    id: 'tech-minimalist',
    name: 'Tech Minimalist',
    description: 'Ultra-clean design focused on technical skills and achievements',
    category: 'minimalist',
    industry: ['Technology', 'Software Engineering', 'DevOps', 'Data Science'],
    previewImage: '/templates/tech-minimalist.png',
    colors: {
      primary: '#37474F',
      secondary: '#455A64',
      accent: '#607D8B',
      text: '#263238',
      background: '#ffffff'
    },
    features: ['Minimal design', 'Technical emphasis', 'Clean sections', 'Code-friendly'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'sans-serif',
    engine: 'latex'
  },
  
  {
    id: 'creative-portfolio-cv',
    name: 'Creative Portfolio CV',
    description: 'Vibrant template showcasing creative work and visual portfolio',
    category: 'technical-functional',
    industry: ['Design', 'Creative', 'Digital Art', 'UX/UI', 'Photography'],
    previewImage: '/templates/creative-portfolio-cv.png',
    colors: {
      primary: '#FF6F00',
      secondary: '#FF8F00',
      accent: '#FFA000',
      text: '#424242',
      background: '#ffffff'
    },
    features: ['Portfolio showcase', 'Visual elements', 'Creative sections', 'Project gallery'],
    atsCompatibility: 'medium',
    layout: 'multi-section',
    fontStyle: 'modern',
    engine: 'latex'
  },
  
  {
    id: 'clean-academic-minimal',
    name: 'Clean Academic Minimal',
    description: 'Ultra-minimalist template perfect for academic and research positions',
    category: 'minimalist',
    industry: ['Academia', 'Research', 'Education', 'Science', 'Medicine'],
    previewImage: '/templates/clean-academic-minimal.png',
    colors: {
      primary: '#2C3E50',
      secondary: '#34495E',
      accent: '#7F8C8D',
      text: '#2C3E50',
      background: '#ffffff'
    },
    features: ['Academic focus', 'Publication ready', 'Clean typography', 'Research emphasis'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'serif',
    engine: 'latex'
  },
  
  {
    id: 'modern-gradient-creative',
    name: 'Modern Gradient Creative',
    description: 'Eye-catching design with gradient elements and modern creative styling',
    category: 'modern-creative',
    industry: ['Design', 'Marketing', 'Creative', 'Digital Media', 'Startups'],
    previewImage: '/templates/modern-gradient-creative.png',
    colors: {
      primary: '#667EEA',
      secondary: '#764BA2',
      accent: '#F093FB',
      text: '#2D3748',
      background: '#ffffff'
    },
    features: ['Gradient design', 'Modern styling', 'Creative layout', 'Visual impact'],
    atsCompatibility: 'medium',
    layout: 'two-column',
    fontStyle: 'modern',
    isNew: true,
    engine: 'latex'
  },
  
  {
    id: 'rendercv-classic',
    name: 'RenderCV Classic',
    description: 'Exact replica of the RenderCV LaTeX template with clean typography and professional structure',
    category: 'professional-corporate',
    industry: ['Technology', 'Software Engineering', 'Computer Science', 'Research', 'Academia', 'Corporate'],
    previewImage: '/templates/rendercv-classic.png',
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#0066CC',
      text: '#000000',
      background: '#ffffff'
    },
    features: ['LaTeX-inspired typography', 'ATS optimized', 'Professional sections', 'Clean structure', 'Charter font family', 'Publication support'],
    atsCompatibility: 'high',
    layout: 'single-column',
    fontStyle: 'serif',
    isNew: true,
    engine: 'latex',
    sampleData: {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'youremail@yourdomain.com',
        phone: '0541 999 99 99',
        location: 'Your Location',
        website: 'yourwebsite.com',
        linkedin: 'linkedin.com/in/yourusername',
        github: 'github.com/yourusername'
      },
      professionalSummary: 'RenderCV is a LaTeX-based CV/resume version-control and maintenance app. It allows you to create a high-quality CV or resume as a PDF file from a YAML file, with Markdown syntax support and complete control over the LaTeX code.',
      workExperience: [
        {
          position: 'Software Engineer',
          company: 'Apple',
          location: 'Cupertino, CA',
          startDate: 'June 2005',
          endDate: 'Aug 2007',
          description: 'Led development of user experience improvements and system integrations',
          achievements: [
            'Reduced time to render user buddy lists by 75% by implementing a prediction algorithm',
            'Integrated iChat with Spotlight Search by creating a tool to extract metadata from saved chat transcripts and provide metadata to a system-wide search database',
            'Redesigned chat file format and implemented backward compatibility for search'
          ]
        },
        {
          position: 'Software Engineer Intern',
          company: 'Microsoft',
          location: 'Redmond, WA',
          startDate: 'June 2003',
          endDate: 'Aug 2003',
          description: 'Developed UI components and optimization tools for Visual Studio',
          achievements: [
            'Designed a UI for the VS open file switcher (Ctrl-Tab) and extended it to tool windows',
            'Created a service to provide gradient across VS and VS add-ins, optimizing its performance via caching',
            'Built an app to compute the similarity of all methods in a codebase, reducing the time from O(n²) to O(n log n)',
            'Created a test case generation tool that creates random XML docs from XML Schema',
            'Automated the extraction and processing of large datasets from legacy systems using SQL and Perl scripts'
          ]
        }
      ],
      education: [
        {
          degree: 'BS in Computer Science',
          institution: 'University of Pennsylvania',
          location: '',
          startDate: 'Sept 2000',
          endDate: 'May 2005',
          gpa: '3.9/4.0',
          honors: ['Computer Architecture', 'Comparison of Learning Algorithms', 'Computational Theory']
        }
      ],
      skills: [
        { name: 'C++', level: 5, category: 'Programming Languages' },
        { name: 'C', level: 5, category: 'Programming Languages' },
        { name: 'Java', level: 5, category: 'Programming Languages' },
        { name: 'Objective-C', level: 4, category: 'Programming Languages' },
        { name: 'C#', level: 4, category: 'Programming Languages' },
        { name: 'SQL', level: 4, category: 'Programming Languages' },
        { name: 'JavaScript', level: 4, category: 'Programming Languages' },
        { name: '.NET', level: 4, category: 'Technologies' },
        { name: 'Microsoft SQL Server', level: 4, category: 'Technologies' },
        { name: 'XCode', level: 4, category: 'Technologies' },
        { name: 'Interface Builder', level: 3, category: 'Technologies' }
      ],
      projects: [
        {
          name: 'Multi-User Drawing Tool',
          description: 'Developed an electronic classroom where multiple users can simultaneously view and draw on a \"chalkboard\" with each person\'s edits synchronized',
          technologies: ['C++', 'MFC'],
          startDate: '',
          endDate: '',
          url: 'github.com/name/repo'
        },
        {
          name: 'Synchronized Desktop Calendar',
          description: 'Developed a desktop calendar with globally shared and synchronized calendars, allowing users to schedule meetings with other users',
          technologies: ['C#', '.NET', 'SQL', 'XML'],
          startDate: '',
          endDate: '',
          url: 'github.com/name/repo'
        },
        {
          name: 'Custom Operating System',
          description: 'Built a UNIX-style OS with a scheduler, file system, text editor, and calculator',
          technologies: ['C'],
          startDate: '2002',
          endDate: '2002'
        }
      ],
      publications: [
        '3D Finite Element Analysis of No-Insulation Coils (Jan 2004) - Frodo Baggins, John Doe, Samwise Gamgee - DOI: 10.1109/TASC.2023.3340648'
      ]
    }
  }
];

export const getTemplateById = (id: string): ResumeTemplate | undefined => {
  return resumeTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: ResumeTemplate['category']): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.category === category);
};

export const getPopularTemplates = (): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.isPopular);
};

export const getNewTemplates = (): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.isNew);
};