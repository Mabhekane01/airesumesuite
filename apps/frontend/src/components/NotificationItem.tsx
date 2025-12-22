import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { Notification } from './NotificationSystem';

interface NotificationItemProps {
  notification: Notification;
  onRemove: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-dark-accent" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'glass-dark border-green-400/30 bg-green-500/10';
      case 'error':
        return 'glass-dark border-red-400/30 bg-red-500/10';
      case 'warning':
        return 'glass-dark border-yellow-400/30 bg-yellow-500/10';
      case 'info':
        return 'glass-dark border-dark-accent/30 bg-dark-accent/10';
    }
  };

  const getTitleColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-dark-accent';
    }
  };

  const getMessageColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-400/80';
      case 'error':
        return 'text-red-400/80';
      case 'warning':
        return 'text-yellow-400/80';
      case 'info':
        return 'text-dark-accent/80';
    }
  };

  return (
    <div 
      className={`border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out ${getBackgroundColor()}`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${getTitleColor()}`}>
            {notification.title}
          </h4>
          
          {notification.message && (
            <p className={`text-sm mt-1 ${getMessageColor()}`}>
              {notification.message}
            </p>
          )}
          
          {notification.action && (
            <div className="mt-3">
              <button
                onClick={notification.action.handler}
                className={`text-sm font-medium underline hover:no-underline ${getTitleColor()}`}
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="flex-shrink-0 ml-3 text-dark-text-muted hover:text-text-primary transition-colors"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;
