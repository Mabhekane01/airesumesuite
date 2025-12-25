import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { storageUtils } from '../utils/storageUtils';

// Intelligent base URL selection
const getBaseUrl = () => {
  // Always prioritize the environment variable provided during build
  const envUrl = (import.meta as any).env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  // Development fallback
  return 'http://localhost:3001';
};

const API_BASE_URL = getBaseUrl();

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 120000, // Increased to 120 seconds for AI operations and job URL scraping
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/check-email',
  '/auth/send-registration-otp',
  '/auth/verify-registration-otp',
  '/auth/resend-registration-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google',
  '/auth/status',
  '/coach/health',
  '/resumes/latex-templates'
];

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Ensure config and headers exist
    if (!config) {
      console.error('Request config is undefined');
      return config;
    }
    
    if (!config.headers) {
      config.headers = {} as any;
    }

    // Check if this is a public endpoint
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      config.url?.includes(endpoint)
    );

    if (isPublicEndpoint) {
      return config;
    }

    // Try to get token from auth store first (Zustand persist)
    let token = null;
    const authData = storageUtils.safeGetJson('auth-storage');
    if (authData && authData.state && authData.state.accessToken) {
      token = authData.state.accessToken;
    }

    // Fallback to legacy authToken storage
    if (!token) {
      try {
        token = localStorage.getItem('authToken');
      } catch (error) {
        console.warn('Failed to get legacy auth token:', error);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor for error handling with automatic token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Enhanced error logging for debugging
    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    // If there's no config object, it means the error occurred before the request was sent
    if (!originalRequest) {
      console.error('No request configuration available, rejecting error');
      return Promise.reject(error);
    }

    // Check if the original request was for a public endpoint.
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
      originalRequest.url?.includes(endpoint)
    );

    // Handle 401 errors with token refresh, but NOT for public endpoints
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry the original request with new token
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get auth store data
        const authStorageData = localStorage.getItem('auth-storage');
        let refreshToken = null;

        if (authStorageData) {
          try {
            const authData = JSON.parse(authStorageData);
            // Ensure authData is a valid object before accessing properties
            if (authData && typeof authData === 'object' && authData.state) {
              refreshToken = authData.state.refreshToken;
              console.log('Token refresh attempt - found refresh token:', !!refreshToken);
            } else {
              console.warn('Invalid auth data structure');
            }
          } catch (parseError) {
            console.warn('Failed to parse auth storage, clearing corrupted data:', parseError);
            try {
              localStorage.removeItem('auth-storage');
            } catch (cleanupError) {
              console.warn('Failed to clean up corrupted storage:', cleanupError);
            }
          }
        } else {
          console.warn('No auth storage data found');
        }

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token (use raw axios to avoid circular dependency)
        const refreshResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken
        });

        if (refreshResponse.data.accessToken && refreshResponse.data.refreshToken) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;
          
          console.log('Token refresh successful - updating storage and retrying request');
          
          // Update auth storage
          let existingAuthData = {};
          try {
            if (authStorageData) {
              existingAuthData = JSON.parse(authStorageData);
            }
          } catch (parseError) {
            console.warn('Failed to parse existing auth data, creating new:', parseError);
            existingAuthData = {};
          }

          const updatedAuthData = {
            state: {
              ...(existingAuthData as any)?.state || {},
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              isAuthenticated: true
            }
          };
          localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData));
          
          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          isRefreshing = false;

          // Retry the original request
          return api(originalRequest);
        } else {
          console.warn('Token refresh response missing tokens:', refreshResponse.data);
          throw new Error('Token refresh failed - invalid response format');
        }
      } catch (refreshError: any) {
        console.error('Token refresh failed:', refreshError?.response?.data || refreshError.message);
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear all auth data and redirect to login
        storageUtils.clearAuthStorage();
        
        console.warn('Token refresh failed - redirecting to login');
        
        // Only redirect if not already on public routes like landing page or templates page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && currentPath !== '/' && !currentPath.includes('/templates')) {
          window.location.href = '/';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle subscription errors (403 with subscription codes)
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      const subscriptionCodes = [
        'SUBSCRIPTION_REQUIRED',
        'AI_FEATURE_SUBSCRIPTION_REQUIRED', 
        'FEATURE_SUBSCRIPTION_REQUIRED'
      ];
      
      if ((errorData as any)?.code && subscriptionCodes.includes((errorData as any).code)) {
        console.warn('🔒 Subscription required error:', {
          feature: (errorData as any).data?.feature,
          message: (errorData as any).message,
          upgradeUrl: (errorData as any).data?.upgradeUrl
        });
        
        // Enhance error with subscription info for frontend handling
        const subscriptionError = new Error((errorData as any).message || 'Subscription required');
        (subscriptionError as any).isSubscriptionError = true;
        (subscriptionError as any).code = (errorData as any).code;
        (subscriptionError as any).featureName = (errorData as any).data?.feature;
        (subscriptionError as any).upgradeUrl = (errorData as any).data?.upgradeUrl;
        
        return Promise.reject(subscriptionError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    const response = await api.post('/auth/check-email', { email });
    return response.data;
  },

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      user: any;
      tokens: {
        access: string;
        refresh: string;
      };
    };
  }> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async login(email: string, password: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      user: any;
      tokens: {
        access: string;
        refresh: string;
      };
    };
  }> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    data?: {
      tokens: {
        access: string;
        refresh: string;
      };
    };
  }> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async googleAuth(code: string): Promise<{
    success: boolean;
    data?: {
      user: any;
      tokens: {
        access: string;
        refresh: string;
      };
    };
  }> {
    const response = await api.post('/auth/google', { code });
    return response.data;
  },
};

// User Profile API
export const profileAPI = {
  async getProfile(): Promise<{
    success: boolean;
    data?: {
      profile: any;
    };
  }> {
    const response = await api.get('/profiles/me');
    return response.data;
  },

  async createProfile(profileData: any): Promise<{
    success: boolean;
    data?: {
      profile: any;
    };
  }> {
    const response = await api.post('/profiles', profileData);
    return response.data;
  },

  async updateProfile(profileData: any): Promise<{
    success: boolean;
    data?: {
      profile: any;
    };
  }> {
    const response = await api.put('/profiles/me', profileData);
    return response.data;
  },

  async getAnalytics(): Promise<{
    success: boolean;
    data?: {
      analytics: any;
    };
  }> {
    const response = await api.get('/profiles/me/analytics');
    return response.data;
  },

  async addSkill(skill: {
    name: string;
    proficiency: string;
    yearsOfExperience: number;
    certifications?: string[];
  }): Promise<{
    success: boolean;
    data?: {
      profile: any;
    };
  }> {
    const response = await api.post('/profiles/me/skills', skill);
    return response.data;
  },

  async removeSkill(skillName: string): Promise<{
    success: boolean;
    data?: {
      profile: any;
    };
  }> {
    const response = await api.delete(`/profiles/me/skills/${encodeURIComponent(skillName)}`);
    return response.data;
  },

  async getCareerInsights(): Promise<{
    success: boolean;
    data?: {
      insights: any;
    };
  }> {
    const response = await api.get('/profiles/me/insights');
    return response.data;
  },

  async getSkillRecommendations(): Promise<{
    success: boolean;
    data?: {
      skillsInDemand: string[];
      improvementSuggestions: string[];
      competitiveAdvantages: string[];
    };
  }> {
    const response = await api.get('/profiles/me/recommendations');
    return response.data;
  },
};

// Job Application API
export const jobApplicationAPI = {
  async getApplications(filters?: any): Promise<{
    success: boolean;
    data?: {
      applications: any[];
      total: number;
      page: number;
      totalPages: number;
      summary: any;
    };
  }> {
    const response = await api.get('/job-applications', { params: filters });
    return response.data;
  },

  async createApplication(applicationData: any): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.post('/job-applications', applicationData);
    return response.data;
  },

  async getApplication(id: string): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.get(`/job-applications/${id}`);
    return response.data;
  },

  async updateApplication(id: string, updates: any): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.put(`/job-applications/${id}`, updates);
    return response.data;
  },

  async deleteApplication(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/job-applications/${id}`);
    return response.data;
  },

  async calculateMatchScore(id: string): Promise<{
    success: boolean;
    data?: {
      matchAnalysis: any;
    };
  }> {
    const response = await api.post(`/job-applications/${id}/match-score`);
    return response.data;
  },

  async batchCalculateMatchScores(limit: number = 10): Promise<{
    success: boolean;
    message?: string;
    data?: {
      processed: number;
      updated: number;
      errors: number;
    };
  }> {
    const response = await api.post(`/job-applications/batch/match-scores?limit=${limit}`);
    return response.data;
  },

  async testGeminiConnection(): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    const response = await api.get('/job-applications/test-gemini');
    return response.data;
  },

  async resetMatchScores(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    const response = await api.post('/job-applications/reset-match-scores');
    return response.data;
  },

  async getJobMatchAnalysis(id: string): Promise<{
    success: boolean;
    data?: {
      analysis: any;
    };
  }> {
    const response = await api.get(`/job-applications/${id}/analysis`);
    return response.data;
  },

  async getInterviewPrep(id: string, interviewType?: string): Promise<{
    success: boolean;
    data?: {
      interviewPrep: any;
    };
  }> {
    const response = await api.get(`/job-applications/${id}/interview-prep`, {
      params: { interviewType }
    });
    return response.data;
  },

  async addInterview(id: string, interviewData: any): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.post(`/job-applications/${id}/interviews`, interviewData);
    return response.data;
  },

  async updateInterview(id: string, interviewId: string, updates: any): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.put(`/job-applications/${id}/interviews/${interviewId}`, updates);
    return response.data;
  },

  async addCommunication(id: string, communicationData: any): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.post(`/job-applications/${id}/communications`, communicationData);
    return response.data;
  },

  async addTask(id: string, taskData: any): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.post(`/job-applications/${id}/tasks`, taskData);
    return response.data;
  },

  async completeTask(id: string, taskId: string, notes?: string): Promise<{
    success: boolean;
    data?: {
      application: any;
    };
  }> {
    const response = await api.patch(`/job-applications/${id}/tasks/${taskId}/complete`, { notes });
    return response.data;
  },

  async getStats(): Promise<{
    success: boolean;
    data?: {
      stats: any;
    };
  }> {
    const response = await api.get('/job-applications/stats');
    return response.data;
  },

  async getUpcomingInterviews(params?: { days?: number }): Promise<{
    success: boolean;
    data?: {
      upcomingInterviews: any[];
    };
  }> {
    const response = await api.get('/job-applications/interviews/upcoming', {
      params
    });
    return response.data;
  },

  async getPendingTasks(priority?: string, overdue?: boolean): Promise<{
    success: boolean;
    data?: {
      pendingTasks: any[];
    };
  }> {
    const response = await api.get('/job-applications/tasks/pending', {
      params: { priority, overdue }
    });
    return response.data;
  },
};


// Advanced Analytics API
export const advancedAnalyticsAPI = {
  async getComprehensiveAnalytics(): Promise<{
    success: boolean;
    data?: {
      analytics: any;
    };
  }> {
    const response = await api.get('/advanced-analytics/comprehensive');
    return response.data;
  },

  async getCompanyAnalysis(): Promise<{
    success: boolean;
    data?: {
      companyAnalysis: any[];
    };
  }> {
    const response = await api.get('/advanced-analytics/companies');
    return response.data;
  },

  async getSkillGapAnalysis(): Promise<{
    success: boolean;
    data?: {
      skillGapAnalysis: any;
    };
  }> {
    const response = await api.get('/advanced-analytics/skills/gap-analysis');
    return response.data;
  },

  async getJobMatchingInsights(): Promise<{
    success: boolean;
    data?: {
      jobMatchingInsights: any;
    };
  }> {
    const response = await api.get('/advanced-analytics/job-matching');
    return response.data;
  },

  async getPredictiveInsights(): Promise<{
    success: boolean;
    data?: {
      predictiveInsights: any;
    };
  }> {
    const response = await api.get('/advanced-analytics/predictive');
    return response.data;
  },

  async getAnalyticsSummary(): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get('/advanced-analytics/summary');
    return response.data;
  },

  async getPerformanceTrends(timeframe?: '3months' | '6months' | '12months'): Promise<{
    success: boolean;
    data?: {
      trends: any[];
      seasonalPatterns: any[];
      performanceImprovement: number;
      timeframe: string;
    };
  }> {
    const response = await api.get('/advanced-analytics/trends', {
      params: { timeframe }
    });
    return response.data;
  },

  async getMarketInsights(): Promise<{
    success: boolean;
    data?: {
      marketCompetitiveness: number;
      industryBenchmark: number;
      seasonalPatterns: any[];
      recommendations: string[];
    };
  }> {
    const response = await api.get('/advanced-analytics/market');
    return response.data;
  },
};

// Resume/Document API
export const documentAPI = {
  async uploadResume(file: File): Promise<{
    success: boolean;
    data?: {
      resume: any;
    };
  }> {
    const formData = new FormData();
    formData.append('resume', file);
    
    const response = await api.post('/documents/upload-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async generateResume(data: any): Promise<{
    success: boolean;
    data?: {
      resume: any;
    };
  }> {
    const response = await api.post('/documents/generate-resume', data);
    return response.data;
  },

  async optimizeResume(resumeId: string, jobDescription: string): Promise<{
    success: boolean;
    data?: {
      optimizedResume: any;
      suggestions: any[];
    };
  }> {
    const response = await api.post(`/documents/optimize-resume/${resumeId}`, {
      jobDescription
    });
    return response.data;
  },

  async downloadResume(resumeId: string, format: 'pdf' | 'docx'): Promise<Blob> {
    const response = await api.get(`/documents/download-resume/${resumeId}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },
};

// Interview API
export const interviewAPI = {
  // Basic CRUD operations
  async getInterviews(filters?: any): Promise<{
    success: boolean;
    data?: {
      interviews: any[];
      total: number;
    };
  }> {
    const response = await api.get('/interviews', { params: filters });
    return response.data;
  },

  async getInterviewById(interviewId: string): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get(`/interviews/${interviewId}`);
    return response.data;
  },

  async createInterview(interviewData: any): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post('/interviews', interviewData);
    return response.data;
  },

  async updateInterview(interviewId: string, updates: any): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.put(`/interviews/${interviewId}`, updates);
    return response.data;
  },

  async deleteInterview(interviewId: string): Promise<{
    success: boolean;
  }> {
    const response = await api.delete(`/interviews/${interviewId}`);
    return response.data;
  },

  // Enhanced scheduling features
  async rescheduleInterview(interviewId: string, data: {
    scheduledDate: string;
    duration?: number;
    reason?: string;
    notifyParticipants?: boolean;
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/reschedule`, data);
    return response.data;
  },

  async confirmInterview(interviewId: string, notes?: string): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/confirm`, { confirmationNotes: notes });
    return response.data;
  },

  async getAvailabilitySuggestions(interviewId: string, params: {
    startDate: string;
    endDate: string;
    duration?: number;
    timezone?: string;
  }): Promise<{
    success: boolean;
    data?: {
      suggestions: any[];
    };
  }> {
    const response = await api.get(`/interviews/${interviewId}/availability-suggestions`, { params });
    return response.data;
  },

  // Communication features
  async sendMessage(interviewId: string, messageData: {
    to: { name: string; email: string; role?: string }[];
    subject?: string;
    body: string;
    type?: string;
    priority?: string;
    threadId?: string;
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/messages`, messageData);
    return response.data;
  },

  async getMessages(interviewId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<{
    success: boolean;
    data?: {
      messages: any[];
      pagination: any;
    };
  }> {
    const response = await api.get(`/interviews/${interviewId}/messages`, { params });
    return response.data;
  },

  async sendInterviewEmail(interviewId: string, emailData: {
    templateType: 'confirmation' | 'thank_you' | 'follow_up' | 'custom';
    recipients: { name: string; email: string; role?: string }[];
    customSubject?: string;
    customBody?: string;
    includeCalendar?: boolean;
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/send-email`, emailData);
    return response.data;
  },

  async inviteInterviewer(interviewId: string, inviteData: {
    name: string;
    email: string;
    title?: string;
    department?: string;
    message?: string;
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/invite-interviewer`, inviteData);
    return response.data;
  },

  // Task management
  async createTask(interviewId: string, taskData: {
    title: string;
    description?: string;
    type: 'preparation' | 'research' | 'practice' | 'documentation' | 'follow_up' | 'reminder' | 'custom';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dueDate?: string;
    estimatedDuration?: number;
    assignedTo?: 'candidate' | 'interviewer' | 'hr' | 'recruiter';
    checklist?: { item: string; completed: boolean }[];
    tags?: string[];
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/tasks`, taskData);
    return response.data;
  },

  async getTasks(interviewId: string, params?: {
    status?: string;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: {
      tasks: any[];
      tasksByStatus: any;
      summary: any;
      pagination: any;
    };
  }> {
    const response = await api.get(`/interviews/${interviewId}/tasks`, { params });
    return response.data;
  },

  async updateTask(interviewId: string, taskId: string, updates: any): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.put(`/interviews/${interviewId}/tasks/${taskId}`, updates);
    return response.data;
  },

  async deleteTask(interviewId: string, taskId: string): Promise<{
    success: boolean;
  }> {
    const response = await api.delete(`/interviews/${interviewId}/tasks/${taskId}`);
    return response.data;
  },

  async completeTask(interviewId: string, taskId: string, data?: {
    notes?: string;
    actualDuration?: number;
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/tasks/${taskId}/complete`, data);
    return response.data;
  },

  // Calendar integration
  async downloadCalendar(interviewId: string): Promise<Blob> {
    const response = await api.get(`/interviews/${interviewId}/calendar/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async getCalendarUrls(interviewId: string): Promise<{
    success: boolean;
    data?: {
      google: string;
      outlook: string;
      apple: string;
    };
  }> {
    const response = await api.get(`/interviews/${interviewId}/calendar/urls`);
    return response.data;
  },

  // Preparation and feedback
  async updatePreparation(interviewId: string, preparationData: {
    preparationMaterials: {
      documents?: string[];
      websites?: string[];
      questionsToAsk?: string[];
      researchNotes?: string;
    };
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/preparation`, preparationData);
    return response.data;
  },

  async submitFeedback(interviewId: string, feedbackData: {
    feedback: {
      overallRating?: number;
      technicalSkills?: number;
      communicationSkills?: number;
      culturalFit?: number;
      notes?: string;
      recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
    };
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/feedback`, feedbackData);
    return response.data;
  },

  async sendFollowUp(interviewId: string, followUpData: {
    type: 'thank_you' | 'decision_inquiry' | 'additional_info' | 'custom';
    message: string;
    recipients: { name: string; email: string; role?: string }[];
  }): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.post(`/interviews/${interviewId}/follow-up`, followUpData);
    return response.data;
  },

  // Utility functions
  async getUpcomingInterviews(): Promise<{
    success: boolean;
    data?: any[];
  }> {
    const response = await api.get('/interviews/upcoming');
    return response.data;
  },

  async getTimezones(): Promise<{
    success: boolean;
    data?: { timezones: string[] };
  }> {
    const response = await api.get('/interviews/utils/timezones');
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  async getApplicationAnalytics(params: { timeRange?: string } = {}): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get('/analytics/applications', { params });
    return response.data;
  },

  async getResumeAnalytics(params: { resumeId?: string } = {}): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get('/analytics/resume/insights', { params });
    return response.data;
  },

  async getUserAnalytics(): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get('/analytics/user');
    return response.data;
  },

  async getDashboardMetrics(): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  }
};

// Notification API
export const notificationAPI = {
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    category?: string;
    type?: string;
  }): Promise<{
    success: boolean;
    data?: {
      notifications: any[];
      unreadCount: number;
      totalCount: number;
      hasMore: boolean;
    };
  }> {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  async getUnreadCount(): Promise<{
    success: boolean;
    data?: {
      unreadCount: number;
    };
  }> {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  async deleteNotification(notificationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  async clearAllNotifications(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete('/notifications');
    return response.data;
  },

  async getNotificationStats(): Promise<{
    success: boolean;
    data?: {
      total: number;
      unread: number;
      byCategory: Record<string, number>;
      byType: Record<string, number>;
    };
  }> {
    const response = await api.get('/notifications/stats');
    return response.data;
  },

  async getPreferences(): Promise<{
    success: boolean;
    data?: any;
  }> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  async updatePreferences(preferences: any): Promise<{
    success: boolean;
    data?: any;
    message: string;
  }> {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data;
  },

  async updateCategoryPreferences(category: string, preferences: {
    enabled?: boolean;
    channels?: string[];
    priority?: string;
  }): Promise<{
    success: boolean;
    data?: any;
    message: string;
  }> {
    const response = await api.put(`/notifications/preferences/${category}`, preferences);
    return response.data;
  },

  async sendTestNotification(data?: {
    type?: string;
    category?: string;
    title?: string;
    message?: string;
    priority?: string;
  }): Promise<{
    success: boolean;
    data?: any;
    message: string;
  }> {
    const response = await api.post('/notifications/test', data);
    return response.data;
  },

  async createNotification(data: {
    type: string;
    category: string;
    title: string;
    message: string;
    priority?: string;
    action?: any;
    metadata?: any;
    expiresAt?: string;
    channels?: string[];
  }): Promise<{
    success: boolean;
    data?: any;
    message: string;
  }> {
    const response = await api.post('/notifications', data);
    return response.data;
  },

  async getNotificationsByCategory(category: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: {
      notifications: any[];
      unreadCount: number;
      totalCount: number;
      hasMore: boolean;
    };
  }> {
    const response = await api.get(`/notifications/category/${category}`, { params });
    return response.data;
  },

  async bulkMarkAsRead(notificationIds: string[]): Promise<{
    success: boolean;
    data?: {
      total: number;
      successful: number;
      failed: number;
    };
    message: string;
  }> {
    const response = await api.patch('/notifications/bulk-read', { notificationIds });
    return response.data;
  }
};

export { api };
export default api;