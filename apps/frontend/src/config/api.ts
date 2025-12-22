// Centralized API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/v1/auth/login',
      REGISTER: '/api/v1/auth/register',
      LOGOUT: '/api/v1/auth/logout',
      REFRESH: '/api/v1/auth/refresh',
      PROFILE: '/api/v1/auth/profile',
      SEND_REGISTRATION_OTP: '/api/v1/auth/send-registration-otp',
      VERIFY_REGISTRATION_OTP: '/api/v1/auth/verify-registration-otp',
      RESEND_REGISTRATION_OTP: '/api/v1/auth/resend-registration-otp',
      VERIFY_OTP: '/api/v1/auth/verify-otp',
      RESEND_OTP: '/api/v1/auth/resend-otp',
      GOOGLE: '/api/v1/auth/google',
    },
    PAYMENTS: {
      CREATE_SESSION: '/api/payments/create-session',
      WEBHOOK: '/api/payments/webhook',
      SUBSCRIPTION_STATUS: '/api/payments/subscription/status',
      CANCEL_SUBSCRIPTION: '/api/payments/subscription/cancel',
      PAYMENT_HISTORY: '/api/payments/payment-history',
      VERIFY_PAYMENT: '/api/payments/verify',
    },
    CURRENCIES: {
      BASE: '/api/v1/currencies',
      BY_COUNTRY: '/api/v1/currencies/country',
    }
  }
};

// Helper function to build full URL
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Helper function for making authenticated requests
export async function makeAuthenticatedRequest(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');
  
  return fetch(buildApiUrl(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}