import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSubscription } from './useSubscription';

interface SubscriptionModalOptions {
  featureName?: string;
  title?: string;
  description?: string;
  showToast?: boolean;
}

export function useSubscriptionModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState<SubscriptionModalOptions>({});
  const subscription = useSubscription();

  const checkFeatureAccess = useCallback((
    featureName: string, 
    options: SubscriptionModalOptions = {}
  ): boolean => {
    // If user has access, allow the action
    if (subscription.canUseAI) {
      return true;
    }

    // If user doesn't have access, show modal or toast
    const {
      title = 'Enterprise Feature',
      description = `${featureName} requires an active Enterprise subscription`,
      showToast = false
    } = options;

    if (showToast) {
      toast.error(description, {
        description: 'Upgrade to Enterprise to unlock AI features',
        action: {
          label: 'Upgrade',
          onClick: () => {
            setModalProps({ featureName, title, description });
            setIsModalOpen(true);
          }
        }
      });
    } else {
      setModalProps({ featureName, title, description });
      setIsModalOpen(true);
    }

    return false;
  }, [subscription.canUseAI]);

  const checkAIFeature = useCallback((featureName: string) => {
    return checkFeatureAccess(featureName, {
      title: 'AI Feature Restricted',
      description: `${featureName.replace('-', ' ')} is an AI-powered feature that requires an Enterprise subscription.`
    });
  }, [checkFeatureAccess]);

  const showModal = useCallback((options: SubscriptionModalOptions = {}) => {
    setModalProps(options);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalProps({});
  }, []);

  return {
    // Modal state
    isModalOpen,
    modalProps,
    
    // Actions
    checkFeatureAccess,
    checkAIFeature,
    showModal,
    closeModal,
    
    // Subscription info
    subscription
  };
}