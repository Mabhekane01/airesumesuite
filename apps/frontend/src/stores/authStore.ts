import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { locationService, LocationData } from '../services/locationService';
import { INotification } from '../types';
import { storageUtils } from '../utils/storageUtils';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  provider: 'local' | 'google';
  isEmailVerified: boolean;
  tier: 'free' | 'enterprise';
  role: 'user' | 'admin';
  subscriptionStatus?: 'active' | 'cancelled' | 'expired' | 'past_due';
  subscription_status?: 'active' | 'cancelled' | 'expired' | 'past_due';
  subscriptionEndDate?: string;
  subscription_end_date?: string;
  subscriptionStartDate?: string;
  subscriptionPlanType?: 'monthly' | 'yearly';
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  cancelAtPeriodEnd?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginNotification: INotification | null;
  redirectAfterLogin: string | null;
  
  // OTP verification state
  requiresOTPVerification: boolean;
  pendingVerificationEmail: string | null;
  
  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setRedirectAfterLogin: (url: string | null) => void;
  login: (email: string, password: string, location?: any, recaptchaToken?: string) => Promise<void>;
  sendRegistrationOTP: (data: RegisterData) => Promise<void>;
  verifyRegistrationOTP: (email: string, otp: string) => Promise<void>;
  resendRegistrationOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string, location?: any) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
  clearOTPState: () => void;
  googleLogin: () => void;
  refreshUserProfile: () => Promise<void>;
  clearLoginNotification: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  recaptchaToken?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginNotification: null,
      redirectAfterLogin: null,
      
      // OTP verification state
      requiresOTPVerification: false,
      pendingVerificationEmail: null,

      setTokens: (accessToken: string, refreshToken: string) => {
        // Store in zustand state
        set({ 
          accessToken, 
          refreshToken, 
          isAuthenticated: true,
          error: null 
        });
        
        // Also store in localStorage for backward compatibility with existing services
        localStorage.setItem('token', accessToken);
        localStorage.setItem('authToken', accessToken);
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      setRedirectAfterLogin: (url: string | null) => {
        set({ redirectAfterLogin: url });
      },

      login: async (email: string, password: string, location?: LocationData, recaptchaToken?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Get location data if not provided
          let locationData = location;
          if (!locationData) {
            try {
              locationData = await locationService.getLocationForLogin();
              console.log('🌍 Location detected for login:', locationData);
            } catch (locationError) {
              console.warn('Location detection failed during login:', locationError);
              locationData = null;
            }
          }

          const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, location: locationData, recaptchaToken }),
          });

          const data = await response.json();
          console.log('🔍 Login response data:', data);

          if (!response.ok) {
            throw new Error(data.message || 'Login failed');
          }

          // Login successful
          console.log('🔍 Auth Store: Setting login data:', {
            hasUser: !!data.user,
            hasAccessToken: !!data.accessToken,
            hasRefreshToken: !!data.refreshToken,
            accessTokenPreview: data.accessToken ? data.accessToken.substring(0, 20) + '...' : 'NULL'
          });
          
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requiresOTPVerification: false,
            pendingVerificationEmail: null,
            loginNotification: data.loginNotification || null,
          });
          
          // Also store in localStorage for backward compatibility
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('authToken', data.accessToken);
          
          console.log('✅ Auth Store: Login state updated successfully');
          
          // Refresh user profile to get latest subscription status
          try {
            await get().refreshUserProfile();
            console.log('✅ User profile refreshed after login');
          } catch (profileError) {
            console.warn('⚠️ Failed to refresh user profile after login:', profileError);
          }
          
        } catch (error: any) {
          console.error('🚨 Auth Store Login Error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          
          throw error;
        }
      },

      sendRegistrationOTP: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          // Get location data for registration
          let locationData = null;
          try {
            locationData = await locationService.getLocationForLogin();
            console.log('🌍 Location detected for registration:', locationData);
          } catch (locationError) {
            console.warn('Location detection failed during registration:', locationError);
          }

          const requestBody = { ...data, location: locationData };
          
          console.log('🌐 Making registration OTP request:', {
            url: `${API_BASE}/api/v1/auth/send-registration-otp`,
            body: {
              ...requestBody,
              password: '[HIDDEN]',
              recaptchaToken: requestBody.recaptchaToken ? `${requestBody.recaptchaToken.substring(0, 20)}...` : 'MISSING'
            }
          });
          
          const response = await fetch(`${API_BASE}/api/v1/auth/send-registration-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Failed to send verification code');
          }

          // OTP sent successfully
          set({
            isLoading: false,
            error: null,
            requiresOTPVerification: true,
            pendingVerificationEmail: result.email,
          });

          console.log('📧 Registration OTP sent successfully');
          return result;
        } catch (error) {
          console.error('🚨 Auth Store Registration OTP Error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to send verification code',
          });
          throw error;
        }
      },

      verifyRegistrationOTP: async (email: string, otp: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/verify-registration-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Verification failed');
          }

          // Registration complete - user is now logged in
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requiresOTPVerification: false,
            pendingVerificationEmail: null,
          });
          
          // Also store in localStorage for backward compatibility
          localStorage.setItem('token', result.accessToken);
          localStorage.setItem('authToken', result.accessToken);

          console.log('✅ Registration completed successfully');
          return result;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Verification failed',
          });
          throw error;
        }
      },

      resendRegistrationOTP: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/resend-registration-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Failed to resend verification code');
          }

          set({
            isLoading: false,
            error: null,
          });

          return result;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to resend verification code',
          });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken, accessToken, user } = get();
        
        try {
          if (refreshToken && accessToken) {
            await fetch(`${API_BASE}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ refreshToken }),
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear all user-related storage (auth + resume data + preferences)
          storageUtils.clearAllUserStorage(user?.id);
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      logoutAll: async () => {
        const { accessToken, user } = get();
        
        try {
          if (accessToken) {
            await fetch(`${API_BASE}/api/v1/auth/logout-all`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
          }
        } catch (error) {
          console.error('Logout all error:', error);
        } finally {
          // Clear all user-related storage (auth + resume data + preferences)
          storageUtils.clearAllUserStorage(user?.id);
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Token refresh failed');
          }

          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            error: null,
          });
          
          // Update localStorage tokens
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('authToken', data.accessToken);
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Token refresh failed',
          });
          throw error;
        }
      },

      verifyOTP: async (email: string, otp: string, location?: any) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/verify-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp, location }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'OTP verification failed');
          }

          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requiresOTPVerification: false,
            pendingVerificationEmail: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'OTP verification failed',
          });
          throw error;
        }
      },

      resendOTP: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/resend-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Failed to resend verification code');
          }

          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to resend verification code',
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      clearOTPState: () => {
        set({ 
          requiresOTPVerification: false, 
          pendingVerificationEmail: null 
        });
      },

      googleLogin: () => {
        const { redirectAfterLogin } = get();
        const url = new URL(`${API_BASE}/api/v1/auth/google`);
        
        // Add redirect URL as a parameter if it exists
        if (redirectAfterLogin) {
          url.searchParams.set('redirect', redirectAfterLogin);
        }
        
        window.location.href = url.toString();
      },

      refreshUserProfile: async () => {
        const { accessToken } = get();
        
        console.log('Refreshing user profile...');
        
        if (!accessToken) {
          throw new Error('No access token available');
        }

        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();
          console.log('Profile response:', data);

          if (!response.ok) {
            throw new Error(data.message || 'Failed to refresh profile');
          }

          console.log('Updating user state with:', {
            tier: data.user?.tier,
            subscriptionStatus: data.user?.subscription_status
          });

          set({ user: data.user });
          
          console.log('User state updated successfully');
        } catch (error) {
          console.error('Failed to refresh user profile:', error);
          throw error;
        }
      },
      clearLoginNotification: () => {
        set({ loginNotification: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate auth store:', error);
          localStorage.removeItem('auth-storage');
        } else if (state?.accessToken) {
          localStorage.setItem('token', state.accessToken);
          localStorage.setItem('authToken', state.accessToken);
        }
      },
      merge: (persistedState, currentState) => {
        try {
          if (!persistedState || typeof persistedState !== 'object') {
            console.warn('Invalid persisted state, using defaults');
            return currentState;
          }
          
          return {
            ...currentState,
            ...persistedState,
          };
        } catch (error) {
          console.error('Error merging persisted state:', error);
          return currentState;
        }
      },
    }
  )
);