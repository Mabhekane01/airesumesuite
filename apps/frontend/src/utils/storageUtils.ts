/**
 * Utility functions for safely handling localStorage operations
 */

export const storageUtils = {
  /**
   * Safely clear all authentication related storage
   */
  clearAuthStorage: () => {
    const keysToRemove = [
      'auth-storage',
      'authToken',
      'refreshToken',
      'user-data',
      'token'
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });
  },

  /**
   * Safely get and parse JSON from localStorage
   */
  safeGetJson: (key: string, fallback: any = null) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to parse ${key} from localStorage:`, error);
      return fallback;
    }
  },

  /**
   * Safely set JSON to localStorage
   */
  safeSetJson: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set ${key} to localStorage:`, error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: () => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Clear all user-specific data (resume, preferences, etc.)
   */
  clearUserData: (userId?: string) => {
    const baseKeys = [
      'resume-builder-data',
      'resume-ai-data',
      'user-preferences',
      'job-applications',
      'interview-data',
      'form-data',
      'draft-data'
    ];

    // Clear base keys (old format)
    baseKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });

    // Clear user-specific keys if userId provided
    if (userId) {
      const userSpecificKeys = [
        `resume-builder-data-${userId}`,
        `resume-ai-data-${userId}`,
        `user-preferences-${userId}`,
        `job-applications-${userId}`,
        `interview-data-${userId}`,
        `form-data-${userId}`,
        `draft-data-${userId}`
      ];

      userSpecificKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key} from localStorage:`, error);
        }
      });
    }

    // Also clear form persistence data and any remaining user-specific keys by scanning localStorage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          baseKeys.some(baseKey => key.startsWith(`${baseKey}-`)) ||
          key.startsWith('form_draft_') ||
          key.startsWith('form_timestamp_') ||
          key.startsWith('selectedPlanType') ||
          key === 'lastResumeHash'
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`🧹 Cleared ${keysToRemove.length} form persistence and user-specific keys during logout`);
    } catch (error) {
      console.warn('Failed to scan and clear user-specific keys:', error);
    }
  },

  /**
   * Clear blob URLs from memory (call before clearing localStorage)
   */
  clearBlobUrls: () => {
    try {
      // Get resume AI data from localStorage before clearing
      const resumeAIData = storageUtils.safeGetJson('resume-ai-data', {});
      
      // Revoke cached PDF blob URL if it exists
      if (resumeAIData.cachedPdfUrl && resumeAIData.cachedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resumeAIData.cachedPdfUrl);
        console.log('✅ Revoked PDF blob URL during logout');
      }
      
      // Also check user-specific storage if available
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('resume-ai-data-')) {
          const userData = storageUtils.safeGetJson(key, {});
          if (userData.cachedPdfUrl && userData.cachedPdfUrl.startsWith('blob:')) {
            URL.revokeObjectURL(userData.cachedPdfUrl);
            console.log(`✅ Revoked PDF blob URL for user: ${key}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear blob URLs:', error);
    }
  },

  /**
   * Clear sessionStorage data
   */
  clearSessionStorage: () => {
    try {
      // Clear known session keys
      const sessionKeysToRemove = [
        'resume-session-data'
      ];

      sessionKeysToRemove.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key} from sessionStorage:`, error);
        }
      });

      console.log('🧹 SessionStorage cleared');
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  },

  /**
   * Clear all user-related storage (auth + user data)
   */
  clearAllUserStorage: (userId?: string) => {
    // Clear blob URLs BEFORE clearing localStorage
    storageUtils.clearBlobUrls();
    
    storageUtils.clearAuthStorage();
    storageUtils.clearUserData(userId);
    storageUtils.clearSessionStorage();
    console.log('All user storage cleared');
  },

  /**
   * Reset all app storage (use with caution)
   */
  resetAllStorage: () => {
    try {
      localStorage.clear();
      console.log('All localStorage cleared');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

/**
 * Hook to safely use localStorage with React
 */
export const useLocalStorage = (key: string, initialValue: any) => {
  const [storedValue, setStoredValue] = useState(() => {
    if (!storageUtils.isAvailable()) {
      return initialValue;
    }
    return storageUtils.safeGetJson(key, initialValue);
  });

  const setValue = (value: any) => {
    try {
      setStoredValue(value);
      if (storageUtils.isAvailable()) {
        storageUtils.safeSetJson(key, value);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Add React import for the hook
import { useState } from 'react';