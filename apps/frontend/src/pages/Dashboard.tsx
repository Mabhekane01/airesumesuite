import React from 'react';
import { motion } from 'framer-motion';
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
    href: '/resume-builder/templates',
    color: 'from-blue-500 to-purple-600',
    bgColor: 'bg-blue-50'
  },
  {
    title: 'Generate Cover Letter',
    description: 'Create a personalized cover letter',
    icon: PencilIcon,
    href: '/cover-letter',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50'
  },
  {
    title: 'Add Job Application',
    description: 'Track a new job application',
    icon: BriefcaseIcon,
    href: '/job-tracker/add',
    color: 'from-green-500 to-blue-600',
    bgColor: 'bg-green-50'
  }
];

const stats = [
  {
    title: 'Resumes Created',
    value: '3',
    change: '+1 this week',
    icon: DocumentTextIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'Applications Sent',
    value: '12',
    change: '+4 this week',
    icon: BriefcaseIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Interviews Scheduled',
    value: '5',
    change: '+2 this week',
    icon: CalendarIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    title: 'Response Rate',
    value: '42%',
    change: '+8% from last month',
    icon: ArrowTrendingUpIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
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
  },
  {
    type: 'cover-letter',
    title: 'Cover Letter for Apple',
    description: 'Generated for iOS Developer position',
    time: '3 days ago',
    status: 'completed'
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

export default function Dashboard() {
  const { user } = useAuthStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-accent-success" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-accent-quaternary" />;
      case 'scheduled':
        return <CalendarIcon className="h-4 w-4 text-accent-secondary" />;
      default:
        return <ClockIcon className="h-4 w-4 text-dark-text-muted" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-accent-danger bg-accent-danger/10';
      case 'medium':
        return 'border-accent-quaternary bg-accent-quaternary/10';
      case 'low':
        return 'border-accent-success bg-accent-success/10';
      default:
        return 'border-dark-border bg-dark-tertiary/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-2 xs:py-3 sm:py-4 md:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 space-y-3 xs:space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark-heavy rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 lg:p-8 border border-dark-border/50 shadow-dark-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 xs:space-y-3 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-dark-text-primary gradient-text-dark animate-gradient">
                Welcome back, {user?.firstName}! 👋
              </h1>
              <p className="text-dark-text-secondary mt-1 xs:mt-1.5 sm:mt-2 text-xs xs:text-sm sm:text-base leading-relaxed">
                Here's what's happening with your job search today.
              </p>
            </div>
            <div className="flex sm:hidden items-center justify-center space-x-4 xs:space-x-6 pt-1 xs:pt-2">
              <div className="text-center">
                <div className="text-lg xs:text-xl font-bold text-dark-text-primary">12</div>
                <div className="text-xs text-dark-text-muted">Applications</div>
              </div>
              <div className="w-px h-5 xs:h-6 bg-dark-border"></div>
              <div className="text-center">
                <div className="text-lg xs:text-xl font-bold text-dark-text-primary">5</div>
                <div className="text-xs text-dark-text-muted">Interviews</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-text-primary">12</div>
                <div className="text-xs text-dark-text-muted">Applications</div>
              </div>
              <div className="w-px h-6 md:h-8 bg-dark-border/70"></div>
              <div className="text-center">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-text-primary">5</div>
                <div className="text-xs text-dark-text-muted">Interviews</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 lg:gap-6"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02, y: -2 }}
                className="glass-dark rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 lg:p-6 border border-dark-border/30 hover:border-accent-primary/50 backdrop-blur-sm shadow-dark-lg hover:shadow-glow-md transition-all duration-300 animate-slide-up-soft"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-1 xs:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs xs:text-sm font-medium text-dark-text-secondary truncate">{stat.title}</p>
                    <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-dark-text-primary mt-0.5 xs:mt-1">{stat.value}</p>
                    <p className="text-xs text-accent-success mt-0.5 truncate">{stat.change}</p>
                  </div>
                  <div className="p-1.5 xs:p-2 sm:p-2.5 lg:p-3 rounded-md xs:rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 shadow-glow-sm flex-shrink-0 self-start xs:self-center">
                    <Icon className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-accent-primary" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-dark-heavy rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 lg:p-8 border border-dark-border/50 backdrop-blur-md shadow-dark-xl"
        >
          <div className="flex items-center space-x-2 xs:space-x-3 mb-3 xs:mb-4 sm:mb-6">
            <div className="w-6 h-6 xs:w-8 xs:h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-md xs:rounded-lg flex items-center justify-center shadow-glow-sm animate-glow-pulse">
              <span className="text-white text-sm xs:text-lg">⚡</span>
            </div>
            <h2 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-dark-text-primary gradient-text-dark">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-1 sm:flex sm:overflow-x-auto sm:space-x-3 md:space-x-4 lg:grid lg:grid-cols-3 lg:overflow-x-visible lg:space-x-0 gap-2 xs:gap-3 sm:gap-0 lg:gap-6 scrollbar-thin scrollbar-thumb-dark-border sm:pb-2 lg:pb-0"
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="animate-slide-up-soft"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Link
                    to={action.href}
                    className="group relative overflow-hidden glass-dark rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-5 lg:p-6 border border-dark-border/30 hover:border-accent-primary/60 transition-all duration-500 block shadow-dark-lg hover:shadow-glow-md backdrop-blur-lg sm:min-w-[260px] md:min-w-[280px] sm:flex-shrink-0 lg:min-w-0"
                  >
                    {/* Background gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-accent-secondary/3 to-accent-tertiary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Glassy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-glass-light via-transparent to-glass-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-2 xs:mb-3 sm:mb-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-lg xs:rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110"></div>
                          <div className="relative w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 glass-dark-heavy rounded-lg xs:rounded-xl flex items-center justify-center border border-accent-primary/30 group-hover:border-accent-primary/60 group-hover:shadow-glow-sm transition-all duration-500">
                            <Icon className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-accent-primary group-hover:text-white transition-colors duration-500" />
                          </div>
                        </div>
                        <div className="w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 bg-accent-primary/40 rounded-full group-hover:bg-accent-primary group-hover:shadow-glow-sm transition-all duration-500"></div>
                      </div>
                      <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-dark-text-primary mb-1 xs:mb-1.5 sm:mb-2 group-hover:text-accent-primary transition-colors duration-500 line-clamp-1">
                        {action.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-dark-text-tertiary group-hover:text-dark-text-secondary transition-colors duration-500 line-clamp-2">
                        {action.description}
                      </p>
                    </div>
                    
                    {/* Subtle glow effect */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-6 lg:gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-dark rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-5 lg:p-6 border border-dark-border/50 backdrop-blur-sm shadow-dark-lg"
          >
            <div className="flex items-center justify-between mb-3 xs:mb-4 sm:mb-5 lg:mb-6">
              <h2 className="text-base xs:text-lg sm:text-xl font-bold text-dark-text-primary">📈 Recent Activity</h2>
              <Link
                to="/activity"
                className="text-accent-primary hover:text-accent-secondary text-xs sm:text-sm font-medium flex items-center group"
              >
                <span className="hidden sm:inline">View all</span>
                <span className="sm:hidden">All</span>
                <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="space-y-2 xs:space-y-3 sm:space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 p-2 xs:p-2.5 sm:p-3 rounded-md xs:rounded-lg hover:bg-dark-quaternary/30 transition-all duration-300 border border-transparent hover:border-accent-primary/20 animate-slide-up-soft" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex-shrink-0">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs xs:text-sm font-medium text-dark-text-primary truncate">{activity.title}</p>
                    <p className="text-xs text-dark-text-secondary truncate">{activity.description}</p>
                  </div>
                  <div className="text-xs text-dark-text-muted flex-shrink-0 hidden xs:block">{activity.time}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Tasks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-dark rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-5 lg:p-6 border border-dark-border/50 backdrop-blur-sm shadow-dark-lg"
          >
            <div className="flex items-center justify-between mb-3 xs:mb-4 sm:mb-5 lg:mb-6">
              <h2 className="text-base xs:text-lg sm:text-xl font-bold text-dark-text-primary">📋 Upcoming Tasks</h2>
              <Link
                to="/tasks"
                className="text-accent-primary hover:text-accent-secondary text-xs sm:text-sm font-medium flex items-center group"
              >
                <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Add task</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>
            <div className="space-y-2 xs:space-y-3 sm:space-y-4">
              {upcomingTasks.map((task, index) => (
                <div key={index} className={`p-2 xs:p-3 sm:p-4 rounded-md xs:rounded-lg border-l-3 xs:border-l-4 ${getPriorityColor(task.priority)} bg-dark-quaternary/20 animate-slide-up-soft`} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-1 xs:space-y-0">
                    <h3 className="text-xs xs:text-sm font-medium text-dark-text-primary truncate pr-2">{task.title}</h3>
                    <span className="text-xs text-dark-text-muted flex-shrink-0">{task.dueDate}</span>
                  </div>
                  <p className="text-xs text-dark-text-secondary mt-1 line-clamp-2">{task.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Progress Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-dark-heavy rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 lg:p-8 border border-dark-border/50 backdrop-blur-md shadow-dark-xl"
        >
          <div className="flex items-center space-x-2 xs:space-x-3 mb-3 xs:mb-4 sm:mb-6">
            <div className="w-6 h-6 xs:w-8 xs:h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-md xs:rounded-lg flex items-center justify-center shadow-glow-sm animate-glow-pulse">
              <span className="text-white text-sm xs:text-lg">📊</span>
            </div>
            <h2 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-dark-text-primary gradient-text-dark">Job Search Progress</h2>
          </div>
          <div className="h-32 xs:h-40 sm:h-48 lg:h-64 bg-gradient-to-br from-accent-primary/10 via-transparent to-accent-secondary/10 rounded-lg xs:rounded-xl flex items-center justify-center border border-dark-border/30">
            <div className="text-center px-3 xs:px-4">
              <ChartBarIcon className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-accent-primary mx-auto mb-2 xs:mb-3 sm:mb-4 animate-glow-pulse" />
              <p className="text-dark-text-primary text-xs xs:text-sm sm:text-base font-medium">Analytics dashboard coming soon!</p>
              <p className="text-xs text-dark-text-secondary mt-1 xs:mt-2 max-w-xs sm:max-w-sm mx-auto leading-relaxed">Track your job search metrics and progress over time with detailed insights.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}