import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Eye, 
  Clock, 
  MapPin, 
  Trash2, 
  ExternalLink, 
  Share2,
  AlertCircle,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const ResumeTrackingDashboard = () => {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShare, setSelectedShare] = useState<any>(null);

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/share`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setShares(data.data);
        if (data.data.length > 0) {
          setSelectedShare(data.data[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to load tracking data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this tracking node?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/v1/share/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Node Revoked.');
      fetchShares();
    } catch (error) {
      toast.error('Revocation failed.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Aggregating Analysis Nodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-slide-up-soft">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-black text-brand-dark tracking-tighter">Engagement Analysis.</h1>
          <p className="text-lg text-text-secondary font-bold opacity-70">Real-time intelligence on institutional architecture views.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white border border-surface-200 px-6 py-3 rounded-2xl shadow-sm">
          <TrendingUp className="text-brand-success" size={20} />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest leading-none">Total Delta</span>
            <span className="text-xl font-black text-brand-dark leading-none mt-1">
              {shares.reduce((sum, s) => sum + s.viewCount, 0)} Views
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* --- SHARE LIST --- */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] px-2">Active Tracking Nodes</h3>
          <div className="space-y-3">
            {shares.length === 0 ? (
              <div className="bg-white border border-dashed border-surface-200 rounded-[2rem] p-10 text-center">
                <p className="text-xs font-bold text-text-tertiary">Zero active signals detected.</p>
              </div>
            ) : (
              shares.map((share) => (
                <div 
                  key={share._id}
                  onClick={() => setSelectedShare(share)}
                  className={`p-6 border rounded-[2rem] cursor-pointer transition-all duration-300 ${selectedShare?._id === share._id ? 'bg-brand-blue border-brand-blue text-white shadow-xl shadow-brand-blue/20 scale-[1.02]' : 'bg-white border-surface-200 hover:border-brand-blue/30 shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-xl ${selectedShare?._id === share._id ? 'bg-white/20' : 'bg-brand-blue/5 text-brand-blue'}`}>
                      <Share2 size={16} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${selectedShare?._id === share._id ? 'text-white/60' : 'text-text-tertiary'}`}>
                      {share.viewCount} Views
                    </span>
                  </div>
                  <h4 className="text-sm font-black truncate mb-1">{share.title}</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-tighter ${selectedShare?._id === share._id ? 'text-white/60' : 'text-text-tertiary'}`}>
                    Last view: {share.lastViewedAt ? new Date(share.lastViewedAt).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- STATS PANEL --- */}
        <div className="lg:col-span-8">
          {selectedShare ? (
            <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-xl relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
              
              <div className="relative z-10 space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Intelligence Node: {selectedShare.shareId}</span>
                    </div>
                    <h2 className="text-3xl font-black text-brand-dark tracking-tighter uppercase">{selectedShare.title}</h2>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open(`${window.location.origin}/share/r/${selectedShare.shareId}`, '_blank')}
                      className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-text-tertiary hover:text-brand-blue transition-all"
                    >
                      <ExternalLink size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedShare._id)}
                      className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-text-tertiary hover:text-red-500 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2rem] space-y-2">
                    <Eye size={24} className="text-brand-blue mb-4" />
                    <div className="text-3xl font-black text-brand-dark">{selectedShare.viewCount}</div>
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Total Engagements</div>
                  </div>
                  <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2rem] space-y-2">
                    <Clock size={24} className="text-brand-blue mb-4" />
                    <div className="text-3xl font-black text-brand-dark">
                      {selectedShare.views.length > 0 ? 'Active' : 'Idle'}
                    </div>
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Signal Status</div>
                  </div>
                  <div className="p-8 bg-surface-50 border border-surface-200 rounded-[2rem] space-y-2">
                    <Globe size={24} className="text-brand-blue mb-4" />
                    <div className="text-3xl font-black text-brand-dark">
                      {new Set(selectedShare.views.map((v: any) => v.ipAddress)).size}
                    </div>
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Unique Clusters</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] px-2">Access Logs</h4>
                  <div className="space-y-3">
                    {selectedShare.views.length === 0 ? (
                      <div className="p-10 border border-dashed border-surface-200 rounded-[2rem] text-center">
                        <p className="text-xs font-bold text-text-tertiary opacity-60 italic">Waiting for signal reception...</p>
                      </div>
                    ) : (
                      selectedShare.views.slice().reverse().map((view: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-white border border-surface-100 rounded-2xl shadow-sm group hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center text-text-tertiary group-hover:text-brand-blue transition-colors">
                              {view.userAgent?.includes('Mobile') ? <Smartphone size={18} /> : <Monitor size={18} />}
                            </div>
                            <div>
                              <div className="text-sm font-black text-brand-dark">
                                {view.ipAddress || 'Internal Hub'}
                              </div>
                              <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                {view.userAgent?.substring(0, 40)}...
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-brand-dark">
                              {new Date(view.viewedAt).toLocaleTimeString()}
                            </div>
                            <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
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
            <div className="h-full flex items-center justify-center bg-white border border-dashed border-surface-200 rounded-[3rem] p-20 text-center opacity-50">
              <div className="space-y-4">
                <AlertCircle size={48} className="mx-auto text-text-tertiary" />
                <p className="text-sm font-black text-text-tertiary uppercase tracking-widest">Select a node to initialize analysis.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeTrackingDashboard;
