import { toast } from 'sonner';

export interface SubscriptionError extends Error {
  isSubscriptionError?: boolean;
  code?: string;
  featureName?: string;
  upgradeUrl?: string;
}

/**
 * Wrapper for API calls that may require subscription
 * Automatically handles subscription errors with user-friendly messages
 */
export async function callWithSubscriptionCheck<T>(
  apiCall: () => Promise<T>,
  options: {
    featureName?: string;
    onSubscriptionRequired?: (error: SubscriptionError) => void;
    showToast?: boolean;
  } = {}
): Promise<T | null> {
  
  const { 
    featureName = 'AI feature',
    onSubscriptionRequired,
    showToast = true 
  } = options;

  try {
    return await apiCall();
  } catch (error) {
    // Check if it's a subscription error
    if ((error as SubscriptionError).isSubscriptionError) {
      const subscriptionError = error as SubscriptionError;
      
      if (showToast) {
        toast.error('Subscription Required', {
          description: subscriptionError.message || `${featureName} requires an Enterprise subscription`,
          action: {
            label: 'Upgrade Now',
            onClick: () => {
              window.location.href = '/dashboard/upgrade';
            }
          },
          duration: 8000
        });
      }
      
      // Call custom handler if provided
      if (onSubscriptionRequired) {
        onSubscriptionRequired(subscriptionError);
      }
      
      return null;
    }
    
    // Re-throw non-subscription errors
    throw error;
  }
}

/**
 * Helper to create a subscription-aware button click handler
 */
export function createSubscriptionHandler(
  handler: () => void | Promise<void>,
  options: {
    featureName?: string;
    checkAccess?: () => boolean;
    onBlocked?: () => void;
  } = {}
) {
  return async () => {
    const { featureName = 'feature', checkAccess, onBlocked } = options;
    
    // If access check is provided and fails, block the action
    if (checkAccess && !checkAccess()) {
      if (onBlocked) {
        onBlocked();
      } else {
        toast.error('Subscription Required', {
          description: `${featureName} requires an Enterprise subscription`,
          action: {
            label: 'Upgrade Now',
            onClick: () => {
              window.location.href = '/dashboard/upgrade';
            }
          }
        });
      }
      return;
    }
    
    // Execute the handler
    try {
      await handler();
    } catch (error) {
      // Handle subscription errors from API calls
      if ((error as SubscriptionError).isSubscriptionError) {
        const subscriptionError = error as SubscriptionError;
        toast.error('Subscription Required', {
          description: subscriptionError.message,
          action: {
            label: 'Upgrade Now',
            onClick: () => {
              window.location.href = '/dashboard/upgrade';
            }
          }
        });
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  };
}