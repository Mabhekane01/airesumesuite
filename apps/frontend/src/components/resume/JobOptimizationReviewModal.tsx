import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { CheckIcon, XMarkIcon, BriefcaseIcon, EyeIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface JobOptimizationSuggestion {
  field: string;
  type: 'job_optimization';
  original: any;
  suggested: any;
  reason: string;
  hasChanges?: boolean;
}

interface JobOptimizationSectionData {
  suggestions: JobOptimizationSuggestion[];
  hasChanges: boolean;
}

interface JobOptimizationReviewData {
  originalResumeData: any;
  optimizedResumeData: any;
  jobMatchScore: number;
  keywordAlignment: string[];
  skillsMatch: number;
  experienceMatch: number;
  addedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  jobContext: {
    jobTitle: string;
    companyName: string;
    jobDescription: string;
  };
  optimizationSuggestions: {
    personalInfo: JobOptimizationSectionData;
    professionalSummary: JobOptimizationSectionData;
    workExperience: JobOptimizationSectionData;
    education: JobOptimizationSectionData;
    skills: JobOptimizationSectionData;
    projects: JobOptimizationSectionData;
  };
}

interface JobOptimizationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  optimizationData: JobOptimizationReviewData;
  onApplySelected?: (selectedOptimizations: any) => void;
}

export const JobOptimizationReviewModal: React.FC<JobOptimizationReviewModalProps> = ({
  isOpen,
  onClose,
  optimizationData,
  onApplySelected
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showAllAlignedKeywords, setShowAllAlignedKeywords] = useState(false);
  const [showAllAddedKeywords, setShowAllAddedKeywords] = useState(false);
  const [showAllMissingKeywords, setShowAllMissingKeywords] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  // Initialize with all suggestions selected
  useEffect(() => {
    if (optimizationData) {
      const allSuggestionIds = new Set<string>();
      Object.entries(optimizationData.optimizationSuggestions).forEach(([section, data]) => {
        data.suggestions.forEach((suggestion, index) => {
          allSuggestionIds.add(`${section}-${index}`);
        });
      });
      setSelectedSuggestions(allSuggestionIds);
    }
  }, [optimizationData]);

  const toggleSuggestion = (sectionName: string, suggestionIndex: number) => {
    const suggestionId = `${sectionName}-${suggestionIndex}`;
    const newSelected = new Set(selectedSuggestions);
    
    if (newSelected.has(suggestionId)) {
      newSelected.delete(suggestionId);
    } else {
      newSelected.add(suggestionId);
    }
    
    setSelectedSuggestions(newSelected);
  };

  const selectAllSuggestions = () => {
    const allSuggestionIds = new Set<string>();
    Object.entries(optimizationData.optimizationSuggestions).forEach(([section, data]) => {
      data.suggestions.forEach((suggestion, index) => {
        allSuggestionIds.add(`${section}-${index}`);
      });
    });
    setSelectedSuggestions(allSuggestionIds);
  };

  const deselectAllSuggestions = () => {
    setSelectedSuggestions(new Set());
  };

  const toggleSuggestionExpansion = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const buildFinalResumeData = () => {
    // Start with the fully optimized data that preserves all fields and structure
    let finalData = JSON.parse(JSON.stringify(optimizationData.optimizedResumeData));

    // Revert DESELECTED optimizations back to original values
    Object.entries(optimizationData.optimizationSuggestions).forEach(([sectionName, sectionData]) => {
      sectionData.suggestions.forEach((suggestion, index) => {
        const suggestionId = `${sectionName}-${index}`;
        
        // If suggestion is NOT selected, revert to original value
        if (!selectedSuggestions.has(suggestionId)) {
          if (suggestion.field === 'professionalSummary') {
            finalData.professionalSummary = suggestion.original;
          } else if (suggestion.field === 'skills') {
            finalData.skills = suggestion.original;
          } else if (suggestion.field.startsWith('workExperience')) {
            // Handle work experience field updates
            const match = suggestion.field.match(/workExperience\[(\d+)\]\.(\w+)/);
            if (match && finalData.workExperience) {
              const [, indexStr, fieldName] = match;
              const index = parseInt(indexStr);
              if (finalData.workExperience[index] && optimizationData.originalResumeData.workExperience?.[index]) {
                finalData.workExperience[index][fieldName] = optimizationData.originalResumeData.workExperience[index][fieldName];
              }
            }
          } else if (suggestion.field.startsWith('education')) {
            // Handle education field updates
            const match = suggestion.field.match(/education\[(\d+)\]\.(\w+)/);
            if (match && finalData.education) {
              const [, indexStr, fieldName] = match;
              const index = parseInt(indexStr);
              if (finalData.education[index] && optimizationData.originalResumeData.education?.[index]) {
                finalData.education[index][fieldName] = optimizationData.originalResumeData.education[index][fieldName];
              }
            }
          } else if (sectionName === 'personalInfo' && suggestion.field === 'professionalTitle') {
            if (finalData.personalInfo && optimizationData.originalResumeData.personalInfo) {
              finalData.personalInfo.professionalTitle = optimizationData.originalResumeData.personalInfo.professionalTitle;
            }
          }
        }
      });
    });

    return finalData;
  };

  const handleApplyToForm = () => {
    const finalResumeData = buildFinalResumeData();
    if (onApplySelected) {
      onApplySelected(finalResumeData);
      toast.success('Job optimizations applied to form successfully!');
    }
  };

  const getSectionIcon = (sectionName: string) => {
    const iconClass = "h-5 w-5";
    switch (sectionName) {
      case 'personalInfo': return <BriefcaseIcon className={iconClass} />;
      case 'professionalSummary': return <DocumentTextIcon className={iconClass} />;
      case 'skills': return <ChartBarIcon className={iconClass} />;
      default: return <BriefcaseIcon className={iconClass} />;
    }
  };

  const getSectionTitle = (sectionName: string) => {
    const titles: Record<string, string> = {
      personalInfo: 'Personal Information',
      professionalSummary: 'Professional Summary',
      workExperience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      projects: 'Projects'
    };
    return titles[sectionName] || sectionName;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!optimizationData) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-dark-primary rounded-xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-secondary/50">
          <h2 className="text-xl font-bold text-dark-text-primary">Job Optimization Review</h2>
          <button
            onClick={onClose}
            className="p-2 text-dark-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-all"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex flex-col max-h-[calc(95vh-80px)] overflow-y-auto overflow-x-hidden p-4">
        {/* Header Section - Responsive */}
        <div className="border-b border-dark-border/30 pb-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shrink-0">
                <BriefcaseIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-dark-text-primary truncate">
                  Job Optimization Review
                </h2>
                <p className="text-sm text-dark-text-muted mt-1 leading-relaxed">
                  Review optimizations for: <span className="text-blue-400 font-medium">{optimizationData.jobContext.jobTitle}</span>
                  {optimizationData.jobContext.companyName && (
                    <span> at <span className="text-purple-400 font-medium">{optimizationData.jobContext.companyName}</span></span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Job Match Score Badge - Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4 shrink-0">
              <div className="text-left lg:text-right">
                <div className="text-sm text-dark-text-muted">Job Match Score</div>
                <div className={`text-2xl font-bold ${getScoreColor(optimizationData.jobMatchScore)}`}>
                  {optimizationData.jobMatchScore}/100
                </div>
              </div>
              <Badge variant="success" className="bg-blue-500/20 text-blue-300 border-blue-500/30 whitespace-nowrap">
                {optimizationData.addedKeywords.length} Keywords Added
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile First */}
        <div className="flex-1 w-full overflow-x-hidden">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 w-full">
            
            {/* Suggestions Panel - FIRST on mobile, left on desktop */}
            <div className="order-1 lg:order-1 lg:col-span-2 space-y-4 min-w-0 overflow-hidden">
              {/* Control Buttons - Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 card-glass-dark rounded-lg border border-dark-border/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-dark-text-primary truncate">
                    {selectedSuggestions.size}/{Object.values(optimizationData.optimizationSuggestions)
                      .reduce((total, section) => total + section.suggestions.length, 0)} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSuggestions}
                    className="text-blue-400 hover:bg-blue-500/10 text-xs sm:text-sm"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllSuggestions}
                    className="text-dark-text-muted hover:bg-dark-tertiary text-xs sm:text-sm"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Optimization Sections */}
              {Object.entries(optimizationData.optimizationSuggestions).map(([sectionName, sectionData]) => {
                if (!sectionData.hasChanges) return null;
                
                return (
                  <Card key={sectionName} className="card-glass-dark border border-dark-border/50">
                    <div className="p-3 sm:p-4">
                      {/* Section Header - Responsive */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {getSectionIcon(sectionName)}
                          <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">
                            {getSectionTitle(sectionName)}
                          </h3>
                        </div>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 w-fit text-xs">
                          {sectionData.suggestions.length} optimizations
                        </Badge>
                      </div>

                      {/* Suggestions - Responsive */}
                      <div className="space-y-3">
                        {sectionData.suggestions.map((suggestion, index) => {
                          const suggestionId = `${sectionName}-${index}`;
                          const isSelected = selectedSuggestions.has(suggestionId);
                          const isExpanded = expandedSuggestions.has(suggestionId);
                          
                          const getContentPreview = (content: any, maxLength: number = 100) => {
                            const text = typeof content === 'string' ? content : JSON.stringify(content);
                            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
                          };
                          
                          const getFullContent = (content: any) => {
                            return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                          };

                          return (
                            <div
                              key={index}
                              className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-500/10 border-blue-500/30 shadow-glow-sm'
                                  : 'bg-dark-tertiary/50 border-dark-border/30 hover:border-blue-500/20'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div 
                                  className={`mt-1 p-1 rounded-full transition-colors shrink-0 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-dark-border text-dark-text-muted'
                                  }`}
                                  onClick={() => toggleSuggestion(sectionName, index)}
                                >
                                  {isSelected ? (
                                    <CheckIconSolid className="h-4 w-4" />
                                  ) : (
                                    <div className="h-4 w-4" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-dark-text-primary mb-2 leading-relaxed">
                                    {suggestion.reason}
                                  </div>
                                  
                                  {/* Before/After Preview */}
                                  <div className="grid grid-cols-1 gap-3 text-xs">
                                    {/* Before */}
                                    <div>
                                      <div className="text-dark-text-muted mb-1 font-medium flex items-center gap-1">
                                        <XMarkIcon className="h-3 w-3 text-red-400" />
                                        Before:
                                      </div>
                                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300 font-mono break-words">
                                        {isExpanded ? getFullContent(suggestion.original) : getContentPreview(suggestion.original)}
                                      </div>
                                    </div>
                                    {/* After */}
                                    <div>
                                      <div className="text-dark-text-muted mb-1 font-medium flex items-center gap-1">
                                        <CheckIcon className="h-3 w-3 text-blue-400" />
                                        Optimized:
                                      </div>
                                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 font-mono break-words">
                                        {isExpanded ? getFullContent(suggestion.suggested) : getContentPreview(suggestion.suggested)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Expand/Collapse Button */}
                                  {(getContentPreview(suggestion.original, 100).includes('...') || 
                                    getContentPreview(suggestion.suggested, 100).includes('...')) && (
                                    <button
                                      onClick={() => toggleSuggestionExpansion(suggestionId)}
                                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                                    >
                                      {isExpanded ? 'Show Less' : 'Show Full Content'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Summary Panel - SECOND on mobile, right on desktop */}
            <div className="order-2 lg:order-2 lg:col-span-1 space-y-4 min-w-0">
              {/* Job Match Summary Card */}
              <Card className="card-glass-dark border border-dark-border/50">
                <div className="p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary mb-4">Job Match Analysis</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-dark-border/30">
                      <span className="text-sm text-dark-text-muted">Overall Match</span>
                      <div className={`text-lg font-bold ${getScoreColor(optimizationData.jobMatchScore)}`}>
                        {optimizationData.jobMatchScore}%
                      </div>
                    </div>
                    
                    <div className="py-2 border-b border-dark-border/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-dark-text-muted">Keyword Alignment</span>
                        <span className="text-xs text-dark-text-muted">
                          {optimizationData.keywordAlignment?.length || 0} matched
                        </span>
                      </div>
                      {optimizationData.keywordAlignment && optimizationData.keywordAlignment.length > 0 ? (
                        <div>
                          <div className="flex flex-wrap gap-1">
                            {(showAllAlignedKeywords 
                              ? optimizationData.keywordAlignment 
                              : optimizationData.keywordAlignment.slice(0, 3)
                            ).map((keyword, index) => (
                              <span 
                                key={index}
                                className="text-xs bg-green-500/10 text-green-300 px-2 py-1 rounded border border-green-500/20"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                          {optimizationData.keywordAlignment.length > 3 && (
                            <button
                              onClick={() => setShowAllAlignedKeywords(!showAllAlignedKeywords)}
                              className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                            >
                              {showAllAlignedKeywords 
                                ? 'Show Less' 
                                : `See All ${optimizationData.keywordAlignment.length} Keywords`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-dark-text-muted italic">No keywords aligned</div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-dark-border/30">
                      <span className="text-sm text-dark-text-muted">Skills Match</span>
                      <div className={`text-lg font-bold ${getScoreColor(optimizationData.skillsMatch)}`}>
                        {optimizationData.skillsMatch}%
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-dark-text-muted">Experience Match</span>
                      <div className={`text-lg font-bold ${getScoreColor(optimizationData.experienceMatch)}`}>
                        {optimizationData.experienceMatch}%
                      </div>
                    </div>
                  </div>

                  {/* Added Keywords - Expandable */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                      Added Keywords ({optimizationData.addedKeywords.length})
                    </h4>
                    {optimizationData.addedKeywords.length > 0 ? (
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {(showAllAddedKeywords 
                            ? optimizationData.addedKeywords 
                            : optimizationData.addedKeywords.slice(0, 4)
                          ).map((keyword, index) => (
                            <span 
                              key={index}
                              className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        {optimizationData.addedKeywords.length > 4 && (
                          <button
                            onClick={() => setShowAllAddedKeywords(!showAllAddedKeywords)}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                          >
                            {showAllAddedKeywords 
                              ? 'Show Less' 
                              : `See All ${optimizationData.addedKeywords.length} Keywords`}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-dark-text-muted italic">No keywords added</div>
                    )}
                  </div>

                  {/* Missing Keywords - Expandable */}
                  {optimizationData.missingKeywords.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                        Still Missing ({optimizationData.missingKeywords.length})
                      </h4>
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {(showAllMissingKeywords 
                            ? optimizationData.missingKeywords 
                            : optimizationData.missingKeywords.slice(0, 3)
                          ).map((keyword, index) => (
                            <span 
                              key={index}
                              className="text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/20"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        {optimizationData.missingKeywords.length > 3 && (
                          <button
                            onClick={() => setShowAllMissingKeywords(!showAllMissingKeywords)}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                          >
                            {showAllMissingKeywords 
                              ? 'Show Less' 
                              : `See All ${optimizationData.missingKeywords.length} Keywords`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Buttons - Responsive */}
              <div className="space-y-3">
                <Button
                  onClick={handleApplyToForm}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-glow-md py-3 text-sm sm:text-base"
                >
                  <CheckIcon className="h-5 w-5 mr-2 shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold">Apply Job Optimizations</div>
                    <div className="text-xs text-green-100 opacity-90">Updates your resume for this job & auto-generates new PDF preview</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full border-dark-border hover:bg-dark-tertiary text-dark-text-primary py-2.5 sm:py-3 text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};