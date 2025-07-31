import { useAuthStore } from '../stores/authStore';

export interface SubscriptionStatus {
  isEnterprise: boolean;
  isFree: boolean;
  tier: string;
  canUseAI: boolean;
  hasActiveSubscription: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuthStore();
  
  const isEnterprise = user?.tier === 'enterprise';
  const isFree = !isEnterprise;
  const tier = user?.tier || 'free';
  
  // More strict subscription status checking
  const subscriptionStatus = user?.subscriptionStatus;
  const hasActiveSubscription = isEnterprise && 
    (subscriptionStatus === 'active' || 
     (!subscriptionStatus && user?.tier === 'enterprise')); // Backward compatibility
  
  // Check if subscription has expired based on end date if available
  const subscriptionEndDate = user?.subscriptionEndDate;
  const isExpired = subscriptionEndDate ? new Date(subscriptionEndDate) < new Date() : false;
  
  const finalActiveStatus = hasActiveSubscription && !isExpired;
  
  // Debug logging
  console.log('useSubscription:', {
    userTier: user?.tier,
    subscriptionStatus: user?.subscriptionStatus,
    subscriptionEndDate: user?.subscriptionEndDate,
    isEnterprise,
    hasActiveSubscription,
    isExpired,
    finalActiveStatus
  });
  
  return {
    isEnterprise,
    isFree,
    tier,
    canUseAI: finalActiveStatus,
    hasActiveSubscription: finalActiveStatus,
  };
}

export function useFeatureAccess(featureName: string) {
  const subscription = useSubscription();
  
  // Define which features require enterprise subscription
  const enterpriseFeatures = [
    'ai-resume-builder',
    'ai-cover-letter',
    'ai-career-coach',
    'ai-interview-prep',
    'unlimited-resumes',
    'priority-support'
  ];
  
  const requiresEnterprise = enterpriseFeatures.includes(featureName);
  const hasAccess = !requiresEnterprise || subscription.isEnterprise;
  
  return {
    hasAccess,
    requiresEnterprise,
    subscription
  };
}