// API Debug utility to help diagnose connectivity issues

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  apiPath: '/api/v1',
  timeout: 30000
};

export const debugAPI = {
  // Check if backend server is reachable
  async checkServerHealth(): Promise<{ isOnline: boolean; message: string }> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { 
          isOnline: true, 
          message: `Server online - ${data.status} at ${data.timestamp}` 
        };
      } else {
        return { 
          isOnline: false, 
          message: `Server responded with status: ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        isOnline: false, 
        message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  // Test authentication endpoint
  async testAuth(): Promise<{ working: boolean; message: string }> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.apiPath}/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'test@example.com' })
      });

      if (response.ok) {
        return { working: true, message: 'Auth endpoint responding correctly' };
      } else {
        return { working: false, message: `Auth endpoint error: ${response.status}` };
      }
    } catch (error) {
      return { 
        working: false, 
        message: `Auth endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  // Test job applications endpoint with current auth
  async testJobApplicationsEndpoint(): Promise<{ working: boolean; message: string; requiresAuth: boolean }> {
    try {
      // First try without auth to see if endpoint exists
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.apiPath}/job-applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        return { 
          working: true, 
          message: 'Job applications endpoint exists but requires authentication', 
          requiresAuth: true 
        };
      } else if (response.ok) {
        return { 
          working: true, 
          message: 'Job applications endpoint responding correctly', 
          requiresAuth: false 
        };
      } else {
        return { 
          working: false, 
          message: `Job applications endpoint error: ${response.status}`, 
          requiresAuth: false 
        };
      }
    } catch (error) {
      return { 
        working: false, 
        message: `Job applications endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        requiresAuth: false 
      };
    }
  },

  // Get current auth status from localStorage
  getAuthStatus(): { hasToken: boolean; tokenInfo: any } {
    try {
      // Check Zustand store
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        const token = authData.state?.accessToken;
        if (token) {
          return { hasToken: true, tokenInfo: { source: 'zustand', hasToken: !!token } };
        }
      }

      // Check legacy storage
      const legacyToken = localStorage.getItem('authToken');
      if (legacyToken) {
        return { hasToken: true, tokenInfo: { source: 'legacy', hasToken: !!legacyToken } };
      }

      return { hasToken: false, tokenInfo: { source: 'none', hasToken: false } };
    } catch (error) {
      return { hasToken: false, tokenInfo: { error: error instanceof Error ? error.message : 'Unknown error' } };
    }
  },

  // Test with authenticated request
  async testAuthenticatedRequest(): Promise<{ working: boolean; message: string }> {
    const authStatus = this.getAuthStatus();
    
    if (!authStatus.hasToken) {
      return { 
        working: false, 
        message: 'No authentication token found. Please log in first.' 
      };
    }

    try {
      let token = null;
      
      // Get token from storage
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        token = authData.state?.accessToken;
      }
      
      if (!token) {
        token = localStorage.getItem('authToken');
      }

      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.apiPath}/job-applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          working: true, 
          message: `Authenticated request successful. Found ${data.data?.total || 0} applications.` 
        };
      } else if (response.status === 401) {
        return { 
          working: false, 
          message: 'Authentication token is invalid or expired. Please log in again.' 
        };
      } else {
        return { 
          working: false, 
          message: `Authenticated request failed with status: ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        working: false, 
        message: `Authenticated request error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  // Run comprehensive diagnostics
  async runDiagnostics(): Promise<{
    serverHealth: any;
    authEndpoint: any;
    jobApplicationsEndpoint: any;
    authStatus: any;
    authenticatedRequest: any;
    summary: string;
  }> {
    console.log('🔍 Running API diagnostics...');
    
    const serverHealth = await this.checkServerHealth();
    const authEndpoint = await this.testAuth();
    const jobApplicationsEndpoint = await this.testJobApplicationsEndpoint();
    const authStatus = this.getAuthStatus();
    const authenticatedRequest = await this.testAuthenticatedRequest();

    const results = {
      serverHealth,
      authEndpoint,
      jobApplicationsEndpoint,
      authStatus,
      authenticatedRequest,
      summary: ''
    };

    // Generate summary
    let summary = '📊 API Diagnostics Summary:\n';
    summary += `• Server Health: ${serverHealth.isOnline ? '✅' : '❌'} ${serverHealth.message}\n`;
    summary += `• Auth Endpoint: ${authEndpoint.working ? '✅' : '❌'} ${authEndpoint.message}\n`;
    summary += `• Job Apps Endpoint: ${jobApplicationsEndpoint.working ? '✅' : '❌'} ${jobApplicationsEndpoint.message}\n`;
    summary += `• Auth Status: ${authStatus.hasToken ? '✅' : '❌'} ${authStatus.hasToken ? 'Token found' : 'No token'}\n`;
    summary += `• Authenticated Request: ${authenticatedRequest.working ? '✅' : '❌'} ${authenticatedRequest.message}\n`;

    if (!serverHealth.isOnline) {
      summary += '\n🚨 Action Required: Backend server is not running. Start with: npm start in apps/backend\n';
    } else if (!authStatus.hasToken) {
      summary += '\n🚨 Action Required: Please log in to access job applications\n';
    } else if (!authenticatedRequest.working) {
      summary += '\n🚨 Action Required: Authentication token may be expired. Please log in again\n';
    } else {
      summary += '\n✅ All systems operational!\n';
    }

    results.summary = summary;
    console.log(summary);
    
    return results;
  }
};

// Add to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugAPI = debugAPI;
  console.log('🔧 API Debug tools available: window.debugAPI.runDiagnostics()');
}