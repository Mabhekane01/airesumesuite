import React, { useEffect, useState } from 'react';
import { useJobBoardStore } from '../stores/jobBoardStore';
import { useAuthStore } from '../stores/authStore';
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
    whileHover={{ y: -6 }}
    className="bg-white border border-surface-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:border-brand-blue/20 transition-all duration-500 group relative overflow-hidden flex flex-col h-full"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/[0.02] rounded-full -mr-16 -mt-16 group-hover:bg-brand-blue/[0.05] transition-colors duration-700" />
    
    <div className="relative z-10 flex justify-between items-start mb-8">
      <div className="min-w-0 flex-1">
        <h3 className="text-2xl font-display font-black text-brand-dark tracking-tighter leading-[1.1] group-hover:text-brand-blue transition-colors duration-300 line-clamp-2">
          {job.title}
        </h3>
        <div className="flex flex-wrap items-center gap-5 mt-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
            <Building size={14} className="text-brand-blue" /> 
            {job.company}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
            <MapPin size={14} className="text-brand-blue" /> 
            {job.location}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2.5">
         {(() => {
           if (job.source === 'scraper') {
             return (
               <div className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm bg-brand-blue/5 border-brand-blue/10 text-brand-blue">
                 <span className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                   System Optimized
                 </span>
               </div>
             );
           } else if (job.source === 'admin') {
             return (
               <div className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm bg-brand-purple/5 border-brand-purple/10 text-brand-purple">
                 <span className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                   Official Listing
                 </span>
               </div>
             );
           } else {
             return (
               <div className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm bg-brand-success/5 border-brand-success/10 text-brand-success">
                 <span className="flex items-center gap-1.5">
                   Community Authored
                 </span>
               </div>
             );
           }
         })()}
         <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-tertiary uppercase tracking-widest bg-surface-50 px-2 py-1 rounded-md border border-surface-100">
           <Clock size={10} />
           {new Date(job.createdAt).toLocaleDateString()}
         </div>
      </div>
    </div>
    
    <p className="relative z-10 text-text-secondary text-sm font-medium leading-relaxed opacity-80 mb-10 line-clamp-3 italic">
      "{job.description}"
    </p>

    <div className="relative z-10 flex items-center justify-between mt-auto pt-6 border-t border-surface-100/60">
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-1 opacity-60">Yield Projection</span>
        <span className="text-sm font-black text-brand-dark tracking-tight flex items-center gap-2">
          <Cpu size={14} className="text-brand-blue opacity-40" />
          {job.salaryRange || 'Protocol: Confidential'}
        </span>
      </div>
      <Link 
        to={`/jobs/${job._id}/apply`} 
        className="btn-primary px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center gap-2.5 hover:scale-105 transition-transform duration-300"
      >
        Deploy Application <ChevronRight size={16} className="stroke-[3]" />
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
        className="relative bg-white border border-surface-200 rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
          <Plus size={120} />
        </div>

        <div className="relative z-10 flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner border border-brand-blue/5">
              <Plus size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-brand-dark tracking-tighter uppercase leading-none">Register Architecture.</h2>
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest mt-1">Manual node synchronization</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-50 border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-dark hover:rotate-90 transition-all duration-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Target Role</label>
              <input required className="input-resume w-full px-5 py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Software Engineer" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Host Entity</label>
              <input required className="input-resume w-full px-5 py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Global Inc." />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Geographic Node</label>
              <input required className="input-resume w-full px-5 py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="City" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Cluster Country</label>
              <input required className="input-resume w-full px-5 py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="Country" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Deployment URL</label>
            <input required type="url" className="input-resume w-full px-5 py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Technical Specs</label>
            <textarea required rows={4} className="input-resume w-full px-5 py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Architecture description..." />
          </div>

          <button disabled={loading} type="submit" className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-blue/20 mt-4 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95">
            {loading ? 'Processing Integration...' : 'Deploy Job Protocol'}
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
    <div className="w-full space-y-12 pb-24 animate-slide-up-soft">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-6 border-b border-surface-200/60">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue border border-brand-blue/10 shadow-sm backdrop-blur-sm">
            <Globe className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Intelligence Grid</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-display font-black text-brand-dark tracking-tighter">
              Job <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Intelligence.</span>
            </h1>
            <p className="text-lg md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed">
              Real-time market exploration through automated scraper nodes and architectural matching.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary shadow-2xl shadow-brand-blue/20 px-8 py-4 font-black uppercase tracking-[0.15em] text-xs hover:scale-105 transition-transform duration-300 flex items-center gap-3"
          >
            <Plus size={20} strokeWidth={3} />
            {user?.role === 'admin' ? 'Register Node' : 'Submit Job'}
          </button>
          <button 
            onClick={handleRefresh}
            disabled={isScraping}
            className="w-14 h-14 rounded-[1.2rem] bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300 disabled:opacity-50 shadow-sm"
            title="Sync Archive"
          >
            <RefreshCw size={24} className={`${isScraping ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white border border-surface-200 rounded-[3rem] p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
          <div className="flex-1 relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-focus-within:bg-brand-blue group-focus-within:text-white transition-all border border-surface-100 group-focus-within:border-brand-blue shadow-inner">
              <MapPin size={18} strokeWidth={2.5} />
            </div>
            <input 
              type="text" 
              placeholder="Filter by country cluster..." 
              className="w-full bg-surface-50/50 border border-surface-200 rounded-2xl py-5 pl-20 pr-8 text-sm font-black text-brand-dark focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary placeholder:font-bold tracking-tight"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCountrySearch()}
            />
          </div>

          <div className="flex-1 relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-focus-within:bg-brand-blue group-focus-within:text-white transition-all border border-surface-100 group-focus-within:border-brand-blue shadow-inner">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <input 
              type="text" 
              placeholder="Search by mission parameters (title, company, description)..." 
              className="w-full bg-surface-50/50 border border-surface-200 rounded-2xl py-5 pl-20 pr-8 text-sm font-black text-brand-dark focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary placeholder:font-bold tracking-tight"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          <h2 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Detection Grid: {filteredJobs.length} Active Nodes</h2>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
            Latent: 12ms
          </div>
        </div>
      </div>

      {/* --- GRID --- */}
      {isLoading && jobs.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          {[1, 2, 4, 5].map(i => (
            <div key={i} className="h-80 bg-white border border-surface-200 rounded-[2.5rem] shadow-sm" />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <AnimatePresence>
            {filteredJobs.map((job: any) => (
              <JobCard key={job._id || job.id} job={job} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-[3rem] py-32 text-center space-y-8 relative overflow-hidden shadow-sm group">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.3]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-surface-50 rounded-[2.5rem] flex items-center justify-center shadow-inner text-text-tertiary mb-6 group-hover:scale-110 transition-transform duration-500 ring-8 ring-white">
              <Cpu className="w-10 h-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-3 max-w-md mx-auto px-4">
              <h3 className="text-3xl font-display font-black text-brand-dark tracking-tight">Null Grid Results.</h3>
              <p className="text-text-secondary font-medium leading-relaxed">The network returned zero architectures for your current parameters. Attempting a global resync is recommended.</p>
            </div>
            <div className="mt-8">
              <button 
                onClick={handleRefresh}
                className="btn-primary px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 hover:scale-105 transition-transform flex items-center gap-3 group/btn"
              >
                <RefreshCw size={16} className="group-hover/btn:rotate-180 transition-transform duration-700" />
                Initialize Global Scraper
              </button>
            </div>
          </div>
        </div>
      )}

      <SubmitJobModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default JobBoard;