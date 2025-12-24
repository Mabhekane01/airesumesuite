import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  PlusIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { jobApplicationAPI, analyticsAPI } from "../../services/api";
import { motion } from "framer-motion";

import { PendingApplicationsWidget } from "./PendingApplicationsWidget";

// Fetcher function for dashboard data
const fetchDashboardData = async () => {
  const [statsRes, eventsRes, insightsRes] = await Promise.all([
    jobApplicationAPI.getStats(),
    jobApplicationAPI.getUpcomingInterviews({ days: 7 }),
    analyticsAPI.getUserAnalytics(),
  ]);

  if (!statsRes.success || !eventsRes.success || !insightsRes.success) {
    throw new Error("Failed to fetch all dashboard data");
  }

  const mockInsights = [
    "Identity architecture pass rate increased by 15% this session.",
    "System detected 12 hidden high-match roles in your tech stack.",
    "Optimization delta: Core skills now align with Tier-1 recruitment standards.",
  ];

  return {
    stats: statsRes.data.stats,
    upcomingEvents: eventsRes.data.upcomingInterviews,
    aiInsights: mockInsights,
  };
};

export default function DashboardHome() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-10">
        <div className="h-48 bg-surface-100 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-100 rounded-[2rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white border border-red-100 p-12 rounded-[2.5rem] text-center shadow-sm">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-6 opacity-20" />
        <h2 className="text-2xl font-black text-brand-dark mb-2">System Interruption.</h2>
        <p className="text-text-secondary font-bold mb-6 max-w-md mx-auto">
          We encountered a protocol error while fetching your real-time metrics.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary px-8 py-3 font-black text-xs uppercase tracking-widest"
        >
          Initialize Reconnect
        </button>
      </div>
    );
  }

  const stats = data?.stats || {
    totalApplications: 0,
    interviewsScheduled: 0,
    pendingTasks: 0,
    responseRate: 0,
    weeklyGrowth: 0,
  };
  const upcomingEvents = data?.upcomingEvents || [];
  const aiInsights = data?.aiInsights || [];

  const statCards = [
    {
      title: "Active Pipelines",
      value: stats.totalApplications,
      icon: BriefcaseIcon,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
      change: `+${stats.weeklyGrowth}% Velocity`,
      changeType: "positive",
    },
    {
      title: "Scheduled Sessions",
      value: stats.interviewsScheduled,
      icon: CalendarIcon,
      color: "text-brand-success",
      bg: "bg-brand-success/10",
      change: "Next: 48h Window",
      changeType: "neutral",
    },
    {
      title: "Response Latency",
      value: `${stats.responseRate}%`,
      icon: ChartBarIcon,
      color: "text-brand-orange",
      bg: "bg-brand-orange/10",
      change: "Optimized Performance",
      changeType: "positive",
    },
    {
      title: "Pending Protocols",
      value: stats.pendingTasks,
      icon: ClockIcon,
      color: "text-brand-dark",
      bg: "bg-brand-dark/5",
      change: "Action Required",
      changeType: stats.pendingTasks > 5 ? "warning" : "neutral",
    },
  ];

  const quickActions = [
    {
      title: "New Application",
      desc: "Initialize tracker",
      icon: PlusIcon,
      href: "/dashboard/applications/new",
      color: "bg-brand-blue",
    },
    {
      title: "Core Resume",
      desc: "Optimize architecture",
      icon: DocumentTextIcon,
      href: "/dashboard/resume/templates",
      color: "bg-brand-dark",
    },
    {
      title: "AI Career Coach",
      desc: "System intelligence",
      icon: SparklesIcon,
      href: "/dashboard/coach",
      color: "bg-brand-success",
    },
    {
      title: "Deep Analytics",
      desc: "Deployment metrics",
      icon: ChartBarIcon,
      href: "/dashboard/analytics",
      color: "bg-brand-orange",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-dark rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-16 text-white shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,145,240,0.2),transparent_60%)] group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 md:gap-10">
          <div className="space-y-4 md:space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-brand-blue font-black uppercase tracking-[0.2em] text-[10px]">
              <RocketLaunchIcon className="w-4 h-4" /> System Operational
            </div>
            <h1 className="text-3xl md:text-6xl font-display font-black tracking-tighter leading-none">
              Welcome Back, <br /><span className="text-brand-blue">{user?.firstName}.</span>
            </h1>
            <p className="text-surface-300 text-base md:text-lg font-bold leading-relaxed max-w-xl opacity-80">
              Identity mapping is synchronized. Your career architecture is currently outperforming 85% of market benchmarks.
            </p>
          </div>
          
          <div className="flex items-center gap-8 md:gap-12 bg-white/5 border border-white/10 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] backdrop-blur-sm shadow-inner">
            <div className="text-center space-y-1 md:space-y-2">
              <div className="text-3xl md:text-5xl font-black text-white tracking-tighter">{stats.totalApplications}</div>
              <div className="text-[9px] md:text-[10px] font-black text-surface-400 uppercase tracking-widest">Global Apps</div>
            </div>
            <div className="w-px h-12 md:h-16 bg-white/10"></div>
            <div className="text-center space-y-1 md:space-y-2">
              <div className="text-3xl md:text-5xl font-black text-brand-blue tracking-tighter">{stats.interviewsScheduled}</div>
              <div className="text-[9px] md:text-[10px] font-black text-surface-400 uppercase tracking-widest">Active Stages</div>
            </div>
          </div>
        </div>
      </motion.div>

      <PendingApplicationsWidget />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white border border-surface-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 group"
          >
            <div className="flex items-start justify-between mb-4 md:mb-6">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500`}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="text-right">
                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
                  stat.changeType === "positive" ? "text-brand-success" : "text-text-tertiary"
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] md:text-[11px] font-black text-text-tertiary uppercase tracking-widest mb-1">{stat.title}</p>
              <p className="text-3xl md:text-4xl font-black text-brand-dark tracking-tighter group-hover:text-brand-blue transition-colors">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Quick Actions Container */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <PlusIcon className="w-64 h-64 text-brand-dark" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight mb-6 md:mb-8 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
              Deployment Console
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.href}
                  className="bg-surface-50 border border-surface-200 p-5 md:p-6 rounded-2xl flex items-center justify-between group hover:border-brand-blue/30 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-lg"
                >
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${action.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-brand-dark leading-none mb-1">{action.title}</p>
                      <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-widest">{action.desc}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* AI Insights Layer */}
          <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,145,240,0.03),transparent_70%)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                    <CpuChipIcon className="w-5 h-5 text-brand-blue" />
                  </div>
                  Semantic Intelligence
                </h2>
                <Link to="/dashboard/coach" className="text-[9px] md:text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] hover:underline">Full Report →</Link>
              </div>
              <div className="space-y-3 md:space-y-4">
                {aiInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className="flex items-start gap-4 md:gap-5 p-4 md:p-6 bg-surface-50 border border-surface-200 rounded-2xl hover:border-brand-blue/20 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-brand-blue font-black text-[10px] shadow-sm group-hover:bg-brand-blue group-hover:text-white transition-all">
                      0{index + 1}
                    </div>
                    <p className="text-sm md:text-base font-bold text-text-secondary leading-relaxed flex-1 opacity-90 group-hover:opacity-100">
                      {insight}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Style Content (Right Column) */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          {/* Upcoming Events Module */}
          <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm h-full flex flex-col">
            <h2 className="text-lg md:text-xl font-black text-brand-dark tracking-tight mb-6 md:mb-8 flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-brand-blue" />
              Event Timeline
            </h2>
            
            {upcomingEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 rounded-[1.5rem] bg-surface-50 border border-surface-200 flex items-center justify-center mx-auto shadow-inner">
                  <ClockIcon className="w-8 h-8 text-text-tertiary" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.2em]">Timeline Clear</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {upcomingEvents.slice(0, 4).map((event, index) => (
                  <div
                    key={event.id}
                    className="p-5 bg-surface-50 border border-surface-200 rounded-2xl hover:border-brand-blue/30 transition-all group shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-[9px] font-black text-brand-blue uppercase tracking-widest">{event.type}</div>
                      <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{event.date}</div>
                    </div>
                    <p className="text-base font-black text-brand-dark tracking-tight leading-none mb-1 group-hover:text-brand-blue transition-colors">
                      {event.title}
                    </p>
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                      {event.company}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-surface-100">
              <Link
                to="/dashboard/calendar"
                className="w-full bg-brand-dark text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
              >
                Launch Scheduler
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}