import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Building, 
  Search, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { jobApplicationAPI } from '../../services/api';

// --- Components ---

const STATUS_CONFIG: Record<string, any> = {
  applied: { label: 'Applied', color: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20', icon: Clock },
  under_review: { label: 'In Review', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', icon: Eye },
  interview: { label: 'Interview', color: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20', icon: Calendar },
  offer: { label: 'Offer', color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-500 bg-red-50 border-red-100', icon: XCircle },
};

const ApplicationCard = ({ application, onDelete }: { application: any, onDelete: (id: string) => void }) => {
  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.applied;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-sm hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:border-brand-blue/20 transition-all duration-500 group relative overflow-hidden flex flex-col h-full"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/[0.02] rounded-full -mr-16 -mt-16 group-hover:bg-brand-blue/[0.05] transition-colors duration-700" />
      
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl md:text-2xl font-display font-black text-brand-dark tracking-tighter leading-[1.1] group-hover:text-brand-blue transition-colors duration-300 line-clamp-2">
            {application.jobTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-3 md:gap-5 mt-3 md:mt-4">
            <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-2.5 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
              <Building size={12} className="text-brand-blue" /> 
              {application.companyName}
            </div>
            {application.jobLocation && (
              <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-2.5 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
                <MapPin size={12} className="text-brand-blue" /> 
                {application.jobLocation.city || 'Remote'}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto justify-between sm:justify-start pt-2 sm:pt-0">
           <div className={`px-2.5 py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${statusConfig.color}`}>
             <span className="flex items-center gap-1.5">
               <statusConfig.icon size={12} strokeWidth={3} />
               {statusConfig.label}
             </span>
           </div>
           
           <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-bold text-text-tertiary uppercase tracking-widest bg-surface-50 px-2 py-1 rounded-md border border-surface-100">
             <Clock size={10} />
             {new Date(application.applicationDate).toLocaleDateString()}
           </div>
           
           <button 
             onClick={(e) => { e.preventDefault(); onDelete(application._id); }}
             className="p-2 rounded-xl text-text-tertiary hover:bg-red-50 hover:text-red-500 transition-all sm:opacity-0 group-hover:opacity-100"
             title="Remove Application"
           >
             <Trash2 size={16} />
           </button>
        </div>
      </div>
      
      {/* Description Snippet or Notes */}
      <p className="relative z-10 text-text-secondary text-sm font-medium leading-relaxed opacity-80 mb-6 md:mb-10 line-clamp-3 italic">
        "{application.applicationStrategy?.whyInterested || application.jobDescription || 'No notes available.'}"
      </p>

      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-auto pt-6 border-t border-surface-100/60 gap-4">
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-1 opacity-60">Status Update</span>
          <span className="text-sm font-black text-brand-dark tracking-tight flex items-center gap-2">
             {application.communications?.length || 0} Logs / {application.interviews?.length || 0} Sessions
          </span>
        </div>
        <Link 
          to={`/dashboard/applications/${application._id}`} 
          className="btn-primary px-6 md:px-8 py-3.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2.5 hover:scale-105 transition-transform duration-300"
        >
          Manage Protocol <ChevronRight size={16} className="stroke-[3]" />
        </Link>
      </div>
    </motion.div>
  );
};

// --- Main Page ---

const ResumeTrackingDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await jobApplicationAPI.getApplications();
      if (response.success && response.data) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      toast.error('Failed to load active protocols.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Execute purge protocol for this application?')) return;
    try {
      await jobApplicationAPI.deleteApplication(id);
      setApplications(prev => prev.filter(app => app._id !== id));
      toast.success('Application purged.');
    } catch (error) {
      toast.error('Purge failed.');
    }
  };

  const filteredApplications = applications.filter(app => 
    !keyword || 
    app.jobTitle.toLowerCase().includes(keyword.toLowerCase()) ||
    app.companyName.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 md:space-y-12 pb-24 animate-slide-up-soft">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 pb-6 border-b border-surface-200/60">
        <div className="space-y-3 md:space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue border border-brand-blue/10 shadow-sm backdrop-blur-sm">
            <Briefcase className="w-4 h-4" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Application Control Grid</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-6xl font-display font-black text-brand-dark tracking-tighter">
              Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Deployments.</span>
            </h1>
            <p className="text-base md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed opacity-80">
              Monitor and manage your active job application nodes.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/jobs')}
            className="btn-primary w-full sm:w-auto shadow-2xl shadow-brand-blue/20 px-6 md:px-8 py-3.5 md:py-4 font-black uppercase tracking-[0.15em] text-[10px] md:text-xs hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-3"
          >
            <Plus size={18} strokeWidth={3} />
            Deploy New
          </button>
        </div>
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[3rem] p-4 md:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch lg:items-center">
          <div className="flex-1 relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-surface-50 flex items-center justify-center group-focus-within:bg-brand-blue group-focus-within:text-white transition-all border border-surface-100 group-focus-within:border-brand-blue shadow-inner">
              <Search size={16} strokeWidth={2.5} />
            </div>
            <input 
              type="text" 
              placeholder="Filter active protocols by role or company..." 
              className="w-full bg-surface-50/50 border border-surface-200 rounded-xl md:rounded-2xl py-4 md:py-5 pl-16 md:pl-20 pr-6 text-sm font-black text-brand-dark focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary placeholder:font-bold tracking-tight"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          <h2 className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">
            Active Grid: {filteredApplications.length} Nodes
          </h2>
        </div>
      </div>

      {/* --- GRID --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-80 bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm" />
          ))}
        </div>
      ) : filteredApplications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <AnimatePresence>
            {filteredApplications.map((app: any) => (
              <ApplicationCard 
                key={app._id} 
                application={app} 
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] py-16 md:py-32 text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-sm group">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.3]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-surface-50 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-inner text-text-tertiary mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500 ring-8 ring-white">
              <Briefcase className="w-8 h-8 md:w-10 md:h-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-3 max-w-md mx-auto px-6">
              <h3 className="text-2xl md:text-3xl font-display font-black text-brand-dark tracking-tight">Zero Active Deployments.</h3>
              <p className="text-sm md:text-base text-text-secondary font-medium leading-relaxed">Your application grid is empty. Initialize new protocols to begin tracking.</p>
            </div>
            <div className="mt-6 md:mt-8 px-6 w-full sm:w-auto">
              <button 
                onClick={() => navigate('/jobs')}
                className="btn-primary w-full sm:w-auto px-8 md:px-10 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 hover:scale-105 transition-transform flex items-center justify-center gap-3 group/btn"
              >
                <Plus size={16} strokeWidth={3} />
                Deploy New Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeTrackingDashboard;