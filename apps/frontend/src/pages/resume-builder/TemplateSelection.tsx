import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrophyIcon,
  SparklesIcon,
  ChevronLeftIcon,
  BriefcaseIcon,
  StarIcon,
  ShieldCheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { resumeTemplates, ResumeTemplate } from '../../data/resumeTemplates';
import TemplateRenderer from '../../components/resume/TemplateRenderer';
import { Resume } from '../../types';

const categories = [
  {
    id: 'modern-creative',
    name: 'Modern & Creative',
    description: 'Perfect for tech startups, designers, and creative professionals',
    icon: SparklesIcon,
    gradient: 'from-blue-500 to-purple-600',
    count: '2',
    features: ['Modern design', 'Creative layouts', 'Visual impact']
  },
  {
    id: 'professional-corporate',
    name: 'Professional & Corporate',
    description: 'Ideal for finance, law, consulting, and executive roles',
    icon: TrophyIcon,
    gradient: 'from-green-500 to-emerald-600',
    count: '4',
    features: ['Executive presence', 'Conservative design', 'Professional authority']
  },
  {
    id: 'technical-functional',
    name: 'Technical & Functional',
    description: 'Skills-focused layouts for engineers and technical roles',
    icon: ShieldCheckIcon,
    gradient: 'from-cyan-500 to-blue-600',
    count: '2',
    features: ['Technical skills emphasis', 'Project showcase', 'Code-friendly']
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, ATS-optimized designs for maximum compatibility',
    icon: ArrowRightIcon,
    gradient: 'from-gray-500 to-slate-600',
    count: '2',
    features: ['ATS optimized', 'Clean typography', 'Content focused']
  }
];

export default function TemplateSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [isHovering, setIsHovering] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'category' | 'template'>('category');

  // Get resume data if passed from previous steps
  const resumeData = location.state?.resumeData;

  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return [];
    
    let templates = resumeTemplates.filter(template => 
      template.category === selectedCategory
    );
    
    if (selectedIndustry !== 'all') {
      templates = templates.filter(t => 
        t.industry.some(ind => ind.toLowerCase().includes(selectedIndustry.toLowerCase()))
      );
    }
    
    return templates;
  }, [selectedCategory, selectedIndustry]);

  const allIndustries = useMemo(() => {
    const industries = new Set<string>();
    resumeTemplates.forEach(template => {
      template.industry.forEach(industry => industries.add(industry));
    });
    return ['all', ...Array.from(industries).sort()];
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentStep('template');
  };

  const handleBackToCategories = () => {
    setCurrentStep('category');
    setSelectedCategory('');
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleContinue = () => {
    if (resumeData) {
      const updatedData = { ...resumeData, templateId: selectedTemplate };
      navigate('/dashboard/resume/builder', { state: { resumeData: updatedData, templateId: selectedTemplate } });
    } else {
      navigate('/dashboard/resume/comprehensive', { state: { templateId: selectedTemplate } });
    }
  };

  // Template Preview Component using shared TemplateRenderer
  const TemplatePreview = ({ template }: { template: ResumeTemplate }) => {
    // Create sample resume data for preview
    const sampleResume: Resume = {
      _id: 'preview',
      template: template.id,
      personalInfo: template.sampleData?.personalInfo || {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        location: 'New York, NY',
        title: 'Software Engineer'
      },
      professionalSummary: template.sampleData?.professionalSummary || 'Experienced software engineer with 5+ years developing scalable web applications and leading technical teams. Expertise in full-stack development, cloud architecture, and agile methodologies.',
      workExperience: template.sampleData?.workExperience?.map(exp => ({
        jobTitle: exp.position,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrentJob: exp.endDate === 'Ongoing',
        responsibilities: exp.achievements || [exp.description],
        achievements: exp.achievements || []
      })) || [
        {
          jobTitle: 'Senior Software Engineer',
          company: 'Tech Innovations Inc.',
          location: 'San Francisco, CA',
          startDate: '2022-01-01',
          endDate: '',
          isCurrentJob: true,
          responsibilities: ['Led development of microservices architecture', 'Improved application performance by 40%', 'Mentored 5 junior developers'],
          achievements: []
        },
        {
          jobTitle: 'Software Developer',
          company: 'StartupXYZ',
          location: 'Remote',
          startDate: '2020-01-01',
          endDate: '2022-01-01',
          isCurrentJob: false,
          responsibilities: ['Built scalable backend services and APIs', 'Implemented CI/CD pipelines'],
          achievements: []
        }
      ],
      education: template.sampleData?.education?.map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        graduationDate: edu.endDate,
        fieldOfStudy: edu.thesis || '',
        gpa: edu.gpa || '',
        honors: edu.honors || []
      })) || [
        {
          degree: 'B.S. Computer Science',
          institution: 'University of Technology',
          graduationDate: '2020-05-01',
          fieldOfStudy: '',
          gpa: '',
          honors: []
        }
      ],
      skills: template.sampleData?.skills?.map(skill => ({
        name: skill.name,
        level: skill.level,
        category: skill.category.toLowerCase()
      })) || [
        { name: 'JavaScript', level: 5, category: 'technical' },
        { name: 'React', level: 5, category: 'technical' },
        { name: 'Node.js', level: 4, category: 'technical' },
        { name: 'Python', level: 4, category: 'technical' },
        { name: 'AWS', level: 3, category: 'technical' }
      ],
      projects: template.sampleData?.projects?.map(proj => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        startDate: proj.startDate,
        endDate: proj.endDate,
        url: proj.url || ''
      })) || [
        {
          name: 'E-commerce Platform',
          description: 'Full-stack web application with React, Node.js, and MongoDB',
          technologies: ['React', 'Node.js', 'MongoDB'],
          startDate: '',
          endDate: '',
          url: ''
        },
        {
          name: 'AI Recommendation System',
          description: 'Machine learning model for personalized recommendations',
          technologies: ['Python', 'TensorFlow'],
          startDate: '',
          endDate: '',
          url: ''
        }
      ],
      certifications: [],
      languages: [
        { name: 'English', proficiency: 'Native' },
        { name: 'Spanish', proficiency: 'Advanced' }
      ],
      volunteerExperience: [],
      awards: [],
      hobbies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return <TemplateRenderer resume={sampleResume} template={template} isPreview={true} />;
  };

  // Category Selection Page
  const renderCategorySelection = () => (
    <div className="min-h-screen gradient-dark py-6 animate-slide-up-soft">
      <div className="max-w-7xl mx-auto px-4">
        {/* Compact Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/dashboard/resume')}
            className="group flex items-center text-dark-text-secondary hover:text-dark-text-primary mb-4 mx-auto transition-all duration-300 hover:translate-x-1"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Resume Builder</span>
          </button>
          
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black text-dark-text-primary leading-tight">
              Choose Your
              <span className="gradient-text-dark">
                {" "}Perfect
              </span>
              <br />Resume Style
            </h1>
            <p className="text-lg text-dark-text-secondary max-w-2xl mx-auto">
              Select a category that matches your industry and career ambitions
            </p>
          </div>
          {/* Quick Stats */}
          <div className="flex items-center justify-center space-x-6 mt-6 text-sm">
            <div className="flex items-center px-3 py-1 bg-dark-tertiary rounded-full border border-dark-border">
              <ShieldCheckIcon className="w-4 h-4 mr-1 text-green-500" />
              <span className="text-dark-text-primary font-medium">ATS Optimized</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-dark-tertiary rounded-full border border-dark-border">
              <TrophyIcon className="w-4 h-4 mr-1 text-yellow-500" />
              <span className="text-dark-text-primary font-medium">Industry Tested</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-dark-tertiary rounded-full border border-dark-border">
              <SparklesIcon className="w-4 h-4 mr-1 text-purple-500" />
              <span className="text-dark-text-primary font-medium">AI Enhanced</span>
            </div>
          </div>
        </div>

        {/* Compact Category Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.id}
                className="group cursor-pointer transform hover:scale-105 transition-all duration-500 hover:z-10"
                onClick={() => handleCategorySelect(category.id)}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="relative">
                  {/* Main Card */}
                  <div className="card-dark rounded-2xl p-6 h-full group-hover:bg-dark-secondary transition-all duration-500 group-hover:border-dark-border">
                    {/* Icon & Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${category.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="bg-dark-tertiary text-dark-text-primary text-xs px-2 py-1 rounded-full font-bold border border-dark-border">
                        {category.count}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-blue-400 transition-all duration-300">
                      {category.name}
                    </h3>
                    <p className="text-dark-text-secondary text-sm leading-relaxed mb-4 line-clamp-2">
                      {category.description}
                    </p>
                    
                    {/* Features */}
                    <div className="space-y-1 mb-4">
                      {category.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-xs text-dark-text-muted">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mr-2"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    {/* CTA */}
                    <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                      <span className="text-xs text-dark-text-muted group-hover:text-blue-400 transition-colors">
                        Explore templates
                      </span>
                      <ArrowRightIcon className="w-4 h-4 text-blue-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Template Selection Page  
  const renderTemplateSelection = () => (
    <div className="min-h-screen gradient-dark py-6 pb-24 animate-slide-up-soft">
      <div className="max-w-[100vw] mx-auto px-6">
        {/* Streamlined Header */}
        <div className="flex items-center justify-between mb-8 p-6 card-dark rounded-3xl shadow-sm">
          <button
            onClick={handleBackToCategories}
            className="group flex items-center text-dark-text-secondary hover:text-dark-text-primary transition-all duration-300"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Back to Categories</span>
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-3xl font-black text-dark-text-primary mb-1">
              {categories.find(c => c.id === selectedCategory)?.name}
            </h1>
            <p className="text-dark-text-secondary">
              {filteredTemplates.length} professional template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
          </div>
          
          {/* Industry Filter */}
          <div className="flex items-center space-x-3">
            <BriefcaseIcon className="w-5 h-5 text-dark-text-secondary" />
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="input-field-dark px-4 py-2 rounded-xl text-sm font-medium"
            >
              <option value="all">All Industries</option>
              {allIndustries.slice(1).map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Full-Width PDF-like Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-12">
          {filteredTemplates.map((template, index) => {
            const category = categories.find(c => c.id === template.category);
            const selectedClasses = 'border-blue-500 shadow-2xl shadow-blue-500 scale-105';
            return (
              <div
                key={template.id}
                className={`group cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:z-10 ${
                  selectedTemplate === template.id ? 'scale-[1.02] z-10' : ''
                }`}
                onClick={() => handleTemplateSelect(template.id)}
                onMouseEnter={() => setIsHovering(template.id)}
                onMouseLeave={() => setIsHovering('')}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative w-full">
                  {/* Template Card with Full PDF Preview */}
                  <div className={`card-dark rounded-2xl overflow-hidden shadow-xl transition-all duration-500 border-2 ${
                    selectedTemplate === template.id
                      ? selectedClasses
                      : 'border-dark-border group-hover:border-blue-400 group-hover:shadow-2xl'
                  }`}>
                    
                    {/* Full-Size PDF-like Template Preview - Fixed Aspect Ratio */}
                    <div className="relative w-full" style={{ aspectRatio: '8.5/11' }}>
                      <div className="absolute inset-0 bg-white shadow-inner">
                        <TemplatePreview template={template} />
                      </div>
                      
                      {/* Hover Overlay */}
                      {isHovering === template.id && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm transition-all duration-300 z-10">
                          <div className="bg-dark-primary text-dark-text-primary px-8 py-4 rounded-2xl font-bold shadow-2xl transform scale-110 text-xl">
                            Click to Select
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Template Info - Enhanced for visibility */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-dark-text-primary text-xl leading-tight group-hover:text-blue-400 transition-colors">
                          {template.name}
                        </h3>
                        <div className="text-sm font-bold px-3 py-1 rounded-xl bg-dark-tertiary text-dark-text-primary border border-dark-border">
                          {template.layout.replace('-', ' ')}
                        </div>
                      </div>
                      
                      <p className="text-base text-dark-text-secondary mb-4 leading-relaxed">
                        {template.description}
                      </p>
                      
                      {/* ATS Compatibility Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          template.atsCompatibility === 'high' 
                            ? 'bg-green-500 text-white' 
                            : template.atsCompatibility === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          ATS {template.atsCompatibility.charAt(0).toUpperCase() + template.atsCompatibility.slice(1)}
                        </div>
                        <div className="text-sm text-dark-text-muted">
                          {template.fontStyle} • {template.features.length} features
                        </div>
                      </div>
                      
                      {/* Industries */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {template.industry.slice(0, 3).map((industry) => (
                          <span
                            key={industry}
                            className="text-sm bg-dark-tertiary text-blue-400 px-3 py-1 rounded-lg font-medium border border-dark-border"
                          >
                            {industry}
                          </span>
                        ))}
                        {template.industry.length > 3 && (
                          <span className="text-sm text-dark-text-muted font-medium px-3 py-1">
                            +{template.industry.length - 3} more
                          </span>
                        )}
                      </div>
                      
                      {/* Features Preview */}
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-dark-text-primary mb-2">Key Features:</div>
                        <div className="flex flex-wrap gap-1">
                          {template.features.slice(0, 3).map((feature, idx) => (
                            <span key={idx} className="text-xs text-dark-text-muted bg-dark-secondary px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Select Button - Larger and more prominent */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(template.id);
                        }}
                        className={`w-full py-3 text-base font-bold transition-all duration-300 transform hover:scale-105 rounded-xl ${
                          selectedTemplate === template.id
                            ? 'btn-primary-dark shadow-lg'
                            : 'btn-secondary-dark'
                        }`}
                      >
                        {selectedTemplate === template.id ? (
                          <span className="flex items-center justify-center">
                            <CheckIconSolid className="w-5 h-5 mr-2" />
                            Selected
                          </span>
                        ) : (
                          'Select Template'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Selection Badge */}
                  {selectedTemplate === template.id && (
                    <div className="absolute top-4 right-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-xl border-4 border-dark-primary animate-bounce">
                      <CheckIconSolid className="w-6 h-6 text-white" />
                    </div>
                  )}
                  
                  {/* Status Badges */}
                  <div className="absolute top-4 left-4 space-y-2">
                    {template.isPopular && (
                      <div className="bg-orange-500 text-white text-sm px-3 py-1 rounded-full font-bold flex items-center shadow-lg">
                        <StarIcon className="w-4 h-4 mr-1" />
                        Popular
                      </div>
                    )}
                    {template.isNew && (
                      <div className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">
                        ✨ New
                      </div>
                    )}
                    {template.isPremium && (
                      <div className="bg-purple-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">
                        👑 Pro
                      </div>
                    )}
                  </div>


                  {/* Card Glow Effect */}
                  {selectedTemplate === template.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl opacity-20 -z-10 blur-xl"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Continue Button */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          {selectedTemplate ? (
            <div className="card-glass-dark backdrop-blur-lg rounded-2xl shadow-2xl p-4 flex items-center space-x-4 animate-slide-up">
              {(() => {
                const template = resumeTemplates.find(t => t.id === selectedTemplate);
                if (!template) return null;
                
                return (
                  <>
                    <div 
                      className="w-10 h-12 rounded border-2 border-blue-300 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
                      }}
                    />
                    
                    <div>
                      <h3 className="font-bold text-dark-text-primary text-sm">
                        {template.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-dark-text-secondary">
                        <span>{template.layout.replace('-', ' ')}</span>
                        <span>•</span>
                        <span>ATS {template.atsCompatibility}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleContinue}
                      className="btn-primary-dark px-6 py-2 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      Continue →
                    </button>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="card-glass-dark backdrop-blur-sm rounded-2xl shadow-xl p-4 text-center animate-pulse">
              <p className="text-dark-text-secondary text-sm font-medium">
                Select a template to continue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return currentStep === 'category' ? renderCategorySelection() : renderTemplateSelection();
}