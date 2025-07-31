import React, { useState } from 'react';
import { SparklesIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { resumeService } from '../../services/resumeService';
import { useResume } from '../../contexts/ResumeContext';
import SubscriptionGate from '../subscription/SubscriptionGate';
import SaveResumeModal from './SaveResumeModal';
import AILoadingOverlay from '../ui/AILoadingOverlay';
import { useAIProgress } from '../../hooks/useAIProgress';
import { toast } from 'sonner';

export function ProfessionalSummaryForm() {
  const { resumeData, handleDataChange } = useResume();
  const { professionalSummary } = resumeData;
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  
  const aiProgress = useAIProgress('professional-summary');

  const updateSummary = (newSummary: string) => {
    handleDataChange('professionalSummary', newSummary);
  };

  const generateAISummary = async () => {
    if (!resumeData?.workExperience?.length && !resumeData?.skills?.length) {
      toast.error('Missing required information', {
        description: 'Please fill out your work experience and skills sections first to generate an AI summary.',
        duration: 4000,
      });
      return;
    }

    aiProgress.startProgress();
    
    try {
      const options = await resumeService.generateProfessionalSummary(resumeData.id, resumeData);
      aiProgress.completeProgress();
      
      setGeneratedOptions(Array.isArray(options) ? options : [options]);
      setShowOptions(true);
      
      toast.success(`✨ Generated ${Array.isArray(options) ? options.length : 1} AI summary options!`, {
        description: 'Click on any option below to use it.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error generating AI summary:', error);
      aiProgress.cancelProgress();
      
      toast.error('Failed to generate AI summary', {
        description: 'Please check your internet connection and try again.',
        duration: 4000,
      });
    }
  };

  const selectAIOption = (option: string) => {
    updateSummary(option);
    setShowOptions(false);
    toast.success('✨ AI summary applied successfully!', {
      description: 'Your professional summary has been updated.',
      duration: 3000,
    });
  };

  const wordCount = professionalSummary?.split(/\s+/).filter(word => word.length > 0).length || 0;
  const charCount = professionalSummary?.length || 0;
  const isOptimalLength = wordCount >= 25 && wordCount <= 60;

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-2xl font-bold gradient-text-dark mb-2">Professional Summary</h2>
        <p className="text-dark-text-secondary">
          Create a compelling professional summary that captures your key qualifications and career objectives. 
          This is often the first thing employers read, so make it count!
        </p>
      </div>

      {/* AI Generation Section */}
      <SubscriptionGate 
        feature="AI Professional Summary Generator" 
        description="Generate multiple professional summary options tailored to your experience using advanced AI technology."
        requiresEnterprise={true}
      >
        <Card className="card-dark p-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 text-purple-400 mr-2" />
            <div>
              <h3 className="font-semibold text-dark-text-primary">AI-Generated Summary</h3>
              <p className="text-sm text-dark-text-secondary">Let AI create multiple professional summary options based on your experience</p>
            </div>
          </div>
          <Button
            onClick={generateAISummary}
            disabled={aiProgress.isLoading}
            className="btn-primary-dark bg-purple-600 hover:bg-purple-700"
          >
            {aiProgress.isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4 mr-2" />
                Generate AI Summary
              </>
            )}
          </Button>
        </div>

        {showOptions && generatedOptions.length > 0 && (
          <div className="space-y-3 animate-slide-up-soft">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-dark-text-primary">Choose your preferred summary:</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOptions(false)}
                className="btn-secondary-dark"
              >
                Cancel
              </Button>
            </div>
            {generatedOptions.map((option, index) => (
              <div
                key={index}
                className="group p-4 bg-dark-secondary/50 border border-dark-border rounded-lg cursor-pointer hover:border-purple-400 hover:bg-dark-secondary hover:shadow-lg transition-all duration-200"
                onClick={() => selectAIOption(option)}
              >
                <div className="flex items-start justify-between">
                  <p className="text-dark-text-secondary group-hover:text-dark-text-primary flex-1 mr-4 leading-relaxed">
                    {option}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="btn-secondary-dark group-hover:border-purple-400 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Use This
                  </Button>
                </div>
                <div className="mt-2 text-xs text-dark-text-muted">
                  Option {index + 1} • {option.split(/\s+/).length} words
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      </SubscriptionGate>

      {/* Manual Summary Input */}
      <div className="space-y-4">
        <Textarea
          label="Professional Summary"
          value={professionalSummary || ''}
          onChange={(e) => updateSummary(e.target.value)}
          placeholder="Write your own professional summary or use the AI generator above..."
          rows={6}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className={`flex items-center ${isOptimalLength ? 'text-green-400' : 'text-dark-text-muted'}`}>
              {isOptimalLength && <CheckCircleIcon className="w-4 h-4 mr-1" />}
              {wordCount} words
            </span>
            <span className="text-dark-text-muted">{charCount} characters</span>
          </div>
          <span className="text-dark-text-muted">
            Optimal: 25-60 words
          </span>
        </div>

        {!isOptimalLength && (professionalSummary?.length || 0) > 0 && (
          <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
            {wordCount < 25 ? (
              "Consider expanding your summary to better showcase your qualifications."
            ) : (
              "Consider condensing your summary for better readability and impact."
            )}
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-dark p-4">
          <h4 className="font-medium text-green-400 mb-3">✅ Do Include</h4>
          <ul className="text-sm text-green-300 space-y-1">
            <li>• Your professional title and years of experience</li>
            <li>• 2-3 key skills most relevant to your target role</li>
            <li>• Specific achievements or quantifiable results</li>
            <li>• Value proposition - what you bring to employers</li>
            <li>• Industry keywords relevant to your field</li>
          </ul>
        </Card>

        <Card className="card-dark p-4">
          <h4 className="font-medium text-red-400 mb-3">❌ Avoid</h4>
          <ul className="text-sm text-red-300 space-y-1">
            <li>• Generic phrases like "hard-working" or "team player"</li>
            <li>• Personal information (age, marital status, etc.)</li>
            <li>• Negative statements or weaknesses</li>
            <li>• Overly complex jargon or acronyms</li>
            <li>• Objective statements - focus on what you offer</li>
          </ul>
        </Card>
      </div>

      {/* Example Summaries */}
      <Card className="card-dark p-4">
        <h4 className="font-medium text-dark-text-primary mb-3">💡 Example Professional Summaries</h4>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-dark-tertiary rounded-lg">
            <p className="font-medium text-dark-text-primary mb-1">Software Engineer:</p>
            <p className="text-dark-text-secondary">"Results-driven software engineer with 5+ years developing scalable web applications using React and Node.js. Led 3 cross-functional teams to deliver products serving 100K+ users, increasing system performance by 40%. Passionate about clean code and mentoring junior developers."</p>
          </div>
          <div className="p-3 bg-dark-tertiary rounded-lg">
            <p className="font-medium text-dark-text-primary mb-1">Marketing Manager:</p>
            <p className="text-dark-text-secondary">"Strategic marketing manager with 7+ years driving growth for B2B SaaS companies. Developed campaigns that generated $2M+ in pipeline and increased lead conversion by 35%. Expert in marketing automation, content strategy, and data-driven decision making."</p>
          </div>
        </div>
      </Card>

      {/* AI Loading Overlay */}
      <AILoadingOverlay
        isVisible={aiProgress.isLoading}
        title="🤖 Generating Professional Summary"
        description="AI is analyzing your experience and creating compelling summary options"
        progress={aiProgress.progress}
        currentStep={aiProgress.currentStep}
        estimatedTime={aiProgress.estimatedTime}
        onCancel={aiProgress.cancelProgress}
      />
    </div>
  );
}