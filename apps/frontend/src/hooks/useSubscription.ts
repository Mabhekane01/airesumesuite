import { useAuthStore } from '../stores/authStore';

export interface SubscriptionStatus {
  isEnterprise: boolean;
  isPro: boolean;
  isFree: boolean;
  tier: string;
  canUseAI: boolean;
  hasActiveSubscription: boolean;
  credits: number;
  usage: {
    aiActions: number;
    exports: number;
  };
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuthStore();
  
  const tier = user?.tier || 'free';
  const isEnterprise = tier === 'enterprise';
  const isPro = tier === 'pro';
  const isFree = tier === 'free';
  
  // Check subscription status - must be 'active' for premium access
  const subscriptionStatus = user?.subscriptionStatus || user?.subscription_status;
  
  // Check if subscription has expired based on end date
  const subscriptionEndDate = user?.subscriptionEndDate || user?.subscription_end_date;
  const isExpired = subscriptionEndDate ? new Date(subscriptionEndDate) < new Date() : false;
  
  // User has an active subscription if they are Pro or Enterprise and not expired
  const hasActiveSubscription = (isPro || isEnterprise) && 
    subscriptionStatus === 'active' && 
    !isExpired;
  
  // Hybrid Model Access:
  // User can use AI if they have an active subscription OR they have credits
  const canUseAI = hasActiveSubscription || (user?.credits || 0) > 0;
  
  return {
    isEnterprise,
    isPro,
    isFree,
    tier,
    canUseAI,
    hasActiveSubscription,
    credits: user?.credits || 0,
    usage: {
      aiActions: user?.usage?.ai_actions_count || 0,
      exports: user?.usage?.resume_exports_count || 0
    }
  };
}

export function useFeatureAccess(featureName: string) {
  const subscription = useSubscription();
  
  // Define ALL AI features that require active subscription or credits
  const aiFeatures = [
    'ai-resume-builder',
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
  
  // For AI features, check canUseAI (hybrid check)
  // For non-AI features, allow access
  const hasAccess = !requiresSubscription || subscription.canUseAI;
  
  return {
    hasAccess,
    requiresSubscription,
    subscription,
    // Additional helper properties
    isBlocked: requiresSubscription && !subscription.canUseAI,
    blockReason: requiresSubscription && !subscription.canUseAI 
      ? 'This feature requires a subscription or AI credits.' 
      : null
  };
}