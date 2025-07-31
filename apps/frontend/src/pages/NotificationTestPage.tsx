import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { notificationService } from '../services/notificationService';
import { useNavNotifications } from '../contexts/NavNotificationContext';
import { toast } from 'sonner';
import NotificationPreferences from '../components/settings/NotificationPreferences';

const testCategories = [
  { value: 'authentication', label: 'Authentication', description: 'Login, security alerts' },
  { value: 'payment', label: 'Payment', description: 'Billing, subscriptions' },
  { value: 'resume', label: 'Resume', description: 'Resume creation, AI analysis' },
  { value: 'application', label: 'Job Applications', description: 'Applications, status updates' },
  { value: 'interview', label: 'Interviews', description: 'Scheduling, reminders' },
  { value: 'cover_letter', label: 'Cover Letters', description: 'Generation, updates' },
  { value: 'career_coach', label: 'Career Coach', description: 'AI coaching sessions' },
  { value: 'system', label: 'System', description: 'Updates, announcements' }
];

const testTypes = [
  { value: 'success', label: 'Success', color: 'text-green-400' },
  { value: 'info', label: 'Info', color: 'text-blue-400' },
  { value: 'warning', label: 'Warning', color: 'text-yellow-400' },
  { value: 'error', label: 'Error', color: 'text-red-400' },
  { value: 'deadline', label: 'Deadline', color: 'text-purple-400' }
];

const testPriorities = [
  { value: 'low', label: 'Low', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-red-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
];

export default function NotificationTestPage() {
  const [activeTab, setActiveTab] = useState<'test' | 'stats' | 'preferences'>('test');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Test notification form state
  const [testForm, setTestForm] = useState({
    type: 'info',
    category: 'system',
    title: 'Test Notification',
    message: 'This is a test notification to verify the system is working correctly.',
    priority: 'medium'
  });

  const { refreshNotifications, notifications, unreadCount } = useNavNotifications();

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      await notificationService.sendTestNotification(testForm);
      toast.success('Test notification sent successfully!');
      
      // Refresh notifications after a short delay
      setTimeout(() => {
        refreshNotifications();
      }, 1000);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const notificationStats = await notificationService.getNotificationStats();
      setStats(notificationStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load notification statistics');
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await notificationService.clearAllNotifications();
      toast.success('All notifications cleared');
      refreshNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      toast.success('All notifications marked as read');
      refreshNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text-dark mb-2">
            Notification System Test Center
          </h1>
          <p className="text-dark-text-secondary">
            Test and manage the notification system functionality
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-dark-secondary/50 p-1 rounded-lg">
            {[
              { id: 'test', label: 'Test Notifications', icon: BellIcon },
              { id: 'stats', label: 'Statistics', icon: ChartBarIcon },
              { id: 'preferences', label: 'Preferences', icon: Cog6ToothIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-accent-primary text-white shadow-glow-sm'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Test Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-dark"
            >
              <h2 className="text-xl font-semibold text-dark-text-primary mb-6">
                Send Test Notification
              </h2>

              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Type
                  </label>
                  <select
                    value={testForm.type}
                    onChange={(e) => setTestForm({ ...testForm, type: e.target.value })}
                    className="input-field-dark"
                  >
                    {testTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Category
                  </label>
                  <select
                    value={testForm.category}
                    onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                    className="input-field-dark"
                  >
                    {testCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Priority
                  </label>
                  <select
                    value={testForm.priority}
                    onChange={(e) => setTestForm({ ...testForm, priority: e.target.value })}
                    className="input-field-dark"
                  >
                    {testPriorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={testForm.title}
                    onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                    className="input-field-dark"
                    placeholder="Notification title"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Message
                  </label>
                  <textarea
                    value={testForm.message}
                    onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                    className="input-field-dark h-24 resize-none"
                    placeholder="Notification message"
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={sendTestNotification}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="spinner-white w-4 h-4" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <BellIcon className="w-4 h-4" />
                      <span>Send Test Notification</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Notification Management */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-dark"
            >
              <h2 className="text-xl font-semibold text-dark-text-primary mb-6">
                Notification Management
              </h2>

              <div className="space-y-4">
                {/* Current Status */}
                <div className="bg-dark-secondary/50 p-4 rounded-lg">
                  <h3 className="font-medium text-dark-text-primary mb-2">Current Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-dark-text-secondary">Total Notifications:</span>
                      <span className="font-medium text-dark-text-primary">{notifications.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-text-secondary">Unread:</span>
                      <span className="font-medium text-accent-primary">{unreadCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={refreshNotifications}
                    disabled={loading}
                    className="btn-secondary w-full"
                  >
                    Refresh Notifications
                  </button>
                  
                  <button
                    onClick={markAllAsRead}
                    disabled={loading || unreadCount === 0}
                    className="btn-secondary w-full"
                  >
                    Mark All as Read
                  </button>
                  
                  <button
                    onClick={clearAllNotifications}
                    disabled={loading || notifications.length === 0}
                    className="btn-danger w-full"
                  >
                    Clear All Notifications
                  </button>
                </div>

                {/* Quick Tests */}
                <div className="border-t border-dark-border pt-4">
                  <h3 className="font-medium text-dark-text-primary mb-3">Quick Tests</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'success', label: 'Success' },
                      { type: 'warning', label: 'Warning' },
                      { type: 'error', label: 'Error' },
                      { type: 'info', label: 'Info' }
                    ].map((test) => (
                      <button
                        key={test.type}
                        onClick={() => {
                          setTestForm({
                            ...testForm,
                            type: test.type,
                            title: `${test.label} Test`,
                            message: `This is a ${test.type} notification test.`
                          });
                          sendTestNotification();
                        }}
                        disabled={loading}
                        className="btn-secondary text-xs py-2"
                      >
                        {test.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-dark-text-primary">
                Notification Statistics
              </h2>
              <button
                onClick={loadStats}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? 'Loading...' : 'Refresh Stats'}
              </button>
            </div>

            {stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-dark text-center">
                  <div className="text-2xl font-bold text-dark-text-primary">{stats.total}</div>
                  <div className="text-dark-text-secondary">Total Notifications</div>
                </div>
                <div className="card-dark text-center">
                  <div className="text-2xl font-bold text-accent-primary">{stats.unread}</div>
                  <div className="text-dark-text-secondary">Unread</div>
                </div>
                <div className="card-dark">
                  <h3 className="font-medium text-dark-text-primary mb-2">By Category</h3>
                  <div className="space-y-1">
                    {Object.entries(stats.byCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span className="text-dark-text-secondary capitalize">{category}:</span>
                        <span className="text-dark-text-primary">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-dark">
                  <h3 className="font-medium text-dark-text-primary mb-2">By Type</h3>
                  <div className="space-y-1">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-dark-text-secondary capitalize">{type}:</span>
                        <span className="text-dark-text-primary">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ChartBarIcon className="h-12 w-12 text-dark-text-muted mx-auto mb-4" />
                <p className="text-dark-text-secondary">Click "Refresh Stats" to load statistics</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <NotificationPreferences />
          </motion.div>
        )}
      </div>
    </div>
  );
}