import React from 'react';
import {
  StarIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { Link } from 'react-router-dom';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  description?: string;
  requiresEnterprise?: boolean;
  showUpgrade?: boolean;
}

export default function SubscriptionGate({ 
  children, 
  feature, 
  description, 
  requiresEnterprise = true,
  showUpgrade = true 
}: SubscriptionGateProps) {
  const { user } = useAuthStore();
  const { hasActiveSubscription, isEnterprise, canUseAI } = useSubscription();
  
  // Debug logging
  console.log('SubscriptionGate check:', {
    feature,
    userTier: user?.tier,
    subscriptionStatus: user?.subscriptionStatus,
    requiresEnterprise,
    isEnterprise,
    hasActiveSubscription,
    canUseAI,
    hasAccess: requiresEnterprise ? hasActiveSubscription : true
  });
  
  // If feature doesn't require enterprise, show the content
  if (!requiresEnterprise) {
    return <>{children}</>;
  }
  
  // For enterprise features, use proper subscription validation
  if (requiresEnterprise && hasActiveSubscription) {
    return <>{children}</>;
  }
  
  // Show upgrade prompt for free tier users
  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="filter blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-md">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LockClosedIcon className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
              Premium Feature
            </h3>
            <p className="text-dark-text-secondary text-sm mb-1">
              {description || `${feature} requires an Enterprise subscription`}
            </p>
            <div className="flex items-center justify-center space-x-1 text-yellow-400 text-sm">
              <SparklesIcon className="w-4 h-4" />
              <span>AI-Powered Feature</span>
            </div>
          </div>
          
          {showUpgrade && (
            <div className="space-y-3">
              <Link
                to="/dashboard/upgrade"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-medium px-6 py-3 rounded-lg hover:shadow-glow-sm transition-all duration-300"
              >
                <StarIcon className="w-4 h-4" />
                <span>Upgrade to Enterprise</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              
              <div className="text-xs text-dark-text-muted">
                Starting from R50/month • Cancel anytime
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}