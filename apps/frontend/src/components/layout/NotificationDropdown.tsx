import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  BellIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export interface NavNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'deadline';
  title: string;
  message: string;
  timestamp: string;
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
      return <div className="w-2 h-2 rounded-full bg-brand-success shadow-[0_0_8px_rgba(46,204,113,0.5)]" />;
    case 'warning':
      return <div className="w-2 h-2 rounded-full bg-brand-orange" />;
    case 'deadline':
      return <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-brand-blue" />;
  }
};

const getTimeAgo = (timestamp: string) => {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'Now';
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
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      className="fixed left-4 right-4 top-24 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-4 sm:w-96 bg-white border border-surface-200 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden z-[100]"
    >
      {/* --- HEADER --- */}
      <div className="p-4 md:p-6 border-b border-surface-100 bg-surface-50/50">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="text-sm font-black text-brand-dark uppercase tracking-widest">
            Alert Logs
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-1 text-[9px] md:text-[10px] font-black bg-brand-blue text-white rounded-lg uppercase tracking-wider">
              {unreadCount} New
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={onMarkAllAsRead}
              className="text-[9px] md:text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline transition-all"
            >
              Clear Signal
            </button>
            <span className="text-surface-300">•</span>
            <button
              onClick={onClearAll}
              className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest hover:text-brand-dark transition-all"
            >
              Flush All
            </button>
          </div>
        )}
      </div>

      {/* --- NOTIFICATIONS LIST --- */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-12 md:p-16 text-center space-y-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-surface-50 border border-surface-200 flex items-center justify-center mx-auto text-text-tertiary opacity-30 shadow-inner">
              <BellIcon className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Zero Alerts Detected</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-50">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`px-4 py-4 md:px-6 md:py-5 hover:bg-surface-50 transition-all duration-200 cursor-pointer relative group ${
                  !notification.read ? "bg-brand-blue/[0.02]" : ""
                }`}
                onClick={() => !notification.read && onMarkAsRead(notification.id)}
              >
                {!notification.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue" />
                )}
                
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="mt-1.5 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-3 md:gap-4">
                      <p className={`text-sm font-black tracking-tight leading-none ${
                        notification.read ? "text-text-secondary" : "text-brand-dark"
                      }`}>
                        {notification.title}
                      </p>
                      <span className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-tighter flex-shrink-0">
                        {getTimeAgo(notification.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-xs font-bold text-text-secondary leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                      {notification.message}
                    </p>
                    
                    {notification.action && (
                      <button className="text-[9px] md:text-[10px] font-black text-brand-blue uppercase tracking-widest pt-2 md:pt-3 flex items-center gap-1 group/btn">
                        {notification.action.label} 
                        <ChevronRightIcon className="w-2.5 h-2.5 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="p-4 bg-surface-50/50 border-t border-surface-100 text-center">
        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">
          End-to-End Encrypted Notifications
        </p>
      </div>
    </motion.div>
  );
}