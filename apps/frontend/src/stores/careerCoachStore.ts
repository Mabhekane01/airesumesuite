import { create } from 'zustand';
import { ResumeData } from '../services/resumeService';
import { careerCoachService } from '../services/careerCoachService';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  isStreaming?: boolean;
  timestamp?: Date;
  error?: boolean;
}

interface CareerCoachState {
  selectedResume: ResumeData | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isBackendHealthy: boolean;
  lastHealthCheck: Date | null;
  selectResume: (resume: ResumeData) => void;
  sendMessage: (message: string, resumeId: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  checkBackendHealth: () => Promise<void>;
}

export const useCareerCoachStore = create<CareerCoachState>((set, get) => ({
  selectedResume: null,
  messages: [],
  isLoading: false,
  error: null,
  isBackendHealthy: true,
  lastHealthCheck: null,

  selectResume: (resume) => {
    console.log('🎯 Resume selected for career coaching:', resume.title);
    set({ selectedResume: resume, messages: [], error: null });
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },

  clearError: () => {
    set({ error: null });
  },

  checkBackendHealth: async () => {
    try {
      const isHealthy = await careerCoachService.checkBackendHealth();
      set({ 
        isBackendHealthy: isHealthy,
        lastHealthCheck: new Date()
      });
    } catch (error) {
      set({ 
        isBackendHealthy: false,
        lastHealthCheck: new Date()
      });
    }
  },

  sendMessage: async (message, resumeId) => {
    const userMessage: Message = { 
      sender: 'user', 
      text: message, 
      timestamp: new Date() 
    };
    
    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const stream = await careerCoachService.getAICoachResponse(message, resumeId);
      
      const aiMessage: Message = { 
        sender: 'ai', 
        text: '', 
        isStreaming: true,
        timestamp: new Date()
      };
      set(state => ({ messages: [...state.messages, aiMessage] }));

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        const chunk = decoder.decode(value, { stream: !done });
        fullResponse += chunk;

        set(state => {
          const newMessages = [...state.messages];
          const lastMessageIndex = newMessages.length - 1;
          if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].sender === 'ai') {
            newMessages[lastMessageIndex] = { 
              ...newMessages[lastMessageIndex], 
              text: fullResponse 
            };
          }
          return { messages: newMessages };
        });
      }

      set(state => {
        const finalMessages = [...state.messages];
        const lastMessageIndex = finalMessages.length - 1;
        if (lastMessageIndex >= 0 && finalMessages[lastMessageIndex].sender === 'ai') {
          finalMessages[lastMessageIndex] = { 
            ...finalMessages[lastMessageIndex], 
            isStreaming: false 
          };
        }
        return { messages: finalMessages, isLoading: false };
      });

    } catch (err) {      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      const errorAiMessage: Message = {
        sender: 'ai',
        text: `Sorry, ${errorMessage}. Please try again.`,
        timestamp: new Date(),
        error: true
      };

      set(state => ({
        messages: [...state.messages, errorAiMessage],
        error: errorMessage,
        isLoading: false,
        isBackendHealthy: !errorMessage.includes('Backend server')
      }));
    }
  },
}));
