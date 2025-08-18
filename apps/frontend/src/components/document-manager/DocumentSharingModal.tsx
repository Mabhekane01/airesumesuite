import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ShareIcon,
  LinkIcon,
  LockClosedIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon as DocumentDownloadIcon,
  PrinterIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
}

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
  requireEmail: boolean;
  requireName: boolean;
  watermarkText?: string;
  createdAt: string;
  isExpired: boolean;
  isViewLimitReached: boolean;
}

interface DocumentSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  onCreateLink: (settings: LinkSettings) => Promise<DocumentLink>;
  onUpdateLink: (id: string, settings: Partial<LinkSettings>) => Promise<void>;
  onDeleteLink: (id: string) => Promise<void>;
  onGenerateQR: (id: string) => Promise<{ qrCode: string; url: string }>;
}

interface LinkSettings {
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
}

export const DocumentSharingModal: React.FC<DocumentSharingModalProps> = ({
  isOpen,
  onClose,
  document,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onGenerateQR,
}) => {
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLink, setSelectedLink] = useState<DocumentLink | null>(null);
  const [showQRCode, setShowQRCode] = useState<{ link: DocumentLink; qrCode: string; url: string } | null>(null);
  
  // Form state
  const [linkSettings, setLinkSettings] = useState<LinkSettings>({
    name: '',
    description: '',
    password: '',
    expiresAt: '',
    maxViews: undefined,
    allowDownload: true,
    allowPrint: true,
    allowCopy: true,
    requireEmail: false,
    requireName: false,
    watermarkText: '',
  });
  
  // Load existing links
  useEffect(() => {
    if (isOpen && document.id) {
      loadLinks();
    }
  }, [isOpen, document.id]);
  
  const loadLinks = async () => {
    try {
      // This would call your API to get document links
      // const response = await DocumentManagerAPI.getDocumentLinks(document.id);
      // setLinks(response.data);
      
      // Mock data for now
      setLinks([]);
    } catch (error) {
      console.error('Failed to load links:', error);
      toast.error('Failed to load sharing links');
    }
  };
  
  const handleCreateLink = async () => {
    try {
      setLoading(true);
      const newLink = await onCreateLink({
        ...linkSettings,
        name: linkSettings.name || `Share of ${document.title}`,
      });
      
      setLinks(prev => [newLink, ...prev]);
      setShowCreateForm(false);
      resetForm();
      toast.success('Shareable link created successfully');
    } catch (error) {
      console.error('Failed to create link:', error);
      toast.error('Failed to create shareable link');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
      return;
    }
    
    try {
      await onDeleteLink(linkId);
      setLinks(prev => prev.filter(link => link.id !== linkId));
      toast.success('Link deleted successfully');
    } catch (error) {
      console.error('Failed to delete link:', error);
      toast.error('Failed to delete link');
    }
  };
  
  const handleToggleLink = async (link: DocumentLink) => {
    try {
      await onUpdateLink(link.id, { isActive: !link.isActive });
      setLinks(prev => prev.map(l => 
        l.id === link.id ? { ...l, isActive: !l.isActive } : l
      ));
      toast.success(`Link ${link.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      console.error('Failed to toggle link:', error);
      toast.error('Failed to update link');
    }
  };
  
  const handleShowQR = async (link: DocumentLink) => {
    try {
      const qrData = await onGenerateQR(link.id);
      setShowQRCode({ link, ...qrData });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  const resetForm = () => {
    setLinkSettings({
      name: '',
      description: '',
      password: '',
      expiresAt: '',
      maxViews: undefined,
      allowDownload: true,
      allowPrint: true,
      allowCopy: true,
      requireEmail: false,
      requireName: false,
      watermarkText: '',
    });
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShareIcon className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-semibold">Share Document</h2>
                  <p className="text-blue-100 text-sm">{document.title}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Quick share section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Quick Share</h3>
                    <p className="text-sm text-gray-600">Create a simple shareable link</p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Link
                  </button>
                </div>
              </div>
              
              {/* Create link form */}
              <AnimatePresence>
                {showCreateForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-gray-50 rounded-xl p-6 space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Create Shareable Link</h3>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic settings */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Link Name
                          </label>
                          <input
                            type="text"
                            value={linkSettings.name}
                            onChange={(e) => setLinkSettings(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={`Share of ${document.title}`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                          </label>
                          <textarea
                            value={linkSettings.description}
                            onChange={(e) => setLinkSettings(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Add a description for this share..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password Protection
                          </label>
                          <input
                            type="password"
                            value={linkSettings.password}
                            onChange={(e) => setLinkSettings(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Optional password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiration Date
                          </label>
                          <input
                            type="datetime-local"
                            value={linkSettings.expiresAt}
                            onChange={(e) => setLinkSettings(prev => ({ ...prev, expiresAt: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            View Limit
                          </label>
                          <input
                            type="number"
                            value={linkSettings.maxViews || ''}
                            onChange={(e) => setLinkSettings(prev => ({ 
                              ...prev, 
                              maxViews: e.target.value ? parseInt(e.target.value) : undefined 
                            }))}
                            placeholder="Unlimited"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Permissions */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Permissions</h4>
                        
                        <div className="space-y-3">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={linkSettings.allowDownload}
                              onChange={(e) => setLinkSettings(prev => ({ ...prev, allowDownload: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <DocumentDownloadIcon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">Allow downloads</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={linkSettings.allowPrint}
                              onChange={(e) => setLinkSettings(prev => ({ ...prev, allowPrint: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <PrinterIcon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">Allow printing</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={linkSettings.allowCopy}
                              onChange={(e) => setLinkSettings(prev => ({ ...prev, allowCopy: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">Allow text copying</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={linkSettings.requireEmail}
                              onChange={(e) => setLinkSettings(prev => ({ ...prev, requireEmail: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <EnvelopeIcon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">Require email</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={linkSettings.requireName}
                              onChange={(e) => setLinkSettings(prev => ({ ...prev, requireName: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <UserIcon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">Require name</span>
                          </label>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Watermark Text
                          </label>
                          <input
                            type="text"
                            value={linkSettings.watermarkText}
                            onChange={(e) => setLinkSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                            placeholder="Optional watermark"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateLink}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Create Link'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Existing links */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Existing Links ({links.length})
                </h3>
                
                {links.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No sharing links created yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className={`border rounded-xl p-4 transition-colors ${
                          link.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900 truncate">{link.name}</h4>
                              <div className="flex items-center space-x-1">
                                {link.hasPassword && (
                                  <LockClosedIcon className="w-4 h-4 text-orange-500" title="Password protected" />
                                )}
                                {link.expiresAt && (
                                  <ClockIcon className="w-4 h-4 text-blue-500" title="Has expiration" />
                                )}
                                {link.maxViews && (
                                  <EyeIcon className="w-4 h-4 text-purple-500" title="View limit set" />
                                )}
                                {!link.allowDownload && (
                                  <ShieldCheckIcon className="w-4 h-4 text-red-500" title="Download restricted" />
                                )}
                              </div>
                              {(link.isExpired || link.isViewLimitReached) && (
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                                  {link.isExpired ? 'Expired' : 'View limit reached'}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                link.isActive 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {link.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <code className="bg-white px-2 py-1 rounded text-sm text-blue-600 flex-1 min-w-0 truncate">
                                {link.fullUrl}
                              </code>
                              <button
                                onClick={() => copyToClipboard(link.fullUrl)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Copy link"
                              >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{link.currentViews} views</span>
                              {link.maxViews && <span>/ {link.maxViews} max</span>}
                              <span>Created {formatDate(link.createdAt)}</span>
                              {link.expiresAt && (
                                <span>Expires {formatDate(link.expiresAt)}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleShowQR(link)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="QR Code"
                            >
                              <QrCodeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => window.open(link.fullUrl, '_blank')}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Open link"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleLink(link)}
                              className={`px-3 py-1 rounded text-xs transition-colors ${
                                link.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {link.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Delete link"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* QR Code Modal */}
        <AnimatePresence>
          {showQRCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setShowQRCode(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-6 max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-4">QR Code</h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                    <img
                      src={showQRCode.qrCode}
                      alt="QR Code"
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code to open the document
                  </p>
                  <button
                    onClick={() => setShowQRCode(null)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentSharingModal;