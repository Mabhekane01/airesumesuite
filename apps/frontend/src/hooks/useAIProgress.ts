import { useState, useEffect, useRef } from 'react';

export interface AIProgressConfig {
  steps: Array<{
    name: string;
    duration: number; // percentage of total time
    message: string;
  }>;
  totalEstimatedTime: number; // in seconds
}

export const AI_OPERATION_CONFIGS: Record<string, AIProgressConfig> = {
  'professional-summary': {
    totalEstimatedTime: 15,
    steps: [
      { name: 'analyzing', duration: 30, message: 'Analyzing your experience and skills...' },
      { name: 'generating', duration: 50, message: 'Generating professional summary options...' },
      { name: 'optimizing', duration: 20, message: 'Optimizing for impact and clarity...' }
    ]
  },
  'job-matching': {
    totalEstimatedTime: 35,
    steps: [
      { name: 'scraping', duration: 20, message: 'Analyzing job posting requirements...' },
      { name: 'matching', duration: 40, message: 'Comparing your skills with job requirements...' },
      { name: 'scoring', duration: 25, message: 'Calculating match score and recommendations...' },
      { name: 'finalizing', duration: 15, message: 'Preparing detailed analysis...' }
    ]
  },
  'ats-analysis': {
    totalEstimatedTime: 25,
    steps: [
      { name: 'scanning', duration: 35, message: 'Scanning resume format and structure...' },
      { name: 'analyzing', duration: 40, message: 'Analyzing ATS compatibility factors...' },
      { name: 'reporting', duration: 25, message: 'Generating compatibility report...' }
    ]
  },
  'resume-enhancement': {
    totalEstimatedTime: 45,
    steps: [
      { name: 'analyzing', duration: 20, message: 'Analyzing current resume content...' },
      { name: 'enhancing', duration: 35, message: 'Enhancing professional summary...' },
      { name: 'optimizing', duration: 25, message: 'Optimizing work experience descriptions...' },
      { name: 'benchmarking', duration: 15, message: 'Performing industry benchmarking...' },
      { name: 'finalizing', duration: 5, message: 'Finalizing improvements...' }
    ]
  },
  'job-optimization': {
    totalEstimatedTime: 40,
    steps: [
      { name: 'analyzing-job', duration: 25, message: 'Analyzing job posting details...' },
      { name: 'matching-skills', duration: 30, message: 'Matching your skills to requirements...' },
      { name: 'optimizing-content', duration: 35, message: 'Optimizing resume content for job...' },
      { name: 'finalizing', duration: 10, message: 'Applying final optimizations...' }
    ]
  }
};

export const useAIProgress = (operationType: keyof typeof AI_OPERATION_CONFIGS) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const config = AI_OPERATION_CONFIGS[operationType];

  const startProgress = () => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStepIndex(0);
    startTimeRef.current = Date.now();
    
    if (config.steps.length > 0) {
      setCurrentStep(config.steps[0].message);
    }

    // Simulate realistic progress with better accuracy
    intervalRef.current = setInterval(() => {
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      const totalTime = config.totalEstimatedTime;
      let newProgress = Math.min((elapsedTime / totalTime) * 95, 95); // Cap at 95% until completion
      
      // Update current step based on progress - use cumulative durations
      let cumulativePercentage = 0;
      let stepIndex = 0;
      
      for (let i = 0; i < config.steps.length; i++) {
        cumulativePercentage += config.steps[i].duration;
        if (newProgress <= cumulativePercentage) {
          stepIndex = i;
          break;
        }
      }
      
      // Ensure we don't go beyond available steps
      stepIndex = Math.min(stepIndex, config.steps.length - 1);
      
      if (stepIndex !== currentStepIndex) {
        setCurrentStepIndex(stepIndex);
        setCurrentStep(config.steps[stepIndex]?.message || '');
      }
      
      setProgress(Math.round(newProgress));
    }, 150); // Slightly slower updates for smoother animation
  };

  const completeProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setProgress(100);
    setCurrentStep('Completed!');
    
    // Hide after a brief moment
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep('');
      setCurrentStepIndex(0);
    }, 1000);
  };

  const cancelProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsLoading(false);
    setProgress(0);
    setCurrentStep('');
    setCurrentStepIndex(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    progress,
    currentStep,
    estimatedTime: config.totalEstimatedTime,
    startProgress,
    completeProgress,
    cancelProgress,
    config
  };
};