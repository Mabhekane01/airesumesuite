import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  SparklesIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  BeakerIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { coverLetterService } from '../../services/coverLetterService';
import { toast } from 'sonner';

interface CoverLetter {
  _id: string;
  title: string;
  jobTitle: string;
  companyName: string;
  tone: string;
  createdAt: string;
  updatedAt: string;
}

export default function CoverLetterDashboard() {
  const navigate = useNavigate();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCoverLetters();
  }, []);

  const fetchCoverLetters = async () => {
    try {
      setIsLoading(true);
      const result = await coverLetterService.getCoverLetters();
      if (result.success && result.data) {
        setCoverLetters(result.data);
      }
    } catch (error) {
      toast.error('Failed to load cover letters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;
    
    try {
      const success = await coverLetterService.deleteCoverLetter(id);
      if (success) {
        setCoverLetters(prev => prev.filter(cl => cl._id !== id));
        toast.success('Cover letter deleted successfully');
      }
    } catch (error) {
      toast.error('Failed to delete cover letter');
    }
  };

  const handleDownload = async (id: string, format: 'pdf' | 'docx' | 'txt') => {
    try {
      const blob = await coverLetterService.downloadCoverLetter(id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Cover letter downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to download cover letter');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark py-4 xs:py-6 sm:py-8 px-2 xs:px-3 sm:px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 xs:h-8 bg-gray-800 rounded mb-4 xs:mb-6"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 xs:h-48 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-4 xs:py-6 sm:py-8 px-2 xs:px-3 sm:px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 xs:mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold gradient-text-dark mb-2">
                Cover Letters
              </h1>
              <p className="text-dark-text-secondary text-sm xs:text-base">
                Create, manage, and optimize your cover letters with AI assistance
              </p>
            </div>
            
            <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-3">
              <Button
                onClick={() => navigate('/dashboard/cover-letter/ai')}
                className="btn-primary-dark w-full xs:w-auto justify-center"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline">AI Assistant</span>
                <span className="xs:hidden">AI Chat</span>
              </Button>
              
              <Button
                onClick={() => navigate('/dashboard/cover-letter/builder')}
                variant="outline"
                className="btn-secondary-dark w-full xs:w-auto justify-center"
              >
                <BeakerIcon className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline">Advanced Builder</span>
                <span className="xs:hidden">Builder</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6 mb-4 xs:mb-6 sm:mb-8">
          <Card 
            className="card-dark p-4 xs:p-5 sm:p-6 cursor-pointer hover:scale-105 transition-transform border border-accent-primary/30 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5"
            onClick={() => navigate('/dashboard/cover-letter/ai')}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 xs:w-12 xs:h-12 bg-accent-primary/20 rounded-lg flex items-center justify-center mr-3 xs:mr-4 flex-shrink-0">
                <ChatBubbleLeftRightIcon className="w-5 h-5 xs:w-6 xs:h-6 text-accent-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-dark-text-primary mb-1 text-sm xs:text-base">
                  Conversational AI
                </h3>
                <p className="text-xs xs:text-sm text-dark-text-secondary line-clamp-2">
                  Chat with AI to create your perfect cover letter
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="card-dark p-4 xs:p-5 sm:p-6 cursor-pointer hover:scale-105 transition-transform border border-accent-tertiary/30 bg-gradient-to-br from-accent-tertiary/10 to-accent-tertiary/5"
            onClick={() => navigate('/dashboard/cover-letter/builder')}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 xs:w-12 xs:h-12 bg-accent-tertiary/20 rounded-lg flex items-center justify-center mr-3 xs:mr-4 flex-shrink-0">
                <BeakerIcon className="w-5 h-5 xs:w-6 xs:h-6 text-accent-tertiary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-dark-text-primary mb-1 text-sm xs:text-base">
                  Advanced Builder
                </h3>
                <p className="text-xs xs:text-sm text-dark-text-secondary line-clamp-2">
                  Full-featured builder with analysis tools
                </p>
              </div>
            </div>
          </Card>

          <Card className="card-dark p-4 xs:p-5 sm:p-6 border border-accent-secondary/30 bg-gradient-to-br from-accent-secondary/10 to-accent-secondary/5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="w-10 h-10 xs:w-12 xs:h-12 bg-accent-secondary/20 rounded-lg flex items-center justify-center mr-3 xs:mr-4 flex-shrink-0">
                <ClockIcon className="w-5 h-5 xs:w-6 xs:h-6 text-accent-secondary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-dark-text-primary mb-1 text-sm xs:text-base">
                  {coverLetters.length} Cover Letters
                </h3>
                <p className="text-xs xs:text-sm text-dark-text-secondary line-clamp-2">
                  Ready to use and customize
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Cover Letters List */}
        {coverLetters.length === 0 ? (
          <Card className="card-dark p-6 xs:p-8 sm:p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 xs:w-16 xs:h-16 text-dark-text-muted mx-auto mb-3 xs:mb-4" />
            <h3 className="text-lg xs:text-xl font-semibold text-dark-text-primary mb-2">
              No cover letters yet
            </h3>
            <p className="text-dark-text-secondary mb-4 xs:mb-6 text-sm xs:text-base">
              Create your first AI-powered cover letter to get started
            </p>
            <div className="flex flex-col xs:flex-row justify-center space-y-2 xs:space-y-0 xs:space-x-3">
              <Button
                onClick={() => navigate('/dashboard/cover-letter/ai')}
                className="btn-primary-dark w-full xs:w-auto"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Start with AI
              </Button>
              <Button
                onClick={() => navigate('/dashboard/cover-letter/builder')}
                variant="outline"
                className="btn-secondary-dark w-full xs:w-auto"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Manually
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
            {coverLetters.map((coverLetter) => (
              <Card key={coverLetter._id} className="card-dark p-4 xs:p-5 sm:p-6">
                <div className="mb-3 xs:mb-4">
                  <h3 className="font-semibold text-dark-text-primary mb-2 line-clamp-2 text-sm xs:text-base">
                    {coverLetter.title}
                  </h3>
                  <div className="space-y-1 text-xs xs:text-sm text-dark-text-secondary">
                    <p><strong>Position:</strong> <span className="truncate inline-block max-w-[200px]">{coverLetter.jobTitle}</span></p>
                    <p><strong>Company:</strong> <span className="truncate inline-block max-w-[200px]">{coverLetter.companyName}</span></p>
                    <p><strong>Tone:</strong> <span className="capitalize">{coverLetter.tone}</span></p>
                  </div>
                </div>

                <div className="text-xs text-dark-text-muted mb-3 xs:mb-4">
                  Created: {new Date(coverLetter.createdAt).toLocaleDateString()}
                  {coverLetter.updatedAt !== coverLetter.createdAt && (
                    <span className="block xs:inline xs:ml-2">
                      <span className="hidden xs:inline">• </span>Updated: {new Date(coverLetter.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2">
                  <Button
                    onClick={() => navigate(`/cover-letter/${coverLetter._id}`)}
                    size="sm"
                    variant="outline"
                    className="flex-1 btn-secondary-dark justify-center"
                  >
                    <EyeIcon className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    onClick={() => navigate(`/cover-letter/${coverLetter._id}/edit`)}
                    size="sm"
                    variant="outline"
                    className="flex-1 btn-secondary-dark justify-center"
                  >
                    <PencilSquareIcon className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  <div className="flex xs:flex-col space-x-2 xs:space-x-0 xs:space-y-0">
                    <div className="relative group flex-1 xs:flex-none">
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-secondary-dark w-full xs:px-3 justify-center"
                      >
                        <ArrowDownTrayIcon className="w-3 h-3 xs:mr-0 mr-1" />
                        <span className="xs:hidden">Download</span>
                      </Button>
                      
                      {/* Download Dropdown */}
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 border border-dark-border rounded-lg shadow-xl py-2 min-w-[120px] z-50">
                        <button
                          onClick={() => handleDownload(coverLetter._id, 'pdf')}
                          className="block w-full text-left px-4 py-2 text-sm text-dark-text-primary hover:bg-dark-accent/10 transition-colors"
                        >
                          Download PDF
                        </button>
                        <button
                          onClick={() => handleDownload(coverLetter._id, 'docx')}
                          className="block w-full text-left px-4 py-2 text-sm text-dark-text-primary hover:bg-dark-accent/10 transition-colors"
                        >
                          Download DOCX
                        </button>
                        <button
                          onClick={() => handleDownload(coverLetter._id, 'txt')}
                          className="block w-full text-left px-4 py-2 text-sm text-dark-text-primary hover:bg-dark-accent/10 transition-colors"
                        >
                          Download TXT
                        </button>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleDelete(coverLetter._id)}
                      size="sm"
                      variant="outline"
                      className="btn-secondary-dark flex-1 xs:flex-none xs:px-3 hover:border-red-500 hover:text-red-400 justify-center"
                    >
                      <TrashIcon className="w-3 h-3 xs:mr-0 mr-1" />
                      <span className="xs:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}