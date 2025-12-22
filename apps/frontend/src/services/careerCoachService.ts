import { api } from './api';
import { useAuthStore } from '../stores/authStore';

const getAICoachResponse = async (message: string, resumeId: string): Promise<ReadableStream<Uint8Array>> => {
  const token = useAuthStore.getState().accessToken;
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  
  try {
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
      if (response.status === 401) {
        throw new Error('Authentication required');
      } else if (response.status === 404) {
        throw new Error('Resume not found');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        throw new Error('AI service is temporarily unavailable');
      }
    }
    
    if (!response.body) {
      throw new Error('No response received');
    }
    
    return response.body;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Backend server is not running');
    }
    
    throw error;
  }
};

const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/coach/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

const getResumeCount = async (): Promise<number> => {
  try {
    const response = await api.get('/resumes/count');
    return response.data.data?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const careerCoachService = {
  getAICoachResponse,
  checkBackendHealth,
  getResumeCount,
};
