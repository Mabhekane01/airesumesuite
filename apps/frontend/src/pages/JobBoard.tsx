import React, { useEffect, useState, useRef } from 'react';
import { useJobBoardStore } from '../stores/jobBoardStore';
import { useAuthStore } from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Briefcase, Building, Plus, Search, ExternalLink, RefreshCw, X, Globe, Cpu, Clock, ChevronRight, Trash2, CheckCircle2, Bold, Italic, List, ListOrdered, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { locationService } from '../services/locationService';
import { jobApplicationAPI } from '../services/api';
import { TrustScore } from '../components/jobs/TrustScore';
import { FeedbackModal } from '../components/jobs/FeedbackModal';

// --- Components ---

const JobCard = ({ job, isAdmin, onApprove, onDelete, onEdit, onViewFeedback, isApplied, applicationId }: { job: any, isAdmin?: boolean, onApprove?: (id: string) => void, onDelete?: (id: string) => void, onEdit?: (job: any) => void, onViewFeedback?: (job: any) => void, isApplied?: boolean, applicationId?: string }) => {
  const displayDate = job.postedDate || job.createdAt;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className={`bg-white border ${isApplied ? 'border-brand-blue/30 shadow-md' : 'border-surface-200'} rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-sm hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:border-brand-blue/20 transition-all duration-500 group relative overflow-hidden flex flex-col h-full`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/[0.02] rounded-full -mr-16 -mt-16 group-hover:bg-brand-blue/[0.05] transition-colors duration-700" />
      
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-3 md:gap-4 mb-4 md:mb-8">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg md:text-2xl font-display font-black text-brand-dark tracking-tighter leading-tight group-hover:text-brand-blue transition-colors duration-300 line-clamp-2">
            {job.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 md:gap-5 mt-2 md:mt-4">
            <div className="flex items-center gap-1.5 text-[8px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-2.5 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
              <Building size={10} className="text-brand-blue" /> 
              {job.company}
            </div>
            <div className="flex items-center gap-1.5 text-[8px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-2.5 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
              <MapPin size={10} className="text-brand-blue" /> 
              {job.location}
            </div>
            {displayDate && (
              <div className="flex items-center gap-1.5 text-[8px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em] bg-surface-50 px-2.5 py-1.5 rounded-lg border border-surface-100 group-hover:bg-white transition-colors">
                <Clock size={10} className="text-brand-blue" />
                {formatDistanceToNow(new Date(displayDate), { addSuffix: true })}
              </div>
            )}
            {/* Trust Score Integration */}
            {(job.authenticityScore !== undefined || job.trustBadges?.length > 0) && (
              <div title="Click to view community reviews" className="cursor-pointer hover:scale-105 transition-transform">
                <TrustScore 
                  score={job.authenticityScore || 50} 
                  badges={job.trustBadges || []} 
                  reviewCount={job.reviewCount || 0}
                  size="sm"
                  onClick={() => onViewFeedback?.(job)}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-start pt-1 sm:pt-0">
           {isAdmin && (
             <div className="flex gap-1.5">
               {job.status === 'pending' && (
                 <button 
                   onClick={() => onApprove?.(job._id)}
                   className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-brand-success/10 text-brand-success hover:bg-brand-success hover:text-white transition-all shadow-sm"
                   title="Approve Node"
                 >
                   <CheckCircle2 size={16} strokeWidth={2.5} />
                 </button>
               )}
               <button 
                 onClick={() => onEdit?.(job)}
                 className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white transition-all shadow-sm"
                 title="Edit Node"
               >
                 <Pencil size={16} strokeWidth={2.5} />
               </button>
               <button 
                 onClick={() => onDelete?.(job._id)}
                 className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                 title="Purge Node"
               >
                 <Trash2 size={16} strokeWidth={2.5} />
               </button>
             </div>
           )}
           <div className="flex items-center gap-1.5">
             {isApplied ? (
               <div className="px-2.5 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border shadow-md bg-brand-dark text-white border-brand-dark">
                 <span className="flex items-center gap-1">
                   <CheckCircle2 size={10} strokeWidth={3} />
                   Applied
                 </span>
               </div>
             ) : (
               <>
                 {job.source === 'scraper' ? (
                   <div className="px-2 py-1 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm bg-brand-blue/5 border-brand-blue/10 text-brand-blue">
                     System Optimized
                   </div>
                 ) : (
                   <div className="px-2 py-1 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm bg-brand-success/5 border-brand-success/10 text-brand-success">
                     Community
                   </div>
                 )}
               </>
             )}
           </div>
        </div>
      </div>
      
      <p className="relative z-10 text-text-secondary text-[13px] md:text-sm font-medium leading-relaxed opacity-80 mb-4 md:mb-10 line-clamp-2 md:line-clamp-3 italic">
        "{job.description.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').substring(0, 150)}..."
      </p>

      <div className="relative z-10 flex flex-row items-center justify-between mt-auto pt-4 md:pt-6 border-t border-surface-100/60 gap-3">
        <div className="flex flex-col">
          <span className="text-[7px] md:text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-0.5 opacity-60">Yield</span>
          <span className="text-xs md:text-sm font-black text-brand-dark tracking-tight flex items-center gap-1.5">
            <Cpu size={12} className="text-brand-blue opacity-40" />
            {job.salaryRange || 'Confidential'}
          </span>
        </div>
        {isApplied ? (
          <Link 
            to={`/dashboard/applications/${applicationId}`} 
            className="bg-white border-2 border-brand-blue text-brand-blue px-4 md:px-8 py-2.5 md:py-3.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-2 hover:bg-brand-blue hover:text-white transition-all duration-300"
          >
            View <ChevronRight size={14} className="stroke-[3]" />
          </Link>
        ) : (
          <Link 
            to={`/jobs/${job._id}/apply`} 
            className="btn-primary px-4 md:px-8 py-2.5 md:py-3.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2 hover:scale-105 transition-transform duration-300"
          >
            Deploy <ChevronRight size={14} className="stroke-[3]" />
          </Link>
        )}
      </div>
    </motion.div>
  );
};

const JobActionModal = ({ isOpen, onClose, editingJob }: { isOpen: boolean; onClose: () => void; editingJob?: any }) => {
  const { submitJob, updateJob } = useJobBoardStore();
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    title: '', company: '', location: '', country: '', description: '', url: '', jobType: 'Full-time', salaryRange: '', postedDate: ''
  });

  useEffect(() => {
    if (isOpen) {
      const initialData = editingJob ? {
        title: editingJob.title || '',
        company: editingJob.company || '',
        location: editingJob.location || '',
        country: editingJob.country || '',
        description: editingJob.description || '',
        url: editingJob.url || '',
        jobType: editingJob.jobType || 'Full-time',
        salaryRange: editingJob.salaryRange || '',
        postedDate: editingJob.postedDate ? new Date(editingJob.postedDate).toISOString().split('T')[0] : ''
      } : {
        title: '', company: '', location: '', country: '', description: '', url: '', jobType: 'Full-time', salaryRange: '', postedDate: ''
      };
      
      setFormData(initialData);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData.description;
      }
    }
  }, [editingJob, isOpen]);

  if (!isOpen) return null;

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      // Elite Algorithm v8.0: High-Fidelity Architectural Reconstructor
      const parser = new DOMParser();
      // Secondary Purification: Nuke all XML and MS-Specific metadata before DOM traversal
      const nuclearClean = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<xml[\s\S]*?<\/xml>/g, '')
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/class="[^"]*"/g, '')
        .replace(/id="[^"]*"/g, '');

      const doc = parser.parseFromString(nuclearClean, 'text/html');
      
      const mapNode = (node: Node): Node | string | null => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        
        const el = node as HTMLElement;
        const tag = el.tagName.toUpperCase();
        
        // Elite Structural Whitelist
        const whitelist = ['P', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'SPAN', 'DIV', 'TABLE', 'TR', 'TD', 'TH', 'TBODY', 'THEAD'];
        
        if (whitelist.includes(tag) || tag.startsWith('H')) {
          const newEl = document.createElement(tag === 'DIV' ? 'p' : (tag.startsWith('H') ? 'p' : tag));
          
          // MAP FIDELITY STYLES
          const s = el.style;
          const computed = window.getComputedStyle ? window.getComputedStyle(el) : (el as any).currentStyle;
          
          if (tag.startsWith('H') || computed?.fontWeight === 'bold' || computed?.fontWeight === '700' || s.fontWeight === 'bold') {
            const strong = document.createElement('strong');
            newEl.appendChild(strong);
            return mapChildrenTo(el, strong);
          }
          
          if (computed?.fontStyle === 'italic' || s.fontStyle === 'italic') {
            const em = document.createElement('em');
            newEl.appendChild(em);
            return mapChildrenTo(el, em);
          }

          // Recursive list restoration
          if (tag === 'LI') {
            const li = document.createElement('li');
            li.style.marginLeft = '1rem';
            return mapChildrenTo(el, li);
          }

          return mapChildrenTo(el, newEl);
        }

        const fragment = document.createDocumentFragment();
        return mapChildrenTo(el, fragment);
      };

      const mapChildrenTo = (source: HTMLElement, targetNode: Node) => {
        Array.from(source.childNodes).forEach(child => {
          const mapped = mapNode(child);
          if (mapped) {
            if (typeof mapped === 'string') targetNode.appendChild(document.createTextNode(mapped));
            else targetNode.appendChild(mapped);
          }
        });
        return targetNode;
      };

      const finalFragment = mapNode(doc.body);
      const output = document.createElement('div');
      if (finalFragment && typeof finalFragment !== 'string') output.appendChild(finalFragment);
      
      document.execCommand('insertHTML', false, output.innerHTML);
    } else {
      document.execCommand('insertText', false, text);
    }
    
    // Final Vector Sync Handshake
    setTimeout(() => {
      setFormData(prev => ({ ...prev, description: target.innerHTML }));
    }, 0);
  };

  const execCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setFormData(prev => ({ ...prev, description: editorRef.current!.innerHTML }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingJob) await updateJob(editingJob._id, formData);
      else await submitJob(formData);
      onClose();
    } catch (error) {
      toast.error('Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-brand-dark/75 backdrop-blur-lg" />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white border border-surface-200 rounded-[2rem] md:rounded-[3.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[95vh]"
      >
        {/* FIXED HEADER */}
        <div className="relative shrink-0 p-5 md:p-10 pb-3 md:pb-6 border-b border-surface-100 bg-white z-20">
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner border border-brand-blue/5">
                {editingJob ? <Pencil size={20} /> : <Plus size={20} />}
              </div>
              <div>
                <h2 className="text-lg md:text-3xl font-display font-black text-brand-dark tracking-tighter uppercase leading-none">{editingJob ? 'Refine Architecture.' : 'Register Architecture.'}</h2>
                <p className="text-[7px] md:text-xs font-bold text-text-tertiary uppercase tracking-widest mt-0.5 md:mt-1">Manual node synchronization</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-50 border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-dark transition-all"><X size={18} /></button>
          </div>
        </div>
        
        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 md:p-10 pt-4 md:pt-8 custom-scrollbar">
          <form id="job-action-form" onSubmit={handleSubmit} className="space-y-5 md:space-y-10 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Target Role</label>
                <input required className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Software Engineer" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Host Entity</label>
                <input required className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Global Inc." />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Location</label>
                <input required className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="City" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Country</label>
                <input required className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="Country" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Deployment URL</label>
                <input required type="url" className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Yield</label>
                <input className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.salaryRange} onChange={e => setFormData({...formData, salaryRange: e.target.value})} placeholder="e.g. $120k" />
              </div>
            </div>
            
            <div className="space-y-1.5 mb-6">
              <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Posted Date (Optional)</label>
              <input type="date" className="input-resume w-full px-4 md:px-5 py-3 md:py-4 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all" value={formData.postedDate} onChange={e => setFormData({...formData, postedDate: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-[0.2em] ml-1">Technical Specs</label>
              <div className="relative group">
                {/* TOOLBAR */}
                <div className="absolute -top-11 right-0 flex items-center gap-1 bg-white border border-surface-200 p-1.5 rounded-xl shadow-2xl opacity-0 group-focus-within:opacity-100 transition-all z-30 scale-90 md:scale-100">
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-2 hover:bg-surface-100 rounded-lg text-text-tertiary hover:text-brand-dark transition-colors" title="Bold"><Bold size={14} /></button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-2 hover:bg-surface-100 rounded-lg text-text-tertiary hover:text-brand-dark transition-colors" title="Italic"><Italic size={14} /></button>
                  <div className="w-px h-4 bg-surface-200 mx-1" />
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }} className="p-2 hover:bg-surface-100 rounded-lg text-text-tertiary hover:text-brand-dark transition-colors" title="Bullet List"><List size={14} /></button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('insertOrderedList'); }} className="p-2 hover:bg-surface-100 rounded-lg text-text-tertiary hover:text-brand-dark transition-colors" title="Numbered List"><ListOrdered size={14} /></button>
                </div>
                {/* EDITOR */}
                <div 
                  ref={editorRef} 
                  contentEditable 
                  onPaste={handlePaste} 
                  className="input-resume w-full px-4 md:px-6 py-4 md:py-6 rounded-2xl text-[15px] md:text-base font-medium bg-surface-50 border border-surface-200 outline-none focus:ring-4 focus:ring-brand-blue/5 min-h-[300px] max-h-[500px] overflow-y-auto rich-text-editor shadow-inner" 
                  onInput={(e) => { const content = e.currentTarget.innerHTML; setFormData(prev => ({ ...prev, description: content })); }} 
                />
                {(!formData.description || formData.description === '<br>' || formData.description === '') && (
                  <div className="absolute top-5 left-5 pointer-events-none text-text-tertiary font-bold text-xs md:text-sm opacity-50">Paste technical specs here (Full fidelity mapping enabled)...</div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* FIXED FOOTER */}
        <div className="shrink-0 p-5 md:p-10 pt-3 md:pt-6 border-t border-surface-100 bg-white z-20">
          <button form="job-action-form" disabled={loading} type="submit" className="btn-primary w-full py-3.5 md:py-5 text-[9px] md:text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95">
            {loading ? 'Processing...' : (editingJob ? 'Update Architecture' : 'Deploy Job Protocol')}
          </button>
        </div>
      </motion.div>
      <style>{`.rich-text-editor { line-height: 1.6 !important; } .rich-text-editor ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; display: block !important; } .rich-text-editor ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; display: block !important; } .rich-text-editor li { display: list-item !important; margin-bottom: 0.4rem !important; list-style-position: outside !important; } .rich-text-editor strong, .rich-text-editor b { font-weight: 800 !important; color: #1a1a1a !important; } .rich-text-editor em, .rich-text-editor i { font-style: italic !important; } .rich-text-editor p { margin-bottom: 1rem !important; display: block !important; }`}</style>
    </div>
  );
};

// --- Main Page ---

const JobBoard = () => {
  const { jobs, pendingJobs, isLoading, fetchJobs, fetchPendingJobs, approveJob, deleteJob, updateJob } = useJobBoardStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [country, setCountry] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [feedbackJob, setFeedbackJob] = useState<any>(null); // For viewing feedback
  const [isScraping, setIsScraping] = useState(false);
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [appliedJobUrls, setAppliedJobUrls] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'admin';
  const isDashboard = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    const detectAndFetch = async () => {
      try {
        const loc = await locationService.getUserLocation();
        const initialCountry = loc.country || 'United States';
        setCountry(initialCountry);
        fetchJobs(initialCountry);
        if (isAdmin) fetchPendingJobs();
        if (user) {
          const appsRes = await jobApplicationAPI.getApplications();
          if (appsRes.success) {
            const urlMap: Record<string, string> = {};
            appsRes.data.applications.forEach(app => { if (app.jobUrl) urlMap[app.jobUrl] = app._id; });
            setAppliedJobUrls(urlMap);
          }
        }
      } catch (e) {
        setCountry('United States'); fetchJobs('United States');
        if (isAdmin) fetchPendingJobs();
      }
    };
    detectAndFetch();
  }, [fetchJobs, fetchPendingJobs, isAdmin, user]);

  useEffect(() => {
    const lowerKeyword = keyword.toLowerCase();
    const sourceData = activeTab === 'approved' ? jobs : pendingJobs;
    
    let filtered = sourceData.filter(job => 
      !lowerKeyword || 
      job.title.toLowerCase().includes(lowerKeyword) || 
      job.company.toLowerCase().includes(lowerKeyword) || 
      job.description.toLowerCase().includes(lowerKeyword)
    );

    if (dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.postedAt || job.createdAt);
        const diffDays = (now.getTime() - jobDate.getTime()) / (1000 * 3600 * 24);
        
        if (dateRange === 'today') return diffDays <= 1;
        if (dateRange === 'week') return diffDays <= 7;
        if (dateRange === 'month') return diffDays <= 30;
        return true;
      });
    }

    setFilteredJobs(filtered);
  }, [keyword, jobs, pendingJobs, activeTab, dateRange]);

  const handleCountrySearch = () => country && fetchJobs(country);
  const handleRefresh = async () => {
    setIsScraping(true);
    try { await fetchJobs(country); if (isAdmin) await fetchPendingJobs(); toast.success('Archive Resynchronized.'); }
    catch (e) { toast.error('Sync failure.'); } finally { setIsScraping(false); }
  };
  const handleApprove = async (id: string) => {
    try { await approveJob(id); toast.success('Node verified.'); } catch (error) { toast.error('Verification failed.'); }
  };
  const handleEdit = (job: any) => { setEditingJob(job); setIsModalOpen(true); };
  const handleDelete = async (id: string) => {
    if (!confirm('Execute purge protocol?')) return;
    try { await deleteJob(id); toast.success('Node purged.'); } catch (error) { toast.error('Purge failed.'); }
  };

  const boardContent = (
    <div className="w-full space-y-5 md:space-y-12 pb-24 animate-slide-up-soft">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 md:gap-8 pb-5 md:pb-6 border-b border-surface-200/60">
        <div className="space-y-2 md:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/5 text-brand-blue border border-brand-blue/10 shadow-sm backdrop-blur-sm">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Intelligence Grid</span>
          </div>
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-3xl md:text-6xl font-display font-black text-brand-dark tracking-tighter">Job <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Intelligence.</span></h1>
            <p className="text-sm md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed opacity-80">Real-time market exploration through automated nodes.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => { setEditingJob(null); setIsModalOpen(true); }} className="flex-1 sm:flex-none btn-primary shadow-xl shadow-brand-blue/20 px-5 md:px-8 py-3 md:py-4 font-black uppercase tracking-[0.15em] text-[9px] md:text-xs hover:scale-105 transition-all flex items-center justify-center gap-2">
            <Plus size={16} strokeWidth={3} /> {user?.role === 'admin' ? 'Register Node' : 'Submit Job'}
          </button>
          <button onClick={handleRefresh} disabled={isScraping} className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-[1.2rem] bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue shadow-sm"><RefreshCw size={18} className={isScraping ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[3rem] p-3 md:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-3 md:gap-6 items-stretch lg:items-center">
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center group-focus-within:bg-brand-blue group-focus-within:text-white transition-all border border-surface-100 shadow-inner"><MapPin size={14} strokeWidth={2.5} /></div>
            <input type="text" placeholder="Filter by country..." className="w-full bg-surface-50/50 border border-surface-200 rounded-xl md:rounded-2xl py-3.5 md:py-5 pl-14 md:pl-20 pr-4 text-sm font-black text-brand-dark focus:ring-8 focus:ring-brand-blue/5 outline-none transition-all placeholder:text-text-tertiary" value={country} onChange={(e) => setCountry(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCountrySearch()} />
          </div>
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center group-focus-within:bg-brand-blue group-focus-within:text-white transition-all border border-surface-100 shadow-inner"><Search size={14} strokeWidth={2.5} /></div>
            <input type="text" placeholder="Search mission parameters..." className="w-full bg-surface-50/50 border border-surface-200 rounded-xl md:rounded-2xl py-3.5 md:py-5 pl-14 md:pl-20 pr-4 text-sm font-black text-brand-dark focus:ring-8 focus:ring-brand-blue/5 outline-none transition-all placeholder:text-text-tertiary" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          
          <div className="flex-1 lg:max-w-[200px] relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center group-focus-within:bg-brand-blue group-focus-within:text-white transition-all border border-surface-100 shadow-inner"><Clock size={14} strokeWidth={2.5} /></div>
            <select 
              className="w-full bg-surface-50/50 border border-surface-200 rounded-xl md:rounded-2xl py-3.5 md:py-5 pl-14 md:pl-16 pr-4 text-sm font-black text-brand-dark focus:ring-8 focus:ring-brand-blue/5 outline-none transition-all appearance-none cursor-pointer"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-50/80 backdrop-blur-md border border-surface-200 p-1 rounded-xl md:rounded-[2rem] w-full sm:w-fit shadow-inner">
          <button onClick={() => setActiveTab('approved')} className={`flex-1 sm:flex-none px-5 md:px-8 py-2 md:py-3 rounded-lg md:rounded-[1.7rem] text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === 'approved' ? 'bg-white text-brand-blue shadow-md border border-surface-100 transform scale-105' : 'text-text-tertiary hover:text-brand-dark hover:bg-white/60'}`}>Active <span className="ml-1 opacity-60">({jobs.length})</span></button>
          <button onClick={() => setActiveTab('pending')} className={`flex-1 sm:flex-none px-5 md:px-8 py-2 md:py-3 rounded-lg md:rounded-[1.7rem] text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === 'pending' ? 'bg-white text-brand-blue shadow-md border border-surface-100 transform scale-105' : 'text-text-tertiary hover:text-brand-dark hover:bg-white/60'}`}>Pending <span className="ml-1 opacity-60">({pendingJobs.length})</span></button>
        </div>
      )}

      <div className="flex items-center justify-between px-1 md:px-2">
        <div className="flex items-center gap-2 md:gap-3"><div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" /><h2 className="text-[8px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">{activeTab === 'approved' ? 'Detection Grid' : 'Queue'}: {filteredJobs.length} Nodes</h2></div>
      </div>

      {isLoading && jobs.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 animate-pulse">
          {[1, 2, 4, 5].map(i => (<div key={i} className="h-64 md:h-80 bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm" />))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
          <AnimatePresence>{filteredJobs.map((job: any) => (
            <JobCard 
              key={job._id || job.id} 
              job={job} 
              isAdmin={isAdmin} 
              onApprove={handleApprove} 
              onDelete={handleDelete} 
              onEdit={handleEdit}
              onViewFeedback={(j) => setFeedbackJob(j)} 
              isApplied={!!appliedJobUrls[job.url]} 
              applicationId={appliedJobUrls[job.url]} 
            />
          ))}</AnimatePresence>
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] py-16 md:py-32 text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-sm group">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.3]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-surface-50 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-inner text-text-tertiary mb-4 md:mb-6 ring-8 ring-white"><Cpu className="w-8 h-8 md:w-10 md:h-10 opacity-50" /></div>
            <div className="space-y-2 md:space-y-3 max-w-md mx-auto px-6"><h3 className="text-xl md:text-3xl font-display font-black text-brand-dark tracking-tight uppercase">Null Grid Results.</h3><p className="text-xs md:text-base text-text-secondary font-medium leading-relaxed">Network returned zero architectures. Attempt global resync.</p></div>
            <div className="mt-6 md:mt-8 px-6 w-full sm:w-auto">
              <button onClick={handleRefresh} className="btn-primary w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={14} /> Global Resync
              </button>
            </div>
          </div>
        </div>
      )}

      <JobActionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingJob(null); }} editingJob={editingJob} />
      
      {feedbackJob && (
        <FeedbackModal 
          isOpen={!!feedbackJob} 
          onClose={() => setFeedbackJob(null)} 
          jobId={feedbackJob._id} 
          jobTitle={feedbackJob.title} 
          companyName={feedbackJob.company}
          initialMode="view"
        />
      )}
    </div>
  );

  return isDashboard ? (boardContent) : (<div className="max-w-[1600px] mx-auto px-2 md:px-12 py-10 md:py-20 relative z-10">{boardContent}</div>);
};

export default JobBoard;
