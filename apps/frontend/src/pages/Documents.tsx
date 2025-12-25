import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  BriefcaseIcon,
  SparklesIcon,
  CommandLineIcon,
  ChevronRightIcon,
  Square2StackIcon,
  ChartBarIcon,
  ShareIcon,
  SignalIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  TvIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart3, 
  Share2,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Trash2,
  ExternalLink,
  Clock,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { resumeService } from '../services/resumeService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type DocType = 'resumes' | 'tracking';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function Documents() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DocType>('resumes');
  const [resumes, setResumes] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [selectedShare, setSelectedShare] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const [resumeRes, shareRes] = await Promise.all([
        resumeService.getResumes(),
        fetch(`${API_BASE}/api/v1/share`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);

      if (resumeRes.success && resumeRes.data) {
        setResumes(resumeRes.data);
      }
      if (shareRes.success) {
        setShares(shareRes.data);
        if (shareRes.data.length > 0) setSelectedShare(shareRes.data[0]);
      }
    } catch (error) {
      toast.error('Failed to synchronize document archive.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!confirm('Are you sure you want to purge this architectural deployment?')) return;
    try {
      const success = await resumeService.deleteResume(id);
      if (success) {
        setResumes(prev => prev.filter(r => (r._id || r.id) !== id));
        toast.success('Architecture purged.');
      }
    } catch (error) {
      toast.error('Purge failed.');
    }
  };

  const handleDeleteShare = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this tracking node?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/v1/share/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Node Revoked.');
      setShares(prev => prev.filter(s => s._id !== id));
      if (selectedShare?._id === id) setSelectedShare(null);
    } catch (error) {
      toast.error('Revocation failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-10 py-10 animate-pulse">
        <div className="h-20 bg-white border border-surface-200 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-white border border-surface-200 rounded-[2rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-slide-up-soft pb-24">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-6 border-b border-surface-200/60">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue border border-brand-blue/10 shadow-sm backdrop-blur-sm">
            <CommandLineIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Document Archive</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-display font-black text-brand-dark tracking-tighter">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Repositories.</span>
            </h1>
            <p className="text-lg md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed">
              Manage your deployed architectures and communication protocols from a centralized command center.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/dashboard/resume/templates')}
            className="btn-primary shadow-2xl shadow-brand-blue/20 px-8 py-4 font-black uppercase tracking-[0.15em] text-xs hover:scale-105 transition-transform duration-300"
          >
            <PlusIcon className="w-5 h-5 mr-2.5 stroke-[2.5px]" />
            New Architecture
          </Button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex flex-wrap items-center gap-2 bg-surface-50/80 backdrop-blur-md border border-surface-200 p-1.5 rounded-[2rem] w-fit shadow-inner">
        <button
          onClick={() => setActiveTab('resumes')}
          className={`px-8 py-3.5 rounded-[1.7rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
            activeTab === 'resumes' 
              ? 'bg-white text-brand-blue shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] border border-surface-100 transform scale-105' 
              : 'text-text-tertiary hover:text-brand-dark hover:bg-white/60'
          }`}
        >
          Resumes <span className="ml-1 opacity-60">({resumes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-8 py-3.5 rounded-[1.7rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
            activeTab === 'tracking' 
              ? 'bg-white text-brand-blue shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] border border-surface-100 transform scale-105' 
              : 'text-text-tertiary hover:text-brand-dark hover:bg-white/60'
          }`}
        >
          Signals <span className="ml-1 opacity-60">({shares.length})</span>
        </button>
      </div>

      {/* --- GRID / CONTENT --- */}
      <div className="w-full min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'resumes' && (
            <motion.div 
              key="resumes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-10"
            >
              {resumes.length === 0 ? (
                <DocEmptyState 
                  title="Zero Architectures Detected" 
                  desc="Initialize your first professional deployment to begin your career campaign."
                  action={() => navigate('/dashboard/resume/templates')}
                  icon={DocumentTextIcon}
                />
              ) : (
                resumes.map((resume, i) => {
                  const safeHandleAction = (action: 'edit' | 'view' | 'delete') => {
                    const id = resume._id || resume.id;
                    if (!id || id.toString() === '[object Object]') {
                      toast.error('Corrupted architecture ID detected. Please refresh or recreate.');
                      return;
                    }
                    if (action === 'edit') navigate(`/dashboard/resume/edit/${id}`);
                    if (action === 'view') navigate(`/dashboard/resume/preview/${id}`);
                    if (action === 'delete') handleDeleteResume(id);
                  };

                  return (
                    <DocumentCard 
                      key={resume._id || resume.id}
                      title={resume.title || 'Untitled Architecture'}
                      subtitle={`${resume.workExperience?.length || 0} Nodes • ${resume.skills?.length || 0} Skills`}
                      date={resume.updatedAt}
                      type="resume"
                      onEdit={() => safeHandleAction('edit')}
                      onView={() => safeHandleAction('view')}
                      onDelete={() => safeHandleAction('delete')}
                      index={i}
                    />
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'tracking' && (
            <motion.div 
              key="tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Active Tracking Nodes</h3>
                    <span className="text-[9px] font-bold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">{shares.length} Active</span>
                  </div>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {shares.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-surface-200 rounded-[2rem] p-10 text-center">
                        <SignalIcon className="w-8 h-8 mx-auto text-text-tertiary opacity-30 mb-4" />
                        <p className="text-xs font-bold text-text-tertiary">Zero active signals detected.</p>
                      </div>
                    ) : (
                      shares.map((share) => (
                        <div 
                          key={share._id}
                          onClick={() => setSelectedShare(share)}
                          className={`p-6 border rounded-[2rem] cursor-pointer transition-all duration-300 group ${
                            selectedShare?._id === share._id 
                              ? 'bg-brand-dark border-brand-dark text-white shadow-xl shadow-brand-dark/20 scale-[1.02]' 
                              : 'bg-white border-surface-200 hover:border-brand-blue/30 hover:shadow-lg shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-xl transition-colors ${
                              selectedShare?._id === share._id 
                                ? 'bg-white/10 text-brand-blue' 
                                : 'bg-brand-blue/5 text-brand-blue group-hover:bg-brand-blue/10'
                            }`}>
                              <Share2 size={16} strokeWidth={2.5} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                              selectedShare?._id === share._id 
                                ? 'bg-white/10 text-white/80' 
                                : 'bg-surface-100 text-text-tertiary'
                            }`}>
                              {share.viewCount} Hits
                            </span>
                          </div>
                          <h4 className="text-sm font-black truncate mb-1.5 tracking-tight">{share.title}</h4>
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${share.lastViewedAt ? 'bg-brand-success animate-pulse' : 'bg-surface-300'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedShare?._id === share._id ? 'text-white/60' : 'text-text-tertiary'}`}>
                              {share.lastViewedAt ? `Active: ${new Date(share.lastViewedAt).toLocaleDateString()}` : 'Idle State'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8">
                  {selectedShare ? (
                    <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden h-full">
                      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
                      
                      <div className="relative z-10 space-y-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-surface-100">
                          <div className="space-y-3">
                            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg bg-brand-dark text-white shadow-lg shadow-brand-dark/10">
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Intelligence Node: {selectedShare.shareId.substring(0,8)}...</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-display font-black text-brand-dark tracking-tighter uppercase leading-none">{selectedShare.title}</h2>
                          </div>
                          
                          <div className="flex gap-3">
                            <button 
                              onClick={() => window.open(`${window.location.origin}/share/r/${selectedShare.shareId}`, '_blank')}
                              className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-text-tertiary hover:text-brand-blue hover:border-brand-blue hover:bg-white hover:shadow-xl hover:shadow-brand-blue/10 transition-all duration-300 group"
                              title="Open Public Link"
                            >
                              <ExternalLink size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleDeleteShare(selectedShare._id)}
                              className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-text-tertiary hover:text-red-500 hover:border-red-200 hover:bg-red-50 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 group"
                              title="Revoke Access"
                            >
                              <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2.5rem] space-y-4 hover:border-brand-blue/20 transition-colors duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-surface-100 flex items-center justify-center text-brand-blue">
                              <Eye size={24} />
                            </div>
                            <div>
                              <div className="text-4xl font-black text-brand-dark tracking-tighter">{selectedShare.viewCount}</div>
                              <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Total Engagements</div>
                            </div>
                          </div>
                          <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2.5rem] space-y-4 hover:border-brand-blue/20 transition-colors duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-surface-100 flex items-center justify-center text-brand-blue">
                              <Clock size={24} />
                            </div>
                            <div>
                              <div className="text-4xl font-black text-brand-dark tracking-tighter">
                                {selectedShare.views.length > 0 ? 'Active' : 'Idle'}
                              </div>
                              <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Signal Status</div>
                            </div>
                          </div>
                          <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2.5rem] space-y-4 hover:border-brand-blue/20 transition-colors duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-surface-100 flex items-center justify-center text-brand-blue">
                              <Globe size={24} />
                            </div>
                            <div>
                              <div className="text-4xl font-black text-brand-dark tracking-tighter">
                                {new Set(selectedShare.views.map((v: any) => v.ipAddress)).size}
                              </div>
                              <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Unique Clusters</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] px-2 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse"></span>
                            Incoming Signals Log
                          </h4>
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {selectedShare.views.length === 0 ? (
                              <div className="py-16 border-2 border-dashed border-surface-200 rounded-[2.5rem] text-center bg-surface-50/50">
                                <p className="text-xs font-bold text-text-tertiary opacity-60 italic">Waiting for signal reception...</p>
                              </div>
                            ) : (
                              selectedShare.views.slice().reverse().map((view: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-6 bg-white border border-surface-100 rounded-[2rem] shadow-sm hover:shadow-lg hover:border-brand-blue/20 transition-all duration-300 group">
                                  <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-surface-50 flex items-center justify-center text-text-tertiary group-hover:text-brand-blue group-hover:bg-brand-blue/5 transition-colors">
                                      {view.userAgent?.includes('Mobile') ? <Smartphone size={20} /> : <Monitor size={20} />}
                                    </div>
                                    <div>
                                      <div className="text-sm font-black text-brand-dark mb-1">
                                        {view.ipAddress || 'Internal Hub'}
                                      </div>
                                      <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                                        {view.userAgent?.substring(0, 40)}...
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-black text-brand-dark mb-1">
                                      {new Date(view.viewedAt).toLocaleTimeString()}
                                    </div>
                                    <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-surface-100 px-2 py-1 rounded-lg">
                                      {new Date(view.viewedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-white border-2 border-dashed border-surface-200 rounded-[3rem] p-20 text-center opacity-60 hover:opacity-100 transition-opacity duration-500">
                      <div className="space-y-6">
                        <div className="w-24 h-24 rounded-full bg-surface-50 flex items-center justify-center mx-auto text-text-tertiary">
                          <AlertCircle size={40} />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-brand-dark">Select a Node</h3>
                          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Initiate signal analysis protocol</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


function DocumentCard({ title, subtitle, date, type, onEdit, onView, onDelete, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-surface-200 rounded-[2.5rem] p-8 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-brand-blue/20 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between min-h-[320px] backdrop-blur-sm"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-500 transform group-hover:scale-110">
        {type === 'resume' ? <DocumentTextIcon className="w-40 h-40 rotate-12" /> : <PencilIcon className="w-40 h-40 rotate-12" />}
      </div>
      
      {/* Decorative gradient blob */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-blue/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-[1.2rem] ${type === 'resume' ? 'bg-brand-blue/5 text-brand-blue border-brand-blue/10' : 'bg-brand-success/5 text-brand-success border-brand-success/10'} border flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm`}>
            {type === 'resume' ? <DocumentTextIcon className="w-7 h-7 stroke-[1.5px]" /> : <PencilIcon className="w-7 h-7 stroke-[1.5px]" />}
          </div>
          <div className="px-3 py-1 rounded-full bg-surface-50 border border-surface-100 text-[9px] font-black text-text-tertiary uppercase tracking-widest group-hover:bg-white group-hover:shadow-sm transition-all">
            {new Date(date).toLocaleDateString()}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-display font-black text-brand-dark tracking-tight leading-tight group-hover:text-brand-blue transition-colors duration-300 line-clamp-2">
            {title}
          </h3>
          <p className="text-xs font-bold text-text-secondary opacity-70 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-surface-300 group-hover:bg-brand-blue transition-colors"></span>
            {subtitle}
          </p>
        </div>
      </div>

      <div className="relative z-10 pt-8 mt-auto flex items-center gap-3">
        <button 
          onClick={onView}
          className="flex-1 bg-surface-50 border border-surface-200 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-brand-blue hover:text-white hover:border-brand-blue hover:shadow-lg hover:shadow-brand-blue/20 transition-all duration-300 active:scale-95"
        >
          View
        </button>
        <button 
          onClick={onEdit}
          className="flex-1 bg-surface-50 border border-surface-200 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-brand-dark hover:text-white hover:border-brand-dark hover:shadow-lg hover:shadow-brand-dark/20 transition-all duration-300 active:scale-95"
        >
          Edit
        </button>
        <button 
          onClick={onDelete}
          className="w-12 h-12 flex items-center justify-center bg-surface-50 border border-surface-200 rounded-2xl text-text-tertiary hover:bg-red-50 hover:text-red-500 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 active:scale-95 group/delete"
          title="Delete"
        >
          <TrashIcon className="w-5 h-5 group-hover/delete:scale-110 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

function DocEmptyState({ title, desc, action, icon: Icon }) {
  return (
    <div className="col-span-full py-24 bg-white border border-surface-200 rounded-[3rem] text-center space-y-8 shadow-sm relative overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.3]" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 bg-surface-50 rounded-[2.5rem] flex items-center justify-center shadow-inner text-text-tertiary mb-6 group-hover:scale-110 transition-transform duration-500 ring-8 ring-white">
          <Icon className="w-10 h-10 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="space-y-3 max-w-md mx-auto px-4">
          <h3 className="text-3xl font-display font-black text-brand-dark tracking-tight">{title}</h3>
          <p className="text-text-secondary font-medium leading-relaxed">{desc}</p>
        </div>
        <div className="mt-8">
          <Button 
            onClick={action}
            className="btn-primary px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 hover:scale-105 transition-transform"
          >
            Initialize Node
          </Button>
        </div>
      </div>
    </div>
  );
}
