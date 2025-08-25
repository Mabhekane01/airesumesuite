import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  DownloadIcon,
  ShareIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  ClockIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  BookmarkIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface DocumentViewerProps {
  documentId: string;
  linkId: string;
  onClose: () => void;
  isOpen: boolean;
}

interface PageData {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

interface AnalyticsData {
  currentViewers: number;
  totalViews: number;
  averageViewTime: number;
  engagementScore: number;
}

interface VisitorInfo {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
}

export const EnhancedDocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  linkId,
  onClose,
  isOpen,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pages, setPages] = useState<PageData[]>([]);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({});
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [pageViewTimes, setPageViewTimes] = useState<Record<number, number>>({});
  const [scrollPositions, setScrollPositions] = useState<Record<number, number>>({});
  const [interactions, setInteractions] = useState<Record<number, any[]>>({});

  const viewerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement>>({});
  const analyticsInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize document viewer
  useEffect(() => {
    if (isOpen && documentId) {
      initializeViewer();
      startAnalyticsRecording();
    }

    return () => {
      if (analyticsInterval.current) {
        clearInterval(analyticsInterval.current);
      }
      stopAnalyticsRecording();
    };
  }, [isOpen, documentId]);

  // Record page view time
  useEffect(() => {
    if (currentPage && sessionStartTime) {
      const pageStartTime = Date.now();
      
      return () => {
        const pageEndTime = Date.now();
        const timeSpent = pageEndTime - pageStartTime;
        
        setPageViewTimes(prev => ({
          ...prev,
          [currentPage]: (prev[currentPage] || 0) + timeSpent
        }));
      };
    }
  }, [currentPage, sessionStartTime]);

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      
      // Simulate loading document pages
      const mockPages: PageData[] = Array.from({ length: 10 }, (_, i) => ({
        pageNumber: i + 1,
        imageUrl: `https://via.placeholder.com/800x1000/ffffff/000000?text=Page+${i + 1}`,
        width: 800,
        height: 1000,
      }));
      
      setPages(mockPages);
      setTotalPages(mockPages.length);
      setSessionStartTime(new Date());
      
      // Record initial view
      await recordDocumentView();
      
    } catch (error) {
      console.error('Error initializing viewer:', error);
      toast.error('Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const startAnalyticsRecording = () => {
    // Record analytics every 30 seconds
    analyticsInterval.current = setInterval(async () => {
      await recordAnalytics();
    }, 30000);
  };

  const stopAnalyticsRecording = async () => {
    if (sessionStartTime) {
      const sessionDuration = Date.now() - sessionStartTime.getTime();
      await recordSessionEnd(sessionDuration);
    }
  };

  const recordDocumentView = async () => {
    try {
      const response = await fetch(`/api/sharing/view/${linkId}/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: generateVisitorId(),
          ipAddress: '127.0.0.1', // Would be real IP in production
          userAgent: navigator.userAgent,
          country: 'US', // Would be detected in production
          city: 'Unknown',
          deviceType: getDeviceType(),
          browser: getBrowser(),
          os: getOS(),
          referrer: document.referrer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record view');
      }
    } catch (error) {
      console.error('Error recording document view:', error);
    }
  };

  const recordAnalytics = async () => {
    try {
      const currentPageData = pages.find(p => p.pageNumber === currentPage);
      if (!currentPageData) return;

      const response = await fetch(`/api/sharing/page/${generateVisitorId()}/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageNumber: currentPage,
          durationSeconds: (pageViewTimes[currentPage] || 0) / 1000,
          scrollPercentage: scrollPositions[currentPage] || 0,
          interactions: interactions[currentPage] || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record analytics');
      }
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  };

  const recordSessionEnd = async (sessionDuration: number) => {
    try {
      // Record final analytics
      await recordAnalytics();
      
      // Could send session summary to analytics service
      console.log('Session ended:', {
        duration: sessionDuration,
        pagesViewed: Object.keys(pageViewTimes).length,
        totalTime: Object.values(pageViewTimes).reduce((a, b) => a + b, 0),
      });
    } catch (error) {
      console.error('Error recording session end:', error);
    }
  };

  const generateVisitorId = () => {
    return localStorage.getItem('visitorId') || `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  };

  const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getOS = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in' && zoom < 200) {
      setZoom(zoom + 25);
    } else if (direction === 'out' && zoom > 50) {
      setZoom(zoom - 25);
    }
  };

  const handleScroll = (pageNumber: number, scrollTop: number, scrollHeight: number) => {
    const scrollPercentage = (scrollTop / (scrollHeight - window.innerHeight)) * 100;
    setScrollPositions(prev => ({
      ...prev,
      [pageNumber]: Math.max(prev[pageNumber] || 0, scrollPercentage)
    }));
  };

  const handleInteraction = (pageNumber: number, type: string, data: any) => {
    setInteractions(prev => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), { type, data, timestamp: Date.now() }]
    }));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/sharing/download/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          linkId,
          visitorId: generateVisitorId(),
          downloadType: 'pdf',
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        toast.success('Download recorded');
        // Trigger actual download
        window.open(`/api/documents/${documentId}/download`, '_blank');
      }
    } catch (error) {
      console.error('Error recording download:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Document',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const toggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

  const toggleVisitorForm = () => {
    setShowVisitorForm(!showVisitorForm);
  };

  const submitVisitorInfo = async () => {
    try {
      // Submit visitor information
      toast.success('Thank you for your information!');
      setShowVisitorForm(false);
    } catch (error) {
      toast.error('Failed to submit information');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-4">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Document Viewer</h2>
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Analytics Toggle */}
              <button
                onClick={toggleAnalytics}
                className={`p-2 rounded-lg transition-colors ${
                  showAnalytics 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Toggle Analytics"
              >
                <ChartBarIcon className="w-5 h-5" />
              </button>

              {/* Visitor Form Toggle */}
              <button
                onClick={toggleVisitorForm}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Contact Information"
              >
                <UserGroupIcon className="w-5 h-5" />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Document Viewer */}
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  
                  <span className="text-sm text-gray-600 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleZoom('out')}
                    disabled={zoom <= 50}
                    className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  
                  <span className="text-sm text-gray-600 font-medium min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  
                  <button
                    onClick={() => handleZoom('in')}
                    disabled={zoom >= 200}
                    className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-auto bg-gray-100 p-4">
                <div className="flex justify-center">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div
                      ref={viewerRef}
                      className="bg-white shadow-lg rounded-lg overflow-hidden"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                    >
                      {pages.map((page) => (
                        <div
                          key={page.pageNumber}
                          ref={(el) => {
                            if (el) pageRefs.current[page.pageNumber] = el;
                          }}
                          className={`${page.pageNumber === currentPage ? 'block' : 'hidden'}`}
                          onScroll={(e) => {
                            const target = e.target as HTMLDivElement;
                            handleScroll(page.pageNumber, target.scrollTop, target.scrollHeight);
                          }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            handleInteraction(page.pageNumber, 'click', { x, y });
                          }}
                        >
                          <img
                            src={page.imageUrl}
                            alt={`Page ${page.pageNumber}`}
                            className="w-full h-auto"
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analytics Sidebar */}
            <AnimatePresence>
              {showAnalytics && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-gray-200 bg-white overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
                    
                    {analytics ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <EyeIcon className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Current Viewers</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">{analytics.currentViewers}</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <ChartBarIcon className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Total Views</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">{analytics.totalViews}</p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <ClockIcon className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Avg. View Time</span>
                          </div>
                          <p className="text-2xl font-bold text-purple-900">
                            {Math.round(analytics.averageViewTime)}s
                          </p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <HeartIcon className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-orange-900">Engagement Score</span>
                          </div>
                          <p className="text-2xl font-bold text-orange-900">{analytics.engagementScore}%</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Analytics loading...</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Visitor Form Modal */}
          <AnimatePresence>
            {showVisitorForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center p-4"
                onClick={toggleVisitorForm}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                    <button
                      onClick={toggleVisitorForm}
                      className="p-1 rounded-lg hover:bg-gray-100"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={visitorInfo.name || ''}
                        onChange={(e) => setVisitorInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={visitorInfo.email || ''}
                        onChange={(e) => setVisitorInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company (Optional)
                      </label>
                      <input
                        type="text"
                        value={visitorInfo.company || ''}
                        onChange={(e) => setVisitorInfo(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message (Optional)
                      </label>
                      <textarea
                        value={visitorInfo.message || ''}
                        onChange={(e) => setVisitorInfo(prev => ({ ...prev, message: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Any questions or feedback?"
                      />
                    </div>

                    <button
                      onClick={submitVisitorInfo}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


