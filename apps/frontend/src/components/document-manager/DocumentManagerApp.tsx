import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  FunnelIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxXMarkIcon,
  FolderPlusIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";
// import DocumentManagerIntegration from "../../services/documentManagerIntegration"; // DISABLED

// Import types
interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnailUrl?: string;
  pageCount?: number;
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "archived" | "deleted";
  source: "upload" | "ai_resume" | "pdf_editor" | "api";
  folderId?: string;
  isShared: boolean;
  viewCount: number;
  downloadCount: number;
}

interface DocumentLink {
  id: string;
  documentId: string;
  name: string;
  slug: string;
  isActive: boolean;
  expiresAt?: Date;
  currentViews: number;
  maxViews?: number;
  passwordProtected: boolean;
  allowDownload: boolean;
  createdAt: Date;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  documentCount: number;
  createdAt: Date;
}

interface Analytics {
  totalViews: number;
  uniqueViewers: number;
  totalDownloads: number;
  averageViewTime: number;
  conversionRate: number;
  viewsToday: number;
  viewsThisWeek: number;
  topDocuments: Array<{ id: string; title: string; views: number }>;
  recentActivity: Array<{
    action: string;
    document: string;
    time: Date;
    location?: string;
  }>;
}

const DocumentManagerApp: React.FC = () => {
  const { user } = useAuthStore();
  const [activeView, setActiveView] = useState<
    "documents" | "analytics" | "links" | "settings"
  >("documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    {
      id: "folder-1",
      name: "Resumes",
      color: "#3B82F6",
      documentCount: 2,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "folder-2",
      name: "Cover Letters",
      color: "#10B981",
      documentCount: 1,
      createdAt: new Date("2024-01-05"),
    },
    {
      id: "folder-3",
      name: "Projects",
      color: "#F59E0B",
      documentCount: 1,
      createdAt: new Date("2024-01-10"),
    },
  ]);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>({
    totalViews: 48,
    uniqueViewers: 12,
    totalDownloads: 11,
    averageViewTime: 45,
    conversionRate: 22.9,
    viewsToday: 8,
    viewsThisWeek: 32,
    topDocuments: [
      { id: "doc-1", title: "Sample Resume.pdf", views: 15 },
      { id: "doc-3", title: "Project Proposal.pptx", views: 25 },
      { id: "doc-2", title: "Cover Letter.docx", views: 8 },
    ],
    recentActivity: [
      {
        action: "view",
        document: "Sample Resume.pdf",
        time: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        action: "download",
        document: "Project Proposal.pptx",
        time: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        action: "share",
        document: "Cover Letter.docx",
        time: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDocument, setShareDocument] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Advanced filtering and sorting
  const [sortBy, setSortBy] = useState<
    "name" | "date" | "size" | "type" | "views"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [favoriteDocuments, setFavoriteDocuments] = useState<string[]>([]);

  // Additional state for full functionality
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3B82F6");
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "pdf">(
    "csv"
  );
  const [bulkAction, setBulkAction] = useState<
    "move" | "delete" | "share" | "archive"
  >("move");
  const [targetFolder, setTargetFolder] = useState<string>("");
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Document shared",
      message: "Your resume was viewed by 3 people",
      time: "2 minutes ago",
      read: false,
    },
    {
      id: "2",
      title: "Upload complete",
      message: "Q4 presentation.pdf uploaded successfully",
      time: "1 hour ago",
      read: true,
    },
  ]);

  // State for backend integration
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Check service availability on mount - DISABLED
  useEffect(() => {
    // Document Manager service calls disabled for now
    setServiceStatus({
      available: false,
      message: "Service temporarily disabled",
    });

    // Load mock documents on mount
    loadDocuments();
  }, []);

  // Real-time analytics subscription - DISABLED
  useEffect(() => {
    // Document Manager analytics disabled for now
    setRealTimeData(null);
  }, [selectedDocuments]);

  // Enhanced document operations with backend integration - DISABLED
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Document Manager upload disabled for now
    toast.error("Document Manager service is temporarily disabled");
    setError("Document Manager service is temporarily disabled");

    // Mock success for demo purposes
    setTimeout(() => {
      toast.success(
        `Upload functionality disabled - ${files.length} document(s) would be uploaded`
      );
      setIsLoading(false);
    }, 1000);
  };

  const loadDocuments = async () => {
    // Document Manager load documents disabled for now
    setIsLoading(false);
    setError("Document Manager service is temporarily disabled");
    toast.info(
      "Document Manager service is temporarily disabled - using mock data"
    );

    // Add mock data for demonstration
    const mockDocuments = [
      {
        id: "doc-1",
        title: "Sample Resume.pdf",
        fileName: "Sample Resume.pdf",
        fileSize: 1024 * 1024, // 1MB
        fileType: "pdf",
        thumbnailUrl: "",
        pageCount: 2,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        status: "active" as const,
        source: "upload" as const,
        folderId: undefined,
        isShared: false,
        viewCount: 15,
        downloadCount: 3,
      },
      {
        id: "doc-2",
        title: "Cover Letter.docx",
        fileName: "Cover Letter.docx",
        fileSize: 512 * 1024, // 512KB
        fileType: "docx",
        thumbnailUrl: "",
        pageCount: 1,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
        status: "active" as const,
        source: "upload" as const,
        folderId: undefined,
        isShared: true,
        viewCount: 8,
        downloadCount: 1,
      },
      {
        id: "doc-3",
        title: "Project Proposal.pptx",
        fileName: "Project Proposal.pptx",
        fileSize: 2 * 1024 * 1024, // 2MB
        fileType: "pptx",
        thumbnailUrl: "",
        pageCount: 12,
        createdAt: new Date("2024-01-05"),
        updatedAt: new Date("2024-01-05"),
        status: "active" as const,
        source: "upload" as const,
        folderId: undefined,
        isShared: false,
        viewCount: 25,
        downloadCount: 7,
      },
    ];

    setDocuments(mockDocuments);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_DOCUMENT_MANAGER_URL || "http://localhost:3002"}/api/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success("Document deleted successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Delete failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select documents first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      switch (action) {
        case "delete":
          if (
            !confirm(
              `Are you sure you want to delete ${selectedDocuments.length} document(s)?`
            )
          )
            return;

          // Document Manager delete API calls disabled for now
          // const deletePromises = selectedDocuments.map((id) =>
          //   fetch(
          //     `${process.env.REACT_APP_DOCUMENT_MANAGER_URL || "http://localhost:3002"}/api/documents/${id}`,
          //     {
          //       method: "DELETE",
          //       headers: {
          //         Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          //     },
          //   }
          // );

          // await Promise.all(deletePromises);
          setDocuments((prev) =>
            prev.filter((doc) => !selectedDocuments.includes(doc.id))
          );
          setSelectedDocuments([]);
          toast.success(
            `Successfully deleted ${selectedDocuments.length} document(s)`
          );
          break;

        case "move":
          // Implementation for bulk move
          toast.info("Bulk move will be implemented with backend integration");
          break;

        case "share":
          // Implementation for bulk share
          toast.info("Bulk share will be implemented with backend integration");
          break;

        case "archive":
          // Implementation for bulk archive
          toast.info(
            "Bulk archive will be implemented with backend integration"
          );
          break;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Bulk action failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setShowBulkActionsModal(false);
    }
  };

  const handleExport = async (format: string) => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select documents first");
      return;
    }

    // Document Manager export disabled for now
    toast.info(
      `${format.toUpperCase()} export is temporarily disabled - Document Manager service unavailable`
    );
    setShowExportModal(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For now, we'll add to local state
      // In a real implementation, this would call the backend
      const newFolder = {
        id: `folder-${Date.now()}`,
        name: newFolderName,
        color: newFolderColor,
        documentCount: 0,
        createdAt: new Date(),
      };

      setFolders((prev) => [...prev, newFolder]);
      setNewFolderName("");
      setNewFolderColor("#3B82F6");
      setShowCreateFolderModal(false);
      toast.success("Folder created successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create folder";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSelection = (documentId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map((doc) => doc.id));
    }
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFolder = !selectedFolder || doc.folderId === selectedFolder;

    const matchesFileType =
      fileTypeFilter === "all" || doc.fileType === fileTypeFilter;

    const matchesDate =
      dateFilter === "all" ||
      (() => {
        const now = new Date();
        const docDate = new Date(doc.createdAt);
        const diffDays = Math.floor(
          (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        switch (dateFilter) {
          case "today":
            return diffDays === 0;
          case "week":
            return diffDays <= 7;
          case "month":
            return diffDays <= 30;
          case "year":
            return diffDays <= 365;
          default:
            return true;
        }
      })();

    const matchesSize =
      sizeFilter === "all" ||
      (() => {
        const sizeMB = doc.fileSize / (1024 * 1024);
        switch (sizeFilter) {
          case "small":
            return sizeMB < 1;
          case "medium":
            return sizeMB >= 1 && sizeMB < 10;
          case "large":
            return sizeMB >= 10;
          default:
            return true;
        }
      })();

    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return (
      matchesSearch &&
      matchesFolder &&
      matchesFileType &&
      matchesDate &&
      matchesSize &&
      matchesStatus
    );
  });

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case "name":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case "date":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "size":
        aValue = a.fileSize;
        bValue = b.fileSize;
        break;
      case "type":
        aValue = a.fileType;
        bValue = b.fileType;
        break;
      case "views":
        aValue = a.viewCount;
        bValue = b.viewCount;
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleShare = (document: Document) => {
    setShareDocument(document);
    setShowShareModal(true);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const toggleFavorite = (documentId: string) => {
    setFavoriteDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Document Manager - Print View</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .document { border: 1px solid #ccc; padding: 15px; margin: 10px 0; }
              .title { font-weight: bold; font-size: 18px; }
              .details { color: #666; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Document Manager</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            ${sortedDocuments
              .map(
                (doc) => `
              <div class="document">
                <div class="title">${doc.title}</div>
                <div class="details">
                  File: ${doc.fileName} | Size: ${formatFileSize(doc.fileSize)} | 
                  Type: ${doc.fileType} | Views: ${doc.viewCount} | 
                  Downloads: ${doc.downloadCount}
                </div>
              </div>
            `
              )
              .join("")}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    setShowPrintModal(false);
  };

  // Get appropriate icon for file type
  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <DocumentIcon className="w-16 h-16 text-red-400" />;
      case "doc":
      case "docx":
        return <DocumentIcon className="w-16 h-16 text-blue-400" />;
      case "xls":
      case "xlsx":
        return <DocumentIcon className="w-16 h-16 text-green-400" />;
      case "ppt":
      case "pptx":
        return <DocumentIcon className="w-16 h-16 text-orange-400" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <PhotoIcon className="w-16 h-16 text-purple-400" />;
      case "mp4":
      case "avi":
      case "mov":
        return <FilmIcon className="w-16 h-16 text-pink-400" />;
      case "mp3":
      case "wav":
      case "flac":
        return <MusicalNoteIcon className="w-16 h-16 text-indigo-400" />;
      case "zip":
      case "rar":
      case "7z":
        return <ArchiveBoxXMarkIcon className="w-16 h-16 text-yellow-400" />;
      default:
        return <DocumentIcon className="w-16 h-16 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      {/* Header */}
      <div className="glass-dark border-b border-white/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center justify-between lg:justify-start">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-glow-sm">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">
                  Document Manager
                </h1>
                <p className="text-sm text-gray-400">
                  Enterprise-grade document sharing & analytics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end space-x-2 lg:space-x-4">
            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBulkActionsModal(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Bulk Actions"
                disabled={selectedDocuments.length === 0}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Export Data"
              >
                <DownloadIcon className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Print View"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Document Stats */}
            <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <EyeIcon className="w-4 h-4" />
                <span>
                  {documents.reduce(
                    (acc: number, doc: Document) => acc + doc.viewCount,
                    0
                  )}{" "}
                  total views
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <DownloadIcon className="w-4 h-4" />
                <span>
                  {documents.reduce(
                    (acc: number, doc: Document) => acc + doc.downloadCount,
                    0
                  )}{" "}
                  downloads
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <ShareIcon className="w-4 h-4" />
                <span>
                  {documents.filter((doc: Document) => doc.isShared).length}{" "}
                  shared
                </span>
              </div>
            </div>

            {/* Clean Professional Actions */}
            <div className="flex items-center space-x-3">
              {/* Simple Document Counter */}
              <div className="hidden md:flex items-center px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
                <span className="text-white text-sm font-medium">
                  {documents.length} documents
                </span>
              </div>

              {/* Clean Action Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowNotificationsPanel(true)}
                  className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <BellIcon className="w-5 h-5" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full"></div>
                </button>

                <button
                  onClick={() => setShowHelpPanel(true)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Help & Support"
                >
                  <InformationCircleIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowSettingsPanel(true)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Settings"
                >
                  <CogIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Toolbar */}
      <div className="glass-dark border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          {/* Left side - Search and basic filters */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-primary"
              />
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showAdvancedFilters
                  ? "bg-accent-primary text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Advanced Filters"
            >
              <FunnelIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Right side - Sorting and view options */}
          <div className="flex items-center justify-between lg:justify-end space-x-3">
            {/* Sort options */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
                <option value="views">Views</option>
              </select>

              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
              >
                {sortOrder === "asc" ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent-primary text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Grid View"
              >
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-accent-primary text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="List View"
              >
                <Bars3Icon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary-dark px-4 py-2 flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 px-3 sm:px-4 lg:px-8 py-4 bg-white/5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* File Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  File Type
                </label>
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
                >
                  <option value="all">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="doc">Word</option>
                  <option value="xls">Excel</option>
                  <option value="ppt">PowerPoint</option>
                  <option value="txt">Text</option>
                  <option value="jpg">Image</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Date
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {/* Size Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Size
                </label>
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
                >
                  <option value="all">All Sizes</option>
                  <option value="small">&lt; 1 MB</option>
                  <option value="medium">1-10 MB</option>
                  <option value="large">&gt; 10 MB</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFileTypeFilter("all");
                    setDateFilter("all");
                    setSizeFilter("all");
                    setStatusFilter("all");
                  }}
                  className="w-full px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex transition-all duration-300 h-full">
        {/* Simple, Clean Sidebar */}
        <div
          className={`${sidebarOpen ? "w-full sm:w-64" : "w-0"} overflow-hidden transition-all duration-300 bg-white/5 backdrop-blur-sm border-r border-white/10 fixed sm:relative inset-0 z-50 sm:z-auto`}
        >
          <div className="p-3 sm:p-4">
            {/* Mobile Close Button */}
            <div className="flex justify-end sm:hidden mb-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Simple Navigation */}
            <nav className="space-y-1 mb-6">
              {[
                {
                  id: "documents",
                  label: "Documents",
                  icon: DocumentTextIcon,
                  count: documents.length,
                },
                { id: "analytics", label: "Analytics", icon: ChartBarIcon },
                {
                  id: "links",
                  label: "Shared Links",
                  icon: ShareIcon,
                  count: links.length,
                },
                { id: "settings", label: "Settings", icon: CogIcon },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    activeView === item.id
                      ? "bg-accent-primary text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.count && (
                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Simple Folders */}
            {activeView === "documents" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400">Folders</h3>
                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="New Folder"
                  >
                    <FolderPlusIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Simple Folder List */}
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      !selectedFolder
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="w-4 h-4" />
                      <span>All Documents</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                      {documents.length}
                    </span>
                  </button>

                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        selectedFolder === folder.id
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: folder.color }}
                        ></div>
                        <span>{folder.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                        {folder.documentCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 pb-8 overflow-y-auto min-h-0">
          {activeView === "documents" && (
            <div>
              {/* Results Summary */}
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedDocuments.length === sortedDocuments.length &&
                          sortedDocuments.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-accent-primary bg-white/5 border-white/10 rounded focus:ring-accent-primary"
                      />
                      <span className="text-sm text-gray-400">Select All</span>
                    </label>
                    {selectedDocuments.length > 0 && (
                      <span className="text-sm text-accent-primary">
                        {selectedDocuments.length} selected
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Showing {sortedDocuments.length} of {documents.length}{" "}
                    documents
                    {selectedFolder &&
                      ` in ${folders.find((f) => f.id === selectedFolder)?.name}`}
                  </div>
                </div>
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400">
                  <span>Sort by: {sortBy}</span>
                  <span>•</span>
                  <span>
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                  </span>
                </div>
              </div>

              {/* Documents Grid/List */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                  {sortedDocuments.map((document) => (
                    <motion.div
                      key={document.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`card-glass-dark hover:shadow-glow-md transition-all duration-300 group h-full flex flex-col overflow-hidden cursor-pointer ${
                        selectedDocuments.includes(document.id)
                          ? "ring-2 ring-accent-primary"
                          : ""
                      }`}
                      onClick={() => handleDocumentSelection(document.id)}
                    >
                      {/* Document Preview */}
                      <div className="w-full h-48 bg-gray-700 overflow-hidden relative group flex-shrink-0">
                        {document.thumbnailUrl ? (
                          <img
                            src={document.thumbnailUrl}
                            alt={document.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                            {getFileTypeIcon(document.fileType)}
                          </div>
                        )}

                        {/* Favorite Button */}
                        <button
                          onClick={() => toggleFavorite(document.id)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all duration-200 z-10"
                        >
                          {favoriteDocuments.includes(document.id) ? (
                            <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <StarOutlineIcon className="w-4 h-4" />
                          )}
                        </button>

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-1 sm:space-x-2">
                          <button className="p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors">
                            <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleShare(document)}
                            className="p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                          >
                            <ShareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button className="p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors">
                            <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>

                        {/* Status Badges */}
                        {document.isShared && (
                          <div className="absolute top-2 left-2 bg-accent-primary/20 backdrop-blur-sm border border-accent-primary/30 rounded-full px-2 py-1">
                            <ShareIcon className="w-3 h-3 text-accent-primary inline mr-1" />
                            <span className="text-xs text-accent-primary">
                              Shared
                            </span>
                          </div>
                        )}

                        {document.source !== "upload" && (
                          <div className="absolute top-2 right-2 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-2 py-1">
                            <span className="text-xs text-blue-400">
                              {document.source === "ai_resume"
                                ? "AI Resume"
                                : "PDF Editor"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="space-y-3 flex-1 p-5">
                        <h3
                          className="font-semibold text-white truncate"
                          title={document.title}
                        >
                          {document.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span>{formatFileSize(document.fileSize)}</span>
                          <span>{document.pageCount} pages</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(document.createdAt)}</span>
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <EyeIcon className="w-3 h-3 mr-2" />
                              {document.viewCount}
                            </span>
                            <span className="flex items-center">
                              <DownloadIcon className="w-3 h-3 mr-2" />
                              {document.downloadCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/10 p-5">
                        <div className="flex items-center space-x-2">
                          <button className="text-gray-400 hover:text-white transition-colors">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShare(document)}
                            className="text-gray-400 hover:text-accent-primary transition-colors"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-white transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedDocuments.map((document) => (
                    <motion.div
                      key={document.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="card-glass-dark p-4 hover:shadow-glow-md transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-16 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                          <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">
                            {document.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {document.fileName}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span>{formatFileSize(document.fileSize)}</span>
                            <span>{document.pageCount} pages</span>
                            <span>{formatDate(document.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                          <div className="text-center">
                            <div className="font-semibold text-white">
                              {document.viewCount}
                            </div>
                            <div className="text-xs">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-white">
                              {document.downloadCount}
                            </div>
                            <div className="text-xs">Downloads</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {document.isShared && (
                            <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
                          )}
                          <button className="text-gray-400 hover:text-white transition-colors p-1">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShare(document)}
                            className="text-gray-400 hover:text-accent-primary transition-colors p-1"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-white transition-colors p-1">
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(document.id)}
                            className="text-gray-400 hover:text-red-400 transition-colors p-1"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {sortedDocuments.length === 0 && (
                <div className="text-center py-12">
                  <DocumentTextIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">
                    No documents found
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "Upload your first document to get started"}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeView === "analytics" && analytics && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                Analytics Dashboard
              </h2>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: "Total Views",
                    value: analytics.totalViews,
                    icon: EyeIcon,
                    color: "blue",
                  },
                  {
                    label: "Unique Viewers",
                    value: analytics.uniqueViewers,
                    icon: UserGroupIcon,
                    color: "green",
                  },
                  {
                    label: "Downloads",
                    value: analytics.totalDownloads,
                    icon: DownloadIcon,
                    color: "purple",
                  },
                  {
                    label: "Avg. View Time",
                    value: `${Math.floor(analytics.averageViewTime / 60)}m ${analytics.averageViewTime % 60}s`,
                    icon: ClockIcon,
                    color: "orange",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-glass-dark p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}
                      >
                        <stat.icon
                          className={`w-6 h-6 text-${stat.color}-400`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Top Documents */}
              <div className="card-glass-dark p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Top Performing Documents
                </h3>
                <div className="space-y-3">
                  {analytics.topDocuments.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-accent-primary/20 rounded-lg flex items-center justify-center text-accent-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-white">{doc.title}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <EyeIcon className="w-4 h-4" />
                        <span>{doc.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card-glass-dark p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {analytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        {activity.action === "viewed" && (
                          <EyeIcon className="w-4 h-4 text-accent-primary" />
                        )}
                        {activity.action === "downloaded" && (
                          <DownloadIcon className="w-4 h-4 text-accent-primary" />
                        )}
                        {activity.action === "shared" && (
                          <ShareIcon className="w-4 h-4 text-accent-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white">
                          <span className="font-semibold capitalize">
                            {activity.action}
                          </span>{" "}
                          "{activity.document}"
                        </p>
                        <div className="flex items-center space-x-3 text-sm text-gray-400 mt-1">
                          <span>{activity.time.toLocaleTimeString()}</span>
                          {activity.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <MapPinIcon className="w-3 h-3 mr-1" />
                                {activity.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === "links" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Shared Links</h2>
                <button className="btn-primary-dark px-4 py-2 flex items-center space-x-2">
                  <PlusIcon className="w-5 h-5" />
                  <span>Create Link</span>
                </button>
              </div>

              <div className="space-y-4">
                {links.map((link) => {
                  const document = documents.find(
                    (d) => d.id === link.documentId
                  );
                  return (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card-glass-dark p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-white">
                              {link.name}
                            </h3>
                            {link.passwordProtected && (
                              <LockClosedIcon className="w-4 h-4 text-yellow-400" />
                            )}
                            {!link.isActive && (
                              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs">
                                Inactive
                              </span>
                            )}
                          </div>

                          <p className="text-gray-400 mb-3">
                            Document: {document?.title}
                          </p>

                          <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-2 mb-4">
                            <span className="text-gray-400 text-sm">
                              https://docs.airesumesuite.com/
                            </span>
                            <span className="text-white text-sm font-mono">
                              {link.slug}
                            </span>
                            <button className="ml-2 p-1 text-gray-400 hover:text-white transition-colors">
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <EyeIcon className="w-4 h-4" />
                              <span>{link.currentViews} views</span>
                              {link.maxViews && <span>/ {link.maxViews}</span>}
                            </div>

                            {link.expiresAt && (
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>
                                  Expires {formatDate(link.expiresAt)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>Created {formatDate(link.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <ChartBarIcon className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <CogIcon className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <div className="card-glass-dark p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  General Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-white font-medium">
                        Enable Analytics
                      </label>
                      <p className="text-gray-400 text-sm">
                        Track views and engagement metrics
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-white font-medium">
                        Auto-expire Links
                      </label>
                      <p className="text-gray-400 text-sm">
                        Automatically expire links after 30 days
                      </p>
                    </div>
                    <input type="checkbox" className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-white font-medium">
                        Email Notifications
                      </label>
                      <p className="text-gray-400 text-sm">
                        Get notified when documents are viewed
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && shareDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Share Document
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Link Name
                  </label>
                  <input
                    type="text"
                    defaultValue={shareDocument.title}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom URL
                  </label>
                  <div className="flex items-center">
                    <span className="text-gray-400 text-sm bg-white/5 px-3 py-2 rounded-l-lg border border-r-0 border-white/10">
                      docs.airesumesuite.com/
                    </span>
                    <input
                      type="text"
                      placeholder="custom-slug"
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-r-lg text-white focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Password Protection</span>
                    <input type="checkbox" className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Allow Downloads</span>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 btn-primary-dark px-4 py-2">
                    Create Link
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Modal */}
      <AnimatePresence>
        {showBulkActionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBulkActionsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Bulk Actions ({selectedDocuments.length} documents)
                </h3>
                <button
                  onClick={() => setShowBulkActionsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Action
                  </label>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  >
                    <option value="move">Move to Folder</option>
                    <option value="delete">Delete</option>
                    <option value="share">Share</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>

                {bulkAction === "move" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Target Folder
                    </label>
                    <select
                      value={targetFolder}
                      onChange={(e) => setTargetFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                    >
                      <option value="">Select a folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={() => setShowBulkActionsModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBulkAction(bulkAction)}
                    disabled={bulkAction === "move" && !targetFolder}
                    className="flex-1 btn-primary-dark px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Action
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Export Documents
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>

                <div className="text-sm text-gray-400">
                  Exporting {sortedDocuments.length} documents as{" "}
                  {exportFormat.toUpperCase()}
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExport(exportFormat)}
                    className="flex-1 btn-primary-dark px-4 py-2"
                  >
                    Export
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Modal */}
      <AnimatePresence>
        {showPrintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPrintModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Print Documents
                </h3>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-400">
                  Print {sortedDocuments.length} documents in a clean, formatted
                  layout
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 btn-primary-dark px-4 py-2"
                  >
                    Print
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {showCreateFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCreateFolderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Create New Folder
                </h3>
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Folder Color
                  </label>
                  <input
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={() => setShowCreateFolderModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 btn-primary-dark px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Folder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotificationsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNotificationsPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Notifications
                </h3>
                <button
                  onClick={() => setShowNotificationsPanel(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.read
                        ? "bg-white/5 border-white/10"
                        : "bg-accent-primary/10 border-accent-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {notification.time}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-accent-primary rounded-full ml-3 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelpPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowHelpPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Help & Support
                </h3>
                <button
                  onClick={() => setShowHelpPanel(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-3">
                    Getting Started
                  </h4>
                  <div className="space-y-2 text-gray-300">
                    <p>• Upload documents by clicking the Upload button</p>
                    <p>• Organize files into folders for better management</p>
                    <p>• Use advanced filters to find specific documents</p>
                    <p>• Share documents with others using the share feature</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">
                    Keyboard Shortcuts
                  </h4>
                  <div className="space-y-2 text-gray-300">
                    <p>
                      •{" "}
                      <kbd className="px-2 py-1 bg-white/10 rounded text-sm">
                        Ctrl + A
                      </kbd>{" "}
                      Select all documents
                    </p>
                    <p>
                      •{" "}
                      <kbd className="px-2 py-1 bg-white/10 rounded text-sm">
                        Delete
                      </kbd>{" "}
                      Delete selected documents
                    </p>
                    <p>
                      •{" "}
                      <kbd className="px-2 py-1 bg-white/10 rounded text-sm">
                        Ctrl + F
                      </kbd>{" "}
                      Focus search
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">
                    Need More Help?
                  </h4>
                  <div className="space-y-2 text-gray-300">
                    <p>• Contact support: support@airesumesuite.com</p>
                    <p>• View documentation: docs.airesumesuite.com</p>
                    <p>• Join our community forum</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettingsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSettingsPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-glass-dark p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Settings</h3>
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-3">
                    Display Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Default View Mode</span>
                      <select className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                        <option value="grid">Grid</option>
                        <option value="list">List</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        Show File Extensions
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="toggle"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">
                    Security Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        Require Password for Downloads
                      </span>
                      <input type="checkbox" className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        Auto-expire Shared Links
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="toggle"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">
                    Notifications
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Email Notifications</span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="toggle"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        Document View Alerts
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="toggle"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentManagerApp;
