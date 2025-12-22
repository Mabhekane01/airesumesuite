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
  
  // Check subscription status - must be 'active' for AI access
  const subscriptionStatus = user?.subscriptionStatus || user?.subscription_status;
  
  // Check if subscription has expired based on end date
  const subscriptionEndDate = user?.subscriptionEndDate || user?.subscription_end_date;
  const isExpired = subscriptionEndDate ? new Date(subscriptionEndDate) < new Date() : false;
  
  // User has AI access ONLY if:
  // 1. Has enterprise tier AND
  // 2. Has active subscription status AND  
  // 3. Subscription hasn't expired
  const hasActiveSubscription = isEnterprise && 
    subscriptionStatus === 'active' && 
    !isExpired;
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 useSubscription debug:', {
      userTier: user?.tier,
      subscriptionStatus,
      subscriptionEndDate,
      isEnterprise,
      isExpired,
      hasActiveSubscription,
      canUseAI: hasActiveSubscription
    });
  }
  
  return {
    isEnterprise,
    isFree,
    tier,
    canUseAI: hasActiveSubscription,
    hasActiveSubscription,
  };
}

export function useFeatureAccess(featureName: string) {
  const subscription = useSubscription();
  
  // Define ALL AI features that require active enterprise subscription
  const aiFeatures = [
    'ai-resume-builder',
    'ai-cover-letter', 
    'ai-career-coach',
    'ai-interview-prep',
    'ai-job-matching',
    'ai-optimization',
    'ai-enhancement',
    'ai-analysis',
    'ai-parsing',
    'ai-generation',
    'unlimited-resumes',
    'priority-support',
    'advanced-analytics'
  ];
  
  const requiresSubscription = aiFeatures.includes(featureName);
  
  // For AI features, check canUseAI (strict subscription check)
  // For non-AI features, allow access
  const hasAccess = !requiresSubscription || subscription.canUseAI;
  
  return {
    hasAccess,
    requiresSubscription,
    subscription,
    // Additional helper properties
    isBlocked: requiresSubscription && !subscription.canUseAI,
    blockReason: requiresSubscription && !subscription.canUseAI 
      ? 'This AI feature requires an active Enterprise subscription' 
      : null
  };
}