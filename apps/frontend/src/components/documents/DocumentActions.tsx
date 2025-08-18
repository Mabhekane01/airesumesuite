import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PrinterIcon,
  CloudIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface DocumentActionsProps {
  onPreview?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onCloudSave?: () => void;
  onUploadForTracking?: () => void;
  hidePreview?: boolean;
}

export default function DocumentActions({
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
  onDownload,
  onShare,
  onPrint,
  onCloudSave,
  onUploadForTracking,
  hidePreview = false,
}: DocumentActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const actions = [
    ...(!hidePreview && onPreview ? [{ 
      label: 'View', 
      icon: EyeIcon, 
      onClick: onPreview,
      color: 'text-teal-400 hover:text-teal-300'
    }] : []),
    { 
      label: 'Edit', 
      icon: PencilIcon, 
      onClick: onEdit,
      color: 'text-green-400 hover:text-green-300'
    },
    ...(onDownload ? [{ 
      label: 'Download PDF', 
      icon: ArrowDownTrayIcon, 
      onClick: onDownload,
      color: 'text-emerald-400 hover:text-emerald-300'
    }] : []),
    ...(onPrint ? [{ 
      label: 'Print', 
      icon: PrinterIcon, 
      onClick: onPrint,
      color: 'text-gray-400 hover:text-gray-300'
    }] : []),
    ...(onCloudSave ? [{ 
      label: 'Save to Cloud', 
      icon: CloudIcon, 
      onClick: onCloudSave,
      color: 'text-cyan-400 hover:text-cyan-300'
    }] : []),
    ...(onShare ? [{ 
      label: 'Share', 
      icon: ShareIcon, 
      onClick: onShare,
      color: 'text-indigo-400 hover:text-indigo-300'
    }] : []),
    ...(onUploadForTracking ? [{ 
      label: 'Upload for Tracking', 
      icon: ChartBarIcon, 
      onClick: onUploadForTracking,
      color: 'text-purple-400 hover:text-purple-300'
    }] : []),
    { 
      label: 'Delete', 
      icon: TrashIcon, 
      onClick: onDelete,
      color: 'text-red-400 hover:text-red-300'
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-quaternary/50 transition-all duration-200"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-48 z-20"
            >
              <div className="card-dark rounded-lg shadow-dark-xl border border-dark-border/50 backdrop-blur-lg bg-gray-800/95 overflow-hidden">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.onClick();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-all duration-200 hover:bg-dark-quaternary/50 ${action.color} ${
                        index !== actions.length - 1 ? 'border-b border-dark-border/30' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}