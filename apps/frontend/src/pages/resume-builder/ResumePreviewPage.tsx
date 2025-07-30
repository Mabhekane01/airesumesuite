import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import EnhancedResumePreview from '../../components/resume/EnhancedResumePreview';
import { resumeService, ResumeData } from '../../services/resumeService';
import { Resume } from '../../types';
import { ResumeProvider } from '../../contexts/ResumeContext';

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) {
        setError('Resume ID is required');
        setLoading(false);
        return;
      }

      try {
        console.log('📄 Fetching resume with ID:', id);
        const resumeData: ResumeData = await resumeService.getResumeById(id);
        console.log('📄 Resume data received:', resumeData);
        
        // Transform ResumeData to Resume format
        const transformedResume: Resume = {
          personalInfo: resumeData.personalInfo,
          professionalSummary: resumeData.professionalSummary,
          workExperience: resumeData.workExperience,
          education: resumeData.education,
          skills: resumeData.skills,
          certifications: resumeData.certifications || [],
          languages: resumeData.languages || [],
          projects: resumeData.projects || [],
          template: resumeData.templateId || 'modern-1',
          // Add any other required Resume fields with defaults
        };
        
        setResume(transformedResume);
      } catch (error) {
        console.error('Failed to fetch resume:', error);
        setError('Failed to load resume. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="spinner-dark"></div>
          <span className="text-dark-text-primary font-medium">Loading resume...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Error Loading Resume</h2>
          <p className="text-dark-text-secondary mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => navigate('/dashboard/resume/templates')}>
              Back to Templates
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Resume Not Found</h2>
          <p className="text-dark-text-secondary mb-6">The resume you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/resume/templates')}>
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              to="/dashboard/resume/comprehensive"
              className="flex items-center text-dark-text-secondary hover:text-dark-text-primary transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Resume Builder
            </Link>
            <div className="h-6 w-px bg-dark-border"></div>
            <h1 className="text-2xl font-bold text-dark-text-primary">Resume Preview</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              onClick={() => navigate(`/dashboard/resume/edit/${id}`)}
            >
              Edit Resume
            </Button>
          </div>
        </div>

        {/* Preview Component */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <ResumeProvider initialData={resume}>
            <EnhancedResumePreview 
              resume={resume}
              onAIImprovement={() => {
                // Handle AI improvement
                console.log('AI improvement requested');
              }}
              onATSCheck={() => {
                // Handle ATS check
                console.log('ATS check requested');
              }}
              onJobOptimization={() => {
                // Handle job optimization
                console.log('Job optimization requested');
              }}
            />
          </ResumeProvider>
        </div>
      </div>
    </div>
  );
}