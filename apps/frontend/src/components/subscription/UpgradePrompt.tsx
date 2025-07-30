import React from 'react';
import {
  StarIcon,
  SparklesIcon,
  ArrowRightIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export default function UpgradePrompt({ 
  feature, 
  description, 
  compact = false,
  className = ""
}: UpgradePromptProps) {
  
  if (compact) {
    return (
      <div className={`glass-dark rounded-lg border border-yellow-400/30 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-dark-text-primary">
                {feature} (Premium)
              </div>
              <div className="text-xs text-dark-text-secondary">
                {description || "Requires Enterprise subscription"}
              </div>
            </div>
          </div>
          <Link
            to="/dashboard/upgrade"
            className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-sm font-medium px-3 py-1.5 rounded-md hover:shadow-glow-sm transition-all duration-300"
          >
            <StarIcon className="w-3 h-3" />
            <span>Upgrade</span>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`glass-dark rounded-xl border border-yellow-400/30 p-6 text-center ${className}`}>
      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <BoltIcon className="w-8 h-8 text-yellow-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
        Unlock {feature}
      </h3>
      
      <p className="text-dark-text-secondary text-sm mb-6">
        {description || `${feature} is an AI-powered premium feature available with Enterprise subscription.`}
      </p>
      
      <div className="space-y-4">
        <Link
          to="/dashboard/upgrade"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-medium px-6 py-3 rounded-lg hover:shadow-glow-sm transition-all duration-300"
        >
          <StarIcon className="w-4 h-4" />
          <span>Upgrade to Enterprise</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
        
        <div className="flex items-center justify-center space-x-4 text-xs text-dark-text-muted">
          <div className="flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>AI-Powered</span>
          </div>
          <div>•</div>
          <div>From R50/month</div>
          <div>•</div>
          <div>Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}