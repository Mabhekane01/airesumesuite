import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { globalSearchService as searchService } from '../services/searchService';
import { Resume, JobApplication, CoverLetter } from '../types';

interface SearchContextType {
  updateSearchIndex: (data: {
    resumes?: Resume[];
    jobApplications?: JobApplication[];
    coverLetters?: CoverLetter[];
  }) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const updateSearchIndex = (data: {
    resumes?: Resume[];
    jobApplications?: JobApplication[];
    coverLetters?: CoverLetter[];
  }) => {
    searchService.updateIndex(data);
  };

  // Initialize with sample data for demo
  useEffect(() => {
    const sampleData = {
      resumes: [
        {
          id: '1',
          template: 'modern',
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@email.com',
            phone: '+1-555-0123',
            location: 'San Francisco, CA',
            professionalTitle: 'Senior Software Engineer',
            linkedinUrl: 'https://linkedin.com/in/johndoe',
            githubUrl: 'https://github.com/johndoe'
          },
          professionalSummary: 'Experienced software engineer with 8+ years developing scalable web applications. Expert in React, Node.js, and cloud technologies. Proven track record of leading teams and delivering high-quality solutions.',
          workExperience: [
            {
              id: '1',
              jobTitle: 'Senior Software Engineer',
              company: 'Tech Innovations Inc',
              location: 'San Francisco, CA',
              startDate: '2020-01',
              endDate: '',
              isCurrentJob: true,
              responsibilities: [
                'Lead development of microservices architecture',
                'Mentor junior developers and conduct code reviews',
                'Collaborate with product team on feature planning'
              ],
              achievements: [
                'Reduced application load time by 40%',
                'Implemented CI/CD pipeline improving deployment speed by 60%'
              ]
            }
          ],
          education: [
            {
              id: '1',
              institution: 'Stanford University',
              degree: 'Bachelor of Science',
              fieldOfStudy: 'Computer Science',
              graduationDate: '2016-06',
              honors: ['Magna Cum Laude']
            }
          ],
          skills: [
            { id: '1', name: 'React', category: 'technical' as const, proficiencyLevel: 'expert' as const },
            { id: '2', name: 'Node.js', category: 'technical' as const, proficiencyLevel: 'expert' as const },
            { id: '3', name: 'TypeScript', category: 'technical' as const, proficiencyLevel: 'advanced' as const },
            { id: '4', name: 'AWS', category: 'technical' as const, proficiencyLevel: 'advanced' as const }
          ],
          projects: [
            {
              id: '1',
              name: 'E-commerce Platform',
              description: 'Full-stack e-commerce solution with React frontend and Node.js backend',
              technologies: ['React', 'Node.js', 'MongoDB', 'Stripe API'],
              url: 'https://github.com/johndoe/ecommerce'
            }
          ],
          certifications: [],
          languages: [],
          volunteerExperience: [],
          awards: [],
          publications: [],
          references: [],
          hobbies: [],
          additionalSections: []
        }
      ] as Resume[],
      jobApplications: [
        {
          id: '1',
          jobTitle: 'Senior Frontend Developer',
          companyName: 'Meta',
          location: 'Menlo Park, CA',
          status: 'interviewing' as const,
          appliedDate: '2024-01-15',
          salary: '$180,000 - $220,000',
          notes: 'Passed technical screening, waiting for system design interview'
        },
        {
          id: '2',
          jobTitle: 'Full Stack Engineer',
          companyName: 'Airbnb',
          location: 'San Francisco, CA',
          status: 'applied' as const,
          appliedDate: '2024-01-20',
          salary: '$160,000 - $200,000',
          notes: 'Application submitted via company website'
        }
      ] as JobApplication[],
      coverLetters: [
        {
          id: '1',
          content: 'Dear Hiring Manager, I am writing to express my strong interest in the Senior Frontend Developer position at Meta. With over 8 years of experience in software development and a passion for creating exceptional user experiences...',
          jobTitle: 'Senior Frontend Developer',
          companyName: 'Meta',
          tone: 'professional' as const
        }
      ] as CoverLetter[]
    };

    updateSearchIndex(sampleData);
  }, []);

  return (
    <SearchContext.Provider value={{ updateSearchIndex }}>
      {children}
    </SearchContext.Provider>
  );
};