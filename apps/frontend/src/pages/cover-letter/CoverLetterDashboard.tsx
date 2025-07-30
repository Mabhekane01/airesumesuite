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
      <div className="min-h-screen bg-gradient-dark p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-dark-secondary rounded mb-6"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-dark-secondary rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text-dark mb-2">
                Cover Letters
              </h1>
              <p className="text-dark-text-secondary">
                Create, manage, and optimize your cover letters with AI assistance
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => navigate('/dashboard/cover-letter/ai')}
                className="btn-primary-dark"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              
              <Button
                onClick={() => navigate('/dashboard/cover-letter/builder')}
                variant="outline"
                className="btn-secondary-dark"
              >
                <BeakerIcon className="w-4 h-4 mr-2" />
                Advanced Builder
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="card-dark p-6 cursor-pointer hover:scale-105 transition-transform border border-accent-primary/30 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5"
            onClick={() => navigate('/dashboard/cover-letter/ai')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent-primary/20 rounded-lg flex items-center justify-center mr-4">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-accent-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-text-primary mb-1">
                  Conversational AI
                </h3>
                <p className="text-sm text-dark-text-secondary">
                  Chat with AI to create your perfect cover letter
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="card-dark p-6 cursor-pointer hover:scale-105 transition-transform border border-accent-tertiary/30 bg-gradient-to-br from-accent-tertiary/10 to-accent-tertiary/5"
            onClick={() => navigate('/dashboard/cover-letter/builder')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent-tertiary/20 rounded-lg flex items-center justify-center mr-4">
                <BeakerIcon className="w-6 h-6 text-accent-tertiary" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-text-primary mb-1">
                  Advanced Builder
                </h3>
                <p className="text-sm text-dark-text-secondary">
                  Full-featured builder with analysis tools
                </p>
              </div>
            </div>
          </Card>

          <Card className="card-dark p-6 border border-accent-secondary/30 bg-gradient-to-br from-accent-secondary/10 to-accent-secondary/5">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent-secondary/20 rounded-lg flex items-center justify-center mr-4">
                <ClockIcon className="w-6 h-6 text-accent-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-text-primary mb-1">
                  {coverLetters.length} Cover Letters
                </h3>
                <p className="text-sm text-dark-text-secondary">
                  Ready to use and customize
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Cover Letters List */}
        {coverLetters.length === 0 ? (
          <Card className="card-dark p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
              No cover letters yet
            </h3>
            <p className="text-dark-text-secondary mb-6">
              Create your first AI-powered cover letter to get started
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                onClick={() => navigate('/dashboard/cover-letter/ai')}
                className="btn-primary-dark"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Start with AI
              </Button>
              <Button
                onClick={() => navigate('/dashboard/cover-letter/builder')}
                variant="outline"
                className="btn-secondary-dark"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Manually
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coverLetters.map((coverLetter) => (
              <Card key={coverLetter._id} className="card-dark p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-dark-text-primary mb-2 line-clamp-2">
                    {coverLetter.title}
                  </h3>
                  <div className="space-y-1 text-sm text-dark-text-secondary">
                    <p><strong>Position:</strong> {coverLetter.jobTitle}</p>
                    <p><strong>Company:</strong> {coverLetter.companyName}</p>
                    <p><strong>Tone:</strong> <span className="capitalize">{coverLetter.tone}</span></p>
                  </div>
                </div>

                <div className="text-xs text-dark-text-muted mb-4">
                  Created: {new Date(coverLetter.createdAt).toLocaleDateString()}
                  {coverLetter.updatedAt !== coverLetter.createdAt && (
                    <span className="ml-2">
                      • Updated: {new Date(coverLetter.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate(`/cover-letter/${coverLetter._id}`)}
                    size="sm"
                    variant="outline"
                    className="flex-1 btn-secondary-dark"
                  >
                    <EyeIcon className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    onClick={() => navigate(`/cover-letter/${coverLetter._id}/edit`)}
                    size="sm"
                    variant="outline"
                    className="flex-1 btn-secondary-dark"
                  >
                    <PencilSquareIcon className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  <div className="relative group">
                    <Button
                      size="sm"
                      variant="outline"
                      className="btn-secondary-dark px-3"
                    >
                      <ArrowDownTrayIcon className="w-3 h-3" />
                    </Button>
                    
                    {/* Download Dropdown */}
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-dark-secondary border border-dark-border rounded-lg shadow-xl py-2 min-w-[120px] z-50">
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
                    className="btn-secondary-dark px-3 hover:border-red-500 hover:text-red-400"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}