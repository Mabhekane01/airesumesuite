import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface UseSharedRecaptchaReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  executeRecaptcha: (action: string) => Promise<string | null>;
  resetRecaptcha: () => void;
}

// Global reCAPTCHA state to prevent multiple instances
let globalRecaptchaState = {
  isLoaded: false,
  isLoading: false,
  error: null as string | null,
  scriptElement: null as HTMLScriptElement | null,
  callbacks: new Set<() => void>(),
  errorCallbacks: new Set<(error: string) => void>(),
};

export const useSharedRecaptcha = (siteKey: string): UseSharedRecaptchaReturn => {
  const [isLoaded, setIsLoaded] = useState(globalRecaptchaState.isLoaded);
  const [isLoading, setIsLoading] = useState(globalRecaptchaState.isLoading);
  const [error, setError] = useState<string | null>(globalRecaptchaState.error);
  const mountedRef = useRef(true);

  console.log('🔍 useSharedRecaptcha hook initialized:', {
    siteKey,
    globalState: {
      isLoaded: globalRecaptchaState.isLoaded,
      isLoading: globalRecaptchaState.isLoading,
      error: globalRecaptchaState.error,
      hasScript: !!globalRecaptchaState.scriptElement
    },
    localState: { isLoaded, isLoading, error }
  });

  useEffect(() => {
    mountedRef.current = true;
    
    // Register callbacks for this component instance
    const onLoad = () => {
      if (mountedRef.current) {
        setIsLoaded(true);
        setIsLoading(false);
        setError(null);
      }
    };
    
    const onError = (errorMsg: string) => {
      if (mountedRef.current) {
        setError(errorMsg);
        setIsLoading(false);
      }
    };

    globalRecaptchaState.callbacks.add(onLoad);
    globalRecaptchaState.errorCallbacks.add(onError);

    // If reCAPTCHA is already loaded, call onLoad immediately
    if (globalRecaptchaState.isLoaded) {
      onLoad();
    } else if (!globalRecaptchaState.isLoading && !globalRecaptchaState.scriptElement) {
      // Only load script if not already loading/loaded
      console.log('🚀 Initializing shared reCAPTCHA for first time');
      initializeRecaptcha(siteKey);
    } else if (globalRecaptchaState.isLoading) {
      console.log('🔄 Shared reCAPTCHA already loading, waiting...');
      // Set loading state for this component too
      setIsLoading(true);
    }

    return () => {
      mountedRef.current = false;
      globalRecaptchaState.callbacks.delete(onLoad);
      globalRecaptchaState.errorCallbacks.delete(onError);
    };
  }, [siteKey]);

  const executeRecaptcha = async (action: string): Promise<string | null> => {
    console.log('🔄 Shared reCAPTCHA execution:', {
      action,
      isLoaded: globalRecaptchaState.isLoaded,
      hasGrecaptcha: !!window.grecaptcha,
      siteKey
    });

    if (!globalRecaptchaState.isLoaded || !window.grecaptcha) {
      const errorMsg = `reCAPTCHA not loaded (isLoaded: ${globalRecaptchaState.isLoaded}, hasGrecaptcha: ${!!window.grecaptcha})`;
      console.error('❌', errorMsg);
      return null;
    }

    try {
      console.log('⏳ Waiting for reCAPTCHA ready...');
      
      // Add timeout for reCAPTCHA ready
      const readyPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA ready timeout'));
        }, 10000);
        
        window.grecaptcha.ready(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      await readyPromise;
      console.log('✅ reCAPTCHA ready, executing action:', action);
      
      // Execute reCAPTCHA v3 with timeout
      const executePromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA execute timeout'));
        }, 10000);
        
        window.grecaptcha.execute(siteKey, { action }).then((token: string) => {
          clearTimeout(timeout);
          resolve(token);
        }).catch((err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      const token = await executePromise;

      console.log('✅ Shared reCAPTCHA token generated:', {
        action,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
      });

      return token;
    } catch (err: any) {
      const errorMessage = err.message || 'reCAPTCHA execution failed';
      console.error('❌ Shared reCAPTCHA execution failed:', {
        error: err,
        message: errorMessage,
        action,
        siteKey
      });
      return null;
    }
  };

  const resetRecaptcha = () => {
    // reCAPTCHA v3 is invisible and doesn't need resetting
    // Only clear errors
    if (mountedRef.current) {
      setError(null);
    }
    console.log('🧹 Shared reCAPTCHA state cleared (v3 doesn\'t require reset)');
  };

  return {
    isLoaded,
    isLoading,
    error,
    executeRecaptcha,
    resetRecaptcha
  };
};

function initializeRecaptcha(siteKey: string) {
  if (!siteKey) {
    const error = 'reCAPTCHA site key is required';
    globalRecaptchaState.error = error;
    globalRecaptchaState.errorCallbacks.forEach(callback => callback(error));
    return;
  }

  if (window.grecaptcha && globalRecaptchaState.isLoaded) {
    globalRecaptchaState.callbacks.forEach(callback => callback());
    return;
  }

  globalRecaptchaState.isLoading = true;
  globalRecaptchaState.error = null;
  
  console.log('🔄 Setting global reCAPTCHA loading state to true');

  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  script.defer = true;

  script.onload = () => {
    console.log('📜 Shared reCAPTCHA script loaded successfully');
    
    // Wait for initialization
    setTimeout(() => {
      if (window.grecaptcha) {
        globalRecaptchaState.isLoaded = true;
        globalRecaptchaState.isLoading = false;
        globalRecaptchaState.scriptElement = script;
        
        globalRecaptchaState.callbacks.forEach(callback => callback());
        console.log('✅ Shared reCAPTCHA initialized and ready');
      } else {
        const error = 'reCAPTCHA script loaded but window.grecaptcha not available';
        globalRecaptchaState.error = error;
        globalRecaptchaState.isLoading = false;
        globalRecaptchaState.errorCallbacks.forEach(callback => callback(error));
        console.error('❌', error);
      }
    }, 500);
  };

  script.onerror = (err) => {
    const errorMsg = 'Failed to load reCAPTCHA script';
    console.error('❌', errorMsg, err);
    globalRecaptchaState.error = errorMsg;
    globalRecaptchaState.isLoading = false;
    globalRecaptchaState.errorCallbacks.forEach(callback => callback(errorMsg));
  };

  document.head.appendChild(script);
  globalRecaptchaState.scriptElement = script;
}