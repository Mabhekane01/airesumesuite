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
    <div className="min-h-screen gradient-dark py-12 px-4 animate-slide-up-soft">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text-dark mb-4">
            Build Your Perfect Resume
          </h1>
          <p className="text-xl text-dark-text-secondary max-w-2xl mx-auto">
            Create a professional, ATS-friendly resume with AI-powered optimization. 
            Choose how you'd like to get started.
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Create from Scratch */}
          <Card 
            className={`card-dark p-8 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption === 'create' 
                ? 'border-blue-500 bg-dark-secondary' 
                : 'border-dark-border hover:border-blue-400'
            }`}
            onClick={() => handleOptionSelect('create')}
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <PlusIcon className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-dark-text-primary mb-4">
                Create New Resume
              </h3>
              <p className="text-dark-text-secondary mb-6">
                Start from scratch with our guided form. Perfect for first-time users or 
                when you want complete control over your resume structure.
              </p>
              <div className="space-y-2 text-sm text-dark-text-muted">
                <p>✓ Step-by-step guidance</p>
                <p>✓ Professional templates</p>
                <p>✓ AI-powered suggestions</p>
              </div>
            </div>
          </Card>

          {/* Upload Existing */}
          <Card 
            className={`card-dark p-8 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption === 'upload' 
                ? 'border-green-500 bg-dark-secondary' 
                : 'border-dark-border hover:border-green-400'
            }`}
            onClick={() => handleOptionSelect('upload')}
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                <CloudArrowUpIcon className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-dark-text-primary mb-4">
                Upload Existing Resume
              </h3>
              <p className="text-dark-text-secondary mb-6">
                Upload your current resume and we'll extract the information automatically. 
                Great for quick updates and optimizations.
              </p>
              <div className="space-y-2 text-sm text-dark-text-muted">
                <p>✓ Automatic data extraction</p>
                <p>✓ Support for PDF & DOCX</p>
                <p>✓ Quick optimization</p>
              </div>
            </div>
          </Card>

          {/* Browse Templates */}
          <Card 
            className={`card-dark p-8 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption === 'templates' 
                ? 'border-purple-500 bg-dark-secondary' 
                : 'border-dark-border hover:border-purple-400'
            }`}
            onClick={() => handleOptionSelect('templates')}
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                <SwatchIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-dark-text-primary mb-4">
                Browse Templates
              </h3>
              <p className="text-dark-text-secondary mb-6">
                Explore our collection of professional templates and choose the perfect design 
                for your industry and style.
              </p>
              <div className="space-y-2 text-sm text-dark-text-muted">
                <p>✓ Professional designs</p>
                <p>✓ Industry-specific layouts</p>
                <p>✓ Customizable colors</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Resumes */}
        <div className="card-dark rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-dark-text-primary">Recent Resumes</h2>
            <Button 
              variant="outline" 
              onClick={() => navigate('/resumes')}
              className="btn-secondary-dark text-sm"
            >
              View All
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Placeholder for recent resumes */}
            <div className="p-4 border border-dark-border rounded-lg hover:bg-dark-secondary cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-8 h-8 text-dark-text-muted" />
                <div>
                  <h3 className="font-medium text-dark-text-primary">Software Engineer Resume</h3>
                  <p className="text-sm text-dark-text-muted">Updated 2 days ago</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border border-dark-border rounded-lg hover:bg-dark-secondary cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-8 h-8 text-dark-text-muted" />
                <div>
                  <h3 className="font-medium text-dark-text-primary">Marketing Manager Resume</h3>
                  <p className="text-sm text-dark-text-muted">Updated 1 week ago</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border border-dark-border rounded-lg hover:bg-dark-secondary cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-8 h-8 text-dark-text-muted" />
                <div>
                  <h3 className="font-medium text-dark-text-primary">Product Designer Resume</h3>
                  <p className="text-sm text-dark-text-muted">Updated 2 weeks ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}