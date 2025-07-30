import { api } from './api';
import { useAuthStore } from '../stores/authStore';

const getAICoachResponse = async (message: string, resumeId: string): Promise<ReadableStream<Uint8Array>> => {
  try {
    console.log('🤖 Sending career coach request:', { message: message.substring(0, 50) + '...', resumeId });
    
    // Get the auth token from the auth store
    const token = useAuthStore.getState().accessToken;
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Use fetch API for proper streaming support
    const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/v1/coach/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/plain'
      },
      body: JSON.stringify({ message, resumeId })
    });

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 404) {
        throw new Error('Resume not found. Please select a valid resume.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before asking again.');
      } else if (response.status >= 500) {
        throw new Error('AI service is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    console.log('✅ Career coach response received');
    
    if (!response.body) {
      throw new Error('No response body received');
    }
    
    return response.body;
  } catch (error: any) {
    console.error('❌ Career coach service error:', error);
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Backend server is not running. Please start the backend server.');
    }
    
    // Re-throw the error if it's already a formatted error message
    if (error.message.includes('Authentication required') ||
        error.message.includes('Resume not found') ||
        error.message.includes('Rate limit exceeded') ||
        error.message.includes('AI service is temporarily unavailable') ||
        error.message.includes('Backend server is not running')) {
      throw error;
    }
    
    throw new Error(error.message || 'An unexpected error occurred while getting AI response.');
  }
};

// Health check function to verify backend connectivity
const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/coach/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
};

// Get available resume count for user
const getResumeCount = async (): Promise<number> => {
  try {
    const response = await api.get('/resumes/count');
    return response.data.data?.count || 0;
  } catch (error) {
    console.warn('Failed to get resume count:', error);
    return 0;
  }
};

export const careerCoachService = {
  getAICoachResponse,
  checkBackendHealth,
  getResumeCount,
};
