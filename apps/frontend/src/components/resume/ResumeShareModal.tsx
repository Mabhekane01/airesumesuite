import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Link as LinkIcon, 
  Copy, 
  Share2, 
  Mail, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  ArrowRight,
  Send
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeId,
          ...shareData
        })
      });

      const data = await response.json();
      if (data.success) {
        setTrackingLink(data.data.trackingUrl);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-dark/20 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white border border-surface-200 rounded-[3rem] w-full max-w-xl p-10 shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                    <Share2 size={24} strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-black text-brand-dark tracking-tighter uppercase">Initialize Share.</h2>
                </div>
                <button onClick={onClose} className="p-2 text-text-tertiary hover:text-brand-dark transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Internal Title</label>
                  <input 
                    required 
                    className="input-resume" 
                    value={shareData.title} 
                    onChange={e => setShareData({...shareData, title: e.target.value})} 
                    placeholder="e.g. Sent to Google HR" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Recipient Name</label>
                    <input 
                      className="input-resume" 
                      value={shareData.recipientName} 
                      onChange={e => setShareData({...shareData, recipientName: e.target.value})} 
                      placeholder="Optional" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Recipient Email</label>
                    <input 
                      type="email" 
                      className="input-resume" 
                      value={shareData.recipientEmail} 
                      onChange={e => setShareData({...shareData, recipientEmail: e.target.value})} 
                      placeholder="Optional" 
                    />
                  </div>
                </div>

                <div className="p-6 bg-surface-50 border border-surface-200 rounded-[2rem] space-y-4">
                  <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest px-1">Tracking Protocol Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={shareData.settings.notifyOnView}
                          onChange={e => setShareData({...shareData, settings: {...shareData.settings, notifyOnView: e.target.checked}})}
                        />
                        <div className="w-10 h-6 bg-surface-200 rounded-full peer-checked:bg-brand-blue transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                      </div>
                      <span className="text-xs font-bold text-text-secondary group-hover:text-brand-dark transition-colors">Notify me on view</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={shareData.settings.allowDownload}
                          onChange={e => setShareData({...shareData, settings: {...shareData.settings, allowDownload: e.target.checked}})}
                        />
                        <div className="w-10 h-6 bg-surface-200 rounded-full peer-checked:bg-brand-blue transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                      </div>
                      <span className="text-xs font-bold text-text-secondary group-hover:text-brand-dark transition-colors">Allow PDF Download</span>
                    </label>
                  </div>
                </div>

                <button disabled={loading} type="submit" className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 mt-4 disabled:opacity-50 transition-all active:scale-[0.98]">
                  {loading ? 'Initializing...' : 'Generate Tracking Node'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-10"
            >
              <div className="w-20 h-20 rounded-[2.5rem] bg-brand-success/10 flex items-center justify-center text-brand-success mx-auto shadow-inner border border-brand-success/20">
                <Shield size={40} strokeWidth={2.5} />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-brand-dark tracking-tighter uppercase leading-none">Tracking Node Active.</h3>
                <p className="text-sm font-bold text-text-secondary opacity-70">Share this unique link to track recruiter engagement in real-time.</p>
              </div>

              <div className="p-2 bg-surface-50 border border-surface-200 rounded-3xl flex items-center gap-2 group">
                <div className="p-3 text-brand-blue">
                  <LinkIcon size={20} />
                </div>
                <input readOnly className="bg-transparent border-none focus:ring-0 text-xs font-black text-brand-dark flex-1 truncate" value={trackingLink} />
                <button 
                  onClick={copyToClipboard}
                  className="p-4 bg-white border border-surface-200 rounded-2xl text-text-tertiary hover:text-brand-blue hover:shadow-lg transition-all"
                >
                  <Copy size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={onClose}
                  className="btn-secondary py-4 text-[10px] font-black uppercase tracking-widest border-2"
                >
                  Close Terminal
                </button>
                <button 
                  onClick={() => setStep('form')}
                  className="btn-primary py-4 text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  Create Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
