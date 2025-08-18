import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon as DownloadIcon,
  PrinterIcon,
  ShareIcon,
  LockClosedIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowsPointingOutIcon,
  DocumentDuplicateIcon,
  UserIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface DocumentData {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  previewImages?: string[];
  pageCount?: number;
}

interface LinkData {
  id: string;
  slug: string;
  name: string;
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  watermarkText?: string;
  brandName?: string;
  brandLogo?: string;
  brandColors?: Record<string, string>;
}

interface PublicDocumentViewerProps {
  slug: string;
}

interface VisitorInfo {
  email?: string;
  name?: string;
  company?: string;
  message?: string;
}

// API Service for public endpoints
class PublicDocumentAPI {
  private static baseUrl = "http://localhost:3002"; // DISABLED - Document Manager service unavailable

  private static async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  static async authenticatePassword(slug: string, password: string) {
    // Document Manager service disabled for now
    console.log(
      "Password authentication disabled - Document Manager unavailable"
    );
    return { success: false, message: "Service temporarily unavailable" };
  }

  static async submitVisitorInfo(slug: string, info: VisitorInfo) {
    // Document Manager service disabled for now
    console.log(
      "Visitor info submission disabled - Document Manager unavailable"
    );
    return { success: false, message: "Service temporarily unavailable" };
  }

  static async trackPageView(data: {
    documentId: string;
    pageNumber: number;
    visitorId: string;
    duration?: number;
    scrollPercentage?: number;
  }) {
    // Document Manager service disabled for now
    console.log("Page view tracking disabled - Document Manager unavailable");
    return { success: false, message: "Service temporarily unavailable" };
  }
}

export const PublicDocumentViewer: React.FC<PublicDocumentViewerProps> = ({
  slug,
}) => {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showVisitorInfo, setShowVisitorInfo] = useState(false);
  const [password, setPassword] = useState("");
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [visitorId] = useState(() => crypto.randomUUID());

  const viewerRef = useRef<HTMLDivElement>(null);
  const pageStartTime = useRef<number>(Date.now());

  // Load document data
  useEffect(() => {
    loadDocument();
  }, [slug]);

  // Track page views
  useEffect(() => {
    if (document && link) {
      const startTime = Date.now();
      pageStartTime.current = startTime;

      // Track initial page view
      trackPageView(1, 0);

      return () => {
        // Track time spent on page when component unmounts
        const duration = Math.floor((Date.now() - startTime) / 1000);
        if (duration > 0) {
          trackPageView(currentPage, duration);
        }
      };
    }
  }, [document, link]);

  // Track page changes
  useEffect(() => {
    if (document && currentPage > 1) {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
      trackPageView(currentPage, duration);
      pageStartTime.current = Date.now();
    }
  }, [currentPage, document]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      // This would be a server-side rendered page or an API call
      // For now, we'll simulate the document loading

      // Mock document data - in reality this would come from server-side rendering
      setDocument({
        id: "123",
        title: "Sample Document",
        fileName: "sample.pdf",
        fileType: "pdf",
        fileUrl: "/sample.pdf",
        pageCount: 5,
        previewImages: ["/preview1.jpg", "/preview2.jpg", "/preview3.jpg"],
      });

      setLink({
        id: "456",
        slug,
        name: "Share of Sample Document",
        allowDownload: true,
        allowPrint: true,
        allowCopy: true,
        brandName: "AI Resume Suite",
      });
    } catch (error: any) {
      console.error("Failed to load document:", error);
      setError(error.message || "Failed to load document");

      // Handle specific errors
      if (error.message?.includes("password")) {
        setShowPasswordPrompt(true);
      } else if (error.message?.includes("visitor info")) {
        setShowVisitorInfo(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      await PublicDocumentAPI.authenticatePassword(slug, password);
      setShowPasswordPrompt(false);
      setPassword("");
      loadDocument();
    } catch (error: any) {
      toast.error(error.message || "Invalid password");
    }
  };

  const handleVisitorInfoSubmit = async () => {
    try {
      await PublicDocumentAPI.submitVisitorInfo(slug, visitorInfo);
      setShowVisitorInfo(false);
      setVisitorInfo({});
      loadDocument();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit information");
    }
  };

  const trackPageView = async (pageNumber: number, duration: number) => {
    if (!document) return;

    try {
      await PublicDocumentAPI.trackPageView({
        documentId: document.id,
        pageNumber,
        visitorId,
        duration,
      });
    } catch (error) {
      console.error("Failed to track page view:", error);
    }
  };

  const handleDownload = () => {
    if (!link?.allowDownload || !document) {
      toast.error("Downloads are not allowed for this document");
      return;
    }

    const link_elem = document.createElement("a");
    link_elem.href = `${import.meta.env.VITE_DOCUMENT_MANAGER_URL}/view/${slug}/download`;
    link_elem.download = document.fileName;
    link_elem.click();

    toast.success("Download started");
  };

  const handlePrint = () => {
    if (!link?.allowPrint) {
      toast.error("Printing is not allowed for this document");
      return;
    }

    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      viewerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  const nextPage = () => {
    if (document && currentPage < (document.pageCount || 1)) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  // Password prompt modal
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center">
            <LockClosedIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Password Protected
            </h2>
            <p className="text-gray-600 mb-6">
              This document requires a password to access.
            </p>

            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />

              <button
                onClick={handlePasswordSubmit}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Access Document
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Visitor info modal
  if (showVisitorInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <UserIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Visitor Information
            </h2>
            <p className="text-gray-600">
              Please provide your information to access this document.
            </p>
          </div>

          <div className="space-y-4">
            {link?.requireEmail && (
              <input
                type="email"
                value={visitorInfo.email || ""}
                onChange={(e) =>
                  setVisitorInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Email address *"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            )}

            {link?.requireName && (
              <input
                type="text"
                value={visitorInfo.name || ""}
                onChange={(e) =>
                  setVisitorInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Full name *"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            )}

            <input
              type="text"
              value={visitorInfo.company || ""}
              onChange={(e) =>
                setVisitorInfo((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="Company (optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <textarea
              value={visitorInfo.message || ""}
              onChange={(e) =>
                setVisitorInfo((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="Message (optional)"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={handleVisitorInfoSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Access Document
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Document Unavailable
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!document || !link) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <div className="flex items-center space-x-4">
              {link.brandLogo ? (
                <img
                  src={link.brandLogo}
                  alt={link.brandName}
                  className="h-8"
                />
              ) : (
                <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              )}
              <div>
                <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                  {document.title}
                </h1>
                {link.brandName && (
                  <p className="text-sm text-gray-500">
                    Shared by {link.brandName}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {link.allowDownload && (
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Download"
                >
                  <DownloadIcon className="w-5 h-5" />
                  <span className="hidden sm:block">Download</span>
                </button>
              )}

              {link.allowPrint && (
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Print"
                >
                  <PrinterIcon className="w-5 h-5" />
                  <span className="hidden sm:block">Print</span>
                </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Share"
              >
                <ShareIcon className="w-5 h-5" />
                <span className="hidden sm:block">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document viewer */}
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Page navigation */}
              {document.pageCount && document.pageCount > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>

                  <span className="text-sm text-gray-600">
                    {currentPage} / {document.pageCount}
                  </span>

                  <button
                    onClick={nextPage}
                    disabled={currentPage === (document.pageCount || 1)}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              </button>

              <span className="text-sm text-gray-600 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Document content */}
        <div
          ref={viewerRef}
          className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center p-4"
        >
          <div
            className="bg-white shadow-lg"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          >
            {document.fileType === "pdf" ? (
              <div className="relative">
                {/* PDF viewer would go here */}
                <div className="w-[210mm] h-[297mm] bg-white border flex items-center justify-center">
                  <div className="text-center">
                    <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">PDF Viewer</p>
                    <p className="text-sm text-gray-500">Page {currentPage}</p>
                  </div>
                </div>

                {/* Watermark */}
                {link.watermarkText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="text-gray-300 text-4xl font-bold transform rotate-45 opacity-20"
                      style={{ userSelect: "none" }}
                    >
                      {link.watermarkText}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={document.fileUrl}
                alt={document.title}
                className="max-w-full h-auto"
                style={{
                  userSelect: link.allowCopy ? "auto" : "none",
                  pointerEvents: link.allowCopy ? "auto" : "none",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Disable text selection if not allowed */}
      {!link.allowCopy && (
        <style>{`
          body {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }
        `}</style>
      )}

      {/* Disable right-click context menu */}
      {(!link.allowCopy || !link.allowPrint) && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 pointer-events-none"
        />
      )}
    </div>
  );
};

export default PublicDocumentViewer;
