import React from 'react';
import { 
  DocumentTextIcon, 
  PencilIcon, 
  BriefcaseIcon,
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const quickActions = [
  {
    title: 'Create Resume',
    description: 'Build a new ATS-optimized resume',
    icon: DocumentTextIcon,
    href: '/resume-builder/create',
    color: 'from-blue-500 to-purple-600',
    bgColor: 'bg-gray-700'
  },
  {
    title: 'Add Job Application',
    description: 'Track a new job application',
    icon: BriefcaseIcon,
    href: '/job-tracker/add',
    color: 'from-green-500 to-teal-600',
    bgColor: 'bg-gray-700'
  }
];

const stats = [
  {
    title: 'Resumes Created',
    value: '3',
    change: '+1 this week',
    icon: DocumentTextIcon,
    color: 'text-teal-600',
    bgColor: 'bg-accent-primary/20'
  },
  {
    title: 'Applications Sent',
    value: '12',
    change: '+4 this week',
    icon: BriefcaseIcon,
    color: 'text-green-600',
    bgColor: 'bg-accent-tertiary/20'
  },
  {
    title: 'Interviews Scheduled',
    value: '5',
    change: '+2 this week',
    icon: CalendarIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-accent-primary/20'
  },
  {
    title: 'Response Rate',
    value: '42%',
    change: '+8% from last month',
    icon: ArrowTrendingUpIcon,
    color: 'text-orange-600',
    bgColor: 'bg-accent-quaternary/20'
  }
];

const recentActivity = [
  {
    type: 'resume',
    title: 'Software Engineer Resume',
    description: 'Updated with new React experience',
    time: '2 hours ago',
    status: 'completed'
  },
  {
    type: 'application',
    title: 'Google - Senior Frontend Developer',
    description: 'Application submitted',
    time: '1 day ago',
    status: 'pending'
  },
  {
    type: 'interview',
    title: 'Microsoft - Technical Interview',
    description: 'Scheduled for tomorrow at 2:00 PM',
    time: '2 days ago',
    status: 'scheduled'
  }
];

const upcomingTasks = [
  {
    title: 'Follow up with Netflix',
    description: 'Send follow-up email for Data Scientist position',
    dueDate: 'Today',
    priority: 'high'
  },
  {
    title: 'Prepare for Amazon interview',
    description: 'System design and behavioral questions',
    dueDate: 'Tomorrow',
    priority: 'high'
  },
  {
    title: 'Update LinkedIn profile',
    description: 'Add recent project experience',
    dueDate: 'This week',
    priority: 'medium'
  }
];

export default function DashboardSimple() {
  const { user } = useAuthStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'scheduled':
        return <CalendarIcon className="h-4 w-4 text-teal-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-accent-danger/30 bg-accent-danger/10';
      case 'medium':
        return 'border-accent-quaternary/30 bg-accent-quaternary/10';
      case 'low':
        return 'border-accent-tertiary/30 bg-accent-tertiary/10';
      default:
        return 'border-surface-200 bg-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="glass-dark-heavy rounded-2xl p-6 sm:p-8 border border-surface-200/50 shadow-dark-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary gradient-text-dark">
                Welcome back, {user?.firstName}! 👋
              </h1>
              <p className="text-text-secondary mt-2 text-sm sm:text-base">
                Here's what's happening with your job search today.
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">12</div>
                <div className="text-xs text-dark-text-muted">Applications</div>
              </div>
              <div className="w-px h-8 bg-dark-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">5</div>
                <div className="text-xs text-dark-text-muted">Interviews</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="glass-dark rounded-xl p-4 sm:p-6 border border-surface-200/30 hover:border-accent-primary/50 backdrop-blur-sm shadow-dark-lg hover:shadow-glow-md transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">{stat.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-accent-tertiary mt-1 truncate">{stat.change}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 shadow-glow-sm flex-shrink-0">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="glass-dark-heavy rounded-2xl p-6 sm:p-8 border border-surface-200/50 backdrop-blur-md shadow-dark-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">⚡</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary gradient-text-dark">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={index}
                  className="transform hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                >
                  <Link
                    to={action.href}
                    className="group relative overflow-hidden glass-dark rounded-xl p-6 border border-surface-200/50 hover:border-accent-primary/50 transition-all duration-300 block shadow-dark-lg hover:shadow-glow-md backdrop-blur-sm"
                  >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${action.color}/80 to-accent-secondary/60 rounded-xl flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-md group-hover:scale-110 transition-all duration-300`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="w-2 h-2 bg-accent-primary/50 rounded-full group-hover:bg-accent-primary transition-colors duration-300"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors duration-300">
                        {action.title}
                      </h3>
                      <p className="text-sm text-text-secondary group-hover:text-text-secondary transition-colors duration-300">
                        {action.description}
                      </p>
                    </div>
                    
                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Activity */}
          <div className="glass-dark rounded-xl p-6 border border-surface-200/50 backdrop-blur-sm shadow-dark-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">Recent Activity</h2>
              <Link
                to="/activity"
                className="text-accent-primary hover:text-accent-primary/80 text-sm font-medium flex items-center"
              >
                View all
                <EyeIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-dark-quaternary/50 transition-colors">
                  <div className="flex-shrink-0">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                    <p className="text-sm text-dark-text-muted">{activity.description}</p>
                  </div>
                  <div className="text-xs text-dark-text-muted">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="glass-dark rounded-xl p-6 border border-surface-200/50 backdrop-blur-sm shadow-dark-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">Upcoming Tasks</h2>
              <Link
                to="/tasks"
                className="text-accent-primary hover:text-accent-primary/80 text-sm font-medium flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add task
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${getPriorityColor(task.priority)}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary">{task.title}</h3>
                    <span className="text-xs text-dark-text-muted">{task.dueDate}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{task.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Chart Placeholder */}
        <div className="glass-dark-heavy rounded-2xl p-6 sm:p-8 border border-surface-200/50 backdrop-blur-md shadow-dark-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary gradient-text-dark">Job Search Progress</h2>
          </div>
          <div className="h-48 sm:h-64 bg-gradient-to-br from-accent-primary/10 via-transparent to-accent-secondary/10 rounded-xl flex items-center justify-center border border-surface-200/30">
            <div className="text-center">
              <ChartBarIcon className="h-12 sm:h-16 w-12 sm:w-16 text-accent-primary mx-auto mb-4 animate-glow-pulse" />
              <p className="text-text-primary text-sm sm:text-base font-medium">Analytics dashboard coming soon!</p>
              <p className="text-xs sm:text-sm text-text-secondary mt-2 max-w-sm mx-auto">Track your job search metrics and progress over time with detailed insights.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
