import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export interface NavNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'deadline';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

interface NotificationDropdownProps {
  notifications: NavNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const getNotificationIcon = (type: NavNotification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    case 'deadline':
      return <ClockIcon className="h-5 w-5 text-red-500" />;
    default:
      return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
  }
};

const getTimeAgo = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export default function NotificationDropdown({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onClearAll 
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 mt-2 w-80 bg-dark-tertiary/95 backdrop-blur-lg rounded-lg shadow-dark-xl border border-dark-border focus:outline-none z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark-text-primary">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-1 text-xs bg-accent-primary/20 text-accent-primary rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              Mark all read
            </button>
            <span className="text-dark-text-secondary">•</span>
            <button
              onClick={onClearAll}
              className="text-xs text-dark-text-secondary hover:text-accent-danger transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <InformationCircleIcon className="h-12 w-12 text-dark-text-secondary/50 mx-auto mb-3" />
            <p className="text-dark-text-secondary text-sm">
              No notifications yet
            </p>
            <p className="text-dark-text-secondary/70 text-xs mt-1">
              We'll notify you about important updates
            </p>
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`px-4 py-3 hover:bg-dark-tertiary/60 transition-all duration-200 cursor-pointer border-l-2 ${
                  notification.read 
                    ? 'border-transparent' 
                    : 'border-accent-primary bg-accent-primary/5'
                }`}
                onClick={() => !notification.read && onMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        notification.read 
                          ? 'text-dark-text-secondary' 
                          : 'text-dark-text-primary'
                      }`}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-dark-text-secondary/70">
                        {getTimeAgo(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-dark-text-secondary mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    {notification.action && (
                      <button className="text-xs text-accent-primary hover:text-accent-primary/80 mt-2 font-medium">
                        {notification.action.label} →
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}