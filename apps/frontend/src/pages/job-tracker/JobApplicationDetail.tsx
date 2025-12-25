import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  LinkIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ShareIcon,
  ArchiveBoxIcon,
  StarIcon,
  CommandLineIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon,
  GlobeAltIcon as GlobeIcon,
  DevicePhoneMobileIcon as SmartphoneIcon,
  ComputerDesktopIcon as MonitorIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { jobApplicationAPI, interviewAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface JobApplication {
  _id: string;
  jobTitle: string;
  companyName: string;
  status: string;
  applicationDate: string;
  jobDescription: string;
  jobLocation: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  compensation: {
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
      period: string;
    };
    benefits?: string[];
  };
  priority: string;
  interviews: Interview[];
  communications: Communication[];
  tasks: Task[];
  metrics: {
    applicationScore: number;
    successProbability?: number;
  };
  applicationStrategy: {
    whyInterested: string;
    keySellingPoints: string[];
    uniqueValueProposition: string;
  };
  trackingStats?: {
    viewCount: number;
    lastViewedAt?: string;
    views: Array<{
      viewedAt: string;
      ipAddress?: string;
      userAgent?: string;
      location?: string;
    }>;
  };
}

interface Interview {
  id: string;
  type: string;
  round: number;
  scheduledDate: string;
  duration: number;
  status: string;
  interviewers: {
    name: string;
    title: string;
  }[];
  feedback?: string;
  rating?: number;
}

interface Communication {
  id: string;
  type: string;
  date: string;
  direction: string;
  contactPerson: string;
  subject?: string;
  summary: string;
  sentiment: string;
}

interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  dueDate: string;
  completed: boolean;
  description?: string;
  progress?: number;
  checklist?: Array<{ item: string; completed: boolean }>;
}

const STATUS_CONFIG: Record<string, any> = {
  applied: { label: 'Applied', color: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20', icon: ClockIcon },
  under_review: { label: 'In Review', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', icon: EyeIcon },
  phone_screen: { label: 'Screening', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', icon: PhoneIcon },
  first_interview: { label: 'Technical', color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CalendarIcon },
  offer_received: { label: 'Offer Received', color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircleIcon },
  rejected: { label: 'Closed', color: 'text-red-500 bg-red-50 border-red-100', icon: XCircleIcon },
};

export default function JobApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewTasks, setInterviewTasks] = useState<Record<string, any[]>>({});
  const [interviewMessages, setInterviewMessages] = useState<Record<string, any[]>>({});
  const [showCreateInterviewModal, setShowCreateInterviewModal] = useState(false);

  useEffect(() => {
    if (applicationId) {
      loadApplication();
    } else {
      toast.error('Invalid deployment ID');
      navigate('/dashboard/applications');
    }
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await jobApplicationAPI.getApplication(applicationId!);
      if (response.success && response.data) {
        setApplication(response.data.application);
        await loadInterviews();
      } else {
        navigate('/dashboard/applications');
      }
    } catch (error) {
      toast.error('System Error: Data acquisition failed.');
      navigate('/dashboard/applications');
    } finally {
      setLoading(false);
    }
  };

  const loadInterviews = async () => {
    if (!applicationId) return;
    try {
      const response = await interviewAPI.getInterviews({ applicationId });
      if (response.success && response.data) {
        setInterviews(response.data.interviews || []);
        for (const interview of response.data.interviews || []) {
          await loadInterviewTasks(interview._id);
          await loadInterviewMessages(interview._id);
        }
      }
    } catch (error) {}
  };

  const loadInterviewTasks = async (interviewId: string) => {
    try {
      const response = await interviewAPI.getTasks(interviewId);
      if (response.success && response.data) {
        setInterviewTasks(prev => ({ ...prev, [interviewId]: response.data.tasks || [] }));
      }
    } catch (error) {}
  };

  const loadInterviewMessages = async (interviewId: string) => {
    try {
      const response = await interviewAPI.getMessages(interviewId);
      if (response.success && response.data) {
        setInterviewMessages(prev => ({ ...prev, [interviewId]: response.data.messages || [] }));
      }
    } catch (error) {}
  };

  const updateStatus = async (newStatus: string) => {
    if (!application) return;
    try {
      const response = await jobApplicationAPI.updateApplication(application._id, { status: newStatus });
      if (response.success) {
        setApplication(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success('Status synchronized.');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteApplication = async () => {
    if (!application || !window.confirm('Execute purge protocol for this application?')) return;
    try {
      const response = await jobApplicationAPI.deleteApplication(application._id);
      if (response.success) {
        toast.success('Architecture purged.');
        navigate('/dashboard/applications');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-10">
        <div className="h-20 bg-white border border-surface-200 rounded-[2rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-surface-200 rounded-[2rem]"></div>
          ))}
        </div>
        <div className="h-96 bg-white border border-surface-200 rounded-[2.5rem]"></div>
      </div>
    );
  }

  if (!application) return null;

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.applied;

  return (
    <div className="space-y-6 md:space-y-10 animate-slide-up-soft pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => navigate('/dashboard/applications')}
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 transition-all shadow-sm group"
          >
            <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
              <h1 className="text-2xl md:text-4xl font-display font-black text-brand-dark tracking-tighter leading-none">
                {application.jobTitle}
              </h1>
              <div className={`px-2.5 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${statusConfig.color}`}>
                {statusConfig.label}
              </div>
            </div>
            <p className="text-base md:text-lg text-text-secondary font-bold opacity-70">{application.companyName}</p>
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={() => navigate(`/dashboard/applications/${application._id}/edit`)}
            className="flex-1 sm:flex-none btn-secondary px-4 md:px-6 py-3 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] border-2 flex items-center justify-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Edit <span className="hidden sm:inline">Parameters</span>
          </button>
          <button
            onClick={deleteApplication}
            className="flex-1 sm:flex-none px-4 md:px-6 py-3 rounded-xl bg-red-50 text-red-500 border-2 border-red-100 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            Purge <span className="hidden sm:inline">Data</span>
          </button>
        </div>
      </div>

      {/* --- QUICK METRICS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {[
          { label: "Semantic Score", val: `${application.metrics.applicationScore}/100`, icon: ChartBarIcon, color: "text-brand-blue", bg: "bg-brand-blue/10" },
          { label: "Active Nodes", val: application.interviews.length, icon: CalendarIcon, color: "text-brand-success", bg: "bg-brand-success/10" },
          { label: "Alert Logs", val: application.communications.length, icon: EnvelopeIcon, color: "text-brand-orange", bg: "bg-brand-orange/10" },
          { label: "Sync Delta", val: `${Math.floor((new Date().getTime() - new Date(application.applicationDate).getTime()) / (1000 * 60 * 60 * 24))} Days`, icon: ClockIcon, color: "text-brand-dark", bg: "bg-brand-dark/5" }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-surface-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm group hover:shadow-xl transition-all duration-500">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 mb-4 md:mb-6 shadow-sm`}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <p className="text-[10px] md:text-[11px] font-black text-text-tertiary uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl md:text-4xl font-black text-brand-dark tracking-tighter group-hover:text-brand-blue transition-colors">{stat.val}</p>
          </div>
        ))}
      </div>

      {/* --- NAVIGATION TABS --- */}
      <div className="flex flex-wrap gap-1.5 md:gap-2 bg-surface-50 border border-surface-200 p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-inner w-full md:max-w-fit mx-auto md:mx-0">
        {[
          { id: 'overview', label: 'Overview', icon: CommandLineIcon },
          { id: 'specs', label: 'Specifications', icon: DocumentTextIcon },
          { id: 'interviews', label: 'Sessions', icon: CalendarIcon },
          { id: 'communications', label: 'Logs', icon: EnvelopeIcon },
          { id: 'tasks', label: 'Backlog', icon: DocumentTextIcon },
          { id: 'strategy', label: 'Directives', icon: ShieldCheckIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-brand-blue shadow-md md:shadow-lg border border-surface-200'
                : 'text-text-tertiary hover:text-brand-dark hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className={activeTab === tab.id ? 'inline' : 'hidden md:inline'}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* --- CONTENT ARCHITECTURE --- */}
      <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-16 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
                <div className="space-y-6 md:space-y-10">
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Identity Parameters.</h3>
                    <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Base configuration data</p>
                  </div>
                  
                  <div className="space-y-4 md:space-y-6">
                    {[
                      { icon: BuildingOfficeIcon, label: "Institutional Host", val: application.companyName },
                      { icon: MapPinIcon, label: "Deployment Node", val: `${application.jobLocation.city || 'Global'}, ${application.jobLocation.country || 'Remote'}` },
                      { icon: CurrencyDollarIcon, label: "Compensation Band", val: application.compensation?.salaryRange ? `$${application.compensation.salaryRange.min.toLocaleString()} - $${application.compensation.salaryRange.max.toLocaleString()}` : "Confidential" },
                      { icon: CalendarIcon, label: "Initialization Date", val: new Date(application.applicationDate).toLocaleDateString() }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 md:gap-5 p-4 md:p-5 bg-surface-50 border border-surface-200 rounded-xl md:rounded-2xl group hover:border-brand-blue/30 transition-all shadow-sm">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white border border-surface-200 flex items-center justify-center text-brand-blue shadow-inner group-hover:scale-110 transition-transform">
                          <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                          <p className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-widest leading-none mb-1">{item.label}</p>
                          <p className="text-sm md:text-base font-bold text-brand-dark leading-none">{item.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 md:space-y-10">
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Status Protocols.</h3>
                    <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">State machine management</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(status)}
                        className={`flex items-center justify-between p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-300 group ${
                          application.status === status
                            ? 'bg-brand-blue/5 border-brand-blue shadow-lg scale-[1.02]'
                            : 'bg-white border-surface-100 hover:border-brand-blue/20 text-text-tertiary grayscale hover:grayscale-0'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <config.icon className={`w-4 h-4 ${application.status === status ? 'text-brand-blue' : ''}`} />
                          <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${application.status === status ? 'text-brand-dark' : ''}`}>{config.label}</span>
                        </div>
                        {application.status === status && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(26,145,240,0.5)]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'specs' && (
              <motion.div key="sp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Technical Specifications.</h3>
                  <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Extracted architectural requirements</p>
                </div>
                <div className="p-8 md:p-12 bg-surface-50/50 border border-surface-200 rounded-[2.5rem] shadow-inner">
                  <div className="prose prose-slate max-w-none fidelity-display-layer">
                    <div 
                      dangerouslySetInnerHTML={{ __html: application.jobDescription }}
                      className="leading-relaxed text-text-secondary font-medium"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'interviews' && (
              <motion.div key="it" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Active Sessions.</h3>
                  <button className="btn-primary px-4 md:px-6 py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">Schedule Node</button>
                </div>
                
                {interviews.length === 0 ? (
                  <div className="bg-surface-50 border border-dashed border-surface-200 rounded-[1.5rem] md:rounded-[2rem] py-16 md:py-24 text-center space-y-4 md:space-y-6 shadow-inner">
                    <CalendarIcon className="w-12 h-12 md:w-16 md:h-16 text-text-tertiary opacity-20 mx-auto" />
                    <p className="text-sm font-bold text-text-secondary px-6">Zero active interview clusters detected.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {interviews.map((iv) => (
                      <div key={iv._id} className="bg-white border border-surface-200 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl hover:border-brand-blue/20 transition-all duration-500 group">
                        <div className="flex justify-between items-start mb-4 md:mb-6">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 group-hover:scale-110 transition-transform">
                            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-surface-50 text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-surface-200">{iv.status}</span>
                        </div>
                        <h4 className="text-lg md:text-xl font-black text-brand-dark tracking-tight mb-1 group-hover:text-brand-blue transition-colors">Round {iv.round} Cluster</h4>
                        <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">{new Date(iv.scheduledDate).toLocaleDateString()} at {new Date(iv.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'strategy' && (
              <motion.div key="st" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-8 md:space-y-12">
                <div className="space-y-3 md:space-y-4">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-brand-blue/10">
                    Mission Architecture
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-brand-dark tracking-tighter leading-none">Deployment Strategy.</h3>
                </div>

                <div className="grid grid-cols-1 gap-6 md:gap-8">
                  <div className="p-6 md:p-8 bg-surface-50 border border-surface-200 rounded-[1.5rem] md:rounded-[2rem] shadow-inner group hover:bg-white hover:border-brand-blue/20 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-4 md:mb-6">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white border border-surface-200 flex items-center justify-center text-brand-blue shadow-sm group-hover:rotate-6 transition-transform">
                        <StarIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h4 className="text-sm md:text-base font-black text-brand-dark uppercase tracking-widest">Primary Objective</h4>
                    </div>
                    <p className="text-sm md:text-base font-bold text-text-secondary leading-relaxed opacity-90 italic">"{application.applicationStrategy.whyInterested || 'Null'}"</p>
                  </div>

                  <div className="p-6 md:p-8 bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm group hover:border-brand-blue/20 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-4 md:mb-6">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-brand-success shadow-sm group-hover:rotate-6 transition-transform">
                        <CheckCircleIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h4 className="text-sm md:text-base font-black text-brand-dark uppercase tracking-widest">Value Proposition</h4>
                    </div>
                    <p className="text-sm md:text-base font-bold text-text-secondary leading-relaxed opacity-90">{application.applicationStrategy.uniqueValueProposition || 'Null'}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
    </div>
  );
}