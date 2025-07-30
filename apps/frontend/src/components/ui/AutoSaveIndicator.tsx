import React from 'react';
import { 
  CloudArrowUpIcon, 
  ClockIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface AutoSaveIndicatorProps {
  lastSaved?: Date | null;
  isDirty?: boolean;
  isError?: boolean;
  className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  lastSaved,
  isDirty,
  isError,
  className = ''
}) => {
  if (isError) {
    return (
      <div className={`flex items-center space-x-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded ${className}`}>
        <ExclamationTriangleIcon className="w-3 h-3" />
        <span>Save failed</span>
      </div>
    );
  }

  if (!isDirty && !lastSaved) {
    return null;
  }

  if (isDirty && !lastSaved) {
    return (
      <div className={`flex items-center space-x-2 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded ${className}`}>
        <ClockIcon className="w-3 h-3" />
        <span>Saving...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded ${className}`}>
      <CloudArrowUpIcon className="w-3 h-3" />
      <span>Saved {lastSaved ? new Date(lastSaved).toLocaleTimeString() : ''}</span>
    </div>
  );
};