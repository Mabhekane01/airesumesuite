import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
  ClockIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { notificationService, NotificationPreferences as INotificationPreferences } from '../../services/notificationService';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  onClose?: () => void;
}

const categoryLabels = {
  authentication: 'Account & Security',
  payment: 'Billing & Subscriptions',
  resume: 'Resume Builder',
  application: 'Job Applications',
  interview: 'Interviews',
  career_coach: 'Career Coach',
  system: 'System Updates'
};

const channelIcons = {
  inApp: BellIcon,
  email: EnvelopeIcon,
  browser: ComputerDesktopIcon,
  mobile: DevicePhoneMobileIcon
};

const channelLabels = {
  inApp: 'In-App',
  email: 'Email',
  browser: 'Browser Push',
  mobile: 'Mobile Push'
};

const priorityColors = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400'
};

export default function NotificationPreferences({ onClose }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<INotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<INotificationPreferences>) => {
    if (!preferences) return;

    try {
      setSaving(true);
      const updatedPrefs = await notificationService.updatePreferences(updates);
      setPreferences(updatedPrefs);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateCategoryPreferences = async (
    category: string,
    settings: { enabled?: boolean; channels?: string[]; priority?: string }
  ) => {
    try {
      setSaving(true);
      const updatedPrefs = await notificationService.updateCategoryPreferences(category, settings);
      setPreferences(updatedPrefs);
      toast.success(`${categoryLabels[category as keyof typeof categoryLabels]} preferences updated`);
    } catch (error) {
      console.error('Failed to update category preferences:', error);
      toast.error('Failed to update category preferences');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTestingNotification(true);
      await notificationService.sendTestNotification({
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification to verify your settings are working correctly.',
        priority: 'medium'
      });
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setTestingNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="spinner-dark"></div>
        <span className="ml-3 text-text-secondary">Loading preferences...</span>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center p-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-text-secondary">Failed to load notification preferences</p>
        <button
          onClick={loadPreferences}
          className="mt-4 btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Notification Preferences
          </h2>
          <p className="text-text-secondary">
            Customize when and how you receive notifications
          </p>
        </div>
        <button
          onClick={sendTestNotification}
          disabled={testingNotification}
          className="btn-secondary flex items-center space-x-2"
        >
          {testingNotification ? (
            <div className="spinner-dark w-4 h-4" />
          ) : (
            <BellIcon className="w-4 h-4" />
          )}
          <span>Send Test</span>
        </button>
      </div>

      {/* Global Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <Cog6ToothIcon className="w-5 h-5 mr-2" />
          Global Settings
        </h3>

        <div className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text-primary">Enable Notifications</h4>
              <p className="text-sm text-text-secondary">
                Master switch for all notifications
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                className="sr-only peer"
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
            </label>
          </div>

          {/* Channel Preferences */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Notification Channels</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(preferences.channels).map(([channel, enabled]) => {
                const Icon = channelIcons[channel as keyof typeof channelIcons];
                const isComingSoon = channel === 'browser' || channel === 'mobile';
                
                return (
                  <label
                    key={channel}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      enabled && !isComingSoon
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-surface-200 bg-surface-50/30'
                    } ${isComingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => 
                        !isComingSoon && updatePreferences({
                          channels: { ...preferences.channels, [channel]: e.target.checked }
                        })
                      }
                      disabled={saving || isComingSoon}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5 text-accent-primary" />
                    <div>
                      <div className="font-medium text-text-primary text-sm">
                        {channelLabels[channel as keyof typeof channelLabels]}
                      </div>
                      {isComingSoon && (
                        <div className="text-xs text-dark-text-muted">Coming Soon</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-text-primary flex items-center">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  Quiet Hours
                </h4>
                <p className="text-sm text-text-secondary">
                  Limit notifications during specific hours
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHours.enabled}
                  onChange={(e) => updatePreferences({
                    quietHours: { ...preferences.quietHours, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
              </label>
            </div>
            
            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHours.startTime}
                    onChange={(e) => updatePreferences({
                      quietHours: { ...preferences.quietHours, startTime: e.target.value }
                    })}
                    className="input-field-dark"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHours.endTime}
                    onChange={(e) => updatePreferences({
                      quietHours: { ...preferences.quietHours, endTime: e.target.value }
                    })}
                    className="input-field-dark"
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Category Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-dark"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Notification Categories
        </h3>

        <div className="space-y-6">
          {Object.entries(preferences.categories).map(([category, settings]) => (
            <div key={category} className="border-b border-surface-200 pb-6 last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-text-primary">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {category === 'authentication' && 'Login alerts, security notifications'}
                    {category === 'payment' && 'Billing, subscriptions, payment confirmations'}
                    {category === 'resume' && 'Resume creation, AI analysis, optimizations'}
                    {category === 'application' && 'Job applications, status updates, match scores'}
                    {category === 'interview' && 'Interview scheduling, reminders, feedback'}
                    {category === 'career_coach' && 'AI career advice and coaching sessions'}
                    {category === 'system' && 'System updates, maintenance, feature announcements'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => updateCategoryPreferences(category, { enabled: e.target.checked })}
                    className="sr-only peer"
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                </label>
              </div>

              {settings.enabled && (
                <div className="ml-6 space-y-3">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Priority Level
                    </label>
                    <select
                      value={settings.priority}
                      onChange={(e) => updateCategoryPreferences(category, { priority: e.target.value })}
                      className="input-field-dark"
                      disabled={saving}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Channels */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Delivery Channels
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(preferences.channels).map((channel) => {
                        const isEnabled = settings.channels.includes(channel);
                        const isChannelAvailable = preferences.channels[channel as keyof typeof preferences.channels];
                        const isComingSoon = channel === 'browser' || channel === 'mobile';
                        
                        return (
                          <button
                            key={channel}
                            onClick={() => {
                              if (!isChannelAvailable || isComingSoon) return;
                              
                              const newChannels = isEnabled
                                ? settings.channels.filter(c => c !== channel)
                                : [...settings.channels, channel];
                              updateCategoryPreferences(category, { channels: newChannels });
                            }}
                            disabled={!isChannelAvailable || isComingSoon || saving}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              isEnabled && isChannelAvailable && !isComingSoon
                                ? 'bg-accent-primary text-white'
                                : 'bg-surface-50 text-text-secondary border border-surface-200'
                            } ${(!isChannelAvailable || isComingSoon) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent-primary/80'}`}
                          >
                            {channelLabels[channel as keyof typeof channelLabels]}
                            {isComingSoon && ' (Soon)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Save Actions */}
      <div className="flex justify-end space-x-4">
        {onClose && (
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Close
          </button>
        )}
        <button
          onClick={loadPreferences}
          className="btn-secondary"
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="spinner-dark w-4 h-4 mr-2" />
              Saving...
            </>
          ) : (
            'Reset'
          )}
        </button>
      </div>

      {/* Status */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-accent-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="spinner-white w-4 h-4" />
          <span>Saving preferences...</span>
        </div>
      )}
    </div>
  );
}
