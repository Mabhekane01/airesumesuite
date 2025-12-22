import React, { useEffect, useState } from 'react';
import { useJobBoardStore } from '../stores/jobBoardStore';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Briefcase, Building, Plus, Search, ExternalLink, RefreshCw, X, Globe, Cpu, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { locationService } from '../services/locationService';

// --- Components ---

const JobCard = ({ job }: { job: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    className="bg-white border border-surface-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:border-brand-blue/30 transition-all duration-500 group relative overflow-hidden flex flex-col h-full"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/[0.02] rounded-full -mr-12 -mt-12 group-hover:bg-brand-blue/[0.05] transition-colors" />
    
    <div className="relative z-10 flex justify-between items-start mb-6">
      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-black text-brand-dark tracking-tighter leading-tight group-hover:text-brand-blue transition-colors truncate">
          {job.title}
        </h3>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-text-tertiary uppercase tracking-widest">
            <Building size={14} className="text-brand-blue opacity-60" /> 
            {job.company}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-black text-text-tertiary uppercase tracking-widest">
            <MapPin size={14} className="text-brand-blue opacity-60" /> 
            {job.location}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
         <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
           job.source === 'scraper' 
             ? "bg-brand-blue/5 border-brand-blue/20 text-brand-blue" 
             : "bg-brand-success/5 border-brand-success/20 text-brand-success"
         }`}>
           {job.source === 'scraper' ? 'System Optimized' : 'Community Authored'}
         </div>
         <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter opacity-60">
           {new Date(job.createdAt).toLocaleDateString()}
         </span>
      </div>
    </div>
    
    <p className="relative z-10 text-text-secondary text-sm font-bold leading-relaxed opacity-80 mb-8 line-clamp-3 italic">
      "{job.description}"
    </p>

    <div className="relative z-10 flex items-center justify-between mt-auto pt-6 border-t border-surface-100">
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-1">Yield Projection</span>
        <span className="text-sm font-black text-brand-dark tracking-tight">
          {job.salaryRange || 'Protocol: Confidential'}
        </span>
      </div>
      <Link 
        to={`/jobs/${job._id}/apply`} 
        className="btn-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-blue/20 flex items-center gap-2"
      >
        Deploy Application <ChevronRight size={14} className="stroke-[3]" />
      </Link>
    </div>
  </motion.div>
);

const SubmitJobModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { submitJob } = useJobBoardStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', company: '', location: '', country: '', description: '', url: '', jobType: 'Full-time'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitJob(formData);
      toast.success('Protocol Initiated. Data queued for validation.');
      onClose();
    } catch (error) {
      toast.error('Initialization failed.');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
              <Plus size={24} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tighter">Register Architecture.</h2>
          </div>
          <button onClick={onClose} className="p-2 text-text-tertiary hover:text-brand-dark transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Target Role</label>
              <input required className="input-resume" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Software Engineer" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Host Entity</label>
              <input required className="input-resume" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Global Inc." />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Geographic Node</label>
              <input required className="input-resume" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="City" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Cluster Country</label>
              <input required className="input-resume" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="Country" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Deployment URL</label>
            <input required type="url" className="input-resume" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Technical Specs</label>
            <textarea required rows={4} className="input-resume resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Architecture description..." />
          </div>

          <button disabled={loading} type="submit" className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 mt-4 disabled:opacity-50 transition-all active:scale-[0.98]">
            {loading ? 'Processing...' : 'Deploy Job Protocol'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main Page ---

const JobBoard = () => {
  const { jobs, isLoading, fetchJobs } = useJobBoardStore();
  const { user } = useAuthStore();
  const [country, setCountry] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    const detectAndFetch = async () => {
      try {
        const loc = await locationService.getUserLocation();
        const initialCountry = loc.country || 'United States';
        setCountry(initialCountry);
        fetchJobs(initialCountry);
      } catch (e) {
        setCountry('United States');
        fetchJobs('United States');
      }
    };
    detectAndFetch();
  }, [fetchJobs]);

  useEffect(() => {
    const lowerKeyword = keyword.toLowerCase();
    const filtered = jobs.filter(job => 
      !lowerKeyword || 
      job.title.toLowerCase().includes(lowerKeyword) ||
      job.company.toLowerCase().includes(lowerKeyword) ||
      job.description.toLowerCase().includes(lowerKeyword)
    );
    setFilteredJobs(filtered);
  }, [keyword, jobs]);

  const handleCountrySearch = () => country && fetchJobs(country);

  const handleRefresh = async () => {
    setIsScraping(true);
    try {
      await fetchJobs(country);
      toast.success('Archive Resynchronized.');
    } catch (e) {
      toast.error('Sync failure.');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="w-full space-y-10 pb-20 animate-slide-up-soft">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Intelligence Grid</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-brand-dark tracking-tighter leading-none">Job Intelligence.</h1>
          <p className="text-lg text-text-secondary font-bold opacity-70">Real-time market exploration through automated scraper nodes.</p>
        </div>
        
        {user?.role === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary px-8 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center gap-3 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            Register Job Node
          </button>
        )}
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white border border-surface-200 rounded-[2.5rem] p-4 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
          <div className="flex-1 relative group">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by country cluster..." 
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCountrySearch()}
            />
          </div>

          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
            <input 
              type="text" 
              placeholder="Search architecture keywords..." 
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <button onClick={handleCountrySearch} className="btn-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">
              Execute Search
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isScraping}
              className="p-4 bg-white border border-surface-200 rounded-2xl text-text-tertiary hover:text-brand-blue hover:bg-surface-50 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={20} className={isScraping ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* --- JOB LIST --- */}
      {isLoading && jobs.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-white border border-surface-200 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {filteredJobs.map((job: any) => (
            <JobCard key={job._id || job.externalId} job={job} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-surface-200 rounded-[3rem] py-32 text-center space-y-8 relative overflow-hidden shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.1]" />
          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 rounded-[2rem] bg-surface-50 border border-surface-200 flex items-center justify-center mx-auto text-text-tertiary opacity-30 shadow-sm group hover:scale-110 transition-transform">
              <Cpu size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-brand-dark tracking-tighter">Null Grid Results.</h3>
              <p className="text-text-secondary font-bold max-w-sm mx-auto opacity-70">The network returned zero architectures for your current parameters. Attempting a global resync is recommended.</p>
            </div>
            <button 
              onClick={handleRefresh}
              className="text-sm font-black text-brand-blue uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto transition-all group"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              Re-initialize Global Scraper
            </button>
          </div>
        </div>
      )}

      <SubmitJobModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default JobBoard;