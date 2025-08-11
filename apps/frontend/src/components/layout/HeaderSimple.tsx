import React, { useState } from 'react';
import { 
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNotifications } from '../../contexts/NotificationContext';
import AuthModalSimple from '../auth/AuthModalSimple';
import NotificationDropdown from './NotificationDropdown';

// Memoized Navigation Component to prevent re-renders on location change
const MemoizedNavigation = React.memo(() => {
  const location = useLocation();
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon, current: location.pathname === '/dashboard' },
    { name: 'Resume Builder', href: '/dashboard/resume/templates', icon: DocumentTextIcon, current: location.pathname.startsWith('/dashboard/resume') },
    { name: 'Cover Letters', href: '/dashboard/cover-letter', icon: PencilIcon, current: location.pathname.startsWith('/dashboard/cover-letter') },
    { name: 'Job Applications', href: '/dashboard/applications', icon: BriefcaseIcon, current: location.pathname.startsWith('/dashboard/applications') },
  ];

  return (
    <>
      {navigation.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
              item.current
                ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                : 'text-dark-text-secondary hover:text-accent-primary hover:bg-accent-primary/10'
            } ${index > 1 ? 'hidden md:flex' : ''}`}
          >
            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{item.name}</span>
            <span className="sm:hidden">{item.name.split(' ')[0]}</span>
          </Link>
        );
      })}
    </>
  );
});

const PublicNavigation = React.memo(() => {
  const location = useLocation();
  const publicNavigation = [
    { name: 'Templates', href: '/templates', icon: DocumentTextIcon, current: location.pathname === '/templates' },
    { name: 'PDF Editor', href: '/pdf-editor', icon: PencilIcon, current: location.pathname === '/pdf-editor' },
  ];

  return (
    <>
      {publicNavigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
              item.current
                ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                : 'text-dark-text-secondary hover:text-accent-primary hover:bg-accent-primary/10'
            }`}
          >
            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );
});


export default function HeaderSimple() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  const handleAuthClick = (mode: 'login' | 'register') => {
    console.log('🔍 HeaderSimple: handleAuthClick called with mode:', mode);
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header className="bg-dark-primary/95 backdrop-blur-lg border-b border-dark-border/70 sticky top-0 z-40 overflow-visible">
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 xs:h-15 sm:h-16 overflow-visible">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-md transition-all duration-300 animate-glow-pulse">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <span className="text-xl font-bold gradient-text-dark">
                  Job Suite
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden sm:flex space-x-1 md:space-x-2">
              {isAuthenticated ? <MemoizedNavigation /> : <PublicNavigation />}
            </nav>

            {/* Auth Section */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              {isAuthenticated && user ? (
                <>
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                      className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-dark-tertiary/60 transition-all duration-300 hover:shadow-glow-sm relative"
                    >
                      <BellIcon className="h-4 w-4 sm:h-5 sm:w-5 text-dark-text-secondary hover:text-accent-primary transition-colors" />
                      {/* Notification Badge */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3 w-3 sm:h-4 sm:w-4 bg-accent-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        </span>
                      )}
                    </button>
                    
                    {/* Notification Dropdown */}
                    {notificationDropdownOpen && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setNotificationDropdownOpen(false)}
                        />
                        <NotificationDropdown
                          notifications={notifications?.map((notification: any) => ({
                            id: notification._id || notification.id || '',
                            type: notification.type === 'deadline' ? 'deadline' : 
                                  notification.type === 'error' ? 'warning' : 
                                  notification.type || 'info',
                            title: notification.title || 'Notification',
                            message: notification.message || '',
                            timestamp: notification.createdAt || new Date().toISOString(),
                            read: Boolean(notification.read),
                            action: notification.action ? {
                              label: notification.action.label || 'View',
                              href: notification.action.url || '#'
                            } : undefined
                          })) || []}
                          onMarkAsRead={markAsRead}
                          onMarkAllAsRead={markAllAsRead}
                          onClearAll={clearAll}
                        />
                      </>
                    )}
                  </div>
                </>
              ) : null}
              {isAuthenticated && user ? (
                <Menu as="div" className="relative z-50">
                  <Menu.Button className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-dark-tertiary/60 transition-all duration-300 hover:shadow-glow-sm">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center shadow-glow-sm">
                      <span className="text-white text-xs sm:text-sm font-medium">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-dark-text-primary hidden md:block">
                      {user.firstName}
                    </span>
                    <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4 text-dark-text-secondary" />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-dark-tertiary/95 backdrop-blur-lg rounded-lg shadow-dark-xl border border-dark-border focus:outline-none z-50" style={{zIndex: 999999}}>
                      <div className="p-2">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/dashboard/account"
                              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md transition-all duration-200 text-dark-text-primary ${
                                active ? 'bg-accent-primary/10 text-accent-primary' : ''
                              }`}
                            >
                              <Cog6ToothIcon className="h-4 w-4" />
                              <span>Account Manager</span>
                            </Link>
                          )}
                        </Menu.Item>
                        <div className="border-t border-dark-border my-1"></div>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md transition-all duration-200 text-accent-danger ${
                                active ? 'bg-accent-danger/10' : ''
                              }`}
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              <span>Sign out</span>
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="text-dark-text-secondary hover:text-accent-primary transition-all duration-300 font-medium text-xs sm:text-sm px-2 sm:px-0"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="btn-primary-dark transform hover:scale-105 text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-3"
                  >
                    <span className="hidden xs:inline">Create Account</span>
                    <span className="xs:hidden">Sign Up</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModalSimple
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}