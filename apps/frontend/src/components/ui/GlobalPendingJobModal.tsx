import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, CheckCircle, X, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface PendingJob {
  id: string;
  title: string;
  company: string;
  location: string;
  timestamp: number;
}

export const GlobalPendingJobModal = () => {
  const [pendingJob, setPendingJob] = useState<PendingJob | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for pending jobs on mount and route change
    checkPendingJobs();
  }, [location.pathname]);

  const checkPendingJobs = () => {
    try {
      // Don't show if we are already on the specific job page
      if (location.pathname.includes('/jobs/')) return;

      const stored = localStorage.getItem('pendingJobApplications');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = new Date().getTime();
        // Get the most recent valid pending job (less than 24h old)
        const valid = parsed.filter((job: PendingJob) => (now - job.timestamp) < 24 * 60 * 60 * 1000);
        
        if (valid.length > 0) {
          // Show the most recent one
          setPendingJob(valid[valid.length - 1]);
        } else {
          setPendingJob(null);
        }
      }
    } catch (e) {
      console.error('Error checking pending jobs', e);
    }
  };

  const handleDismiss = () => {
    if (!pendingJob) return;
    
    // Remove specific job from storage
    const stored = localStorage.getItem('pendingJobApplications');
    if (stored) {
      const parsed = JSON.parse(stored);
      const updated = parsed.filter((job: PendingJob) => job.id !== pendingJob.id);
      localStorage.setItem('pendingJobApplications', JSON.stringify(updated));
    }
    setPendingJob(null);
  };

  const handleTrack = () => {
    if (!pendingJob) return;
    // Navigate to job page with auto-track param
    navigate(`/jobs/${pendingJob.id}/apply?autoTrack=true`);
    handleDismiss(); // Clear it so it doesn't pop up again immediately
  };

  if (!pendingJob) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 100, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-8 right-8 z-[100] max-w-md w-full"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-brand-blue/20 rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-blue/[0.03] rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-brand-blue/10 transition-colors duration-1000" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner border border-brand-blue/5">
                  <Briefcase size={28} strokeWidth={2.5} className="group-hover:rotate-6 transition-transform" />
                </div>
                <div>
                  <h4 className="text-base font-black text-brand-dark uppercase tracking-tighter">Recent Deployment.</h4>
                  <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-brand-blue animate-pulse" />
                    Tracking Synchronization
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-surface-50 border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-dark transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-text-secondary leading-relaxed">
                We detected interest in an external architecture. Would you like to synchronize this node with your application grid?
              </p>
              <div className="p-5 bg-surface-50/50 border border-surface-200 rounded-2xl group-hover:bg-white transition-colors duration-500">
                <h5 className="text-base font-black text-brand-dark truncate tracking-tight">{pendingJob.title}</h5>
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest mt-1">{pendingJob.company} <span className="mx-1.5 opacity-30">•</span> {pendingJob.location}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleDismiss}
                className="flex-1 py-4 rounded-xl bg-surface-50 border border-surface-200 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-brand-dark hover:bg-white transition-all active:scale-95"
              >
                Purge Node
              </button>
              <button 
                onClick={handleTrack}
                className="flex-[1.5] py-4 rounded-xl bg-brand-blue text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:bg-brand-blue/90 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Sync to Tracker <ArrowRight size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
