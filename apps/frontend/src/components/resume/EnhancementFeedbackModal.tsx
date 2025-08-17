import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface EnhancementResult {
  type: 'ats' | 'ai-enhance' | 'job-optimization';
  title: string;
  summary: string;
  improvements: {
    category: string;
    changes: string[];
    impact: 'high' | 'medium' | 'low';
  }[];
  scores?: {
    before: number;
    after: number;
    improvement: number;
  };
  qualityScore?: {
    before: number;
    after: number;
    improvement: number;
  };
  keyMetrics: {
    label: string;
    value: string;
    improvement?: string;
  }[];
}

interface EnhancementFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: EnhancementResult | null;
  onApplyChanges?: () => void;
  onViewComparison?: () => void;
}

const EnhancementFeedbackModal: React.FC<EnhancementFeedbackModalProps> = ({
  isOpen,
  onClose,
  result,
  onApplyChanges,
  onViewComparison
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ats':
        return <ShieldCheckIcon className="w-8 h-8 text-teal-400" />;
      case 'ai-enhance':
        return <SparklesIcon className="w-8 h-8 text-emerald-400" />;
      case 'job-optimization':
        return <DocumentTextIcon className="w-8 h-8 text-green-400" />;
      default:
        return <SparklesIcon className="w-8 h-8 text-teal-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ats':
        return 'from-blue-500/20 to-teal-600/20 border-teal-400/30';
      case 'ai-enhance':
        return 'from-emerald-500/20 to-purple-600/20 border-emerald-400/30';
      case 'job-optimization':
        return 'from-green-500/20 to-green-600/20 border-green-400/30';
      default:
        return 'from-blue-500/20 to-teal-600/20 border-teal-400/30';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
      case 'low':
        return 'bg-teal-500/20 text-teal-400 border-teal-400/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  // Auto-advance through steps
  useEffect(() => {
    if (!isOpen || !result) return;
    
    const timer = setTimeout(() => {
      if (currentStep < 2) {
        setCurrentStep(prev => prev + 1);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentStep, isOpen, result]);

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative w-full max-w-4xl max-h-[90vh] overflow-y-auto
        bg-gradient-to-br ${getTypeColor(result.type)}
        backdrop-blur-xl border rounded-2xl shadow-2xl
        transform transition-all duration-500 ease-out
        animate-scale-in
      `}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-dark-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-gray-700">
                {getTypeIcon(result.type)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{result.title}</h2>
                <p className="text-dark-text-secondary">{result.summary}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-gray-700/80 hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-dark-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Score Improvement */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <ChartBarIcon className="w-5 h-5 mr-2 text-teal-400" />
                Performance Improvement
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-red-400">{(result.scores || result.qualityScore)?.before || 0}%</span>
                <ArrowRightIcon className="w-4 h-4 text-dark-text-muted" />
                <span className="text-2xl font-bold text-green-400">{(result.scores || result.qualityScore)?.after || 0}%</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-400/30">
                  +{(result.scores || result.qualityScore)?.improvement || 0}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(result.keyMetrics || []).map((metric, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-dark-text-secondary mb-1">{metric.label}</div>
                  <div className="text-xl font-bold text-white">{metric.value}</div>
                  {metric.improvement && (
                    <div className="text-sm text-green-400">+{metric.improvement}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Improvements Made */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-400" />
                Improvements Made ({result.improvements.length})
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            <div className="space-y-3">
              {result.improvements.map((improvement, index) => (
                <div 
                  key={index} 
                  className="bg-gray-800/50 rounded-lg p-4 border border-dark-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{improvement.category}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(improvement.impact)}`}>
                      {improvement.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  
                  {showDetails && (
                    <div className="space-y-1">
                      {improvement.changes.map((change, changeIndex) => (
                        <div key={changeIndex} className="flex items-start space-x-2 text-sm text-dark-text-secondary">
                          <CheckCircleIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{change}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-dark-border">
            <button
              onClick={onApplyChanges}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>Apply All Changes</span>
            </button>
            
            {onViewComparison && (
              <button
                onClick={onViewComparison}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-dark-border"
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span>View Comparison</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="sm:w-auto px-6 py-3 text-dark-text-secondary hover:text-white transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Quick Tips */}
          <div className="bg-teal-500/10 border border-teal-400/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <LightBulbIcon className="w-5 h-5 text-teal-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Pro Tip</h4>
                <p className="text-sm text-dark-text-secondary">
                  {result.type === 'ats' && "ATS optimization improves your resume's visibility to hiring managers by 60-80%."}
                  {result.type === 'ai-enhance' && "AI enhancements can increase interview callbacks by up to 40% by highlighting your key strengths."}
                  {result.type === 'job-optimization' && "Job-specific optimization increases your match score and shows employers you're the perfect fit."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancementFeedbackModal;