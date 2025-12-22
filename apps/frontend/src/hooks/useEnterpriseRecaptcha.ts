import { useState, useEffect, useCallback } from 'react';
import { enterpriseRecaptchaService, RECAPTCHA_CONFIG } from '../services/recaptchaService';

interface UseEnterpriseRecaptchaReturn {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  executeRecaptcha: (action: string) => Promise<string | null>;
  getStatus: () => any;
}

/**
 * Enterprise reCAPTCHA React Hook
 * 
 * Uses the singleton reCAPTCHA service to provide a consistent interface
 * across all components without conflicts or multiple instances.
 */
export const useEnterpriseRecaptcha = (): UseEnterpriseRecaptchaReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔌 useEnterpriseRecaptcha hook mounted');

    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize the service
        await enterpriseRecaptchaService.initialize(RECAPTCHA_CONFIG.SITE_KEY);
        
        // Set up ready callback
        enterpriseRecaptchaService.onReady(() => {
          console.log('✅ Enterprise reCAPTCHA ready in hook');
          setIsReady(true);
          setIsLoading(false);
        });

        // Set up error callback
        enterpriseRecaptchaService.onError((errorMessage) => {
          console.error('❌ Enterprise reCAPTCHA error in hook:', errorMessage);
          setError(errorMessage);
          setIsLoading(false);
        });

        // Check if already ready
        const status = enterpriseRecaptchaService.getStatus();
        if (status.isInitialized) {
          setIsReady(true);
          setIsLoading(false);
        }

      } catch (initError: any) {
        console.error('❌ Failed to initialize enterprise reCAPTCHA:', initError);
        setError(initError.message || 'reCAPTCHA initialization failed');
        setIsLoading(false);
      }
    };

    initializeService();

    // Cleanup function
    return () => {
      console.log('🔌 useEnterpriseRecaptcha hook unmounted');
    };
  }, []);

  /**
   * Execute reCAPTCHA with enterprise features
   */
  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    console.log('🚀 Executing enterprise reCAPTCHA:', { action, isReady });

    if (!isReady) {
      console.error('❌ reCAPTCHA not ready for execution');
      return null;
    }

    try {
      const result = await enterpriseRecaptchaService.executeRecaptcha(action);
      
      if (result.success && result.token) {
        return result.token;
      } else {
        console.error('❌ reCAPTCHA execution failed:', result.error);
        setError(result.error || 'Execution failed');
        return null;
      }
    } catch (error: any) {
      console.error('❌ reCAPTCHA execution error:', error);
      setError(error.message || 'Execution error');
      return null;
    }
  }, [isReady]);

  /**
   * Get service status for debugging
   */
  const getStatus = useCallback(() => {
    return {
      hookState: { isReady, isLoading, error },
      serviceStatus: enterpriseRecaptchaService.getStatus()
    };
  }, [isReady, isLoading, error]);

  return {
    isReady,
    isLoading,
    error,
    executeRecaptcha,
    getStatus
  };
};