import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

export interface DocumentSharingServiceConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

export interface AnalyticsRedirect {
  redirectUrl: string;
  documentId: string;
  analyticsType: string;
}

export interface SharingRedirect {
  redirectUrl: string;
  documentId: string;
  options?: any;
}

export interface ViewingRedirect {
  redirectUrl: string;
  slug: string;
  hasPassword: boolean;
}

export class DocumentSharingIntegration {
  private client: AxiosInstance;
  private config: DocumentSharingServiceConfig;

  constructor() {
    this.config = {
      baseURL: process.env.DOCUMENT_SHARING_SERVICE_URL || 'http://localhost:3003',
      timeout: 10000,
      retries: 3
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DocumentManager/1.0.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Document Sharing Service Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Document Sharing Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Document Sharing Service Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('Document Sharing Service Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if document-sharing-service is available
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('Document sharing service is not available:', error.message);
      return false;
    }
  }

  /**
   * Get analytics service status
   */
  async getAnalyticsStatus(): Promise<any> {
    try {
      const response = await this.client.get('/api/analytics/status');
      return response.data;
    } catch (error) {
      logger.error('Failed to get analytics status:', error);
      throw new Error('Analytics service unavailable');
    }
  }

  /**
   * Redirect to analytics service for detailed analytics
   */
  async redirectToAnalytics(documentId: string, type: string = 'views'): Promise<AnalyticsRedirect> {
    try {
      const redirectUrl = `${this.config.baseURL}/api/analytics/documents/${documentId}/${type}`;
      
      return {
        redirectUrl,
        documentId,
        analyticsType: type
      };
    } catch (error) {
      logger.error('Failed to generate analytics redirect:', error);
      throw new Error('Failed to generate analytics redirect');
    }
  }

  /**
   * Get basic document analytics (cached/fallback)
   */
  async getBasicDocumentAnalytics(documentId: string): Promise<any> {
    try {
      // Try to get from document-sharing-service first
      const response = await this.client.get(`/api/analytics/documents/${documentId}/basic`);
      return response.data;
    } catch (error) {
      logger.warn('Falling back to basic analytics for document:', documentId);
      
      // Return basic fallback data
      return {
        success: true,
        data: {
          documentId,
          hasAnalytics: false,
          fallback: true,
          message: 'Analytics service unavailable, using fallback data'
        }
      };
    }
  }

  /**
   * Redirect to sharing service for link creation
   */
  async redirectToSharing(documentId: string, options?: any): Promise<SharingRedirect> {
    try {
      const redirectUrl = `${this.config.baseURL}/api/links`;
      
      return {
        redirectUrl,
        documentId,
        options
      };
    } catch (error) {
      logger.error('Failed to generate sharing redirect:', error);
      throw new Error('Failed to generate sharing redirect');
    }
  }

  /**
   * Redirect to sharing service for link management
   */
  async redirectToLinkManagement(documentId: string): Promise<SharingRedirect> {
    try {
      const redirectUrl = `${this.config.baseURL}/api/links/document/${documentId}`;
      
      return {
        redirectUrl,
        documentId
      };
    } catch (error) {
      logger.error('Failed to generate link management redirect:', error);
      throw new Error('Failed to generate link management redirect');
    }
  }

  /**
   * Get basic sharing info (cached/fallback)
   */
  async getBasicSharingInfo(documentId: string): Promise<any> {
    try {
      // Try to get from document-sharing-service first
      const response = await this.client.get(`/api/links/document/${documentId}/basic`);
      return response.data;
    } catch (error) {
      logger.warn('Falling back to basic sharing info for document:', documentId);
      
      // Return basic fallback data
      return {
        success: true,
        data: {
          documentId,
          hasSharing: false,
          fallback: true,
          message: 'Sharing service unavailable, using fallback data'
        }
      };
    }
  }

  /**
   * Redirect to viewing service for public document viewing
   */
  async redirectToViewing(slug: string, password?: string): Promise<ViewingRedirect> {
    try {
      const redirectUrl = `${this.config.baseURL}/view/${slug}${password ? `?password=${password}` : ''}`;
      
      return {
        redirectUrl,
        slug,
        hasPassword: !!password
      };
    } catch (error) {
      logger.error('Failed to generate viewing redirect:', error);
      throw new Error('Failed to generate viewing redirect');
    }
  }

  /**
   * Redirect to viewing service for short URL format
   */
  async redirectToShortUrl(slug: string): Promise<ViewingRedirect> {
    try {
      const redirectUrl = `${this.config.baseURL}/d/${slug}`;
      
      return {
        redirectUrl,
        slug,
        hasPassword: false
      };
    } catch (error) {
      logger.error('Failed to generate short URL redirect:', error);
      throw new Error('Failed to generate short URL redirect');
    }
  }

  /**
   * Get basic viewing info (cached/fallback)
   */
  async getBasicViewingInfo(slug: string): Promise<any> {
    try {
      // Try to get from document-sharing-service first
      const response = await this.client.get(`/api/public/documents/${slug}/basic`);
      return response.data;
    } catch (error) {
      logger.warn('Falling back to basic viewing info for slug:', slug);
      
      // Return basic fallback data
      return {
        success: true,
        data: {
          slug,
          hasViewing: false,
          fallback: true,
          message: 'Viewing service unavailable, using fallback data'
        }
      };
    }
  }

  /**
   * Sync document data with document-sharing-service
   */
  async syncDocument(documentId: string, documentData: any): Promise<boolean> {
    try {
      const response = await this.client.post('/api/sync/documents', {
        documentId,
        data: documentData
      });
      
      return response.status === 200;
    } catch (error) {
      logger.error('Failed to sync document with sharing service:', error);
      return false;
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): DocumentSharingServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<DocumentSharingServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios client
    this.client.defaults.baseURL = this.config.baseURL;
    this.client.defaults.timeout = this.config.timeout;
    
    logger.info('Document sharing service configuration updated:', this.config);
  }
}

// Export singleton instance
export const documentSharingIntegration = new DocumentSharingIntegration();



