import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, DocumentTextIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { FileUpload } from '../../components/resume/FileUpload';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useResumeStore } from '../../stores/resumeStore';
import { ResumeData } from '../../services/resumeService';
import { toast } from 'sonner';

export default function UploadResume() {
  const navigate = useNavigate();
  const [uploadedData, setUploadedData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createResume } = useResumeStore();

  const handleFileUpload = (data: ResumeData) => {
    setUploadedData(data);
    toast.success('Resume parsed successfully! Review the extracted information.');
  };

  const handleCreateResume = async () => {
    if (!uploadedData) return;

    setIsLoading(true);
    try {
      const resume = await createResume(uploadedData);
      toast.success('Resume created successfully!');
      navigate(`/resume/${resume._id}`);
    } catch (error) {
      toast.error('Failed to create resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditResume = () => {
    if (!uploadedData) return;
    
    // Store the data temporarily and navigate to edit form
    // For now, we'll navigate to create page - in a real app, we'd pass the data
    navigate('/resume-builder/create', { state: { resumeData: uploadedData } });
  };

  return (
    <div className="min-h-screen gradient-dark py-8 animate-slide-up-soft">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/resume-builder')}
            className="flex items-center text-dark-text-secondary hover:text-dark-text-primary mb-4 transition-colors duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Back to Resume Builder
          </button>
          
          <h1 className="text-3xl font-bold gradient-text-dark mb-2">Upload Your Resume</h1>
          <p className="text-dark-text-secondary">
            Upload your existing resume and we'll extract the information automatically
          </p>
        </div>

        {!uploadedData ? (
          <Card className="card-dark p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <CloudArrowUpIcon className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-dark-text-primary mb-2">
                Upload Resume File
              </h2>
              <p className="text-dark-text-secondary">
                Supports PDF, DOC, and DOCX files up to 10MB
              </p>
            </div>

            <FileUpload onUpload={handleFileUpload} />

            <div className="mt-8 pt-6 border-t border-dark-border">
              <h3 className="text-lg font-medium text-dark-text-primary mb-4">What happens next?</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-400">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-dark-text-primary">File Analysis</h4>
                    <p className="text-sm text-dark-text-secondary">AI extracts text and structure from your resume</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-400">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-dark-text-primary">Data Extraction</h4>
                    <p className="text-sm text-dark-text-secondary">Information is organized into structured sections</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-400">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-dark-text-primary">Review & Edit</h4>
                    <p className="text-sm text-dark-text-secondary">Review and make any necessary adjustments</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <Card className="card-dark p-6 border border-green-500/30 bg-green-500/10">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-green-400">Resume Uploaded Successfully!</h3>
                  <p className="text-green-300">
                    We've extracted your information. Review the details below and make any necessary adjustments.
                  </p>
                </div>
              </div>
            </Card>

            {/* Extracted Data Preview */}
            <Card className="card-dark p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Extracted Information</h3>
              
              <div className="space-y-4">
                {/* Personal Info */}
                <div>
                  <h4 className="font-medium text-dark-text-primary mb-2">Personal Information</h4>
                  <div className="bg-dark-tertiary p-4 rounded-lg">
                    <p className="text-dark-text-secondary"><strong className="text-dark-text-primary">Name:</strong> {uploadedData.personalInfo.firstName} {uploadedData.personalInfo.lastName}</p>
                    <p className="text-dark-text-secondary"><strong className="text-dark-text-primary">Email:</strong> {uploadedData.personalInfo.email}</p>
                    <p className="text-dark-text-secondary"><strong className="text-dark-text-primary">Phone:</strong> {uploadedData.personalInfo.phone}</p>
                    <p className="text-dark-text-secondary"><strong className="text-dark-text-primary">Location:</strong> {uploadedData.personalInfo.location}</p>
                  </div>
                </div>

                {/* Professional Summary */}
                {uploadedData.professionalSummary && (
                  <div>
                    <h4 className="font-medium text-dark-text-primary mb-2">Professional Summary</h4>
                    <div className="bg-dark-tertiary p-4 rounded-lg">
                      <p className="text-dark-text-secondary">{uploadedData.professionalSummary}</p>
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {uploadedData.workExperience && uploadedData.workExperience.length > 0 && (
                  <div>
                    <h4 className="font-medium text-dark-text-primary mb-2">Work Experience</h4>
                    <div className="bg-dark-tertiary p-4 rounded-lg">
                      <p className="text-dark-text-secondary">{uploadedData.workExperience.length} position(s) found</p>
                    </div>
                  </div>
                )}

                {/* Education */}
                {uploadedData.education && uploadedData.education.length > 0 && (
                  <div>
                    <h4 className="font-medium text-dark-text-primary mb-2">Education</h4>
                    <div className="bg-dark-tertiary p-4 rounded-lg">
                      <p className="text-dark-text-secondary">{uploadedData.education.length} education entry(ies) found</p>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {uploadedData.skills && uploadedData.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-dark-text-primary mb-2">Skills</h4>
                    <div className="bg-dark-tertiary p-4 rounded-lg">
                      <p className="text-dark-text-secondary">{uploadedData.skills.length} skill(s) identified</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setUploadedData(null)}
                className="btn-secondary-dark"
              >
                Upload Different File
              </Button>

              <div className="space-x-3">
                <Button
                  variant="outline"
                  onClick={handleEditResume}
                  className="btn-secondary-dark"
                >
                  Review & Edit
                </Button>
                <Button
                  onClick={handleCreateResume}
                  isLoading={isLoading}
                  className="btn-primary-dark"
                >
                  Create Resume
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}