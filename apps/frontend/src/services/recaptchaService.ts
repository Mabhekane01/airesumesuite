/**
 * Enterprise reCAPTCHA Service
 * 
 * Singleton service that manages reCAPTCHA v3 globally across the entire application.
 * Handles script loading, token generation, and prevents multiple instance conflicts.
 * 
 * Features:
 * - Single global reCAPTCHA instance
 * - Dynamic action support (login, signup, etc.)
 * - Proper error handling and retries
 * - Enterprise-grade logging and monitoring
 * - Automatic cleanup and memory management
 */

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface RecaptchaConfig {
  SITE_KEY: string;
  actions: {
    LOGIN: string;
    SIGNUP: string;
    PASSWORD_RESET: string;
    CONTACT: string;
  };
}

interface RecaptchaExecutionResult {
  success: boolean;
  token?: string;
  error?: string;
  action?: string;
  score?: number;
}

class EnterpriseRecaptchaService {
  private static instance: EnterpriseRecaptchaService;
  private siteKey: string = '';
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private scriptElement: HTMLScriptElement | null = null;
  private initializationPromise: Promise<void> | null = null;
  private pendingCallbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: string) => void> = [];

  // Enterprise configuration
  private readonly SCRIPT_TIMEOUT = 15000; // 15 seconds
  private readonly EXECUTION_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor() {
    console.log('🏢 Enterprise reCAPTCHA Service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnterpriseRecaptchaService {
    if (!EnterpriseRecaptchaService.instance) {
      EnterpriseRecaptchaService.instance = new EnterpriseRecaptchaService();
    }
    return EnterpriseRecaptchaService.instance;
  }

  /**
   * Initialize reCAPTCHA service with site key
   */
  public async initialize(siteKey: string): Promise<void> {
    if (!siteKey) {
      throw new Error('reCAPTCHA site key is required');
    }

    this.siteKey = siteKey;

    // Return existing initialization promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized && window.grecaptcha) {
      return Promise.resolve();
    }

    console.log('🚀 Initializing Enterprise reCAPTCHA Service...');

    this.initializationPromise = this.loadRecaptchaScript();
    return this.initializationPromise;
  }

  /**
   * Load reCAPTCHA script with enterprise error handling
   */
  private async loadRecaptchaScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
      if (existingScript && window.grecaptcha) {
        console.log('✅ reCAPTCHA script already loaded');
        this.isInitialized = true;
        this.notifyCallbacks();
        resolve();
        return;
      }

      this.isInitializing = true;

      // Create script element
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.handleScriptError('reCAPTCHA script loading timeout');
        reject(new Error('reCAPTCHA script loading timeout'));
      }, this.SCRIPT_TIMEOUT);

      // Success handler
      script.onload = () => {
        clearTimeout(timeout);
        console.log('📜 reCAPTCHA script loaded successfully');

        // Wait for grecaptcha to be available
        this.waitForGrecaptcha()
          .then(() => {
            this.isInitialized = true;
            this.isInitializing = false;
            this.scriptElement = script;
            this.notifyCallbacks();
            console.log('✅ Enterprise reCAPTCHA fully initialized');
            resolve();
          })
          .catch((error) => {
            this.handleScriptError(error.message);
            reject(error);
          });
      };

      // Error handler
      script.onerror = () => {
        clearTimeout(timeout);
        const error = 'Failed to load reCAPTCHA script';
        this.handleScriptError(error);
        reject(new Error(error));
      };

      // Add script to document
      document.head.appendChild(script);
    });
  }

  /**
   * Wait for grecaptcha to be available with timeout
   */
  private async waitForGrecaptcha(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('grecaptcha initialization timeout'));
      }, 5000);

      const checkGrecaptcha = () => {
        if (window.grecaptcha) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkGrecaptcha, 100);
        }
      };

      checkGrecaptcha();
    });
  }

  /**
   * Execute reCAPTCHA with enterprise features
   */
  public async executeRecaptcha(action: string, retryCount: number = 0): Promise<RecaptchaExecutionResult> {
    console.log(`🔄 Enterprise reCAPTCHA execution attempt ${retryCount + 1}:`, {
      action,
      isInitialized: this.isInitialized,
      hasGrecaptcha: !!window.grecaptcha
    });

    // Ensure service is initialized
    if (!this.isInitialized || !window.grecaptcha) {
      const error = 'reCAPTCHA service not initialized';
      console.error('❌', error);
      return { success: false, error };
    }

    try {
      // Wait for reCAPTCHA to be ready
      await this.waitForRecaptchaReady();

      // Execute with timeout
      const token = await this.executeWithTimeout(action);

      console.log('✅ Enterprise reCAPTCHA token generated:', {
        action,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
      });

      return {
        success: true,
        token,
        action
      };

    } catch (error: any) {
      const errorMessage = error.message || 'reCAPTCHA execution failed';
      console.error('❌ Enterprise reCAPTCHA execution failed:', {
        error: errorMessage,
        action,
        retryCount
      });

      // Retry logic for enterprise resilience
      if (retryCount < this.MAX_RETRIES) {
        console.log(`🔄 Retrying reCAPTCHA execution (${retryCount + 1}/${this.MAX_RETRIES})...`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return this.executeRecaptcha(action, retryCount + 1);
      }

      return {
        success: false,
        error: errorMessage,
        action
      };
    }
  }

  /**
   * Wait for reCAPTCHA ready with timeout
   */
  private async waitForRecaptchaReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('reCAPTCHA ready timeout'));
      }, this.EXECUTION_TIMEOUT);

      window.grecaptcha.ready(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Execute reCAPTCHA with timeout
   */
  private async executeWithTimeout(action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('reCAPTCHA execution timeout'));
      }, this.EXECUTION_TIMEOUT);

      window.grecaptcha.execute(this.siteKey, { action })
        .then((token: string) => {
          clearTimeout(timeout);
          resolve(token);
        })
        .catch((error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Register callback for initialization
   */
  public onReady(callback: () => void): void {
    if (this.isInitialized) {
      callback();
    } else {
      this.pendingCallbacks.push(callback);
    }
  }

  /**
   * Register error callback
   */
  public onError(callback: (error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isInitialized: boolean;
    isInitializing: boolean;
    hasScript: boolean;
    hasGrecaptcha: boolean;
    siteKey: string;
  } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      hasScript: !!this.scriptElement,
      hasGrecaptcha: !!window.grecaptcha,
      siteKey: this.siteKey
    };
  }

  /**
   * Reset service (for testing or error recovery)
   */
  public reset(): void {
    console.log('🔄 Resetting Enterprise reCAPTCHA Service...');
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    this.pendingCallbacks = [];
    this.errorCallbacks = [];

    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
      this.scriptElement = null;
    }
  }

  /**
   * Notify all pending callbacks
   */
  private notifyCallbacks(): void {
    this.pendingCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in reCAPTCHA callback:', error);
      }
    });
    this.pendingCallbacks = [];
  }

  /**
   * Handle script loading errors
   */
  private handleScriptError(error: string): void {
    console.error('❌ reCAPTCHA script error:', error);
    this.isInitializing = false;
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in reCAPTCHA error callback:', callbackError);
      }
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const enterpriseRecaptchaService = EnterpriseRecaptchaService.getInstance();

// Export configuration
export const RECAPTCHA_CONFIG: RecaptchaConfig = {
  SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
  actions: {
    LOGIN: 'login',
    SIGNUP: 'signup',
    PASSWORD_RESET: 'password_reset',
    CONTACT: 'contact'
  }
};

// Initialize service immediately if site key is available
if (RECAPTCHA_CONFIG.SITE_KEY) {
  enterpriseRecaptchaService.initialize(RECAPTCHA_CONFIG.SITE_KEY)
    .then(() => {
      console.log('🏢 Enterprise reCAPTCHA Service auto-initialized');
    })
    .catch((error) => {
      console.error('❌ Enterprise reCAPTCHA Service auto-initialization failed:', error);
    });
}