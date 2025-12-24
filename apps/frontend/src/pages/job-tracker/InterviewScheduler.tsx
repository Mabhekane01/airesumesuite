import { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronRightIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { jobApplicationAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Interview {
  id: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  type: 'phone' | 'video' | 'on_site' | 'technical' | 'behavioral' | 'case_study' | 'presentation' | 'panel';
  round: number;
  scheduledDate: string;
  duration: number;
  timezone?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  
  interviewers: {
    name: string;
    title: string;
    email?: string;
    linkedinUrl?: string;
    department?: string;
  }[];
  
  location?: string;
  meetingLink?: string;
  meetingId?: string;
  dialInInfo?: string;
  
  preparationNotes?: string;
  questionsToAsk?: string[];
  
  feedback?: string;
  rating?: number;
  technicalPerformance?: number;
  culturalFit?: number;
  communicationSkills?: number;
  
  thankYouSent?: boolean;
  followUpNotes?: string;
  nextSteps?: string;
}

interface JobApplication {
  _id: string;
  jobTitle: string;
  companyName: string;
  status: string;
}

const INTERVIEW_TYPES = [
  { value: 'phone', label: 'Phone Screen', icon: PhoneIcon },
  { value: 'video', label: 'Video Call', icon: VideoCameraIcon },
  { value: 'on_site', label: 'On-site', icon: MapPinIcon },
  { value: 'technical', label: 'Technical', icon: ClockIcon },
  { value: 'behavioral', label: 'Behavioral', icon: UserGroupIcon },
  { value: 'case_study', label: 'Case Study', icon: ClockIcon },
  { value: 'presentation', label: 'Presentation', icon: ClockIcon },
  { value: 'panel', label: 'Panel', icon: UserGroupIcon },
];

const STATUS_CONFIG: Record<string, any> = {
  scheduled: { label: 'Scheduled', color: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20' },
  completed: { label: 'Completed', color: 'text-brand-success bg-brand-success/10 border-brand-success/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-500 bg-red-50 border-red-100' },
  rescheduled: { label: 'Rescheduled', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20' },
  no_show: { label: 'No Show', color: 'text-text-tertiary bg-surface-100 border-surface-200' },
};

// --- Supporting Components ---

const CalendarGridView = ({ interviews, onSelectInterview }: { interviews: Interview[], onSelectInterview: (i: Interview) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getInterviewsForDay = (day: number) => {
    return interviews.filter(interview => {
      const date = new Date(interview.scheduledDate);
      return date.getDate() === day && 
             date.getMonth() === currentDate.getMonth() && 
             date.getFullYear() === currentDate.getFullYear();
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg md:text-xl font-black text-brand-dark uppercase tracking-tight">
          {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-surface-50 rounded-lg border border-surface-200 transition-colors">
            <XMarkIcon className="w-4 h-4 md:w-5 md:h-5 rotate-45" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-surface-50 rounded-lg border border-surface-200 transition-colors">
            <ChevronRightIcon className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-surface-200 border border-surface-200 rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-surface-50 py-2.5 md:py-3 text-center text-[8px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest border-b border-surface-200">
            {day.slice(0, 1)}<span className="hidden md:inline">{day.slice(1)}</span>
          </div>
        ))}
        {days.map((day, idx) => {
          const dayInterviews = day ? getInterviewsForDay(day) : [];
          const isToday = day === new Date().getDate() && 
                          currentDate.getMonth() === new Date().getMonth() && 
                          currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div key={idx} className={`min-h-[80px] md:min-h-[120px] bg-white p-1 md:p-2 transition-colors ${day ? 'hover:bg-surface-50/50' : 'bg-surface-50/20'}`}>
              {day && (
                <div className="space-y-1 md:space-y-2">
                  <span className={`inline-flex w-6 h-6 md:w-7 md:h-7 items-center justify-center text-[10px] md:text-xs font-black rounded-full ${
                    isToday ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30' : 'text-text-secondary'
                  }`}>
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayInterviews.map(iv => (
                      <button
                        key={iv.id}
                        onClick={() => onSelectInterview(iv)}
                        className="w-full text-left p-1 md:p-1.5 rounded-md md:rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-[8px] md:text-[9px] font-bold text-brand-blue truncate hover:bg-brand-blue/20 transition-all"
                      >
                        {iv.jobTitle}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function InterviewScheduler({ defaultView = 'list' }: { defaultView?: 'calendar' | 'list' }) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(defaultView);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [interviewsResponse, applicationsResponse] = await Promise.all([
        jobApplicationAPI.getUpcomingInterviews({ days: 30 }),
        jobApplicationAPI.getApplications()
      ]);

      if (interviewsResponse.success) {
        setInterviews(interviewsResponse.data.upcomingInterviews || []);
      }

      if (applicationsResponse.success) {
        setApplications(applicationsResponse.data.applications || []);
      }
    } catch (error) {
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const createInterview = async (interviewData: Partial<Interview>) => {
    try {
      const response = await jobApplicationAPI.addInterview(
        interviewData.applicationId!,
        interviewData
      );
      
      if (response.success) {
        toast.success('Interview scheduled. System synchronized.');
        setShowCreateModal(false);
        loadData();
      }
    } catch (error) {
      toast.error('Failed to schedule interview');
    }
  };

  const updateInterviewStatus = async (interviewId: string, status: string) => {
    try {
      const interview = interviews.find(i => i.id === interviewId);
      if (!interview) return;

      const response = await jobApplicationAPI.updateInterview(
        interview.applicationId,
        interviewId,
        { status }
      );
      
      if (response.success) {
        toast.success('Status updated.');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (filterStatus === 'all') return true;
    return interview.status === filterStatus;
  });

  const upcomingInterviews = interviews.filter(interview => 
    interview.status === 'scheduled' && new Date(interview.scheduledDate) >= new Date()
  );

  const todayInterviews = upcomingInterviews.filter(interview =>
    new Date(interview.scheduledDate).toDateString() === new Date().toDateString()
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-10">
        <div className="h-20 bg-white border border-surface-200 rounded-[2rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-surface-200 rounded-[2rem] Tune"></div>
          ))}
        </div>
        <div className="h-96 bg-white border border-surface-200 rounded-[2.5rem]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-slide-up-soft pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Temporal Management</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-black text-brand-dark tracking-tighter leading-none">Interview Scheduler.</h1>
          <p className="text-base md:text-lg text-text-secondary font-bold opacity-70">Strategic coordination of active recruitment sessions.</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-6 md:px-8 py-3.5 md:py-4 text-[11px] md:text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <PlusIcon className="w-4 h-4 stroke-[2.5]" />
          Schedule Session
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {[
          { label: "Today's Active", val: todayInterviews.length, icon: CalendarIcon, color: "text-brand-blue", bg: "bg-brand-blue/10" },
          { label: "Pending (7 Days)", val: upcomingInterviews.length, icon: ClockIcon, color: "text-brand-orange", bg: "bg-brand-orange/10" },
          { label: "Total Sessions", val: interviews.length, icon: UserGroupIcon, color: "text-brand-dark", bg: "bg-brand-dark/5" },
          { label: "Closed Sessions", val: interviews.filter(i => i.status === 'completed').length, icon: CheckCircleIcon, color: "text-brand-success", bg: "bg-brand-success/10" }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-surface-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm group hover:shadow-xl transition-all duration-500"
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 mb-4 md:mb-6 shadow-sm`}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <p className="text-[10px] md:text-[11px] font-black text-text-tertiary uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl md:text-4xl font-black text-brand-dark tracking-tighter group-hover:text-brand-blue transition-colors">{stat.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Control Area */}
      <div className="bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-4 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch lg:items-center">
          <div className="flex-1 flex items-center gap-3 md:gap-4 bg-surface-50 border border-surface-200 p-1.5 md:p-2 rounded-xl md:rounded-2xl">
            <div className="px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest border-r border-surface-200">Status</div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[10px] md:text-xs font-black text-brand-dark uppercase tracking-widest outline-none pr-4 cursor-pointer flex-1"
            >
              <option value="all">Universal View</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-surface-50 border border-surface-200 p-1 rounded-xl w-full sm:w-fit justify-center">
            {['list', 'calendar'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m as any)}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  viewMode === m ? 'bg-white text-brand-blue shadow-sm' : 'text-text-tertiary hover:text-brand-dark'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline List or Calendar */}
      <div className="space-y-6">
        {viewMode === 'list' ? (
          filteredInterviews.length === 0 ? (
            <div className="bg-white border border-dashed border-surface-200 rounded-[2rem] md:rounded-[3rem] py-16 md:py-24 text-center space-y-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-surface-50 border border-surface-200 flex items-center justify-center mx-auto text-text-tertiary opacity-30 shadow-inner">
                <CalendarIcon className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="space-y-2 px-6">
                <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none">Timeline Clear.</h3>
                <p className="text-sm font-bold text-text-secondary max-w-sm mx-auto opacity-70">Initialize your first interview protocol to begin synchronization.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="text-xs md:text-sm font-black text-brand-blue uppercase tracking-widest hover:underline"
              >
                Schedule Session →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {filteredInterviews.map((interview) => {
                const typeConfig = INTERVIEW_TYPES.find(t => t.value === interview.type);
                const statusConfig = STATUS_CONFIG[interview.status];
                const isToday = new Date(interview.scheduledDate).toDateString() === new Date().toDateString();

                return (
                  <motion.div
                    layout
                    key={interview.id}
                    className={`bg-white border-2 rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden ${
                      isToday ? 'border-brand-blue/30 bg-brand-blue/[0.01]' : 'border-surface-200 hover:border-brand-blue/20'
                    }`}
                  >
                    {isToday && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-brand-blue" />}
                    
                    <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
                      <div className="flex-1 space-y-4 md:space-y-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-surface-50 flex items-center justify-center border border-surface-200 group-hover:scale-110 group-hover:border-brand-blue/20 transition-all duration-500`}>
                            {typeConfig && <typeConfig.icon className="w-6 h-6 md:w-7 md:h-7 text-brand-blue opacity-70 group-hover:opacity-100" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg md:text-2xl font-black text-brand-dark tracking-tight group-hover:text-brand-blue transition-colors truncate">
                              {interview.jobTitle} <span className="text-text-tertiary mx-1.5 md:mx-2">/</span> {typeConfig?.label}
                            </h3>
                            <p className="text-[9px] md:text-[11px] font-black text-text-tertiary uppercase tracking-widest mt-1">{interview.companyName} <span className="mx-1.5 md:mx-2 opacity-30">—</span> Round {interview.round}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 pt-4 md:pt-6 border-t border-surface-100">
                          <div className="flex items-center gap-3">
                            <CalendarIcon className="w-4 h-4 text-brand-blue" />
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{new Date(interview.scheduledDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3 sm:border-l border-surface-100 sm:pl-6">
                            <ClockIcon className="w-4 h-4 text-brand-orange" />
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{new Date(interview.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <div className="flex items-center gap-3 sm:border-l border-surface-100 sm:pl-6">
                            <div className="w-4 h-4 rounded-md border-2 border-brand-success flex items-center justify-center text-[8px] font-black text-brand-success italic">D</div>
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{interview.duration} Min</span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-64 flex flex-col justify-between gap-4 md:gap-6">
                        <div className="flex flex-wrap lg:justify-end gap-2">
                          <div className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </div>
                          {isToday && (
                            <div className="px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-brand-success text-white shadow-lg shadow-brand-success/20">
                              Active Node
                            </div>
                          )}
                        </div>

                        <div className="flex lg:justify-end gap-2 md:gap-3">
                          {interview.status === 'scheduled' && (
                            <button
                              onClick={() => updateInterviewStatus(interview.id, 'completed')}
                              className="flex-1 sm:flex-none p-2.5 md:p-3 bg-surface-50 border border-surface-200 rounded-lg md:rounded-xl text-text-tertiary hover:text-brand-success hover:bg-white hover:border-brand-success/20 transition-all shadow-sm flex items-center justify-center"
                              title="Log Success"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInterview(interview)}
                            className="flex-1 sm:flex-none p-2.5 md:p-3 bg-surface-50 border border-surface-200 rounded-lg md:rounded-xl text-text-tertiary hover:text-brand-blue hover:bg-white hover:border-brand-blue/20 transition-all shadow-sm flex items-center justify-center"
                            title="Parameters"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          {interview.meetingLink && (
                            <a
                              href={interview.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-brand-dark text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                            >
                              Join Node
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 shadow-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.02]" />
            <div className="relative z-10">
              <CalendarGridView interviews={filteredInterviews} onSelectInterview={setSelectedInterview} />
            </div>
          </div>
        )}
      </div>

      {/* Create Interview Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
            className="absolute inset-0 bg-brand-dark/20 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl p-6 md:p-10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                  <PlusIcon className="w-5 h-5 md:w-6 md:h-6 stroke-[3]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-brand-dark tracking-tighter uppercase leading-none">Initialize Session.</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 md:p-3 text-text-tertiary hover:text-brand-dark rounded-xl transition-colors">
                <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); /* Logic handled in modal children */ }} className="space-y-6 md:space-y-8">
              {/* Form implementation simplified for display - would require sub-component update */}
              <div className="p-8 md:p-12 bg-surface-50 border border-dashed border-surface-200 rounded-2xl md:rounded-[2rem] text-center space-y-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] bg-white border border-surface-200 flex items-center justify-center mx-auto shadow-sm">
                  <CommandLineIcon className="w-6 h-6 md:w-8 md:h-8 text-brand-blue" />
                </div>
                <p className="text-xs md:text-sm font-bold text-text-secondary leading-relaxed px-4">Please use the application management layer to schedule specific sessions.</p>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="btn-primary px-6 md:px-8 py-3 text-[10px] font-black uppercase tracking-widest"
                >
                  Return to Matrix
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}