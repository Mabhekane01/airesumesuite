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
        className="relative bg-white border border-surface-200 rounded-[3rem] w-full max-w-xl p-12 shadow-2xl overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700">
          <Share2 size={120} />
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-10 relative z-10"
            >
              <div className="flex justify-between items-center pb-6 border-b border-surface-100">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
                    <Share2 size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black text-brand-dark tracking-tighter uppercase leading-none">Initialize Share.</h2>
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest mt-1">Deployment Node Tracking</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-50 border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-dark hover:rotate-90 transition-all duration-300">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Internal Reference Title</label>
                  <input 
                    required 
                    className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-4 px-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary" 
                    value={shareData.title} 
                    onChange={e => setShareData({...shareData, title: e.target.value})} 
                    placeholder="e.g. Sent to Google HR" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Recipient Identifier</label>
                    <input 
                      className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-4 px-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary" 
                      value={shareData.recipientName} 
                      onChange={e => setShareData({...shareData, recipientName: e.target.value})} 
                      placeholder="Optional" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Communication Protocol (Email)</label>
                    <input 
                      type="email" 
                      className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-4 px-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary" 
                      value={shareData.recipientEmail} 
                      onChange={e => setShareData({...shareData, recipientEmail: e.target.value})} 
                      placeholder="Optional" 
                    />
                  </div>
                </div>

                <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2.5rem] space-y-6 relative overflow-hidden group/settings shadow-inner">
                  <div className="absolute inset-0 bg-brand-blue/[0.01] pointer-events-none group-hover/settings:bg-brand-blue/[0.03] transition-colors" />
                  <h4 className="relative z-10 text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Shield size={12} className="text-brand-blue" />
                    Tracking Protocol Configuration
                  </h4>
                  <div className="relative z-10 space-y-4">
                    <label className="flex items-center justify-between p-4 bg-white/50 border border-surface-100 rounded-xl cursor-pointer group/label hover:bg-white transition-all shadow-sm">
                      <span className="text-xs font-black text-brand-dark uppercase tracking-widest flex items-center gap-3">
                        <Mail size={14} className="text-brand-blue opacity-40" />
                        View Alerts
                      </span>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={shareData.settings.notifyOnView}
                          onChange={e => setShareData({...shareData, settings: {...shareData.settings, notifyOnView: e.target.checked}})}
                        />
                        <div className="w-12 h-7 bg-surface-200 rounded-full peer-checked:bg-brand-blue transition-colors duration-300 shadow-inner" />
                        <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-5 shadow-md" />
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-white/50 border border-surface-100 rounded-xl cursor-pointer group/label hover:bg-white transition-all shadow-sm">
                      <span className="text-xs font-black text-brand-dark uppercase tracking-widest flex items-center gap-3">
                        <ArrowDownTrayIcon className="w-3.5 h-3.5 text-brand-blue opacity-40" />
                        Asset Extraction (PDF)
                      </span>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={shareData.settings.allowDownload}
                          onChange={e => setShareData({...shareData, settings: {...shareData.settings, allowDownload: e.target.checked}})}
                        />
                        <div className="w-12 h-7 bg-surface-200 rounded-full peer-checked:bg-brand-blue transition-colors duration-300 shadow-inner" />
                        <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-5 shadow-md" />
                      </div>
                    </label>
                  </div>
                </div>

                <button disabled={loading} type="submit" className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-blue/20 mt-4 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 group/submit">
                  {loading ? 'Processing Integration...' : 'Initialize Tracking Node'}
                  <ArrowRight size={18} className="group-hover/submit:translate-x-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-12 relative z-10"
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-brand-success/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-24 h-24 rounded-[2.5rem] bg-white border-2 border-brand-success/20 flex items-center justify-center text-brand-success shadow-xl ring-8 ring-brand-success/5 animate-bounce-slow">
                  <Shield size={48} strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-4xl font-display font-black text-brand-dark tracking-tighter uppercase leading-none">Node Active.</h3>
                <p className="text-base text-text-secondary font-medium max-w-xs mx-auto leading-relaxed">Your unique tracking link is live. Recruiter engagement is now being monitored.</p>
              </div>

              <div className="p-3 bg-surface-50 border border-surface-200 rounded-[2rem] flex items-center gap-3 group/link shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-white border border-surface-100 flex items-center justify-center text-brand-blue shadow-sm">
                  <LinkIcon size={20} />
                </div>
                <input readOnly className="bg-transparent border-none focus:ring-0 text-xs font-black text-brand-dark flex-1 truncate font-mono tracking-tight" value={trackingLink} />
                <button 
                  onClick={copyToClipboard}
                  className="p-4 bg-brand-dark text-white rounded-xl hover:bg-black hover:shadow-xl transition-all active:scale-95 group/copy"
                  title="Copy Tracking URL"
                >
                  <Copy size={18} className="group-hover/copy:scale-110 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={onClose}
                  className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-surface-200 rounded-xl text-brand-dark hover:bg-surface-50 transition-all active:scale-95"
                >
                  Close Terminal
                </button>
                <button 
                  onClick={() => setStep('form')}
                  className="btn-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 active:scale-95"
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
