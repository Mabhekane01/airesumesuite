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
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[100] max-w-sm w-full"
      >
        <div className="bg-white border border-brand-blue/20 rounded-[2rem] p-6 shadow-2xl shadow-brand-blue/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 blur-xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                  <Briefcase size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-brand-dark uppercase tracking-tight">Recent Activity</h4>
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Did you apply to this?</p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="text-text-tertiary hover:text-brand-dark transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 mb-4">
              <h5 className="font-black text-brand-dark truncate">{pendingJob.title}</h5>
              <div className="text-xs font-bold text-text-secondary mt-1">{pendingJob.company} • {pendingJob.location}</div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleDismiss}
                className="flex-1 py-3 rounded-xl border border-surface-200 text-xs font-black uppercase tracking-wider hover:bg-surface-50 transition-colors"
              >
                No, Dismiss
              </button>
              <button 
                onClick={handleTrack}
                className="flex-1 py-3 rounded-xl bg-brand-blue text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-blue/20 hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
              >
                Yes, Track <ArrowRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
