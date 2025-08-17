import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentTextIcon, CalendarIcon, EyeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useResumeStore } from '../../stores/resumeStore';
import { ResumeData } from '../../services/resumeService';
import { getTemplateById } from '../../data/resumeTemplates';

interface ResumeSelectorProps {
  onSelectResume: (resume: ResumeData) => void;
}

export default function ResumeSelector({ onSelectResume }: ResumeSelectorProps) {
  const { resumes, fetchResumes, loadingState, error } = useResumeStore();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const isLoading = loadingState === 'loading';

  useEffect(() => {
    const loadResumes = async () => {
      try {
        await fetchResumes();
      } catch (error) {
        console.error('Failed to fetch resumes:', error);
      }
    };
    loadResumes();
  }, [fetchResumes]);

  const handleSelect = (resume: ResumeData) => {
    setSelectedId(resume._id!);
    onSelectResume(resume);
  };

  const getResumeStats = (resume: ResumeData) => {
    const workExpCount = resume.workExperience?.length || 0;
    const skillsCount = resume.skills?.length || 0;
    const educationCount = resume.education?.length || 0;
    const completionScore = Math.min(100, (workExpCount * 25) + (skillsCount * 2) + (educationCount * 15));
    
    return {
      workExpCount,
      skillsCount,
      educationCount,
      completionScore
    };
  };

  const getTemplateName = (templateId?: string) => {
    if (!templateId) return 'Default Template';
    const template = getTemplateById(templateId);
    return template?.name || 'Default Template';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-teal-500/20 rounded-md">
            <DocumentTextIcon className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-dark-text-primary">
              Available Resumes ({resumes.length})
            </span>
            {loadingState === 'loading' && (
              <div className="text-xs text-dark-text-muted">Loading...</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedId && (
            <div className="flex items-center gap-2 px-2 py-1 bg-green-500/20 rounded-full">
              <CheckCircleIcon className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Selected</span>
            </div>
          )}
          <button
            onClick={async () => {
              await fetchResumes();
            }}
            className="p-1.5 bg-teal-600/20 hover:bg-teal-600/30 rounded-md text-teal-400 hover:text-teal-300 transition-colors"
            disabled={isLoading}
            title="Refresh resumes"
          >
            <span className="text-sm">{isLoading ? '...' : '↻'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-800 border border-dark-border animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-grow">
                  <div className="h-4 bg-dark-border rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-dark-border rounded w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="text-center">
                    <div className="h-4 bg-dark-border rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-dark-border rounded w-12 mx-auto"></div>
                  </div>
                ))}
              </div>
              <div className="h-2 bg-dark-border rounded-full mb-2"></div>
              <div className="h-3 bg-dark-border rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Resume List */}
      {!isLoading && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {resumes.map((resume) => {
          const stats = getResumeStats(resume);
          const isSelected = selectedId === resume._id;
          
          return (
            <div
              key={resume._id}
              onClick={() => handleSelect(resume)}
              className={`group p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-teal-500 shadow-md'
                  : 'bg-gray-800 hover:bg-gray-700 border-dark-border hover:border-teal-500/30'
              }`}
            >
              {/* Resume Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-grow">
                  <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-dark-text-primary group-hover:text-white'}`}>
                    {resume.title || 'Untitled Resume'}
                  </h3>
                  <p className="text-xs text-dark-text-muted mt-1">
                    {getTemplateName(resume.templateId)}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <SparklesIcon className="w-4 h-4 text-teal-400" />
                  </div>
                )}
              </div>

              {/* Resume Stats */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-teal-300' : 'text-dark-text-primary'}`}>
                    {stats.workExpCount}
                  </div>
                  <div className="text-xs text-dark-text-muted">Jobs</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-teal-300' : 'text-dark-text-primary'}`}>
                    {stats.skillsCount}
                  </div>
                  <div className="text-xs text-dark-text-muted">Skills</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-teal-300' : 'text-dark-text-primary'}`}>
                    {stats.educationCount}
                  </div>
                  <div className="text-xs text-dark-text-muted">Education</div>
                </div>
              </div>

              {/* Completion Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-dark-text-secondary">Completeness</span>
                  <span className={`text-xs font-medium ${
                    stats.completionScore >= 80 ? 'text-green-400' :
                    stats.completionScore >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {stats.completionScore}%
                  </span>
                </div>
                <div className="w-full bg-dark-border rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      stats.completionScore >= 80 ? 'bg-green-400' :
                      stats.completionScore >= 60 ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${stats.completionScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center gap-2 text-xs text-dark-text-muted">
                <CalendarIcon className="w-3 h-3" />
                <span>
                  Updated {resume.updatedAt ? new Date(resume.updatedAt).toLocaleDateString() : 'recently'}
                </span>
                {isSelected && (
                  <div className="ml-auto flex items-center gap-1 text-teal-400">
                    <EyeIcon className="w-3 h-3" />
                    <span>In Preview</span>
                  </div>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="text-center py-8">
          <div className="p-4 bg-red-600/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <DocumentTextIcon className="w-10 h-10 text-red-400" />
          </div>
          <h3 className="font-semibold text-red-400 mb-2">Error Loading Resumes</h3>
          <p className="text-sm text-red-300 mb-6 max-w-sm mx-auto">
            {error}
          </p>
          <button 
            onClick={async () => {
              await fetchResumes();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all duration-300"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && resumes.length === 0 && (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="p-4 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <DocumentTextIcon className="w-10 h-10 text-teal-400" />
            </div>
            <h3 className="font-semibold text-dark-text-primary mb-2">No Resumes Found</h3>
            <p className="text-sm text-dark-text-secondary mb-6 max-w-sm mx-auto">
              API working but no resumes returned. This might be a user ID mismatch issue.
            </p>
            <button 
              onClick={() => navigate('/dashboard/resume/templates')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <SparklesIcon className="w-4 h-4" />
              Create AI Resume
            </button>
          </div>
          
        </div>
      )}

      {/* Connection Status and Actions */}
      {!isLoading && resumes.length === 0 && (
        <div className="mt-6 space-y-4">
          {/* Backend Connection Help */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-amber-400 text-sm font-medium">Connection Status</span>
            </div>
            <p className="text-amber-300 text-sm mb-3">
              Unable to load resumes. This could be due to:
            </p>
            <ul className="text-xs text-amber-300 space-y-1 mb-4 ml-4">
              <li>• Backend server not running (try running start-backend.bat)</li>
              <li>• No resumes created yet in the Resume Builder</li>
              <li>• Authentication session expired</li>
              <li>• Network connectivity issues</li>
            </ul>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  await fetchResumes();
                }}
                className="text-xs px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Retry Connection'}
              </button>
              <button 
                onClick={() => navigate('/dashboard/resume/templates')}
                className="text-xs px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded transition-colors"
              >
                Create Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
