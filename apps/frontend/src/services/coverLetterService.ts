import { api } from './api';

export interface CoverLetterData {
  _id?: string;
  title: string;
  content: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  jobDescription?: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  templateId: string;
  isPublic: boolean;
  resumeId?: string; // CV attachment capability
  attachedResume?: {
    _id: string;
    title: string;
    personalInfo?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCoverLetterRequest {
  title: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  jobDescription?: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  templateId?: string;
  resumeId?: string;
}

export interface GenerateFromJobRequest {
  jobUrl: string;
  resumeId: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
}

export interface JobPostingData {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  url: string;
  salary?: string;
  employmentType?: string;
  datePosted?: string;
}

export class CoverLetterService {
  async createCoverLetter(data: CreateCoverLetterRequest): Promise<{ success: boolean; data?: CoverLetterData; message?: string }> {
    try {
      const response = await api.post('/cover-letters', data);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Failed to create cover letter' };
    }
  }

  async getCoverLetters(): Promise<{ success: boolean; data?: CoverLetterData[] }> {
    try {
      const response = await api.get('/cover-letters');
      return { success: true, data: response.data.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  async generateFromJobUrl(data: GenerateFromJobRequest): Promise<CoverLetterData> {
    const response = await api.post('/cover-letters/generate-from-job', data);
    return response.data.data;
  }

  async generateAIContent(data: {
    jobTitle: string;
    companyName: string;
    tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    resumeId?: string;
    jobDescription?: string;
    existingContent?: string;
  }): Promise<{ success: boolean; content?: string; message?: string }> {
    try {
      console.log('🤖 Generating AI content with data:', data);
      const response = await api.post('/cover-letters/ai-generate', data, {
        timeout: 60000 // 60 seconds for AI generation
      });
      return { 
        success: true, 
        content: response.data.data?.content || response.data.content 
      };
    } catch (error: any) {
      console.error('AI generation error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'AI generation failed' 
      };
    }
  }

  async attachResume(coverLetterId: string, resumeId: string): Promise<{ success: boolean; data?: CoverLetterData; message?: string }> {
    try {
      const response = await api.post(`/cover-letters/${coverLetterId}/attach-resume`, { resumeId });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Attach resume error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to attach resume' 
      };
    }
  }

  async detachResume(coverLetterId: string): Promise<{ success: boolean; data?: CoverLetterData; message?: string }> {
    try {
      const response = await api.delete(`/cover-letters/${coverLetterId}/attach-resume`);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Detach resume error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to detach resume' 
      };
    }
  }

  async getUserCoverLetters(): Promise<CoverLetterData[]> {
    const response = await api.get('/cover-letters');
    return response.data.data;
  }

  async getCoverLetterById(id: string): Promise<CoverLetterData> {
    const response = await api.get(`/cover-letters/${id}`);
    return response.data.data;
  }

  async updateCoverLetter(id: string, data: Partial<CoverLetterData>): Promise<{ success: boolean; data?: CoverLetterData; message?: string }> {
    try {
      const response = await api.put(`/cover-letters/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Failed to update cover letter' };
    }
  }

  async deleteCoverLetter(id: string): Promise<boolean> {
    try {
      await api.delete(`/cover-letters/${id}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async regenerateCoverLetter(id: string, tone?: 'professional' | 'casual' | 'enthusiastic' | 'conservative'): Promise<CoverLetterData> {
    const response = await api.post(`/cover-letters/${id}/regenerate`, { tone });
    return response.data.data;
  }

  async scrapeJobPosting(jobUrl: string): Promise<JobPostingData> {
    const response = await api.post('/cover-letters/scrape-job', { jobUrl });
    return response.data.data;
  }

  async generateCoverLetterVariations(data: {
    resumeId: string;
    jobDescription: string;
    jobTitle: string;
    companyName: string;
    customInstructions?: string;
  }): Promise<{ tone: string; content: string; strengths: string[]; }[]> {
    const response = await api.post('/cover-letters/generate-variations', data);
    return response.data.data;
  }

  async analyzeCoverLetterMatch(id: string, jobDescription: string): Promise<{
    matchScore: number;
    keywordAlignment: string[];
    improvementSuggestions: string[];
    strengths: string[];
    overallAssessment: string;
  }> {
    const response = await api.post(`/cover-letters/${id}/analyze`, { jobDescription });
    return response.data.data;
  }

  async optimizeCoverLetterForATS(data: {
    content: string;
    jobDescription: string;
    optimizationLevel?: 'basic' | 'comprehensive';
    targetKeywords?: string[];
  }): Promise<{ content: string; improvements: string[]; }> {
    const response = await api.post('/cover-letters/optimize-ats', data);
    return response.data;
  }

  async enhanceCoverLetterWithAI(data: {
    content: string;
    jobDescription?: string;
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    focusAreas?: string[];
  }): Promise<{ enhancedContent: string; improvements: string[]; }> {
    try {
      console.log('✨ Enhancing content with AI:', { contentLength: data.content.length, tone: data.tone });
      const response = await api.post('/cover-letters/ai-enhance', data, {
        timeout: 60000 // 60 seconds for AI enhancement
      });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      throw new Error(error.response?.data?.message || error.message || 'AI enhancement failed');
    }
  }

  async downloadCoverLetter(id: string, format: 'pdf' | 'docx' | 'txt'): Promise<Blob> {
    const response = await api.get(`/cover-letters/${id}/download/${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadCoverLetterWithData(coverLetterData: {
    title: string;
    content: string;
    jobTitle: string;
    companyName: string;
    tone: string;
  }, format: 'pdf' | 'docx' | 'txt'): Promise<{ success: boolean; blob?: Blob; message?: string }> {
    try {
      console.log('📥 Downloading cover letter with data:', { format, hasContent: !!coverLetterData.content });
      
      const response = await api.post(`/cover-letters/download-with-data/${format}`, 
        { coverLetterData }, 
        {
          responseType: 'blob',
          timeout: 30000 // 30 seconds timeout for file generation
        }
      );
      
      if (response.data) {
        console.log('✅ Download successful, blob size:', response.data.size);
        return { success: true, blob: response.data };
      } else {
        throw new Error('No data received from server');
      }
    } catch (error: any) {
      console.error('❌ Download failed:', error);
      const message = error.response?.data?.message || error.message || 'Download failed';
      return { success: false, message };
    }
  }

  async createFromResumeBuilder(data: {
    resumeData: any;
    jobUrl?: string;
    jobDescription?: string;
    jobTitle: string;
    companyName: string;
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  }): Promise<CoverLetterData> {
    const response = await api.post('/cover-letters/from-resume-builder', data);
    return response.data.data;
  }

  async analyzeRealTime(data: {
    content: string;
    jobDescription?: string;
  }): Promise<{ 
    success: boolean; 
    data?: {
      matchScore: number;
      wordCount: number;
      keywordAlignment: string[];
      suggestions: string[];
      strengths: string[];
    };
    message?: string;
  }> {
    try {
      const response = await api.post('/cover-letters/analyze-realtime', data);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Real-time analysis error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Analysis failed' 
      };
    }
  }
}

export const coverLetterService = new CoverLetterService();