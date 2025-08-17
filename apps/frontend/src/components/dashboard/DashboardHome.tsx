import { useQuery } from '@tanstack/react-query';
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
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { jobApplicationAPI, analyticsAPI } from '../../services/api';

// Interfaces for data shapes
interface DashboardStats {
  totalApplications: number;
  interviewsScheduled: number;
  pendingTasks: number;
  responseRate: number;
  weeklyGrowth: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  company: string;
  date: string;
  type: 'interview' | 'follow-up' | 'deadline';
}

// Fetcher function for dashboard data
const fetchDashboardData = async () => {
  const [statsRes, eventsRes, insightsRes] = await Promise.all([
    jobApplicationAPI.getStats(),
    jobApplicationAPI.getUpcomingInterviews({ days: 7 }),
    analyticsAPI.getUserAnalytics(),
  ]);

  if (!statsRes.success || !eventsRes.success || !insightsRes.success) {
    // You can handle partial failures if needed
    throw new Error('Failed to fetch all dashboard data');
  }

  // Mocking AI insights as the endpoint seems to be a placeholder
  const mockInsights = [
    'Your application response rate has improved by 15% this month',
    'Consider applying to more mid-size companies for better success rates',
    'Your JavaScript skills are in high demand - highlight them more',
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
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Retry once on failure
  });

  // Loading state UI
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 sm:space-y-6">
        <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/4 mb-4 sm:mb-6"></div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 sm:h-28 lg:h-32 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state UI
  if (isError) {
    return (
      <div className="card-glass-dark p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-accent-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-dark-text-primary mb-2">Could not load dashboard</h2>
        <p className="text-dark-text-secondary mb-4">
          There was an error fetching your dashboard data. Please try again later.
        </p>
        <p className="text-xs text-dark-text-muted">Error: {error.message}</p>
      </div>
    );
  }

  // Data-driven UI
  const stats = data?.stats || { totalApplications: 0, interviewsScheduled: 0, pendingTasks: 0, responseRate: 0, weeklyGrowth: 0 };
  const upcomingEvents = data?.upcomingEvents || [];
  const aiInsights = data?.aiInsights || [];
  
    const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: BriefcaseIcon,
      color: 'bg-teal-500',
      change: `+${stats.weeklyGrowth}% this week`,
      changeType: stats.weeklyGrowth > 0 ? 'positive' : 'neutral',
    },
    {
      title: 'Interviews Scheduled',
      value: stats.interviewsScheduled,
      icon: CalendarIcon,
      color: 'bg-green-500',
      change: 'Next: Tomorrow 2PM',
      changeType: 'neutral',
    },
    {
      title: 'Response Rate',
      value: `${stats.responseRate}%`,
      icon: ChartBarIcon,
      color: 'bg-emerald-500',
      change: '+5% from last month',
      changeType: 'positive',
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: ClockIcon,
      color: 'bg-orange-500',
      change: '3 due today',
      changeType: stats.pendingTasks > 5 ? 'warning' : 'neutral',
    },
  ];

  const quickActions = [
    {
      title: 'New Application',
      description: 'Add a new job application',
      icon: PlusIcon,
      href: '/dashboard/applications/new',
      color: 'bg-emerald-600',
    },
    {
      title: 'Build Resume',
      description: 'Create or update your resume',
      icon: DocumentTextIcon,
      href: '/dashboard/resume/builder',
      color: 'bg-teal-600',
    },
    {
      title: 'AI Career Coach',
      description: 'Get personalized career advice',
      icon: SparklesIcon,
      href: '/dashboard/coach',
      color: 'bg-green-600',
    },
    {
      title: 'View Analytics',
      description: 'Track your job search progress',
      icon: ChartBarIcon,
      href: '/dashboard/analytics',
      color: 'bg-indigo-600',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="glass-dark-heavy rounded-xl p-4 sm:p-6 text-white shadow-glow-md border border-accent-primary/30 backdrop-blur-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 via-accent-secondary/15 to-accent-tertiary/20 animate-gradient"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2 animate-slide-up-soft gradient-text-dark">
              Welcome back, {user?.firstName}! ✨
            </h1>
            <p className="text-dark-text-secondary text-sm sm:text-base animate-slide-up-soft leading-relaxed" style={{ animationDelay: '0.1s' }}>
              You're making great progress on your career journey. Here's what's happening today.
            </p>
          </div>
          <div className="flex sm:hidden items-center justify-center space-x-6 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-dark-text-primary">{stats.totalApplications}</div>
              <div className="text-xs text-dark-text-muted">Applications</div>
            </div>
            <div className="w-px h-6 bg-dark-border/50"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-dark-text-primary">{stats.interviewsScheduled}</div>
              <div className="text-xs text-dark-text-muted">Interviews</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-dark-text-primary">{stats.totalApplications}</div>
              <div className="text-xs text-dark-text-muted">Applications</div>
            </div>
            <div className="w-px h-8 bg-dark-border/50"></div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-dark-text-primary">{stats.interviewsScheduled}</div>
              <div className="text-xs text-dark-text-muted">Interviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className="card-dark p-3 sm:p-4 lg:p-6 animate-slide-up-soft hover:animate-float-gentle"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-dark-text-secondary truncate">{stat.title}</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-dark-text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-glow-sm flex-shrink-0 self-start sm:self-center`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4">
              <span className={`text-xs font-medium ${
                stat.changeType === 'positive' ? 'text-accent-success' : 
                stat.changeType === 'warning' ? 'text-accent-quaternary' : 'text-dark-text-muted'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card-glass-dark p-4 sm:p-5 lg:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-dark-text-primary mb-4 sm:mb-6 gradient-text-dark">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 sm:flex sm:overflow-x-auto sm:space-x-4 lg:grid lg:grid-cols-4 lg:overflow-x-visible lg:space-x-0 gap-3 sm:gap-0 lg:gap-4 scrollbar-thin scrollbar-thumb-dark-border sm:pb-2 lg:pb-0">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="group quick-action-card p-3 sm:p-4 lg:p-6 animate-slide-up-soft sm:min-w-[200px] sm:flex-shrink-0 lg:min-w-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110"></div>
                  <div className={`relative glass-dark-heavy p-3 sm:p-4 rounded-xl border border-accent-primary/30 group-hover:border-accent-primary/60 group-hover:shadow-glow-sm transition-all duration-500`}>
                    <action.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-accent-primary group-hover:text-white transition-colors duration-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-dark-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
                    {action.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-dark-text-tertiary mt-1 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* AI Insights */}
        <div className="card-gradient-dark p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent-primary animate-glow-pulse" />
            <h2 className="text-base sm:text-lg font-semibold text-dark-text-primary">🧠 AI Insights</h2>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2.5 sm:space-x-3 p-2.5 sm:p-3 bg-accent-primary/10 rounded-lg border border-accent-primary/20 animate-slide-up-soft" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent-primary rounded-full mt-1.5 sm:mt-2 flex-shrink-0 animate-glow-pulse"></div>
                <p className="text-xs sm:text-sm text-dark-text-secondary leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
          <Link
            to="/dashboard/coach"
            className="inline-flex items-center mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors group"
          >
            <span className="hidden sm:inline">Get more insights</span>
            <span className="sm:hidden">More insights</span>
            <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="card-gradient-dark p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-dark-text-primary mb-3 sm:mb-4">📈 Recent Activity</h2>
          <div className="space-y-3 sm:space-y-4">
            {/* This should be replaced with real data */}
          </div>
          <Link
            to="/dashboard/applications"
            className="inline-flex items-center mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-accent-secondary hover:text-accent-primary transition-colors group"
          >
            <span className="hidden sm:inline">View all activity</span>
            <span className="sm:hidden">All activity</span>
            <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="card-glass-dark p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-dark-text-primary mb-3 sm:mb-4">📅 Upcoming Events</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {upcomingEvents.slice(0, 3).map((event, index) => (
              <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 bg-dark-quaternary/30 rounded-lg border border-dark-border hover:border-accent-primary/30 transition-all duration-300 animate-slide-up-soft space-y-2 sm:space-y-0" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent-tertiary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-dark-text-primary truncate">{event.title}</p>
                    <p className="text-xs sm:text-sm text-dark-text-secondary truncate">{event.company}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm font-medium text-dark-text-primary">{event.date}</p>
                  <p className="text-xs text-dark-text-muted capitalize">{event.type}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/dashboard/calendar"
            className="inline-flex items-center mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-accent-tertiary hover:text-accent-primary transition-colors group"
          >
            <span className="hidden sm:inline">View calendar</span>
            <span className="sm:hidden">Calendar</span>
            <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}