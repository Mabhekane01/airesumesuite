import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface UseRecaptchaOptions {
  siteKey: string;
  action?: string;
  size?: 'invisible' | 'compact' | 'normal';
  theme?: 'light' | 'dark';
  onLoad?: () => void;
  onError?: (error: any) => void;
}

interface UseRecaptchaReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  executeRecaptcha: (action?: string) => Promise<string | null>;
  resetRecaptcha: () => void;
}

export const useRecaptcha = (options: UseRecaptchaOptions): UseRecaptchaReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const { siteKey, action = 'signup', size = 'invisible', theme = 'light', onLoad, onError } = options;

  // Load reCAPTCHA script
  useEffect(() => {
    if (!siteKey) {
      setError('reCAPTCHA site key is required');
      return;
    }

    if (scriptLoadedRef.current || window.grecaptcha) {
      setIsLoaded(true);
      onLoad?.();
      return;
    }

    setIsLoading(true);
    setError(null);

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('📜 reCAPTCHA script loaded successfully');
      
      // Wait a bit for the script to initialize
      setTimeout(() => {
        if (window.grecaptcha) {
          scriptLoadedRef.current = true;
          setIsLoaded(true);
          setIsLoading(false);
          onLoad?.();
          console.log('✅ reCAPTCHA initialized and ready');
        } else {
          setError('reCAPTCHA script loaded but window.grecaptcha not available');
          setIsLoading(false);
          console.error('❌ reCAPTCHA script loaded but window.grecaptcha not available');
        }
      }, 500); // Wait 500ms for initialization
    };

    script.onerror = (err) => {
      const errorMsg = 'Failed to load reCAPTCHA script';
      console.error('❌', errorMsg, err);
      setError(errorMsg);
      setIsLoading(false);
      onError?.(err);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [siteKey, onLoad, onError]);

  const executeRecaptcha = async (customAction?: string): Promise<string | null> => {
    console.log('🔄 executeRecaptcha called:', {
      isLoaded,
      hasGrecaptcha: !!window.grecaptcha,
      siteKey,
      action: customAction || action
    });

    if (!isLoaded || !window.grecaptcha) {
      const errorMsg = `reCAPTCHA not loaded (isLoaded: ${isLoaded}, hasGrecaptcha: ${!!window.grecaptcha})`;
      console.error('❌', errorMsg);
      setError(errorMsg);
      return null;
    }

    try {
      setError(null);
      
      console.log('⏳ Waiting for reCAPTCHA ready...');
      
      // Add timeout for reCAPTCHA ready
      const readyPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA ready timeout'));
        }, 10000); // 10 second timeout
        
        window.grecaptcha.ready(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      await readyPromise;
      console.log('✅ reCAPTCHA ready, executing...');
      
      // Execute reCAPTCHA v3 with timeout
      const executePromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA execute timeout'));
        }, 10000); // 10 second timeout
        
        window.grecaptcha.execute(siteKey, {
          action: customAction || action
        }).then((token: string) => {
          clearTimeout(timeout);
          resolve(token);
        }).catch((err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      const token = await executePromise;

      console.log('✅ reCAPTCHA token generated:', {
        action: customAction || action,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 50)}...` : 'null'
      });

      return token;
    } catch (err: any) {
      const errorMessage = err.message || 'reCAPTCHA execution failed';
      setError(errorMessage);
      onError?.(err);
      console.error('❌ reCAPTCHA execution failed:', {
        error: err,
        message: errorMessage,
        siteKey,
        action: customAction || action
      });
      return null;
    }
  };

  const resetRecaptcha = () => {
    // reCAPTCHA v3 is invisible and doesn't need resetting
    // Only clear errors, don't call grecaptcha.reset() which is for v2
    setError(null);
    console.log('🧹 reCAPTCHA state cleared (v3 doesn\'t require reset)');
  };

  return {
    isLoaded,
    isLoading,
    error,
    executeRecaptcha,
    resetRecaptcha
  };
};

// Hook for reCAPTCHA v2 (checkbox/invisible)
export const useRecaptchaV2 = (options: UseRecaptchaOptions & { containerId?: string }) => {
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { siteKey, size = 'normal', theme = 'light', onLoad, onError, containerId } = options;

  useEffect(() => {
    if (!siteKey || !window.grecaptcha) return;

    const renderRecaptcha = () => {
      const container = containerId ? document.getElementById(containerId) : containerRef.current;
      
      if (!container) return;

      try {
        const id = window.grecaptcha.render(container, {
          sitekey: siteKey,
          size,
          theme,
          callback: (token: string) => {
            console.log('✅ reCAPTCHA v2 token received:', token.substring(0, 20) + '...');
          },
          'expired-callback': () => {
            console.warn('⚠️ reCAPTCHA v2 token expired');
          },
          'error-callback': (error: any) => {
            console.error('❌ reCAPTCHA v2 error:', error);
            onError?.(error);
          }
        });
        
        setWidgetId(id);
        onLoad?.();
      } catch (err) {
        console.error('❌ Failed to render reCAPTCHA v2:', err);
        onError?.(err);
      }
    };

    if (window.grecaptcha && window.grecaptcha.render) {
      renderRecaptcha();
    } else {
      window.grecaptcha?.ready(renderRecaptcha);
    }
  }, [siteKey, size, theme, onLoad, onError, containerId]);

  const getResponse = (): string | null => {
    if (widgetId !== null && window.grecaptcha) {
      return window.grecaptcha.getResponse(widgetId);
    }
    return null;
  };

  const resetV2 = () => {
    if (widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId);
    }
  };

  return {
    containerRef,
    widgetId,
    getResponse,
    reset: resetV2
  };
};

// Enterprise reCAPTCHA configuration
export const RECAPTCHA_CONFIG = {
  SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
  ACTIONS: {
    SIGNUP: 'signup',
    LOGIN: 'login',
    PASSWORD_RESET: 'password_reset',
    CONTACT: 'contact',
    NEWSLETTER: 'newsletter'
  },
  MINIMUM_SCORES: {
    SIGNUP: 0.7,
    LOGIN: 0.5,
    PASSWORD_RESET: 0.8,
    CONTACT: 0.3,
    NEWSLETTER: 0.4
  }
} as const;