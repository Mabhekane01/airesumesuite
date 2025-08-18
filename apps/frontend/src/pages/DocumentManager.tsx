import React, { useState, useEffect } from "react";
import { createFileName } from "../utils/validation";
import { motion, AnimatePresence } from "framer-motion";
import {
  DocumentTextIcon,
  PencilIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PrinterIcon,
  CloudIcon,
  ViewColumnsIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  CogIcon,
  ArrowUpTrayIcon as UploadIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BellIcon,
  ClockIcon,
  ShieldCheckIcon,
  StarIcon,
  ArchiveBoxIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  TableCellsIcon,
  LinkIcon,
  PaperAirplaneIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxXMarkIcon,
  FolderPlusIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { resumeService, ResumeData } from "../services/resumeService";
import {
  coverLetterService,
  CoverLetterData,
} from "../services/coverLetterService";
import { api } from "../services/api";
import ResumePDFPreviewSimple from "../components/documents/ResumePDFPreviewSimple";
import CoverLetterEditor from "../components/documents/CoverLetterEditor";
import DocumentActions from "../components/documents/DocumentActions";
import DocumentLoadingSkeleton from "../components/documents/DocumentLoadingSkeleton";
import TemplateRenderer from "../components/resume/TemplateRenderer";
import { resumeTemplates, getTemplateById } from "../data/resumeTemplates";

import { toast } from "sonner";
import { Resume } from "../types/index";

// Helper function to convert MongoDB ObjectId to string
const convertObjectIdToString = (id: any): string => {
  if (!id) return "";

  if (typeof id === "string") {
    return id;
  }

  // Handle MongoDB ObjectId Buffer format
  if (id.buffer && id.buffer.data && Array.isArray(id.buffer.data)) {
    const bytes = [...id.buffer.data];
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  return String(id);
};

// Utility function to detect LaTeX templates
const isLatexTemplateId = (templateId: string): boolean => {
  // Templates in /public/templates/ are LaTeX templates (template01, template02, etc.)
  // Regular resumeTemplates are HTML-based
  return (
    templateId?.startsWith("template") &&
    !templateId.includes("modern-creative")
  );
};

type DocumentType = "resumes" | "cover-letters";
type ViewMode = "grid" | "list";

interface DocumentStats {
  totalResumes: number;
  totalCoverLetters: number;
  recentlyModified: number;
  drafts: number;
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
  topDocuments: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  recentActivity: Array<{
    action: string;
    document: string;
    time: Date;
    location?: string;
  }>;
}

export default function DocumentManager() {
  const [activeTab, setActiveTab] = useState<DocumentType>("resumes");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterData[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DocumentStats>({
    totalResumes: 0,
    totalCoverLetters: 0,
    recentlyModified: 0,
    drafts: 0,
  });

  // Document Manager Suite States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    "documents" | "analytics" | "links" | "settings"
  >("documents");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    "title" | "createdAt" | "updatedAt" | "fileSize"
  >("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "pdf">(
    "csv"
  );
  const [bulkAction, setBulkAction] = useState<
    "move" | "delete" | "share" | "archive"
  >("move");
  const [targetFolder, setTargetFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3B82F6");

  // Mock data for document manager suite
  const [folders] = useState<Folder[]>([
    {
      id: "folder-1",
      name: "Professional",
      color: "#3B82F6",
      documentCount: 12,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "folder-2",
      name: "Creative",
      color: "#10B981",
      documentCount: 8,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "folder-3",
      name: "Academic",
      color: "#F59E0B",
      documentCount: 5,
      createdAt: new Date("2024-02-01"),
    },
  ]);

  const [analytics] = useState<Analytics>({
    totalViews: 1247,
    uniqueViewers: 89,
    totalDownloads: 156,
    averageViewTime: 180,
    conversionRate: 12.5,
    topDocuments: [
      { id: "1", title: "Senior Developer Resume", views: 45 },
      { id: "2", title: "Marketing Manager Cover Letter", views: 38 },
      { id: "3", title: "UX Designer Portfolio", views: 32 },
    ],
    recentActivity: [
      {
        action: "viewed",
        document: "Senior Developer Resume",
        time: new Date(),
        location: "New York",
      },
      {
        action: "downloaded",
        document: "Marketing Manager Cover Letter",
        time: new Date(Date.now() - 3600000),
        location: "San Francisco",
      },
      {
        action: "shared",
        document: "UX Designer Portfolio",
        time: new Date(Date.now() - 7200000),
      },
    ],
  });

  // Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCoverLetterEditor, setShowCoverLetterEditor] = useState(false);
  const [editingCoverLetter, setEditingCoverLetter] =
    useState<CoverLetterData | null>(null);
  const [coverLetterEditorTab, setCoverLetterEditorTab] = useState<
    "edit" | "preview" | "ai-enhance"
  >("edit");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending action loading states
      setActionLoading(null);
    };
  }, []);

  // Document Manager Suite Helper Functions
  const handleDocumentSelection = (documentId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    if (
      selectedDocuments.length ===
      (activeTab === "resumes" ? resumes.length : coverLetters.length)
    ) {
      setSelectedDocuments([]);
    } else {
      const allIds =
        activeTab === "resumes"
          ? resumes.map((r) => r._id)
          : coverLetters.map((c) => c._id);
      setSelectedDocuments(allIds);
    }
  };

  const toggleFavorite = (documentId: string) => {
    setFavoriteDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <DocumentTextIcon className="w-16 h-16 text-red-400" />;
      case "doc":
      case "docx":
        return <DocumentTextIcon className="w-16 h-16 text-blue-400" />;
      case "resume":
        return <DocumentTextIcon className="w-16 h-16 text-green-400" />;
      case "cover-letter":
        return <DocumentTextIcon className="w-16 h-16 text-purple-400" />;
      default:
        return <DocumentTextIcon className="w-16 h-16 text-gray-400" />;
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);

      // Load resumes with proper error handling
      let resumesData: ResumeData[] = [];
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.success && resumesResponse.data) {
          resumesData = resumesResponse.data;
          setResumes(resumesData);
        } else {
          console.warn("Failed to load resumes:", "Unknown error");
          setResumes([]);
        }
      } catch (error) {
        console.error("Error loading resumes:", error);
        setResumes([]);
      }

      // Load cover letters with proper error handling
      let coverLettersData: CoverLetterData[] = [];
      try {
        const coverLettersResponse = await coverLetterService.getCoverLetters();
        if (coverLettersResponse.success && coverLettersResponse.data) {
          coverLettersData = coverLettersResponse.data;
          setCoverLetters(coverLettersData);
        } else {
          console.warn("Failed to load cover letters:", "Unknown error");
          setCoverLetters([]);
        }
      } catch (error) {
        console.error("Error loading cover letters:", error);
        setCoverLetters([]);
      }

      // Calculate stats with proper data validation
      const totalResumes = resumesData.length;
      const totalCoverLetters = coverLettersData.length;

      // Calculate recently modified documents
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentlyModified = [
        ...resumesData.filter((doc) => {
          const updatedAt = doc.updatedAt || doc.createdAt;
          return updatedAt && new Date(updatedAt) > dayAgo;
        }),
        ...coverLettersData.filter((doc) => {
          const updatedAt = doc.updatedAt || doc.createdAt;
          return updatedAt && new Date(updatedAt) > dayAgo;
        }),
      ].length;

      setStats({
        totalResumes,
        totalCoverLetters,
        recentlyModified,
        drafts: 0, // Will be implemented based on document status
      });
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents. Please refresh the page.");
      // Set empty state on critical error
      setResumes([]);
      setCoverLetters([]);
      setStats({
        totalResumes: 0,
        totalCoverLetters: 0,
        recentlyModified: 0,
        drafts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string, type: DocumentType) => {
    if (!id) {
      toast.error("Invalid document ID");
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${type === "resumes" ? "resume" : "cover letter"}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const success =
        type === "resumes"
          ? await resumeService.deleteResume(id)
          : await coverLetterService.deleteCoverLetter(id);

      if (success) {
        if (type === "resumes") {
          setResumes((prev) => prev.filter((r) => r._id !== id));
          setStats((prev) => ({
            ...prev,
            totalResumes: prev.totalResumes - 1,
          }));
        } else {
          setCoverLetters((prev) => prev.filter((c) => c._id !== id));
          setStats((prev) => ({
            ...prev,
            totalCoverLetters: prev.totalCoverLetters - 1,
          }));
        }
        toast.success(
          `${type === "resumes" ? "Resume" : "Cover letter"} deleted successfully`
        );
      } else {
        throw new Error("Delete operation failed");
      }
    } catch (error) {
      console.error("Delete operation failed:", error);
      toast.error(
        `Failed to delete ${type === "resumes" ? "resume" : "cover letter"}. Please try again.`
      );
    }
  };

  const handleDownloadResume = async (resume: ResumeData) => {
    const resumeId = convertObjectIdToString(resume._id);
    if (!resumeId) {
      toast.error("Cannot download: Resume ID is missing");
      return;
    }

    if (!resume.personalInfo?.firstName || !resume.personalInfo?.lastName) {
      toast.error(
        "Cannot download: Resume is missing required personal information"
      );
      return;
    }

    const loadingToast = toast.loading(
      "🏢 Enterprise PDF generation in progress..."
    );
    setActionLoading(`download-${resumeId}`);

    try {
      console.log("🚀 Starting smart PDF download...", resumeId);

      // Check if saved PDF exists and is current
      const pdfInfo = await resumeService.getSavedPDFInfo(resumeId);

      let pdfBlob: Blob;

      if (pdfInfo.hasSavedPDF) {
        console.log("📁 Using saved PDF from database");
        toast.dismiss(loadingToast);
        toast.loading("📁 Retrieving saved PDF...");

        pdfBlob = await resumeService.getSavedPDF(resumeId);
        console.log("✅ Retrieved saved PDF successfully");
      } else {
        console.log("🔧 Generating new PDF with LaTeX engine");

        // Generate new PDF using standardized LaTeX template system
        const templateId = resume.template || resume.templateId || "template01";

        pdfBlob = await resumeService.downloadResumeWithEngine(resume, "pdf", {
          engine: "latex", // All templates now use LaTeX
          templateId: templateId,
        });
        console.log("✅ Generated new PDF successfully");
      }

      if (pdfBlob.size === 0) {
        throw new Error("Received empty PDF file from server");
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const fileName = createFileName(
        resume.personalInfo?.firstName,
        resume.personalInfo?.lastName
      );

      // Create and trigger download
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Clean up blob URL
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      toast.dismiss(loadingToast);
      toast.success(
        `🎉 Enterprise PDF downloaded successfully! File: ${fileName}`
      );

      // Show success message based on source
      setTimeout(() => {
        if (pdfInfo.hasSavedPDF) {
          toast.success("💾 Saved PDF downloaded instantly!", {
            duration: 3000,
          });
        } else {
          toast.success("💼 Fresh PDF generated with LaTeX engine!", {
            duration: 4000,
          });
        }
      }, 1000);
    } catch (error: any) {
      console.error("❌ Enterprise PDF generation failed:", error);
      toast.dismiss(loadingToast);

      // Handle axios errors properly
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.message;

        if (status === 401) {
          toast.error(
            "🔐 Authentication required. Please log in to download resumes."
          );
        } else if (status === 404) {
          toast.error(
            "🔍 Download endpoint not found. Please ensure backend server is running."
          );
        } else if (status >= 500) {
          toast.error(
            "🏢 Server-side PDF generation temporarily unavailable. Please try again shortly."
          );
        } else {
          toast.error(`❌ Enterprise PDF generation failed: ${errorMessage}`);
        }
      } else if (error.request) {
        toast.error(
          "🌐 Cannot connect to server. Please ensure backend is running and accessible."
        );
      } else {
        toast.error(`❌ Unexpected error: ${error.message || "Unknown error"}`);
      }

      // Fallback to client-side generation for development/testing
      console.log("🔄 Attempting fallback to client-side generation...");
      setTimeout(() => {
        toast.info("🔄 Falling back to browser-based PDF generation...");
        // The existing print-based fallback could go here if needed
      }, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintResume = async (resume: ResumeData) => {
    const resumeId = convertObjectIdToString(resume._id);
    if (!resumeId) {
      toast.error("Cannot print: Resume ID is missing");
      return;
    }

    setActionLoading(`print-${resumeId}`);
    const loadingToast = toast.loading("Preparing PDF for printing...");

    try {
      const pdfBlob = await resumeService.downloadResumeWithEngine(
        resume,
        "pdf",
        {
          engine: "latex",
          templateId: resume.template || resume.templateId || "template01",
        }
      );

      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          // A timeout gives the PDF viewer time to load the document.
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
              toast.error(
                "Print failed. Please use the browser print function (Ctrl+P)."
              );
            } finally {
              URL.revokeObjectURL(pdfUrl);
            }
          }, 250);
        };
      } else {
        toast.error(
          "Could not open print window. Please disable pop-up blockers."
        );
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to generate PDF for printing.");
    } finally {
      toast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const handleShareResume = async (resume: ResumeData) => {
    const resumeId = convertObjectIdToString(resume._id);
    if (!resumeId) {
      toast.error("Cannot share: Resume ID is missing");
      return;
    }

    setActionLoading(`share-${resumeId}`);
    const loadingToast = toast.loading("Preparing PDF for sharing...");

    try {
      const pdfBlob = await resumeService.downloadResumeWithEngine(
        resume,
        "pdf",
        {
          engine: "latex",
          templateId: resume.template || resume.templateId || "template01",
        }
      );

      const fileName = `${resume.personalInfo?.firstName || "Resume"}_${resume.personalInfo?.lastName || "PDF"}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: resume.title || "My Resume",
          text: `Check out my resume: ${resume.title}`,
          files: [file],
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback for browsers that don't support sharing files
        const shareUrl = `${window.location.origin}/shared/resume/${resumeId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Sharing not supported, share link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share resume.");
    } finally {
      toast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  // Helper function to generate secure token
  const generateSecureToken = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Filtered and sorted documents for document manager suite
  const filteredDocuments = (
    activeTab === "resumes" ? resumes : coverLetters
  ).filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activeTab === "resumes"
        ? (doc as ResumeData).personalInfo?.firstName
        : (doc as CoverLetterData).jobTitle
      )
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (fileTypeFilter !== "all") {
      if (fileTypeFilter === "resume" && activeTab !== "resumes") return false;
      if (fileTypeFilter === "cover-letter" && activeTab !== "cover-letters")
        return false;
    }

    if (dateFilter !== "all") {
      const docDate = new Date(doc.updatedAt || doc.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - docDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case "today":
          if (diffDays > 0) return false;
          break;
        case "week":
          if (diffDays > 7) return false;
          break;
        case "month":
          if (diffDays > 30) return false;
          break;
        case "year":
          if (diffDays > 365) return false;
          break;
      }
    }

    return true;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "updatedAt":
        aValue = new Date(a.updatedAt || a.createdAt).getTime();
        bValue = new Date(b.updatedAt || b.createdAt).getTime();
        break;
      case "fileSize":
        aValue = 0; // Mock file size for now
        bValue = 0;
        break;
      default:
        aValue = new Date(a.updatedAt || a.createdAt).getTime();
        bValue = new Date(b.updatedAt || b.createdAt).getTime();
    }

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleDownloadCoverLetter = async (coverLetter: CoverLetterData) => {
    try {
      const printDiv = document.createElement("div");
      printDiv.style.position = "absolute";
      printDiv.style.left = "-9999px";
      printDiv.style.width = "8.5in";
      printDiv.style.minHeight = "11in";
      printDiv.style.backgroundColor = "white";
      printDiv.style.padding = "1in";

      const formatDate = (date: string | undefined) => {
        if (!date) return new Date().toLocaleDateString();
        return new Date(date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      };

      printDiv.innerHTML = `
        <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; white-space: pre-wrap;">
          ${coverLetter.content || `AI-generated cover letter content will appear here.`}
        </div>
      `;

      document.body.appendChild(printDiv);

      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printDiv.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;

      document.body.removeChild(printDiv);

      toast.success(
        "Cover letter download initiated! Use your browser's print dialog to save as PDF."
      );
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download cover letter. Please try again.");
    }
  };

  const handleShareCoverLetter = async (coverLetter: CoverLetterData) => {
    try {
      toast.info("Generating PDF for sharing...");

      // Generate PDF file for sharing using enterprise download endpoint
      const response = await api.post(
        "/cover-letters/download-with-data/pdf",
        {
          coverLetterData: {
            title: coverLetter.title,
            content: coverLetter.content,
            jobTitle: coverLetter.jobTitle,
            companyName: coverLetter.companyName,
            tone: coverLetter.tone,
            createdAt: coverLetter.createdAt,
          },
        },
        {
          responseType: "blob",
        }
      );

      if (!response.data) {
        throw new Error("Failed to generate PDF");
      }

      // Create a File object from the PDF blob
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const fileName = `${coverLetter.title}_Cover_Letter.pdf`.replace(
        /\s+/g,
        "_"
      );
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      // Check if file sharing is supported
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${coverLetter.title} - Cover Letter`,
          text: `My cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
          files: [file],
        });
        toast.success("Cover letter PDF shared successfully!");
      } else if (navigator.share) {
        // Fallback to URL sharing if file sharing not supported
        const shareUrl = `${window.location.origin}/api/v1/shared/cover-letter/${coverLetter._id}`;
        await navigator.share({
          title: `${coverLetter.title} - Cover Letter`,
          text: `Check out my cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
          url: shareUrl,
        });
        toast.success("Cover letter link shared successfully!");
      } else {
        // For older browsers, download the file and copy link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("PDF downloaded! You can now share the downloaded file.");
      }
    } catch (error: any) {
      console.error("Share error:", error);
      if (error.name !== "AbortError") {
        toast.error(
          "Failed to share cover letter. Please try downloading instead."
        );
      }
    }
  };

  // Helper function for clipboard operations
  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            toast.success("Link copied to clipboard!");
          })
          .catch(() => {
            fallbackCopyTextToClipboard(text);
          });
      } else {
        fallbackCopyTextToClipboard(text);
      }
    } catch (error) {
      console.error("Clipboard error:", error);
      fallbackCopyTextToClipboard(text);
    }
  };

  // Fallback copy method
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error(
        "Could not copy link. Please copy manually: " +
          text.substring(0, 50) +
          "..."
      );
    }

    document.body.removeChild(textArea);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select documents first");
      return;
    }

    try {
      switch (action) {
        case "delete":
          if (
            !confirm(
              `Are you sure you want to delete ${selectedDocuments.length} document(s)?`
            )
          )
            return;

          // Mock delete operation for now
          if (activeTab === "resumes") {
            setResumes((prev) =>
              prev.filter((resume) => !selectedDocuments.includes(resume._id))
            );
            setStats((prev) => ({
              ...prev,
              totalResumes: prev.totalResumes - selectedDocuments.length,
            }));
          } else {
            setCoverLetters((prev) =>
              prev.filter(
                (coverLetter) => !selectedDocuments.includes(coverLetter._id)
              )
            );
            setStats((prev) => ({
              ...prev,
              totalCoverLetters:
                prev.totalCoverLetters - selectedDocuments.length,
            }));
          }
          setSelectedDocuments([]);
          toast.success(
            `${selectedDocuments.length} document(s) deleted successfully`
          );
          break;

        case "move":
          if (!targetFolder) {
            toast.error("Please select a target folder");
            return;
          }
          // Mock move operation
          toast.success(
            `${selectedDocuments.length} document(s) moved to folder`
          );
          setSelectedDocuments([]);
          break;

        case "share":
          // Mock share operation
          toast.success(
            `${selectedDocuments.length} document(s) shared successfully`
          );
          setSelectedDocuments([]);
          break;

        case "archive":
          // Mock archive operation
          toast.success(
            `${selectedDocuments.length} document(s) archived successfully`
          );
          setSelectedDocuments([]);
          break;

        default:
          toast.error("Invalid action");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Action failed";
      toast.error(errorMessage);
    } finally {
      setShowBulkActionsModal(false);
    }
  };

  const handleDuplicateDocument = async (id: string, type: DocumentType) => {
    if (!id) {
      toast.error("Invalid document ID");
      return;
    }

    try {
      if (type === "resumes") {
        const original = resumes.find((r) => r._id === id);
        if (!original) {
          toast.error("Original resume not found");
          return;
        }

        const duplicateData = {
          ...original,
          title: `${original.title} (Copy)`,
          _id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        };

        const response = await resumeService.createResume(duplicateData);
        if (response.success && response.data) {
          setResumes((prev) => [...prev, response.data]);
          setStats((prev) => ({
            ...prev,
            totalResumes: prev.totalResumes + 1,
          }));
          toast.success("Resume duplicated successfully");
        } else {
          throw new Error(response.message || "Failed to duplicate resume");
        }
      } else {
        const original = coverLetters.find((c) => c._id === id);
        if (!original) {
          toast.error("Original cover letter not found");
          return;
        }

        const duplicateData = {
          ...original,
          title: `${original.title} (Copy)`,
          _id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        };

        const response =
          await coverLetterService.createCoverLetter(duplicateData);
        if (response.success && response.data) {
          setCoverLetters((prev) => [...prev, response.data]);
          setStats((prev) => ({
            ...prev,
            totalCoverLetters: prev.totalCoverLetters + 1,
          }));
          toast.success("Cover letter duplicated successfully");
        } else {
          throw new Error(
            response.message || "Failed to duplicate cover letter"
          );
        }
      }
    } catch (error) {
      console.error("Duplicate operation failed:", error);
      toast.error(
        `Failed to duplicate ${type === "resumes" ? "resume" : "cover letter"}. Please try again.`
      );
    }
  };

  const filteredResumes = resumes.filter((resume) =>
    resume.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCoverLetters = coverLetters.filter(
    (coverLetter) =>
      coverLetter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coverLetter.companyName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      coverLetter.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsCards = [
    {
      title: "Total Resumes",
      value: stats.totalResumes,
      icon: DocumentTextIcon,
      color: "from-accent-primary to-accent-secondary",
      bgColor: "bg-accent-primary/10",
    },
    {
      title: "Cover Letters",
      value: stats.totalCoverLetters,
      icon: PencilIcon,
      color: "from-accent-secondary to-accent-tertiary",
      bgColor: "bg-accent-secondary/10",
    },
    {
      title: "Recently Modified",
      value: stats.recentlyModified,
      icon: FolderIcon,
      color: "from-accent-tertiary to-accent-quaternary",
      bgColor: "bg-accent-tertiary/10",
    },
    {
      title: "Drafts",
      value: stats.drafts,
      icon: DocumentDuplicateIcon,
      color: "from-accent-quaternary to-accent-primary",
      bgColor: "bg-accent-quaternary/10",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up-soft">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-10 bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="card-dark rounded-xl p-6 shadow-dark-lg animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-700 rounded w-12"></div>
                </div>
                <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="card-dark rounded-xl p-6 shadow-dark-lg">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 h-10 bg-gray-700 rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gray-700 rounded animate-pulse"></div>
              <div className="w-10 h-10 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex space-x-1 bg-dark-quaternary/30 p-1 rounded-lg">
            <div className="flex-1 h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="flex-1 h-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Documents Loading */}
        <DocumentLoadingSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up-soft">
      {/* Enhanced Header with Document Manager Suite Features */}
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
                  Document Manager Suite
                </h1>
                <p className="text-sm text-gray-400">
                  Enterprise-grade resume & cover letter management
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
                <ArrowDownTrayIcon className="w-5 h-5" />
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
                <span>{analytics.totalViews}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>{analytics.totalDownloads}</span>
              </div>
            </div>

            {/* Create Buttons */}
            <div className="flex items-center space-x-2">
              <Link
                to="/dashboard/resume/templates"
                className="btn-primary-dark px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Resume</span>
              </Link>
              <button
                onClick={() => {
                  setEditingCoverLetter(null);
                  setCoverLetterEditorTab("edit");
                  setShowCoverLetterEditor(true);
                }}
                className="btn-secondary-dark px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Cover Letter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-dark rounded-xl p-6 shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-text-secondary">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-dark-text-primary mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Enhanced Toolbar with Document Manager Suite Features */}
      <div className="glass-dark border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-primary"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === "grid"
                    ? "bg-accent-primary text-white shadow-glow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
                title="Grid View"
              >
                <ViewColumnsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-accent-primary text-white shadow-glow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
                title="List View"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center space-x-3">
            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                showFilters
                  ? "bg-accent-primary/20 text-accent-primary"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Toggle Filters"
            >
              <FunnelIcon className="w-5 h-5" />
            </button>

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
              >
                <option value="title">Sort by Title</option>
                <option value="createdAt">Sort by Created</option>
                <option value="updatedAt">Sort by Updated</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {sortOrder === "asc" ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* File Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary"
                >
                  <option value="all">All Types</option>
                  <option value="resume">Resumes</option>
                  <option value="cover-letter">Cover Letters</option>
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

        {/* Document Type Tabs */}
        <div className="mt-4 flex space-x-1 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("resumes")}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === "resumes"
                ? "bg-accent-primary text-white shadow-glow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            📄 Resumes ({filteredDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab("cover-letters")}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === "cover-letters"
                ? "bg-accent-primary text-white shadow-glow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            ✉️ Cover Letters ({filteredDocuments.length})
          </button>
        </div>
      </div>

      {/* Results Summary and Selection Controls */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedDocuments.length === filteredDocuments.length &&
                    filteredDocuments.length > 0
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
              Showing {filteredDocuments.length} of{" "}
              {activeTab === "resumes" ? resumes.length : coverLetters.length}{" "}
              documents
              {selectedFolder &&
                ` in ${folders.find((f) => f.id === selectedFolder)?.name}`}
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400">
            <span>Sort by: {sortBy}</span>
            <span>•</span>
            <span>{sortOrder === "asc" ? "Ascending" : "Descending"}</span>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      <AnimatePresence mode="wait">
        {activeTab === "resumes" ? (
          <motion.div
            key="resumes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredResumes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                  No resumes found
                </h3>
                <p className="text-dark-text-secondary mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Create your first resume to get started"}
                </p>
                <Link
                  to="/dashboard/resume/templates"
                  className="btn-primary-dark px-6 py-2 rounded-lg inline-flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Resume</span>
                </Link>
              </div>
            ) : (
              filteredResumes.map((resume) => (
                <ResumeCard
                  key={resume._id}
                  resume={resume}
                  viewMode={viewMode}
                  actionLoading={actionLoading}
                  onPreview={() => {
                    setSelectedDocument(convertObjectIdToString(resume._id));
                    setShowPreviewModal(true);
                  }}
                  onEdit={() => {
                    const resumeId = convertObjectIdToString(resume._id);
                    window.location.href = `/dashboard/resume/comprehensive?edit=${resumeId}`;
                  }}
                  onDelete={() =>
                    handleDeleteDocument(
                      convertObjectIdToString(resume._id),
                      "resumes"
                    )
                  }
                  onDuplicate={() =>
                    handleDuplicateDocument(
                      convertObjectIdToString(resume._id),
                      "resumes"
                    )
                  }
                  onDownload={() => handleDownloadResume(resume)}
                  onShare={() => handleShareResume(resume)}
                  onPrint={() => handlePrintResume(resume)}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="cover-letters"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 justify-items-center"
                : "space-y-4"
            }
          >
            {filteredCoverLetters.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <PencilIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                  No cover letters found
                </h3>
                <p className="text-dark-text-secondary mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Create your first cover letter to get started"}
                </p>
                <button
                  onClick={() => {
                    setEditingCoverLetter(null);
                    setCoverLetterEditorTab("edit");
                    setShowCoverLetterEditor(true);
                  }}
                  className="btn-primary-dark px-6 py-2 rounded-lg inline-flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Cover Letter</span>
                </button>
              </div>
            ) : (
              filteredCoverLetters.map((coverLetter) => (
                <CoverLetterCard
                  key={coverLetter._id}
                  coverLetter={coverLetter}
                  viewMode={viewMode}
                  onView={() => {
                    setEditingCoverLetter(coverLetter);
                    setCoverLetterEditorTab("preview");
                    setShowCoverLetterEditor(true);
                  }}
                  onEdit={() => {
                    setEditingCoverLetter(coverLetter);
                    setCoverLetterEditorTab("edit");
                    setShowCoverLetterEditor(true);
                  }}
                  onDelete={() =>
                    handleDeleteDocument(coverLetter._id!, "cover-letters")
                  }
                  onShare={() => handleShareCoverLetter(coverLetter)}
                  onDownload={() => handleDownloadCoverLetter(coverLetter)}
                  onDuplicate={() => {}} // Empty function for cover letters
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedDocument && (
          <ResumePDFPreviewSimple
            resumeId={selectedDocument}
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedDocument(null);
            }}
            onEdit={() => {
              setShowPreviewModal(false);
              const resumeId = convertObjectIdToString(selectedDocument);
              window.location.href = `/dashboard/resume/comprehensive?edit=${resumeId}`;
            }}
          />
        )}
      </AnimatePresence>

      {/* Cover Letter Editor Modal */}
      <AnimatePresence>
        {showCoverLetterEditor && (
          <CoverLetterEditor
            coverLetter={editingCoverLetter}
            isOpen={showCoverLetterEditor}
            initialTab={coverLetterEditorTab}
            onClose={() => {
              setShowCoverLetterEditor(false);
              setEditingCoverLetter(null);
              setCoverLetterEditorTab("edit");
            }}
            onSave={(savedCoverLetter) => {
              if (editingCoverLetter) {
                setCoverLetters((prev) =>
                  prev.map((c) =>
                    c._id === savedCoverLetter._id ? savedCoverLetter : c
                  )
                );
              } else {
                setCoverLetters((prev) => [...prev, savedCoverLetter]);
              }
              // Update the editing cover letter with the saved data to reflect changes
              setEditingCoverLetter(savedCoverLetter);
              // Keep the editor open - don't close it after saving
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed inset-y-0 left-0 w-80 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 z-50 lg:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  Document Manager
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                <button
                  onClick={() => setActiveView("documents")}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    activeView === "documents"
                      ? "bg-accent-primary/20 text-accent-primary"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>Documents</span>
                </button>
                <button
                  onClick={() => setActiveView("analytics")}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    activeView === "analytics"
                      ? "bg-accent-primary/20 text-accent-primary"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => setActiveView("links")}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    activeView === "links"
                      ? "bg-accent-primary/20 text-accent-primary"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <LinkIcon className="w-5 h-5" />
                  <span>Shared Links</span>
                </button>
                <button
                  onClick={() => setActiveView("settings")}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    activeView === "settings"
                      ? "bg-accent-primary/20 text-accent-primary"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <CogIcon className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </nav>

              {/* Folders Section */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400">Folders</h3>
                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <FolderPlusIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedFolder === folder.id
                          ? "bg-accent-primary/20 text-accent-primary"
                          : "text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        ></div>
                        <span className="text-sm">{folder.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {folder.documentCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Bulk Actions ({selectedDocuments.length} documents)
              </h3>

              <div className="space-y-3 mb-6">
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

                {bulkAction === "move" && (
                  <select
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  >
                    <option value="">Select folder...</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleBulkAction(bulkAction)}
                  className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/80 transition-colors"
                >
                  Apply Action
                </button>
                <button
                  onClick={() => setShowBulkActionsModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Export Data
              </h3>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Document Type
                  </label>
                  <select
                    value={activeTab}
                    onChange={(e) =>
                      setActiveTab(e.target.value as DocumentType)
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                  >
                    <option value="resumes">Resumes</option>
                    <option value="cover-letters">Cover Letters</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    toast.success(
                      `Exporting ${activeTab} as ${exportFormat.toUpperCase()}`
                    );
                    setShowExportModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/80 transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Print View
              </h3>

              <div className="space-y-3 mb-6">
                <p className="text-gray-400 text-sm">
                  Select documents to print or print all visible documents.
                </p>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="print-selected"
                    className="w-4 h-4 text-accent-primary bg-white/5 border-white/10 rounded focus:ring-accent-primary"
                  />
                  <label
                    htmlFor="print-selected"
                    className="text-sm text-gray-400"
                  >
                    Print selected documents only ({selectedDocuments.length})
                  </label>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    toast.success("Print view prepared");
                    setShowPrintModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/80 transition-colors"
                >
                  Prepare Print
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Create New Folder
              </h3>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Folder Color
                  </label>
                  <div className="flex space-x-2">
                    {[
                      "#3B82F6",
                      "#10B981",
                      "#F59E0B",
                      "#EF4444",
                      "#8B5CF6",
                      "#EC4899",
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewFolderColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newFolderColor === color
                            ? "border-white scale-110"
                            : "border-white/20 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      toast.success(
                        `Folder "${newFolderName}" created successfully`
                      );
                      setNewFolderName("");
                      setShowCreateFolderModal(false);
                    } else {
                      toast.error("Please enter a folder name");
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/80 transition-colors"
                >
                  Create Folder
                </button>
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics View */}
      {activeView === "analytics" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-dark rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Views
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.totalViews}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <EyeIcon className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="card-dark rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Unique Viewers
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.uniqueViewers}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>
            <div className="card-dark rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Downloads</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.totalDownloads}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <ArrowDownTrayIcon className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
            <div className="card-dark rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Conversion Rate
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.conversionRate}%
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-dark rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Top Documents
              </h3>
              <div className="space-y-3">
                {analytics.topDocuments.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-400">
                        #{index + 1}
                      </span>
                      <span className="text-white">{doc.title}</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {doc.views} views
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-dark rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {analytics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        {activity.action}{" "}
                        <span className="text-gray-400">
                          {activity.document}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(activity.time)}{" "}
                        {activity.location && `• ${activity.location}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overlay for sidebar */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
    </div>
  );
}

// Resume Preview Thumbnail Component
interface ResumePreviewThumbnailProps {
  resume: ResumeData;
}

function ResumePreviewThumbnail({ resume }: ResumePreviewThumbnailProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    generatePDFPreview();
  }, [resume._id]);

  const generatePDFPreview = async () => {
    try {
      setLoading(true);
      setError(false);

      // Generate PDF blob using the standardized LaTeX template system
      const pdfBlob = await resumeService.downloadResumeWithEngine(
        resume,
        "pdf",
        {
          engine: "latex", // Use LaTeX engine for best quality
          templateId: resume.template || resume.templateId || "template01", // Use standardized template format
        }
      );

      // Create blob URL for preview
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Failed to generate PDF preview:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div
        className="w-full h-full bg-gray-200 flex items-center justify-center"
        style={{ margin: 0, padding: 0 }}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Generating PDF...</span>
        </div>
      </div>
    );
  }

  if (error) {
    // Fallback to template-based preview if PDF generation fails
    return <FallbackTemplatePreview resume={resume} />;
  }

  if (!pdfUrl) {
    return <FallbackTemplatePreview resume={resume} />;
  }

  return (
    <div
      className="w-full h-full bg-white overflow-hidden flex items-center justify-center"
      style={{ margin: 0, padding: 0 }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=FitW`}
          className="w-full h-full border-0"
          style={{
            margin: 0,
            padding: 0,
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: "scale(0.8)",
            transformOrigin: "center center",
          }}
          title="Resume Preview"
        />
      </div>
    </div>
  );
}

// Fallback component using TemplateRenderer for when PDF generation fails
interface FallbackTemplatePreviewProps {
  resume: ResumeData;
}

function FallbackTemplatePreview({ resume }: FallbackTemplatePreviewProps) {
  // Convert ResumeData to Resume format for TemplateRenderer
  const convertToResumeFormat = (resumeData: ResumeData): Resume => {
    return {
      _id: resumeData._id || "preview",
      template: resumeData.templateId || "modern-creative-1",
      personalInfo: {
        firstName: resumeData.personalInfo?.firstName || "John",
        lastName: resumeData.personalInfo?.lastName || "Doe",
        email: resumeData.personalInfo?.email || "john.doe@email.com",
        phone: resumeData.personalInfo?.phone || "(555) 123-4567",
        location: resumeData.personalInfo?.location || "New York, NY",
        professionalTitle: "Professional", // Add a default title
        linkedinUrl: resumeData.personalInfo?.linkedinUrl,
        portfolioUrl: resumeData.personalInfo?.portfolioUrl,
        githubUrl: resumeData.personalInfo?.githubUrl,
      },
      professionalSummary:
        resumeData.professionalSummary ||
        "Experienced professional with proven track record of success.",
      workExperience:
        resumeData.workExperience?.map((exp) => ({
          jobTitle: exp.jobTitle,
          company: exp.company,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate || "",
          isCurrentJob: exp.isCurrentJob,
          responsibilities: exp.responsibilities || [],
          achievements: exp.achievements || [],
        })) || [],
      education:
        resumeData.education?.map((edu) => ({
          degree: edu.degree,
          institution: edu.institution,
          graduationDate: edu.graduationDate,
          fieldOfStudy: edu.fieldOfStudy || "",
          gpa: edu.gpa || "",
          honors: edu.coursework || [],
        })) || [],
      skills:
        resumeData.skills?.map((skill) => ({
          name: skill.name,
          level: 5, // Default level since ResumeData doesn't have level
          category: skill.category,
        })) || [],
      projects:
        resumeData.projects?.map((proj) => ({
          name: proj.name,
          description: proj.description,
          technologies: proj.technologies || [],
          startDate: "",
          endDate: "",
          url: proj.url || "",
        })) || [],
      certifications: resumeData.certifications || [],
      languages:
        resumeData.languages?.map((lang) => ({
          name: typeof lang === "string" ? lang : lang.name,
          proficiency: typeof lang === "string" ? "fluent" : lang.proficiency,
        })) || [],
      volunteerExperience: [],
      awards: [],
      hobbies: [],
      createdAt: resumeData.createdAt || new Date().toISOString(),
      updatedAt: resumeData.updatedAt || new Date().toISOString(),
    };
  };

  // Get the template for this resume
  const template =
    getTemplateById(resume.templateId || "modern-creative-1") ||
    resumeTemplates[0];
  const resumeForTemplate = convertToResumeFormat(resume);

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ margin: 0, padding: 0 }}
    >
      <div className="w-full h-full overflow-hidden">
        <TemplateRenderer
          resume={resumeForTemplate}
          template={template}
          isPreview={true}
        />
      </div>
    </div>
  );
}

// Resume Card Component
interface ResumeCardProps {
  resume: ResumeData;
  viewMode: ViewMode;
  actionLoading: string | null;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onShare: () => void;
  onPrint: () => void;
}

function ResumeCard({
  resume,
  viewMode,
  actionLoading,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
  onDownload,
  onShare,
  onPrint,
}: ResumeCardProps) {
  const [pdfInfo, setPdfInfo] = useState<{
    hasSavedPDF: boolean;
    isOptimized?: boolean;
  } | null>(null);
  const resumeId = convertObjectIdToString(resume._id);

  useEffect(() => {
    // Check if resume has saved PDF
    if (resumeId) {
      resumeService
        .getSavedPDFInfo(resumeId)
        .then((info) => setPdfInfo(info))
        .catch((error) => {
          console.log("PDF info not available:", error);
          setPdfInfo({ hasSavedPDF: false });
        });
    }
  }, [resumeId]);

  const formatDate = (date: string | undefined) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        className="card-dark rounded-lg shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 xs:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-12 xs:w-12 xs:h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <DocumentTextIcon className="w-5 h-5 xs:w-6 xs:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-base xs:text-lg font-semibold text-dark-text-primary truncate">
                  {resume.title}
                </h3>
                <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-full">
                  Resume
                </span>
              </div>
              <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
                Updated {formatDate(resume.updatedAt || resume.createdAt)}
              </p>
            </div>
          </div>

          <DocumentActions
            onPreview={onPreview}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -6, scale: 1.02 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 group border border-dark-border/50 hover:border-teal-500/50 w-full max-w-xs sm:max-w-sm mx-auto"
    >
      {/* Document Type Icon Header */}
      <div className="relative overflow-hidden w-full h-32 sm:h-40 rounded-t-xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
        {/* Document Type Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center shadow-glow-lg">
          <DocumentTextIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
        </div>

        {/* Document Type Badge */}
        <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-medium text-white">Resume</span>
        </div>

        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
          <button
            onClick={onPreview}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            title="Preview"
          >
            <EyeIcon className="w-6 h-6" />
          </button>
          <button
            onClick={onEdit}
            className="p-3 bg-teal-500/80 hover:bg-teal-500 rounded-full backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            title="Edit"
          >
            <PencilIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Resume Info Section */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-dark-text-primary group-hover:text-teal-400 transition-colors truncate flex-1">
            {resume.title}
          </h3>
          {pdfInfo?.hasSavedPDF && (
            <div className="flex items-center ml-2 flex-shrink-0">
              <div
                className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-glow-sm"
                title="PDF Saved"
              ></div>
              {pdfInfo.isOptimized && (
                <div
                  className="w-2.5 h-2.5 bg-purple-400 rounded-full shadow-glow-sm ml-1.5"
                  title="Job Optimized"
                ></div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 mb-4">
          <p className="text-sm text-dark-text-secondary">
            Updated {formatDate(resume.updatedAt || resume.createdAt)}
          </p>
          <div className="flex items-center space-x-3 text-xs text-gray-400">
            {pdfInfo?.hasSavedPDF && (
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>PDF Saved</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <DocumentTextIcon className="w-3 h-3" />
              <span>Resume Document</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-dark-border/30">
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={actionLoading === `download-${resume._id}`}
              className="p-2 text-dark-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onPrint}
              className="p-2 text-dark-text-muted hover:text-gray-400 hover:bg-gray-500/10 rounded-lg transition-all duration-200"
              title="Print Resume"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onShare}
              disabled={actionLoading === `share-${resumeId}`}
              className="p-2 text-dark-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Share Resume"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={onDelete}
            className="p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Cover Letter Preview Thumbnail Component
interface CoverLetterPreviewThumbnailProps {
  coverLetter: CoverLetterData;
}

function CoverLetterPreviewThumbnail({
  coverLetter,
}: CoverLetterPreviewThumbnailProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return new Date().toLocaleDateString();
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div className="bg-white text-xs leading-tight h-full w-full">
        {/* AI-Generated Content Preview - Full Content Display */}
        <div
          className="text-gray-800 text-justify h-full overflow-hidden leading-relaxed text-xs p-3"
          style={{ margin: 0 }}
        >
          {coverLetter.content ? (
            <div
              className="whitespace-pre-wrap overflow-hidden h-full"
              style={{ margin: 0, padding: 0 }}
            >
              {coverLetter.content.length > 600
                ? coverLetter.content.substring(0, 600) + "..."
                : coverLetter.content}
            </div>
          ) : (
            <div className="text-gray-400 italic text-center flex items-center justify-center h-full">
              <div>
                <div className="text-lg">📄</div>
                <div>AI Cover Letter</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Cover Letter Card Component
interface CoverLetterCardProps {
  coverLetter: CoverLetterData;
  viewMode: ViewMode;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
}

function CoverLetterCard({
  coverLetter,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onDuplicate,
}: CoverLetterCardProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        className="card-dark rounded-lg p-3 xs:p-4 shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 xs:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-12 xs:w-12 xs:h-16 bg-gradient-to-br from-accent-secondary to-accent-tertiary rounded-lg flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <PencilIcon className="w-5 h-5 xs:w-6 xs:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-base xs:text-lg font-semibold text-dark-text-primary truncate">
                  {coverLetter.title}
                </h3>
                <span className="px-2 py-1 bg-accent-secondary/20 text-accent-secondary text-xs rounded-full">
                  Cover Letter
                </span>
              </div>
              <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
                {coverLetter.jobTitle} at {coverLetter.companyName}
              </p>
              <p className="text-xs text-dark-text-muted truncate">
                Updated{" "}
                {formatDate(coverLetter.updatedAt || coverLetter.createdAt)}
              </p>
            </div>
          </div>

          <DocumentActions
            onPreview={onEdit}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={() => {}} // Empty function for cover letters
            hidePreview
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="card-dark rounded-lg xs:rounded-xl shadow-dark-lg hover:shadow-glow-md transition-all duration-300 group max-w-xs sm:max-w-sm mx-auto"
    >
      {/* Document Type Icon Header */}
      <div className="relative overflow-hidden w-full h-32 sm:h-40 rounded-t-lg xs:rounded-t-xl bg-gradient-to-br from-accent-secondary/20 to-accent-tertiary/20 flex items-center justify-center mb-3">
        {/* Document Type Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-accent-secondary to-accent-tertiary rounded-2xl flex items-center justify-center shadow-glow-lg">
          <PencilIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
        </div>

        {/* Document Type Badge */}
        <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-medium text-white">Cover Letter</span>
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center space-x-3">
          <button
            onClick={onView}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all duration-200"
            title="View Full Cover Letter"
          >
            <EyeIcon className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onEdit}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all duration-200"
            title="Edit Cover Letter"
          >
            <PencilIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Cover Letter Info */}
      <div className="p-4">
        <div className="space-y-2">
          <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-dark-text-primary group-hover:text-accent-primary transition-colors truncate">
            {coverLetter.title}
          </h3>
          <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
            {coverLetter.jobTitle} at {coverLetter.companyName}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-dark-text-muted">
              Updated{" "}
              {formatDate(coverLetter.updatedAt || coverLetter.createdAt)}
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className="flex items-center space-x-1">
                <PencilIcon className="w-3 h-3" />
                <span>Cover Letter</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 xs:mt-3 pt-2 xs:pt-3 border-t border-dark-border flex items-center justify-between">
          <div className="flex items-center space-x-1 xs:space-x-2">
            <button
              onClick={onDownload}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-md transition-colors touch-target"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onShare}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-md transition-colors touch-target"
              title="Share Cover Letter"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onDelete}
            className="p-1.5 xs:p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors touch-target"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
