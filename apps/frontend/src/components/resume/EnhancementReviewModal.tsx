import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { CheckIcon, XMarkIcon, SparklesIcon, EyeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface EnhancementSuggestion {
  field: string;
  type: 'improvement' | 'addition' | 'removal';
  original: any;
  suggested: any;
  reason: string;
  hasChanges?: boolean;
}

interface EnhancementSectionData {
  suggestions: EnhancementSuggestion[];
  hasChanges: boolean;
}

interface EnhancementReviewData {
  originalResumeData: any;
  enhancedResumeData: any;
  improvements: string[];
  keywordsAdded: string[];
  atsScore: number;
  enhancementSuggestions: {
    personalInfo: EnhancementSectionData;
    professionalSummary: EnhancementSectionData;
    workExperience: EnhancementSectionData;
    education: EnhancementSectionData;
    skills: EnhancementSectionData;
    projects: EnhancementSectionData;
  };
}

interface EnhancementReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  enhancementData: EnhancementReviewData;
  onApplySelected: (selectedEnhancements: any) => void;
}

export const EnhancementReviewModal: React.FC<EnhancementReviewModalProps> = ({
  isOpen,
  onClose,
  enhancementData,
  onApplySelected
}) => {
  const { updateAIData, clearOptimizedContent } = useResume();
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState<'original' | 'enhanced' | 'selected'>('enhanced');
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  // Initialize with all suggestions selected
  useEffect(() => {
    if (enhancementData) {
      const allSuggestionIds = new Set<string>();
      Object.entries(enhancementData.enhancementSuggestions).forEach(([section, data]) => {
        data.suggestions.forEach((suggestion, index) => {
          allSuggestionIds.add(`${section}-${index}`);
        });
      });
      setSelectedSuggestions(allSuggestionIds);
    }
  }, [enhancementData]);

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
    Object.entries(enhancementData.enhancementSuggestions).forEach(([section, data]) => {
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
    // Start with complete original resume data to preserve ALL fields
    let finalData = JSON.parse(JSON.stringify(enhancementData.originalResumeData));

    // Apply only the selected AI enhancement suggestions
    Object.entries(enhancementData.enhancementSuggestions).forEach(([sectionName, sectionData]) => {
      sectionData.suggestions.forEach((suggestion, index) => {
        const suggestionId = `${sectionName}-${index}`;
        
        // Only apply if suggestion is selected
        if (selectedSuggestions.has(suggestionId)) {
          const enhancedValue = suggestion.suggested;
          
          if (suggestion.field === 'professionalSummary') {
            finalData.professionalSummary = enhancedValue;
          } else if (suggestion.field.startsWith('workExperience')) {
            // Handle work experience field updates
            const match = suggestion.field.match(/workExperience\[(\d+)\]\.(\w+)/);
            if (match && finalData.workExperience?.[parseInt(match[1])]) {
              finalData.workExperience[parseInt(match[1])][match[2]] = enhancedValue;
            }
          } else if (suggestion.field === 'skills') {
            finalData.skills = enhancedValue;
          }
          // Add more field handlers as AI enhancement expands to cover them
        }
      });
    });

    return finalData;
  };

  const handleApplyToForm = () => {
    const finalResumeData = buildFinalResumeData();
    // Clear optimized content to force PDF regeneration
    clearOptimizedContent();
    // Track AI usage for subscription logic
    updateAIData({ wasOptimizationApplied: true });
    onApplySelected(finalResumeData);
    toast.success('Enhancements applied to form successfully!');
  };

  const getSectionIcon = (sectionName: string) => {
    const iconClass = "h-5 w-5";
    switch (sectionName) {
      case 'personalInfo': return <SparklesIcon className={iconClass} />;
      case 'professionalSummary': return <DocumentTextIcon className={iconClass} />;
      default: return <SparklesIcon className={iconClass} />;
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

  if (!enhancementData) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="AI Enhancement Review"
      size="xl"
    >
      <div className="max-h-[85vh] overflow-hidden w-full">
        {/* Header Section - Responsive */}
        <div className="border-b border-surface-200/30 pb-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 shrink-0">
                <SparklesIcon className="h-6 w-6 text-accent-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-text-primary truncate">
                  AI Enhancement Review
                </h2>
                <p className="text-sm text-dark-text-muted mt-1 leading-relaxed">
                  Review and select which AI improvements to apply to your resume
                </p>
              </div>
            </div>
            
            {/* ATS Score Badge - Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4 shrink-0">
              <div className="text-left lg:text-right">
                <div className="text-sm text-dark-text-muted">ATS Score</div>
                <div className="text-2xl font-bold text-accent-primary">
                  {enhancementData.atsScore}/100
                </div>
              </div>
              <Badge variant="success" className="bg-green-500/20 text-green-300 border-green-500/30 whitespace-nowrap">
                {enhancementData.keywordsAdded.length} Keywords Added
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 lg:gap-6 h-full">
            {/* Mobile: Summary first, Desktop: Right panel */}
            <div className="order-1 xl:order-2 xl:col-span-1 space-y-4 xl:sticky xl:top-0">
              {/* Summary Card */}
              <Card className="card-glass-dark border border-surface-200/50">
                <div className="p-4">
                  <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-4">Enhancement Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-surface-200/30">
                      <span className="text-sm text-dark-text-muted">Total Improvements</span>
                      <Badge variant="secondary" className="bg-accent-primary/20 text-accent-primary text-xs">
                        {enhancementData.improvements.length}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-surface-200/30">
                      <span className="text-sm text-dark-text-muted">Keywords Added</span>
                      <Badge variant="success" className="bg-green-500/20 text-green-300 text-xs">
                        {enhancementData.keywordsAdded.length}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-dark-text-muted">ATS Score</span>
                      <div className="text-lg sm:text-xl font-bold text-accent-primary">
                        {enhancementData.atsScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Keywords Preview - Responsive */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Added Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {enhancementData.keywordsAdded.slice(0, 8).map((keyword, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs bg-accent-primary/10 text-accent-primary border-accent-primary/30 break-words"
                        >
                          {keyword.length > 15 ? keyword.substring(0, 15) + '...' : keyword}
                        </Badge>
                      ))}
                      {enhancementData.keywordsAdded.length > 8 && (
                        <Badge variant="outline" className="text-xs text-dark-text-muted">
                          +{enhancementData.keywordsAdded.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
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
                    <div className="font-semibold">Apply Changes to Form</div>
                    <div className="text-xs text-green-100 opacity-90">Updates your resume fields & auto-generates new PDF preview</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full border-surface-200 hover:bg-gray-700 text-text-primary py-2.5 sm:py-3 text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Enhancement Suggestions Panel - Mobile: Second, Desktop: Left */}
            <div className="order-2 xl:order-1 xl:col-span-2 space-y-4 overflow-y-auto max-h-[50vh] xl:max-h-[70vh] pr-2">
              {/* Control Buttons - Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 card-glass-dark rounded-lg border border-surface-200/50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    <span className="block sm:inline">
                      {selectedSuggestions.size} of {Object.values(enhancementData.enhancementSuggestions)
                        .reduce((total, section) => total + section.suggestions.length, 0)} 
                    </span>
                    <span className="block sm:inline sm:ml-1">improvements selected</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSuggestions}
                    className="text-accent-primary hover:bg-accent-primary/10 text-xs sm:text-sm"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllSuggestions}
                    className="text-dark-text-muted hover:bg-gray-700 text-xs sm:text-sm"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Enhancement Sections */}
              {Object.entries(enhancementData.enhancementSuggestions).map(([sectionName, sectionData]) => {
                if (!sectionData.hasChanges) return null;
                
                return (
                  <Card key={sectionName} className="card-glass-dark border border-surface-200/50">
                    <div className="p-3 sm:p-4">
                      {/* Section Header - Responsive */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {getSectionIcon(sectionName)}
                          <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                            {getSectionTitle(sectionName)}
                          </h3>
                        </div>
                        <Badge variant="secondary" className="bg-accent-primary/20 text-accent-primary border-accent-primary/30 w-fit text-xs">
                          {sectionData.suggestions.length} improvements
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
                                  ? 'bg-accent-primary/10 border-accent-primary/30 shadow-glow-sm'
                                  : 'bg-gray-700/50 border-surface-200/30 hover:border-accent-primary/20'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div 
                                  className={`mt-1 p-1 rounded-full transition-colors shrink-0 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-accent-primary text-white' 
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
                                  <div className="text-sm font-medium text-text-primary mb-2 leading-relaxed">
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
                                        <CheckIcon className="h-3 w-3 text-green-400" />
                                        Enhanced:
                                      </div>
                                      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-green-300 font-mono break-words">
                                        {isExpanded ? getFullContent(suggestion.suggested) : getContentPreview(suggestion.suggested)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Expand/Collapse Button */}
                                  {(getContentPreview(suggestion.original, 100).includes('...') || 
                                    getContentPreview(suggestion.suggested, 100).includes('...')) && (
                                    <button
                                      onClick={() => toggleSuggestionExpansion(suggestionId)}
                                      className="text-xs text-accent-primary hover:text-accent-secondary mt-2 transition-colors"
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
          </div>
        </div>
      </div>
    </Modal>
  );
};
