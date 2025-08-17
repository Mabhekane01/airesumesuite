import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, DocumentTextIcon, CloudArrowUpIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type BuilderOption = 'create' | 'upload' | 'templates';

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<BuilderOption | null>(null);

  const handleOptionSelect = (option: BuilderOption) => {
    setSelectedOption(option);
    if (option === 'create') {
      navigate('/resume-builder/create');
    } else if (option === 'upload') {
      navigate('/resume-builder/upload');
    } else if (option === 'templates') {
      navigate('/resume-builder/templates');
    }
  };

  return (
    <div className="min-h-screen gradient-dark py-6 xs:py-8 sm:py-12 px-2 xs:px-3 sm:px-4 animate-slide-up-soft">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 xs:mb-8 sm:mb-12">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold gradient-text-dark mb-3 xs:mb-4">
            Build Your Perfect Resume
          </h1>
          <p className="text-sm xs:text-base sm:text-lg md:text-xl text-dark-text-secondary max-w-2xl mx-auto px-2 xs:px-0">
            Create a professional, ATS-friendly resume with AI-powered optimization. 
            Choose how you'd like to get started.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 mb-6 xs:mb-8 sm:mb-12">
          {/* Create from Scratch */}
          <Card 
            className={`card-dark p-4 xs:p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption === 'create' 
                ? 'border-teal-500 bg-gray-800' 
                : 'border-dark-border hover:border-teal-400'
            }`}
            onClick={() => handleOptionSelect('create')}
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-teal-500/20 rounded-full flex items-center justify-center mb-4 xs:mb-5 sm:mb-6">
                <PlusIcon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-teal-400" />
              </div>
              <h3 className="text-lg xs:text-xl sm:text-2xl font-semibold text-dark-text-primary mb-3 xs:mb-4">
                Create New Resume
              </h3>
              <p className="text-dark-text-secondary mb-4 xs:mb-5 sm:mb-6 text-sm xs:text-base">
                Start from scratch with our guided form. Perfect for first-time users or 
                when you want complete control over your resume structure.
              </p>
              <div className="space-y-1 xs:space-y-2 text-xs xs:text-sm text-dark-text-muted">
                <p>✓ Step-by-step guidance</p>
                <p>✓ Professional templates</p>
                <p>✓ AI-powered suggestions</p>
              </div>
            </div>
          </Card>

          {/* Upload Existing */}
          <Card 
            className={`card-dark p-4 xs:p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption === 'upload' 
                ? 'border-green-500 bg-gray-800' 
                : 'border-dark-border hover:border-green-400'
            }`}
            onClick={() => handleOptionSelect('upload')}
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 xs:mb-5 sm:mb-6">
                <CloudArrowUpIcon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-green-400" />
              </div>
              <h3 className="text-lg xs:text-xl sm:text-2xl font-semibold text-dark-text-primary mb-3 xs:mb-4">
                Upload Existing Resume
              </h3>
              <p className="text-dark-text-secondary mb-4 xs:mb-5 sm:mb-6 text-sm xs:text-base">
                Upload your current resume and we'll extract the information automatically. 
                Great for quick updates and optimizations.
              </p>
              <div className="space-y-1 xs:space-y-2 text-xs xs:text-sm text-dark-text-muted">
                <p>✓ Automatic data extraction</p>
                <p>✓ Support for PDF & DOCX</p>
                <p>✓ Quick optimization</p>
              </div>
            </div>
          </Card>

          {/* Browse Templates */}
          <Card 
            className={`card-dark p-4 xs:p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption === 'templates' 
                ? 'border-emerald-500 bg-gray-800' 
                : 'border-dark-border hover:border-emerald-400'
            }`}
            onClick={() => handleOptionSelect('templates')}
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 xs:mb-5 sm:mb-6">
                <SwatchIcon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg xs:text-xl sm:text-2xl font-semibold text-dark-text-primary mb-3 xs:mb-4">
                Browse Templates
              </h3>
              <p className="text-dark-text-secondary mb-4 xs:mb-5 sm:mb-6 text-sm xs:text-base">
                Explore our collection of professional templates and choose the perfect design 
                for your industry and style.
              </p>
              <div className="space-y-1 xs:space-y-2 text-xs xs:text-sm text-dark-text-muted">
                <p>✓ Professional designs</p>
                <p>✓ Industry-specific layouts</p>
                <p>✓ Customizable colors</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Resumes */}
        <div className="card-dark rounded-lg shadow-sm p-4 xs:p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 xs:mb-5 sm:mb-6">
            <h2 className="text-lg xs:text-xl font-semibold text-dark-text-primary">Recent Resumes</h2>
            <Button 
              variant="outline" 
              onClick={() => navigate('/resumes')}
              className="btn-secondary-dark text-sm"
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4">
            {/* Placeholder for recent resumes */}
            <div className="p-3 xs:p-4 border border-dark-border rounded-lg hover:bg-gray-800 cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-2 xs:space-x-3">
                <DocumentTextIcon className="w-6 h-6 xs:w-8 xs:h-8 text-dark-text-muted flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-medium text-dark-text-primary text-sm xs:text-base truncate">Software Engineer Resume</h3>
                  <p className="text-xs xs:text-sm text-dark-text-muted">Updated 2 days ago</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 xs:p-4 border border-dark-border rounded-lg hover:bg-gray-800 cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-2 xs:space-x-3">
                <DocumentTextIcon className="w-6 h-6 xs:w-8 xs:h-8 text-dark-text-muted flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-medium text-dark-text-primary text-sm xs:text-base truncate">Marketing Manager Resume</h3>
                  <p className="text-xs xs:text-sm text-dark-text-muted">Updated 1 week ago</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 xs:p-4 border border-dark-border rounded-lg hover:bg-gray-800 cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-2 xs:space-x-3">
                <DocumentTextIcon className="w-6 h-6 xs:w-8 xs:h-8 text-dark-text-muted flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-medium text-dark-text-primary text-sm xs:text-base truncate">Product Designer Resume</h3>
                  <p className="text-xs xs:text-sm text-dark-text-muted">Updated 2 weeks ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}