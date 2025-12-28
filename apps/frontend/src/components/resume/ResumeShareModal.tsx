import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { 
  X, 
  Link as LinkIcon, 
  Copy, 
  Share2, 
  Mail, 
  Shield,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  resumeTitle: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const ResumeShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, resumeId, resumeTitle }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState({
    title: `Institutional Share - ${resumeTitle}`,
    recipientEmail: '',
    recipientName: '',
    settings: {
      requireEmail: false,
      notifyOnView: true,
      allowDownload: true
    }
  });
  const [trackingLink, setTrackingLink] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      // Handle auth-storage format if needed
      let actualToken = token;
      if (!token) {
         const authStorage = localStorage.getItem('auth-storage');
         if (authStorage) {
            const parsed = JSON.parse(authStorage);
            actualToken = parsed?.state?.accessToken;
         }
      }

      const response = await fetch(`${API_BASE}/api/v1/resumes/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${actualToken}`
        },
        body: JSON.stringify({
          resumeId,
          ...shareData
        })
      });

      const data = await response.json();
      if (data.success) {
        setTrackingLink(data.data.trackingUrl || data.data.url);
        setStep('success');
        toast.success('Tracking protocol initialized.');
      } else {
        toast.error(data.message || 'Initialization failure.');
      }
    } catch (error) {
      toast.error('Network protocol error.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackingLink);
    toast.success('Link copied to clipboard.');
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden safe-area-mobile">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-brand-dark/40 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl overflow-hidden my-auto max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Share2 size={100} />
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6 relative z-10"
            >
              <div className="flex justify-between items-start pb-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">Share Tracking Link</h2>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary mt-1">Generate a secure, trackable link.</p>
                </div>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-surface-50 text-text-tertiary hover:text-brand-dark transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider ml-1">Reference Title</label>
                  <input 
                    required 
                    className="w-full bg-surface-50 border-none rounded-xl py-3 px-4 text-sm font-semibold text-brand-dark focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-text-tertiary" 
                    value={shareData.title} 
                    onChange={e => setShareData({...shareData, title: e.target.value})} 
                    placeholder="e.g. Application to Google" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider ml-1">Recipient Name</label>
                    <input 
                      className="w-full bg-surface-50 border-none rounded-xl py-3 px-4 text-sm font-semibold text-brand-dark focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-text-tertiary" 
                      value={shareData.recipientName} 
                      onChange={e => setShareData({...shareData, recipientName: e.target.value})} 
                      placeholder="Optional" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider ml-1">Recipient Email</label>
                    <input 
                      type="email" 
                      className="w-full bg-surface-50 border-none rounded-xl py-3 px-4 text-sm font-semibold text-brand-dark focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-text-tertiary" 
                      value={shareData.recipientEmail} 
                      onChange={e => setShareData({...shareData, recipientEmail: e.target.value})} 
                      placeholder="Optional" 
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 bg-surface-50 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Shield size={12} className="text-brand-blue" />
                    Tracking Settings
                  </h4>
                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between p-2.5 bg-white rounded-xl cursor-pointer hover:shadow-sm transition-all active:scale-[0.99]">
                      <span className="text-xs sm:text-sm font-bold text-brand-dark flex items-center gap-2">
                        <Mail size={14} className="text-text-tertiary" />
                        Notify on View
                      </span>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={shareData.settings.notifyOnView}
                          onChange={e => setShareData({...shareData, settings: {...shareData.settings, notifyOnView: e.target.checked}})}
                        />
                        <div className="w-9 h-5 bg-surface-200 rounded-full peer-checked:bg-brand-blue transition-colors duration-300" />
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-4 shadow-sm" />
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between p-2.5 bg-white rounded-xl cursor-pointer hover:shadow-sm transition-all active:scale-[0.99]">
                      <span className="text-xs sm:text-sm font-bold text-brand-dark flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-3.5 h-3.5 text-text-tertiary" />
                        Allow PDF Download
                      </span>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={shareData.settings.allowDownload}
                          onChange={e => setShareData({...shareData, settings: {...shareData.settings, allowDownload: e.target.checked}})}
                        />
                        <div className="w-9 h-5 bg-surface-200 rounded-full peer-checked:bg-brand-blue transition-colors duration-300" />
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-4 shadow-sm" />
                      </div>
                    </label>
                  </div>
                </div>

                <button disabled={loading} type="submit" className="btn-primary w-full py-4 text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-brand-blue/20 mt-2 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2">
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>Create Tracking Link <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 relative z-10"
            >
              <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 bg-brand-success/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-white border-2 border-brand-success/20 flex items-center justify-center text-brand-success shadow-lg ring-4 ring-brand-success/5">
                  <Share2 size={32} strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">Link Generated</h3>
                <p className="text-xs sm:text-sm text-text-secondary font-medium max-w-xs mx-auto">Your secure tracking link is ready.</p>
              </div>

              <div className="p-2 bg-surface-50 border border-surface-200 rounded-xl flex items-center gap-2 group/link">
                <div className="w-10 h-10 rounded-lg bg-white border border-surface-100 flex items-center justify-center text-brand-blue shadow-sm shrink-0">
                  <LinkIcon size={18} />
                </div>
                <input readOnly className="bg-transparent border-none focus:ring-0 text-xs font-bold text-brand-dark flex-1 truncate font-mono min-w-0" value={trackingLink} />
                <button 
                  onClick={copyToClipboard}
                  className="p-2.5 bg-brand-dark text-white rounded-lg hover:bg-black hover:shadow-lg transition-all active:scale-95 shrink-0"
                  title="Copy Link"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-surface-200 rounded-xl text-brand-dark hover:bg-surface-50 transition-all"
                >
                  Done
                </button>
                <button 
                  onClick={() => setStep('form')}
                  className="btn-primary px-4 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-blue/20"
                >
                  Create New
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
};
