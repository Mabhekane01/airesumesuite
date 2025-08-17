import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  CheckIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { Button } from '../components/ui/Button';
import OverleafTemplateGallery from '../components/resume/OverleafTemplateGallery';
import AuthModal from '../components/auth/AuthModal';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

export default function PublicTemplatesPage() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const handleTemplateSelect = (templateId: string) => {
    // Check if user is authenticated before proceeding
    if (!isAuthenticated) {
      setSelectedTemplate(templateId);
      setShowAuthModal(true);
      return;
    }

    // If authenticated, proceed directly to comprehensive resume builder with selected template
    navigate('/dashboard/resume/comprehensive', {
      state: { 
        templateId: templateId,
        isLatexTemplate: true
      }
    });
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    toast.success('Welcome! You can now create your resume.');
    
    // After successful auth, proceed directly to comprehensive resume builder with selected template
    if (selectedTemplate) {
      navigate('/dashboard/resume/comprehensive', {
        state: { 
          templateId: selectedTemplate,
          isLatexTemplate: true
        }
      });
    }
    // If no template was selected, they'll see the authenticated version of this page
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text-dark mb-6">
            Professional Resume Templates
          </h1>
          <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto mb-8">
            Choose from our collection of professionally designed LaTeX templates. 
            Create stunning resumes that pass ATS systems and impress hiring managers.
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-dark-text-tertiary">
            <div className="flex items-center space-x-2">
              <CheckIconSolid className="h-5 w-5 text-accent-success" />
              <span>ATS-Optimized</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIconSolid className="h-5 w-5 text-accent-success" />
              <span>Professional Typography</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIconSolid className="h-5 w-5 text-accent-success" />
              <span>LaTeX Quality</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIconSolid className="h-5 w-5 text-accent-success" />
              <span>Instant Download</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        {!isAuthenticated && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 mb-12 border border-dark-border">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-dark-text-primary mb-2">
                Ready to Create Your Perfect Resume?
              </h2>
              <p className="text-dark-text-secondary mb-4">
                Browse our templates below and select one to get started. Sign up to customize and download your resume.
              </p>
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-accent-primary text-white hover:bg-accent-primary/80"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Start Building Now
              </Button>
            </div>
          </div>
        )}
        
        {/* Authenticated User Welcome */}
        {isAuthenticated && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 backdrop-blur-sm rounded-xl p-6 mb-12 border border-accent-primary/20">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-dark-text-primary mb-2">
                Welcome Back! Choose Your Template
              </h2>
              <p className="text-dark-text-secondary mb-4">
                Select a template below to start creating your professional resume. You can customize and download instantly.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Templates Gallery */}
        <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-8 border border-dark-border">
          <OverleafTemplateGallery
            selectedTemplateId={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />
        </div>

        {/* Benefits Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-dark-text-primary mb-2">AI-Powered</h3>
            <p className="text-dark-text-secondary">
              Our AI helps optimize your resume content for specific job applications and ATS systems.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-dark-text-primary mb-2">ATS Compatible</h3>
            <p className="text-dark-text-secondary">
              All templates are designed to pass Applicant Tracking Systems used by major employers.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-dark-text-primary mb-2">Professional Quality</h3>
            <p className="text-dark-text-secondary">
              LaTeX-powered templates ensure professional typography and perfect formatting every time.
            </p>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}