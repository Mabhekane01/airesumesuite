import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  Building, 
  MapPin, 
  Globe, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck,
  AlertCircle,
  Layout,
  Clock,
  ExternalLink,
  X,
  Download,
  BarChart2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import ResumeSelector from '../components/career-coach/ResumeSelector';
import { TrustScore } from '../components/jobs/TrustScore';
import { FeedbackModal } from '../components/jobs/FeedbackModal';
import { ResumeData } from '../services/resumeService';
import { api, jobApplicationAPI } from '../services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const ResumeSelectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (resume: ResumeData) => void; 
  loading: boolean;
}) => {
  const [selectedResume, setSelectedResume] = useState<ResumeData | null>(null);

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
        className="relative bg-white border border-surface-200 rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
              <ShieldCheck size={24} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-dark tracking-tighter">Select Tracking Node.</h2>
              <p className="text-xs font-bold text-text-tertiary">Choose which resume architecture to deploy.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-50 border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-dark hover:rotate-90 transition-all duration-300"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 mb-6 custom-scrollbar">
          <ResumeSelector onSelectResume={setSelectedResume} />
        </div>

        <div className="shrink-0 pt-6 border-t border-surface-100">
          <button 
            disabled={!selectedResume || loading} 
            onClick={() => selectedResume && onConfirm(selectedResume)}
            className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {loading ? 'Initializing Tracking Protocol...' : (
              <>
                Confirm & Download Tracked Resume <Download size={18} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PublicJobView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackApplication, setTrackApplication] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  
  // Modal States
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autoTrack') === 'true') {
      setIsResumeModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const fetchJobAndCheckStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/shared/job/${id}`);
        const data = await response.json();
        
        if (data.success) {
          const jobData = data.data;
          setJob(jobData);
          
          // Check if user already applied to this job
          if (isAuthenticated) {
            try {
              const appsRes = await jobApplicationAPI.getApplications();
              if (appsRes.success) {
                const jobId = jobData._id || jobData.id;
                const existingApp = appsRes.data.applications.find(app => 
                  (app.jobPostingId && (app.jobPostingId === jobId || app.jobPostingId.toString() === jobId)) || 
                  (jobData.url && app.jobUrl === jobData.url)
                );
                if (existingApp) {
                  setExistingApplicationId(existingApp._id);
                }
              }
            } catch (appErr) {
              console.warn('Could not verify application status');
            }
          }
        } else {
          setError(data.message || 'Job not found');
        }
      } catch (err) {
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobAndCheckStatus();
  }, [id, isAuthenticated]);

  const handleApplyClick = () => {
    if (!job || existingApplicationId) return;

    // Save to pending applications in localStorage so user can add it later if they return
    const pendingApps = JSON.parse(localStorage.getItem('pendingJobApplications') || '[]');
    const jobData = {
      id: job._id || job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      country: job.country,
      description: job.description,
      url: job.url,
      timestamp: new Date().getTime()
    };
    
    // Avoid duplicates
    if (!pendingApps.find((a: any) => a.id === jobData.id)) {
      pendingApps.push(jobData);
      // Keep only last 5 pending apps
      if (pendingApps.length > 5) pendingApps.shift();
      localStorage.setItem('pendingJobApplications', JSON.stringify(pendingApps));
    }

    if (trackApplication && !isAuthenticated) {
      toast.info('Please sign in to track this application', {
        description: 'You can still apply directly, but tracking helps you manage your search.'
      });
      localStorage.setItem('redirectAfterLogin', window.location.pathname + '?autoTrack=true');
      navigate('/login');
      return;
    }

    if (trackApplication && isAuthenticated) {
      // Direct to resume selection for tracking
      setIsResumeModalOpen(true);
    } else {
      // Direct apply without tracking
      window.open(job.url, '_blank', 'noopener,noreferrer');
      // Redirect current tab to job board so it's ready when they return
      setTimeout(() => {
        navigate('/dashboard/job-posting');
      }, 500);
    }
  };

  const handleConfirmApply = async (resume: ResumeData) => {
    setProcessing(true);
    try {
      // 1. Create Share Link
      const shareRes = await api.post('/share', {
        resumeId: resume._id,
        title: `Application to ${job.company}`,
        settings: {
          requireEmail: false,
          notifyOnView: true,
          allowDownload: true
        }
      });
      
      if (!shareRes.data.success) throw new Error('Failed to create tracking link');
      
      const shareId = shareRes.data.data.shareId;
      const trackingUrl = shareRes.data.data.trackingUrl;

      // 2. Download Tracked PDF
      const pdfRes = await api.post(`/resumes/${resume._id}/download-tracked`, {
        trackingUrl,
        templateId: resume.templateId || 'template01'
      });

      if (!pdfRes.data.success || !pdfRes.data.data.pdfData) {
        throw new Error('Failed to retrieve tracked PDF data');
      }

      // Convert base64 back to Blob
      const base64Data = pdfRes.data.data.pdfData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfRes.data.data.filename || `${resume.personalInfo.firstName}_${resume.personalInfo.lastName}_${job.company}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Tracked Resume Downloaded', {
        description: 'Upload this file to the job application to track views.'
      });

      // 3. Create Job Application Record
      await api.post('/job-applications', {
        jobTitle: job.title,
        companyName: job.company,
        jobDescription: job.description,
        jobUrl: job.url,
        jobPostingId: job._id || job.id, // Proper schema link
        jobSource: 'manual',
        jobLocation: {
          country: job.country,
          city: job.location,
          remote: job.jobType?.toLowerCase().includes('remote') || false
        },
        status: 'applied',
        applicationDate: new Date(),
        documentsUsed: {
          resumeId: resume._id,
          trackingShareId: shareId
        }
      });

      toast.success('Application added to tracker!');

      // Remove from pending applications
      const pendingApps = JSON.parse(localStorage.getItem('pendingJobApplications') || '[]');
      const filteredApps = pendingApps.filter((a: any) => a.id !== (job._id || job.id));
      localStorage.setItem('pendingJobApplications', JSON.stringify(filteredApps));

      // 4. Redirect to Job URL and then to job-posting grid
      setTimeout(() => {
        window.open(job.url, '_blank', 'noopener,noreferrer');
        setIsResumeModalOpen(false);
        navigate('/dashboard/job-posting');
      }, 1500);

    } catch (err) {
      console.error('Error in application flow:', err);
      toast.error('Application tracking initialization failed', {
        description: 'You can still apply directly.'
      });
      // Fallback
      window.open(job.url, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        navigate('/dashboard/job-posting');
      }, 500);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Calibrating Architecture...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] p-6">
        <div className="bg-white border border-surface-200 rounded-[3rem] p-12 text-center max-w-lg shadow-xl">
          <AlertCircle size={48} className="text-brand-orange mx-auto mb-6" />
          <h2 className="text-2xl font-black text-brand-dark mb-4 uppercase">Signal Interrupted.</h2>
          <p className="text-text-secondary font-bold mb-8">{error || 'This job node is no longer active in the grid.'}</p>
          <Link to="/jobs" className="btn-primary px-8 py-4 text-xs font-black uppercase tracking-widest block">
            Return to Intelligence Grid
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-20 px-6 sm:px-10">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* --- JOB HEADER --- */}
        <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active Deployment Node</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tighter leading-none uppercase">
                  {job.title}
                </h1>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                    <Building size={18} className="text-brand-blue" />
                    {job.company}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                    <MapPin size={18} className="text-brand-blue" />
                    {job.location}, {job.country}
                  </div>
                  {job.jobType && (
                    <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                      <Clock size={18} className="text-brand-blue" />
                      {job.jobType}
                    </div>
                  )}
                  {/* Trust Score Display */}
                  <div className="md:ml-4 pl-4 md:border-l border-surface-200">
                    <TrustScore 
                      score={job.authenticityScore || 50} 
                      badges={job.trustBadges || []} 
                      reviewCount={job.reviewCount || 0}
                      size="md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Match Probability</div>
                <div className="text-4xl font-black text-brand-success tracking-tighter">94%</div>
              </div>
            </div>

            <div className="pt-8 border-t border-surface-100 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-1">
                <div className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Yield Projection</div>
                <div className="text-xl font-black text-brand-dark tracking-tight">{job.salaryRange || 'Protocol: Confidential'}</div>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                  {existingApplicationId ? (
                    <Link 
                      to={`/dashboard/applications/${existingApplicationId}`}
                      className="btn-primary w-full px-10 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-dark/20 flex items-center justify-center gap-3 transition-all bg-brand-dark hover:bg-slate-800"
                    >
                      View Active Deployment <Layout size={18} />
                    </Link>
                  ) : (
                    <button 
                      onClick={handleApplyClick}
                      disabled={processing}
                      className="btn-primary w-full px-10 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      {processing ? 'Processing...' : 'Deploy Application'} <ArrowRight size={18} className="stroke-[3]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- APPLIED BANNER --- */}
        {existingApplicationId && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-success text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle size={32} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h3 className="text-xl font-black uppercase tracking-tight">Application Protocol Active.</h3>
              <p className="text-sm font-bold opacity-80">You have already synchronized this node with your tracking grid. Redundant deployments are restricted to ensure data integrity.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsFeedbackModalOpen(true)}
                className="px-6 py-3.5 bg-brand-dark text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck size={14} /> Verify
              </button>
              <Link 
                to={`/dashboard/applications/${existingApplicationId}`}
                className="px-6 py-3.5 bg-white text-brand-dark rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <BarChart2 size={14} className="stroke-[3]" /> Analytics
              </Link>
            </div>
          </motion.div>
        )}

        {/* --- DEPLOYMENT STRATEGY ALERT --- */}
        {!existingApplicationId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-blue/5 border border-brand-blue/20 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <AlertCircle size={24} strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-brand-dark uppercase tracking-widest">Recommended: Deployment Strategy</h4>
              <p className="text-xs font-bold text-text-secondary leading-relaxed">
                Choose <span className="text-brand-blue">"Direct Only"</span> for your first visit. This ensures the job site opens instantly without being blocked by your browser. 
                <span className="block mt-1 opacity-70 italic font-medium text-text-tertiary">Don't worry—the system will save this node to your dashboard, so you can easily activate full tracking later.</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* --- TRACKING OPTIONS --- */}
        {!existingApplicationId && (
          <div className="bg-brand-dark text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-brand-blue/20 transition-all duration-1000" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="w-20 h-20 rounded-3xl bg-brand-blue/20 flex items-center justify-center text-brand-blue shadow-inner shrink-0 group-hover:rotate-6 transition-transform">
                <ShieldCheck size={40} strokeWidth={2.5} />
              </div>
              
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-black tracking-tight uppercase">Intelligence Tracking Enabled.</h3>
                <p className="text-sm font-bold text-white/60 leading-relaxed">
                  Activate the real-time tracking protocol. The system will automatically add this node to your application grid, track recruiter engagement, and provide follow-up logic.
                </p>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 shrink-0">
                <button 
                  onClick={() => setTrackApplication(true)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${trackApplication ? 'bg-brand-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Track Node
                </button>
                <button 
                  onClick={() => setTrackApplication(false)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!trackApplication ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Direct Only
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- JOB DESCRIPTION --- */}
        <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-sm">
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-center text-brand-blue">
                <Layout size={20} />
              </div>
              <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">Node Technical Specifications</h3>
            </div>
            
            <div className="prose prose-slate max-w-none fidelity-display-layer">
              <div 
                dangerouslySetInnerHTML={{ __html: job.description }}
                className="leading-relaxed text-text-secondary font-medium"
              />
            </div>
            
            <div className="pt-10 border-t border-surface-100 flex items-center justify-center">
              <button 
                onClick={handleApplyClick}
                disabled={!!existingApplicationId}
                className={`text-sm font-black uppercase tracking-widest hover:underline flex items-center gap-2 group ${existingApplicationId ? 'opacity-50 cursor-not-allowed' : 'text-brand-blue'}`}
              >
                <ExternalLink size={16} />
                View Original Deployment Source
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fidelity Display Layer Synchronization */}
      <style>{`
        .fidelity-display-layer { font-size: 1rem !important; line-height: 1.6 !important; }
        .fidelity-display-layer ul { list-style-type: disc !important; padding-left: 2rem !important; margin-bottom: 1.25rem !important; margin-top: 0.5rem !important; display: block !important; }
        .fidelity-display-layer ol { list-style-type: decimal !important; padding-left: 2rem !important; margin-bottom: 1.25rem !important; margin-top: 0.5rem !important; display: block !important; }
        .fidelity-display-layer li { display: list-item !important; margin-bottom: 0.5rem !important; padding-left: 0.25rem !important; color: inherit !important; }
        .fidelity-display-layer strong { font-weight: 800 !important; color: #1a1a1a !important; }
        .fidelity-display-layer b { font-weight: 800 !important; }
        .fidelity-display-layer em, .fidelity-display-layer i { font-style: italic !important; }
        .fidelity-display-layer p { margin-bottom: 1.25rem !important; display: block !important; }
      `}</style>

      <ResumeSelectionModal 
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onConfirm={handleConfirmApply}
        loading={processing}
      />
      
      {job && (
        <FeedbackModal 
          isOpen={isFeedbackModalOpen} 
          onClose={() => setIsFeedbackModalOpen(false)}
          jobId={job._id || job.id}
          jobTitle={job.title}
          companyName={job.company}
        />
      )}
    </div>
  );
};

export default PublicJobView;
