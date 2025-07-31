// Paystack Frontend Service
// This service handles Paystack payments on the frontend

import { useAuthStore } from '../stores/authStore';

export interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  callback?: (response: PaystackResponse) => void;
  onClose?: () => void;
  metadata?: Record<string, any>;
  channels?: string[];
  label?: string;
  plan?: string;
  quantity?: number;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
}

export interface PaystackResponse {
  reference: string;
  status: string;
  message: string;
  trans: string;
  transaction: string;
  trxref: string;
  redirecturl?: string;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

class PaystackService {
  private publicKey: string;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.publicKey = import.meta.env.VITE_PAYSTACK_PUBLISHABLE_KEY || '';
    
    if (!this.publicKey) {
      console.error('❌ Paystack publishable key not found!');
      console.error('Please add VITE_PAYSTACK_PUBLISHABLE_KEY to your .env file');
      console.error('Example: VITE_PAYSTACK_PUBLISHABLE_KEY=pk_test_your_key_here');
    } else {
      const isTest = this.publicKey.startsWith('pk_test_');
      console.log(`✅ Paystack configured in ${isTest ? 'TEST' : 'LIVE'} mode`);
    }
  }

  // Helper method to get access token from auth store
  private getAccessToken(): string {
    console.log('Getting access token from auth store...');
    
    try {
      const authState = useAuthStore.getState();
      console.log('Auth state:', {
        hasUser: !!authState.user,
        isAuthenticated: authState.isAuthenticated,
        hasAccessToken: !!authState.accessToken,
        accessTokenLength: authState.accessToken?.length
      });
      
      const token = authState.accessToken;
      
      if (!token || token === 'undefined' || token === 'null') {
        console.error('No valid token found in auth store');
        throw new Error('No access token available. Please log in again.');
      }
      
      console.log('Token retrieved successfully:', token.substring(0, 30) + '...');
      return token;
    } catch (error) {
      console.error('Error getting token from auth store:', error);
      throw new Error('Failed to retrieve access token');
    }
  }

  // Load Paystack script dynamically
  private loadPaystackScript(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (this.isLoaded || window.PaystackPop) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Paystack script'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Initialize payment
  async initializePayment(config: Omit<PaystackConfig, 'key'>): Promise<void> {
    try {
      await this.loadPaystackScript();

      if (!window.PaystackPop) {
        throw new Error('Paystack script not loaded properly');
      }

      // Ensure callback is a proper function
      const paymentConfig: PaystackConfig = {
        key: this.publicKey,
        currency: 'ZAR',
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        ...config,
        // Only include callback if it's a valid function
        ...(config.callback && typeof config.callback === 'function' && {
          callback: config.callback
        }),
        ...(config.onClose && typeof config.onClose === 'function' && {
          onClose: config.onClose
        }),
      };

      // Validate required fields
      if (!paymentConfig.email || !paymentConfig.amount) {
        throw new Error('Email and amount are required for payment initialization');
      }

      // Additional validation
      if (!paymentConfig.key) {
        throw new Error('Paystack public key is required but not configured');
      }

      if (paymentConfig.callback && typeof paymentConfig.callback !== 'function') {
        throw new Error('Callback must be a valid function');
      }

      console.log('Initializing Paystack payment with config:', {
        key: paymentConfig.key ? 'SET' : 'MISSING',
        email: paymentConfig.email,
        amount: paymentConfig.amount,
        currency: paymentConfig.currency,
        hasCallback: typeof paymentConfig.callback === 'function',
        hasOnClose: typeof paymentConfig.onClose === 'function',
      });

      const handler = window.PaystackPop.setup(paymentConfig);
      handler.openIframe();

    } catch (error) {
      console.error('Paystack payment initialization failed:', error);
      throw error;
    }
  }

  // Generate reference
  generateReference(prefix: string = 'AIJS'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  // Verify payment (call backend endpoint)
  async verifyPayment(reference: string, planType: string): Promise<any> {
    try {
      const token = this.getAccessToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      console.log('Payment verification debug:', {
        reference,
        planType,
        token: token,
        tokenLength: token?.length,
        authHeader: `Bearer ${token}`
      });
      
      const response = await fetch(`${baseUrl}/api/payments/verify/${reference}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType }),
      });

      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If it's not JSON (e.g., 404 HTML page), create error object
        const text = await response.text();
        console.error('Non-JSON response from verification endpoint:', text);
        data = { 
          success: false, 
          message: `Verification endpoint returned ${response.status}: ${response.statusText}`,
          statusCode: response.status
        };
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Verification failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw error;
    }
  }

  // Create payment session (call backend)
  async createPaymentSession(paymentData: {
    planType: 'monthly' | 'yearly';
    paymentMethod: 'paystack';
    amount: number;
    currency: string;
    location?: any;
  }): Promise<any> {
    try {
      const token = this.getAccessToken();
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/payments/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment session');
      }

      return data;
    } catch (error) {
      console.error('Payment session creation failed:', error);
      throw error;
    }
  }

  // Process enterprise upgrade with inline payment
  async processEnterpriseUpgrade(
    planType: 'monthly' | 'yearly',
    amount: number,
    currency: string,
    userEmail: string,
    location?: any
  ): Promise<PaystackResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate inputs
        if (!this.publicKey) {
          reject(new Error('Paystack public key is not configured'));
          return;
        }

        if (!userEmail || !amount || amount <= 0) {
          reject(new Error('Invalid payment details'));
          return;
        }

        console.log('Processing enterprise upgrade:', {
          planType,
          amount,
          currency,
          userEmail,
          publicKeySet: !!this.publicKey
        });

        // Generate payment reference
        const reference = this.generateReference('ENTERPRISE');

        // Store planType in localStorage
        localStorage.setItem('selectedPlanType', planType);

        // Initialize Paystack payment
        await this.initializePayment({
          email: userEmail,
          amount: amount * 100, // Convert to kobo/cents
          currency,
          ref: reference,
          metadata: {
            planType,
            upgrade: 'enterprise',
            originalAmount: amount,
            location: location?.country || 'unknown',
          },
          callback: (response: PaystackResponse) => {
            console.log('Paystack callback received:', response);
            try {
              if (response.status === 'success') {
                // Verify payment on backend (don't await here to avoid async callback issues)
                this.verifyPayment(response.reference, planType)
                  .then((verification) => {
                    if (verification.success) {
                      console.log('Payment verification successful');
                      resolve(response);
                    } else {
                      console.error('Payment verification failed:', verification);
                      reject(new Error('Payment verification failed'));
                    }
                  })
                  .catch((error) => {
                    console.error('Payment verification error:', error);
                    reject(error);
                  });
              } else {
                console.error('Payment failed:', response);
                reject(new Error(response.message || 'Payment failed'));
              }
            } catch (error) {
              console.error('Callback error:', error);
              reject(error);
            }
          },
          onClose: () => {
            reject(new Error('Payment cancelled by user'));
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get supported currencies
  getSupportedCurrencies(): string[] {
    return ['ZAR', 'USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'UGX', 'TZS'];
  }

  // Get supported payment channels
  getSupportedChannels(): string[] {
    return ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];
  }

  // Format amount for display
  formatAmount(amount: number, currency: string = 'ZAR'): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // Check if Paystack is available
  isAvailable(): boolean {
    return !!this.publicKey;
  }

  // Get environment info
  getEnvironmentInfo(): { 
    isTest: boolean; 
    publicKey: string; 
    environment: string; 
  } {
    const isTest = this.publicKey.startsWith('pk_test_');
    const environment = isTest ? 'test' : 'live';
    
    return {
      isTest,
      publicKey: this.publicKey,
      environment,
    };
  }

  // Check subscription status from backend
  async checkSubscriptionStatus(): Promise<any> {
    try {
      const token = this.getAccessToken();
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/payments/subscription/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check subscription status');
      }

      return data;
    } catch (error) {
      console.error('Subscription status check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
export default paystackService;