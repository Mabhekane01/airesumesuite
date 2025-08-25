import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  FolderIcon,
  ShareIcon,
  ChartBarIcon,
  CogIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpTrayIcon as UploadIcon,
  EyeIcon,
  ArrowDownTrayIcon as DownloadIcon,
  TrashIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BellIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  ShieldCheckIcon,
  StarIcon,
  ArchiveBoxIcon,
  AdjustmentsHorizontalIcon,
  ViewColumnsIcon,
  Bars3Icon,
  XMarkIcon,
  CalendarIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  TableCellsIcon,
  LinkIcon,
  PaperAirplaneIcon,
  QrCodeIcon,
  DocumentChartBarIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { resumeService, ResumeData } from '../../services/resumeService';
import { coverLetterService, CoverLetterData } from '../../services/coverLetterService';

// Types
interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  mimeType?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'deleted';
  folderId?: string;
  folderName?: string;
  source: 'upload' | 'ai_resume' | 'pdf_editor' | 'api' | 'resume' | 'cover_letter';
  links?: DocumentLink[];
  // CV/Cover Letter specific fields
  content?: string;
  jobTitle?: string;
  companyName?: string;
  templateId?: string;
  personalInfo?: any;
  workExperience?: any[];
  education?: any[];
  skills?: any[];
}

// Utility function to convert ResumeData/CoverLetterData to Document
const convertToDocument = (item: ResumeData | CoverLetterData, type: 'resume' | 'cover_letter'): Document => {
  const id = typeof item._id === 'string' ? item._id : String(item._id || '');
  
  if (type === 'resume') {
    const resume = item as ResumeData;
    return {
      id,
      title: resume.title || `Resume - ${resume.personalInfo?.firstName} ${resume.personalInfo?.lastName}`,
      fileName: `${resume.title || 'resume'}.pdf`,
      fileType: 'pdf',
      createdAt: resume.createdAt || new Date().toISOString(),
      updatedAt: resume.updatedAt || resume.createdAt || new Date().toISOString(),
      status: 'active',
      source: 'resume',
      templateId: resume.template,
      personalInfo: resume.personalInfo,
      workExperience: resume.workExperience,
      education: resume.education,
      skills: resume.skills
    };
  } else {
    const coverLetter = item as CoverLetterData;
    return {
      id,
      title: coverLetter.title || `Cover Letter - ${coverLetter.jobTitle}`,
      fileName: `${coverLetter.title || 'cover-letter'}.pdf`,
      fileType: 'pdf',
      createdAt: coverLetter.createdAt || new Date().toISOString(),
      updatedAt: coverLetter.updatedAt || coverLetter.createdAt || new Date().toISOString(),
      status: 'active',
      source: 'cover_letter',
      content: coverLetter.content,
      jobTitle: coverLetter.jobTitle,
      companyName: coverLetter.companyName,
      templateId: coverLetter.templateId
    };
  }
};

interface DocumentLink {
  id: string;
  slug: string;
  name: string;
  shortUrl: string;
  fullUrl: string;
  isActive: boolean;
  hasPassword: boolean;
  expiresAt?: string;
  maxViews?: number;
  currentViews: number;
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  createdAt: string;
  isExpired: boolean;
  isViewLimitReached: boolean;
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  documentCount: number;
  createdAt: string;
}

interface AnalyticsData {
  summary: {
    totalDocuments: number;
    totalViews: number;
    totalDownloads: number;
  };
  dailyViews: Array<{
    date: string;
    views: number;
    unique_visitors: number;
  }>;
  topDocuments: Array<{
    id: string;
    title: string;
    views: number;
    unique_visitors: number;
  }>;
  countries: Array<{
    country: string;
    views: number;
  }>;
  referrers: Array<{
    referrer: string;
    views: number;
  }>;
}

// API Service
class DocumentManagerAPI {
  private static baseUrl = import.meta.env.VITE_DOCUMENT_MANAGER_URL || 'http://localhost:3002/api';
  
  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().token; // Uses AI Resume Suite auth token
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }
  
  // Documents
  static async getDocuments(params: {
    page?: number;
    limit?: number;
    search?: string;
    folderId?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}) {
    const queryParams = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    );
    return this.request(`/documents?${queryParams}`);
  }
  
  static async uploadDocument(formData: FormData) {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }
    
    return response.json();
  }
  
  static async getDocument(id: string) {
    return this.request(`/documents/${id}`);
  }
  
  static async updateDocument(id: string, data: { title?: string; description?: string; folderId?: string }) {
    return this.request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  static async deleteDocument(id: string, permanent = false) {
    return this.request(`/documents/${id}?permanent=${permanent}`, {
      method: 'DELETE',
    });
  }
  
  static async getDocumentAnalytics(id: string, days = 30) {
    return this.request(`/documents/${id}/analytics?days=${days}`);
  }
  
  // Links
  static async createLink(data: {
    documentId: string;
    name?: string;
    description?: string;
    password?: string;
    expiresAt?: string;
    maxViews?: number;
    allowDownload?: boolean;
    allowPrint?: boolean;
    allowCopy?: boolean;
    requireEmail?: boolean;
    requireName?: boolean;
    watermarkText?: string;
  }) {
    return this.request('/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  static async getDocumentLinks(documentId: string) {
    return this.request(`/links/document/${documentId}`);
  }
  
  static async updateLink(id: string, data: any) {
    return this.request(`/links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  static async deleteLink(id: string) {
    return this.request(`/links/${id}`, {
      method: 'DELETE',
    });
  }
  
  static async getLinkAnalytics(id: string, days = 30) {
    return this.request(`/links/${id}/analytics?days=${days}`);
  }
  
  static async generateQRCode(id: string) {
    return this.request(`/links/${id}/qr`);
  }
  
  // Analytics
  static async getDashboardAnalytics(days = 30) {
    return this.request(`/analytics/dashboard?days=${days}`);
  }
  
  static async getRealTimeAnalytics() {
    return this.request('/analytics/realtime');
  }
}

// Main Component
export const EnterpriseDocumentManager: React.FC = () => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'file_size'>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'analytics' | 'settings'>('documents');
  const [documentFilter, setDocumentFilter] = useState<'all' | 'uploads' | 'resumes' | 'cover_letters'>('all');
  
  // Original data from AI Resume Suite
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterData[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load documents (both uploaded and CVs/cover letters)
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load uploaded documents from Document Manager API
      let uploadedDocs: Document[] = [];
      try {
        const response = await DocumentManagerAPI.getDocuments({
          page: currentPage,
          limit: 20,
          search: searchQuery || undefined,
          folderId: selectedFolder || undefined,
          sortBy,
          sortOrder,
        });
        uploadedDocs = response.data.documents || [];
      } catch (error) {
        console.error('Failed to load uploaded documents:', error);
        // Continue with CVs and cover letters even if uploads fail
      }
      
      // Load resumes from AI Resume Suite
      let resumesData: ResumeData[] = [];
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.success && resumesResponse.data) {
          resumesData = resumesResponse.data;
          setResumes(resumesData);
        }
      } catch (error) {
        console.error('Failed to load resumes:', error);
        setResumes([]);
      }
      
      // Load cover letters from AI Resume Suite
      let coverLettersData: CoverLetterData[] = [];
      try {
        const coverLettersResponse = await coverLetterService.getCoverLetters();
        if (coverLettersResponse.success && coverLettersResponse.data) {
          coverLettersData = coverLettersResponse.data;
          setCoverLetters(coverLettersData);
        }
      } catch (error) {
        console.error('Failed to load cover letters:', error);
        setCoverLetters([]);
      }
      
      // Convert and combine all documents
      const resumeDocs = resumesData.map(resume => convertToDocument(resume, 'resume'));
      const coverLetterDocs = coverLettersData.map(cl => convertToDocument(cl, 'cover_letter'));
      
      const allDocuments = [...uploadedDocs, ...resumeDocs, ...coverLetterDocs];
      
      // Apply filters
      let filteredDocs = allDocuments;
      if (documentFilter !== 'all') {
        filteredDocs = allDocuments.filter(doc => {
          switch (documentFilter) {
            case 'uploads':
              return ['upload', 'ai_resume', 'pdf_editor', 'api'].includes(doc.source);
            case 'resumes':
              return doc.source === 'resume';
            case 'cover_letters':
              return doc.source === 'cover_letter';
            default:
              return true;
          }
        });
      }
      
      // Apply search filter
      if (searchQuery) {
        filteredDocs = filteredDocs.filter(doc => 
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Sort documents
      filteredDocs.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'file_size':
            aValue = a.fileSize || 0;
            bValue = b.fileSize || 0;
            break;
          default: // created_at
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
        }
        
        if (sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedFolder, sortBy, sortOrder, documentFilter]);
  
  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const response = await DocumentManagerAPI.getDashboardAnalytics(30);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);
  
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);
  
  // File upload handler
  const handleFileUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      
      if (selectedFolder) {
        formData.append('folderId', selectedFolder);
      }
      
      try {
        await DocumentManagerAPI.uploadDocument(formData);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    loadDocuments();
    setShowUploadModal(false);
  };
  
  // Create shareable link
  const createShareableLink = async (documentId: string, settings: any) => {
    try {
      const response = await DocumentManagerAPI.createLink({
        documentId,
        ...settings,
      });
      
      toast.success('Shareable link created successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to create link:', error);
      toast.error('Failed to create shareable link');
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Get document actions based on source
  const getDocumentActions = (document: Document) => {
    const actions = [];
    
    // Share action (for all documents)
    actions.push({
      icon: ShareIcon,
      label: 'Share',
      onClick: () => {
        setSelectedDocument(document);
        setShowShareModal(true);
      }
    });
    
    // View/Edit action
    if (document.source === 'resume') {
      actions.push({
        icon: EyeIcon,
        label: 'Edit',
        onClick: () => {
          window.open(`/dashboard/resume/preview/${document.id}`, '_blank');
        }
      });
    } else if (document.source === 'cover_letter') {
      actions.push({
        icon: EyeIcon,
        label: 'Edit',
        onClick: () => {
          window.open(`/dashboard/cover-letter?edit=${document.id}`, '_blank');
        }
      });
    } else {
      actions.push({
        icon: EyeIcon,
        label: 'View',
        onClick: () => {
          if (document.fileUrl) {
            window.open(document.fileUrl, '_blank');
          }
        }
      });
    }
    
    // Download action
    if (document.fileUrl || document.source === 'resume' || document.source === 'cover_letter') {
      actions.push({
        icon: DownloadIcon,
        label: 'Download',
        onClick: () => {
          if (document.source === 'resume') {
            // Generate and download resume PDF
            window.open(`/api/resumes/${document.id}/pdf`, '_blank');
          } else if (document.source === 'cover_letter') {
            // Generate and download cover letter PDF
            window.open(`/api/cover-letters/${document.id}/pdf`, '_blank');
          } else if (document.fileUrl) {
            const link = document.createElement('a');
            link.href = document.fileUrl;
            link.download = document.fileName;
            link.click();
          }
        }
      });
    }
    
    return actions;
  };

  // Document grid item component
  const DocumentGridItem: React.FC<{ document: Document }> = ({ document }) => {
    const actions = getDocumentActions(document);
    
    return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={() => setSelectedDocument(document)}
    >
      {/* Document thumbnail */}
      <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
        {document.thumbnailUrl ? (
          <img
            src={document.thumbnailUrl}
            alt={document.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <DocumentTextIcon className="w-12 h-12 text-blue-500" />
        )}
        
        {/* File type badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {document.fileType.toUpperCase()}
        </div>
        
        {/* Page count */}
        {document.pageCount && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {document.pageCount} pages
          </div>
        )}
        
        {/* Quick actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDocument(document);
              setShowShareModal(true);
            }}
            className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <ShareIcon className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(document.fileUrl, '_blank');
            }}
            className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <EyeIcon className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const link = document.createElement('a');
              link.href = document.fileUrl;
              link.download = document.fileName;
              link.click();
            }}
            className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <DownloadIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      {/* Document info */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 truncate" title={document.title}>
          {document.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatFileSize(document.fileSize)}</span>
          <span>{formatDate(document.createdAt)}</span>
        </div>
        
        {/* Source badge */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${
            document.source === 'resume' 
              ? 'bg-green-100 text-green-700'
              : document.source === 'cover_letter'
              ? 'bg-purple-100 text-purple-700'
              : document.source === 'ai_resume' 
              ? 'bg-blue-100 text-blue-700'
              : document.source === 'pdf_editor'
              ? 'bg-orange-100 text-orange-700'
              : document.source === 'api'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {document.source === 'resume' ? 'CV/Resume' : 
             document.source === 'cover_letter' ? 'Cover Letter' :
             document.source === 'ai_resume' ? 'AI Resume' : 
             document.source === 'pdf_editor' ? 'PDF Editor' :
             document.source === 'api' ? 'API' : 'Upload'}
          </span>
          
          {/* Links indicator */}
          {document.links && document.links.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-blue-600">
              <LinkIcon className="w-3 h-3" />
              <span>{document.links.length}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
  
  // Analytics dashboard component
  const AnalyticsDashboard: React.FC = () => {
    const totalDocuments = documents.length;
    const resumeCount = documents.filter(d => d.source === 'resume').length;
    const coverLetterCount = documents.filter(d => d.source === 'cover_letter').length;
    const uploadCount = documents.filter(d => ['upload', 'ai_resume', 'pdf_editor', 'api'].includes(d.source)).length;
    
    // Calculate recently modified (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyModified = documents.filter(doc => {
      const updatedAt = new Date(doc.updatedAt);
      return updatedAt > weekAgo;
    }).length;
    
    if (!analytics && totalDocuments === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Documents</p>
                <p className="text-3xl font-bold">{totalDocuments}</p>
              </div>
              <DocumentTextIcon className="w-12 h-12 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">CVs/Resumes</p>
                <p className="text-3xl font-bold">{resumeCount}</p>
              </div>
              <DocumentTextIcon className="w-12 h-12 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Cover Letters</p>
                <p className="text-3xl font-bold">{coverLetterCount}</p>
              </div>
              <PencilIcon className="w-12 h-12 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Uploads</p>
                <p className="text-3xl font-bold">{uploadCount}</p>
              </div>
              <FolderIcon className="w-12 h-12 text-orange-200" />
            </div>
          </div>
        </div>
        
        {/* Recent activity */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Documents Modified (Last 7 Days)</p>
                <p className="text-sm text-gray-500">Recently updated documents</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{recentlyModified}</p>
                <p className="text-sm text-gray-500">docs</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent documents */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
          <div className="space-y-3">
            {documents.slice(0, 5).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                    {doc.source === 'resume' ? (
                      <DocumentTextIcon className="w-5 h-5 text-green-600" />
                    ) : doc.source === 'cover_letter' ? (
                      <PencilIcon className="w-5 h-5 text-purple-600" />
                    ) : (
                      <FolderIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <p className="text-sm text-gray-500">{formatDate(doc.updatedAt)}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  doc.source === 'resume' 
                    ? 'bg-green-100 text-green-700'
                    : doc.source === 'cover_letter'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {doc.source === 'resume' ? 'CV' : 
                   doc.source === 'cover_letter' ? 'Cover Letter' : 'Upload'}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Document breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Types</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">CVs/Resumes</span>
                </div>
                <span className="font-medium text-gray-900">{resumeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">Cover Letters</span>
                </div>
                <span className="font-medium text-gray-900">{coverLetterCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Uploads</span>
                </div>
                <span className="font-medium text-gray-900">{uploadCount}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.open('/dashboard/resume/templates', '_blank')}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">Create New Resume</span>
                </div>
                <span className="text-green-600">→</span>
              </button>
              
              <button
                onClick={() => window.open('/dashboard/cover-letter', '_blank')}
                className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <PencilIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-900">Create Cover Letter</span>
                </div>
                <span className="text-purple-600">→</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <UploadIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-900">Upload Document</span>
                </div>
                <span className="text-blue-600">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Document Manager</h1>
            </div>
            
            {/* Navigation tabs */}
            <div className="flex items-center space-x-1">
              {[
                { id: 'documents', label: 'Documents', icon: DocumentTextIcon },
                { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
                { id: 'settings', label: 'Settings', icon: CogIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              ))}
            </div>
            
            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.subscriptionTier} Plan</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col space-y-4">
              {/* Filter tabs */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'all', label: 'All Documents', icon: DocumentTextIcon },
                  { id: 'resumes', label: 'CVs/Resumes', icon: DocumentTextIcon },
                  { id: 'cover_letters', label: 'Cover Letters', icon: PencilIcon },
                  { id: 'uploads', label: 'Uploads', icon: FolderIcon },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setDocumentFilter(filter.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      documentFilter === filter.id
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <filter.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{filter.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* View mode toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <ViewColumnsIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <Bars3Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-3">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at-DESC">Newest First</option>
                  <option value="created_at-ASC">Oldest First</option>
                  <option value="title-ASC">Name A-Z</option>
                  <option value="title-DESC">Name Z-A</option>
                  <option value="file_size-DESC">Largest First</option>
                  <option value="file_size-ASC">Smallest First</option>
                </select>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>
            
            {/* Documents grid/list */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Try adjusting your search query' : 'Upload your first document to get started'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <UploadIcon className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                layout
                className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
                }
              >
                <AnimatePresence>
                  {documents.map((document) => (
                    <DocumentGridItem key={document.id} document={document} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}
        
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
              <p className="text-gray-600">Settings panel coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>

  );
};

export default EnterpriseDocumentManager;