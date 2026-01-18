import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  CommandLineIcon,
  ShieldExclamationIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  provider: 'local' | 'google';
  twoFactorEnabled: boolean;
  tier: string;
  lastLoginAt: string;
  createdAt: string;
  activeSessions: number;
}

interface Session {
  id: string;
  loginTime: string;
  location: {
    city?: string;
    country?: string;
  };
  browser: string;
  isCurrent: boolean;
}

export default function AccountManager() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [personalForm, setPersonalForm] = useState({ firstName: '', lastName: '' });
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmText: '' });

  const [saving, setSaving] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account');
      if (response.data?.success) {
        const userData = response.data.data.user;
        setUserData(userData);
        setPersonalForm({ firstName: userData.firstName, lastName: userData.lastName });
        setEmailForm({ email: userData.email, password: '' });
      }
    } catch (error) {
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get('/account/sessions');
      if (response.data?.success) {
        setSessions(response.data.data.sessions);
      }
    } catch (error) {
      toast.error('Failed to load sessions');
    }
  };

  const updatePersonalInfo = async () => {
    try {
      setSaving(true);
      const response = await api.put('/account/personal-info', personalForm);
      if (response.data?.success) {
        toast.success('Personal profile synchronized.');
        await loadAccountData();
      }
    } catch (error: any) {
      toast.error('Protocol Error: Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <ArrowPathIcon className="h-10 w-10 animate-spin text-brand-blue" />
        <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Accessing Account Module...</p>
      </div>
    );
  }

  if (!userData) return null;

  const tabs = [
    { key: 'personal', label: 'Identity', icon: UserIcon },
    { key: 'email', label: 'Security', icon: ShieldCheckIcon },
    { key: 'sessions', label: 'Nodes', icon: ComputerDesktopIcon },
    { key: 'danger', label: 'Purge', icon: TrashIcon }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 pb-20 animate-slide-up-soft">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <CommandLineIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Account Configuration</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-black text-brand-dark tracking-tighter leading-none">Identity Manager.</h1>
          <p className="text-base md:text-lg text-text-secondary font-bold opacity-70">Manage your deployment credentials and system security.</p>
        </div>
      </div>

      {/* --- PROFILE OVERVIEW --- */}
      <div className="bg-white border border-surface-200 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/[0.02] rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <UserIcon className="w-16 h-16 md:w-20 md:h-20 text-brand-blue" />
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-brand-dark tracking-tight leading-none mb-1">
                {userData.firstName} {userData.lastName}
              </h2>
              <p className="text-sm md:text-base text-text-secondary font-bold opacity-80">{userData.email}</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
              <div className={`px-2.5 py-1.5 rounded-lg md:rounded-xl border flex items-center gap-2 ${userData.isEmailVerified ? 'bg-brand-success/5 border-brand-success/20 text-brand-success' : 'bg-brand-orange/5 border-brand-orange/20 text-brand-orange'}`}>
                {userData.isEmailVerified ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <ShieldExclamationIcon className="w-3.5 h-3.5" />}
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{userData.isEmailVerified ? 'Verified' : 'Unverified'}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg md:rounded-xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue flex items-center gap-2 font-black uppercase tracking-widest text-[8px] md:text-[9px]">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                {userData.tier} Tier
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- TAB NAVIGATION --- */}
      <div className="flex flex-wrap gap-1.5 md:gap-2 bg-surface-50 border border-surface-200 p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-inner w-full md:max-w-fit mx-auto md:mx-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'sessions') loadSessions();
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.key
                ? 'bg-white text-brand-blue shadow-md border border-surface-200'
                : 'text-text-tertiary hover:text-brand-dark hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className={activeTab === tab.key ? 'inline' : 'hidden sm:inline'}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* --- CONTENT ARCHITECTURE --- */}
      <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-16 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'personal' && (
              <motion.div key="p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-8 md:space-y-10">
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight uppercase leading-none">Identity Parameters.</h3>
                  <p className="text-[10px] md:text-sm font-bold text-text-secondary opacity-70">Update your primary identification fields.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">First Name</label>
                    <input
                      type="text"
                      value={personalForm.firstName}
                      onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                      className="input-resume py-3.5 md:py-4 px-5 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Last Name</label>
                    <input
                      type="text"
                      value={personalForm.lastName}
                      onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                      className="input-resume py-3.5 md:py-4 px-5 rounded-xl text-sm font-bold bg-surface-50 border border-surface-200 focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none"
                    />
                  </div>
                </div>
                <button onClick={updatePersonalInfo} disabled={saving} className="w-full sm:w-auto btn-primary px-8 md:px-10 py-3.5 md:py-4 text-[11px] md:text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20">
                  {saving ? 'Synchronizing...' : 'Update Identity'}
                </button>
              </motion.div>
            )}

            {activeTab === 'sessions' && (
              <motion.div key="s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 md:space-y-10">
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight uppercase leading-none">Active Deployment Nodes.</h3>
                  <p className="text-[10px] md:text-sm font-bold text-text-secondary opacity-70">Monitor and manage your active system sessions.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-4 md:p-6 bg-surface-50 border border-surface-200 rounded-2xl md:rounded-[2rem] flex items-center justify-between group hover:border-brand-blue/30 transition-all shadow-sm">
                      <div className="flex items-center gap-4 md:gap-5">
                        <ComputerDesktopIcon className="w-6 h-6 md:w-7 md:h-7 text-brand-blue" />
                        <div>
                          <p className="text-sm font-black text-brand-dark flex items-center gap-2">
                            {session.browser}
                            {session.isCurrent && <span className="text-[8px] font-black bg-brand-success text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">Current</span>}
                          </p>
                          <p className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-1">
                            {session.location.city || 'Global Node'} • {new Date(session.loginTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'danger' && (
              <motion.div key="d" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-8 md:space-y-10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
                    <ShieldExclamationIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Critical Access</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Purge Identity.</h3>
                  <p className="text-sm md:text-base font-bold text-text-secondary leading-relaxed opacity-80 italic">
                    "Warning: Protocol execution will result in immediate and permanent data loss across all career architectures."
                  </p>
                </div>
                
                <div className="space-y-6 pt-6 border-t border-surface-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1 text-red-500">Purge Confirmation String</label>
                    <input
                      type="text"
                      value={deleteForm.confirmText}
                      onChange={(e) => setDeleteForm({ ...deleteForm, confirmText: e.target.value })}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full bg-red-50/10 border border-red-100 rounded-xl py-3.5 md:py-4 px-5 text-sm font-bold focus:border-red-500 focus:ring-red-50 focus:ring-4 transition-all outline-none"
                    />
                  </div>
                  <button className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl bg-red-500 text-white font-black uppercase tracking-[0.3em] text-[10px] md:text-xs shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95">
                    Execute Purge Protocol
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
