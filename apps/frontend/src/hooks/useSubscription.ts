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
  
  return {
    isEnterprise,
    isFree,
    tier,
    canUseAI: isEnterprise,
    hasActiveSubscription: isEnterprise,
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