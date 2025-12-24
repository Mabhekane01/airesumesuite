import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight, X, Building, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface PendingJob {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  url: string;
  timestamp: number;
}

export const PendingApplicationsWidget = () => {
  const navigate = useNavigate();
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);

  useEffect(() => {
    const loadPendingJobs = () => {
      try {
        const stored = localStorage.getItem('pendingJobApplications');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Filter out jobs older than 24 hours
          const now = new Date().getTime();
          const valid = parsed.filter((job: PendingJob) => (now - job.timestamp) < 24 * 60 * 60 * 1000);
          
          if (valid.length !== parsed.length) {
            localStorage.setItem('pendingJobApplications', JSON.stringify(valid));
          }
          setPendingJobs(valid);
        }
      } catch (e) {
        console.error('Failed to load pending jobs', e);
      }
    };

    loadPendingJobs();
    
    // Listen for storage events to update in real-time across tabs
    window.addEventListener('storage', loadPendingJobs);
    return () => window.removeEventListener('storage', loadPendingJobs);
  }, []);

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = pendingJobs.filter(job => job.id !== id);
    setPendingJobs(updated);
    localStorage.setItem('pendingJobApplications', JSON.stringify(updated));
    toast.info('Application reminder removed');
  };

  const handleTrack = (jobId: string) => {
    navigate(`/jobs/${jobId}?autoTrack=true`);
  };

  if (pendingJobs.length === 0) return null;

  return (
    <div className="bg-white border border-surface-200 rounded-[2rem] p-6 md:p-8 shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
      
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shadow-inner">
          <Clock size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Pending Applications</h3>
          <p className="text-xs font-bold text-text-tertiary">You viewed these jobs recently. Did you apply?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        <AnimatePresence>
          {pendingJobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => handleTrack(job.id)}
              className="bg-surface-50 border border-surface-200 p-5 rounded-2xl group cursor-pointer hover:border-brand-blue/30 hover:shadow-md transition-all duration-300 relative"
            >
              <button 
                onClick={(e) => handleDismiss(e, job.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-text-tertiary hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>

              <h4 className="font-black text-brand-dark pr-6 line-clamp-1 mb-2">{job.title}</h4>
              
              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <Building size={12} className="text-brand-blue" />
                  {job.company}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <MapPin size={12} className="text-brand-blue" />
                  {job.location}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-200">
                <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest">Action Required</span>
                <div className="flex items-center gap-1 text-[10px] font-black text-brand-blue uppercase tracking-widest group-hover:gap-2 transition-all">
                  Track <ArrowRight size={12} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
