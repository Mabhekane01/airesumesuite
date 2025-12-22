import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Eye, 
  Zap, 
  BarChart3, 
  Download, 
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Save,
  X
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';

interface SettingsData {
  privacy: any;
  notifications: any;
  jobSearch: any;
  ai: any;
  applicationTracking: any;
  interface: any;
  dashboard: any;
  security: any;
  integrations: any;
  betaFeatures: any;
  dataConsent: any;
  backup: any;
  customSettings: any[];
}

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  hasChanges?: boolean;
  isLoading?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  icon,
  children,
  isExpanded,
  onToggle,
  hasChanges = false,
  isLoading = false
}) => (
  <Card className="mb-4 transition-all duration-200 hover:shadow-md">
    <div 
      className="flex items-center justify-between p-6 cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {hasChanges && (
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            )}
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
    {isExpanded && (
      <div className="px-6 pb-6 border-t border-gray-100">
        <div className="pt-6">
          {children}
        </div>
      </div>
    )}
  </Card>
);

interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  premium?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
  premium = false
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {premium && (
          <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
            Premium
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      )}
    </div>
    <button
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled 
          ? 'bg-blue-600' 
          : disabled 
            ? 'bg-gray-200 cursor-not-allowed' 
            : 'bg-gray-200'
      }`}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export const EnterpriseSettingsDashboard: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [originalSettings, setOriginalSettings] = useState<SettingsData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['privacy']));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load settings');
      
      const data = await response.json();
      setSettings(data.data.settings);
      setOriginalSettings(data.data.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Show error notification
    } finally {
      setLoading(false);
    }
  };

  // Check if settings have changes
  const hasChanges = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasChanges) return;

    const autoSaveTimer = setTimeout(() => {
      handleSave(true); // Silent save
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [settings, hasChanges]);

  const handleSave = async (silent: boolean = false) => {
    if (!settings || !hasChanges) return;

    try {
      setSaving(true);
      if (!silent) setSaveStatus('idle');

      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      setOriginalSettings(data.data.settings);
      
      if (!silent) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (!silent) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
    }
  };

  const updateSettings = useCallback((section: string, key: string, value: any) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value
        }
      };
    });
  }, []);

  const updateNestedSettings = useCallback((section: string, subsection: string, key: string, value: any) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [key]: value
          }
        }
      };
    });
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleExportSettings = async () => {
    try {
      const response = await fetch(`/api/settings/export?format=${exportFormat}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleImportSettings = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('settings', file);

      const response = await fetch('/api/settings/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Import failed');

      await loadSettings(); // Reload settings
      setShowImportModal(false);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Settings</h3>
        <p className="text-gray-600 mb-4">We couldn't load your settings. Please try again.</p>
        <Button onClick={loadSettings}>Retry</Button>
      </div>
    );
  }

  const filteredSections = [
    {
      key: 'privacy',
      title: 'Privacy & Visibility',
      description: 'Control who can see your profile and personal information',
      icon: <Eye className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Visibility
            </label>
            <Select
              value={settings.privacy?.profileVisibility || 'public'}
              onChange={(value) => updateSettings('privacy', 'profileVisibility', value)}
              options={[
                { value: 'public', label: 'Public - Visible to everyone' },
                { value: 'recruiters_only', label: 'Recruiters Only - Visible to verified recruiters' },
                { value: 'network_only', label: 'Network Only - Visible to your connections' },
                { value: 'private', label: 'Private - Only visible to you' }
              ]}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Toggle
              label="Show Email Address"
              description="Display your email in your profile"
              enabled={settings.privacy?.showEmail || false}
              onChange={(value) => updateSettings('privacy', 'showEmail', value)}
            />
            <Toggle
              label="Show Phone Number"
              description="Display your phone number in your profile"
              enabled={settings.privacy?.showPhone || false}
              onChange={(value) => updateSettings('privacy', 'showPhone', value)}
            />
            <Toggle
              label="Show LinkedIn Profile"
              description="Display your LinkedIn URL"
              enabled={settings.privacy?.showLinkedIn || false}
              onChange={(value) => updateSettings('privacy', 'showLinkedIn', value)}
            />
            <Toggle
              label="Show Location"
              description="Display your current location"
              enabled={settings.privacy?.showLocation || false}
              onChange={(value) => updateSettings('privacy', 'showLocation', value)}
            />
            <Toggle
              label="Show Salary Expectations"
              description="Display your salary expectations"
              enabled={settings.privacy?.showSalaryExpectations || false}
              onChange={(value) => updateSettings('privacy', 'showSalaryExpectations', value)}
            />
            <Toggle
              label="Searchable Profile"
              description="Allow your profile to appear in search results"
              enabled={settings.privacy?.searchable || false}
              onChange={(value) => updateSettings('privacy', 'searchable', value)}
            />
          </div>
        </div>
      )
    },
    {
      key: 'notifications',
      title: 'Notifications',
      description: 'Manage how and when you receive notifications',
      icon: <Bell className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Email Notifications</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Toggle
                label="Job Matches"
                description="New jobs matching your preferences"
                enabled={settings.notifications?.email?.jobMatches || false}
                onChange={(value) => updateNestedSettings('notifications', 'email', 'jobMatches', value)}
              />
              <Toggle
                label="Application Updates"
                description="Updates on your job applications"
                enabled={settings.notifications?.email?.applicationUpdates || false}
                onChange={(value) => updateNestedSettings('notifications', 'email', 'applicationUpdates', value)}
              />
              <Toggle
                label="Interview Reminders"
                description="Reminders for upcoming interviews"
                enabled={settings.notifications?.email?.interviewReminders || false}
                onChange={(value) => updateNestedSettings('notifications', 'email', 'interviewReminders', value)}
              />
              <Toggle
                label="Career Tips"
                description="Personalized career advice and tips"
                enabled={settings.notifications?.email?.careerTips || false}
                onChange={(value) => updateNestedSettings('notifications', 'email', 'careerTips', value)}
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Frequency
              </label>
              <Select
                value={settings.notifications?.email?.frequency || 'immediate'}
                onChange={(value) => updateNestedSettings('notifications', 'email', 'frequency', value)}
                options={[
                  { value: 'immediate', label: 'Immediate' },
                  { value: 'daily', label: 'Daily Digest' },
                  { value: 'weekly', label: 'Weekly Summary' },
                  { value: 'never', label: 'Never' }
                ]}
              />
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Push Notifications</h4>
            <Toggle
              label="Enable Push Notifications"
              description="Receive push notifications on your devices"
              enabled={settings.notifications?.push?.enabled || false}
              onChange={(value) => updateNestedSettings('notifications', 'push', 'enabled', value)}
            />
            
            {settings.notifications?.push?.enabled && (
              <div className="mt-4 pl-6 border-l-2 border-blue-200">
                <div className="space-y-3">
                  <Toggle
                    label="Job Matches"
                    enabled={settings.notifications?.push?.jobMatches || false}
                    onChange={(value) => updateNestedSettings('notifications', 'push', 'jobMatches', value)}
                  />
                  <Toggle
                    label="Messages"
                    enabled={settings.notifications?.push?.messages || false}
                    onChange={(value) => updateNestedSettings('notifications', 'push', 'messages', value)}
                  />
                  <Toggle
                    label="Deadline Alerts"
                    enabled={settings.notifications?.push?.deadlineAlerts || false}
                    onChange={(value) => updateNestedSettings('notifications', 'push', 'deadlineAlerts', value)}
                  />
                </div>
                
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Quiet Hours</h5>
                  <Toggle
                    label="Enable Quiet Hours"
                    enabled={settings.notifications?.push?.quietHours?.enabled || false}
                    onChange={(value) => updateNestedSettings('notifications', 'push', 'quietHours', { 
                      ...settings.notifications?.push?.quietHours, 
                      enabled: value 
                    })}
                  />
                  
                  {settings.notifications?.push?.quietHours?.enabled && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                        <Input
                          type="time"
                          value={settings.notifications?.push?.quietHours?.startTime || '22:00'}
                          onChange={(e) => updateNestedSettings('notifications', 'push', 'quietHours', {
                            ...settings.notifications?.push?.quietHours,
                            startTime: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                        <Input
                          type="time"
                          value={settings.notifications?.push?.quietHours?.endTime || '08:00'}
                          onChange={(e) => updateNestedSettings('notifications', 'push', 'quietHours', {
                            ...settings.notifications?.push?.quietHours,
                            endTime: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'ai',
      title: 'AI & Automation',
      description: 'Configure AI-powered features and automation',
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Resume Optimization</h4>
            <Toggle
              label="AI Resume Optimization"
              description="Let AI optimize your resume for better job matches"
              enabled={settings.ai?.resumeOptimization?.enabled || false}
              onChange={(value) => updateNestedSettings('ai', 'resumeOptimization', 'enabled', value)}
            />
            
            {settings.ai?.resumeOptimization?.enabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimization Aggressiveness
                  </label>
                  <Select
                    value={settings.ai?.resumeOptimization?.aggressiveness || 'moderate'}
                    onChange={(value) => updateNestedSettings('ai', 'resumeOptimization', 'aggressiveness', value)}
                    options={[
                      { value: 'conservative', label: 'Conservative - Minimal changes' },
                      { value: 'moderate', label: 'Moderate - Balanced optimization' },
                      { value: 'aggressive', label: 'Aggressive - Maximum optimization' }
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone Preference
                  </label>
                  <Select
                    value={settings.ai?.resumeOptimization?.tonePreference || 'professional'}
                    onChange={(value) => updateNestedSettings('ai', 'resumeOptimization', 'tonePreference', value)}
                    options={[
                      { value: 'professional', label: 'Professional' },
                      { value: 'casual', label: 'Casual' },
                      { value: 'enthusiastic', label: 'Enthusiastic' },
                      { value: 'authoritative', label: 'Authoritative' }
                    ]}
                  />
                </div>
                
                <Toggle
                  label="Auto-Update Resume"
                  description="Automatically apply AI optimizations"
                  enabled={settings.ai?.resumeOptimization?.autoUpdate || false}
                  onChange={(value) => updateNestedSettings('ai', 'resumeOptimization', 'autoUpdate', value)}
                  premium
                />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Career Coach</h4>
            <Toggle
              label="AI Career Coach"
              description="Get personalized career advice and guidance"
              enabled={settings.ai?.careerCoach?.enabled || false}
              onChange={(value) => updateNestedSettings('ai', 'careerCoach', 'enabled', value)}
            />
            
            {settings.ai?.careerCoach?.enabled && (
              <div className="mt-4 space-y-4">
                <Toggle
                  label="Proactive Advice"
                  description="Receive unsolicited career tips and recommendations"
                  enabled={settings.ai?.careerCoach?.proactiveAdvice || false}
                  onChange={(value) => updateNestedSettings('ai', 'careerCoach', 'proactiveAdvice', value)}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Communication Style
                  </label>
                  <Select
                    value={settings.ai?.careerCoach?.communicationStyle || 'supportive'}
                    onChange={(value) => updateNestedSettings('ai', 'careerCoach', 'communicationStyle', value)}
                    options={[
                      { value: 'direct', label: 'Direct - Straight to the point' },
                      { value: 'supportive', label: 'Supportive - Encouraging and helpful' },
                      { value: 'analytical', label: 'Analytical - Data-driven insights' },
                      { value: 'encouraging', label: 'Encouraging - Motivational approach' }
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Job Search Automation</h4>
            <Toggle
              label="Auto-Apply to Jobs"
              description="Automatically apply to jobs matching your criteria"
              enabled={settings.jobSearch?.autoApply?.enabled || false}
              onChange={(value) => updateNestedSettings('jobSearch', 'autoApply', 'enabled', value)}
              premium
            />
            
            {settings.jobSearch?.autoApply?.enabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Match Score Threshold (%)
                  </label>
                  <Input
                    type="number"
                    min="50"
                    max="100"
                    value={settings.jobSearch?.autoApply?.criteria?.matchScoreThreshold || 80}
                    onChange={(e) => updateNestedSettings('jobSearch', 'autoApply', 'criteria', {
                      ...settings.jobSearch?.autoApply?.criteria,
                      matchScoreThreshold: parseInt(e.target.value)
                    })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Applications Per Day
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.jobSearch?.autoApply?.criteria?.maxApplicationsPerDay || 5}
                    onChange={(e) => updateNestedSettings('jobSearch', 'autoApply', 'criteria', {
                      ...settings.jobSearch?.autoApply?.criteria,
                      maxApplicationsPerDay: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'security',
      title: 'Security & Privacy',
      description: 'Manage your account security and data privacy',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
            <Toggle
              label="Enable Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              enabled={settings.security?.twoFactorAuth?.enabled || false}
              onChange={(value) => updateNestedSettings('security', 'twoFactorAuth', 'enabled', value)}
            />
            
            {settings.security?.twoFactorAuth?.enabled && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Method
                </label>
                <Select
                  value={settings.security?.twoFactorAuth?.method || 'app'}
                  onChange={(value) => updateNestedSettings('security', 'twoFactorAuth', 'method', value)}
                  options={[
                    { value: 'app', label: 'Authenticator App' },
                    { value: 'sms', label: 'SMS' },
                    { value: 'email', label: 'Email' }
                  ]}
                />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Session Management</h4>
            <div className="space-y-3">
              <Toggle
                label="Auto-logout on Inactivity"
                description="Automatically sign out after a period of inactivity"
                enabled={settings.security?.sessionManagement?.logoutInactive || false}
                onChange={(value) => updateNestedSettings('security', 'sessionManagement', 'logoutInactive', value)}
              />
              
              {settings.security?.sessionManagement?.logoutInactive && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inactivity Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    min="15"
                    max="480"
                    value={settings.security?.sessionManagement?.inactivityTimeout || 480}
                    onChange={(e) => updateNestedSettings('security', 'sessionManagement', 'inactivityTimeout', parseInt(e.target.value))}
                  />
                </div>
              )}
              
              <Toggle
                label="Remember Device"
                description="Stay signed in on trusted devices"
                enabled={settings.security?.sessionManagement?.rememberDevice || false}
                onChange={(value) => updateNestedSettings('security', 'sessionManagement', 'rememberDevice', value)}
              />
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Login Alerts</h4>
            <div className="space-y-3">
              <Toggle
                label="New Device Alert"
                description="Get notified when your account is accessed from a new device"
                enabled={settings.security?.loginAlerts?.newDeviceAlert || false}
                onChange={(value) => updateNestedSettings('security', 'loginAlerts', 'newDeviceAlert', value)}
              />
              <Toggle
                label="Unusual Location Alert"
                description="Get notified when your account is accessed from an unusual location"
                enabled={settings.security?.loginAlerts?.unusualLocationAlert || false}
                onChange={(value) => updateNestedSettings('security', 'loginAlerts', 'unusualLocationAlert', value)}
              />
              <Toggle
                label="Failed Login Alert"
                description="Get notified of failed login attempts"
                enabled={settings.security?.loginAlerts?.failedLoginAlert || false}
                onChange={(value) => updateNestedSettings('security', 'loginAlerts', 'failedLoginAlert', value)}
              />
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Data Export</h4>
            <div className="space-y-3">
              <Toggle
                label="Allow Data Export"
                description="Enable the ability to export your data"
                enabled={settings.security?.dataDownload?.allowExport || false}
                onChange={(value) => updateNestedSettings('security', 'dataDownload', 'allowExport', value)}
              />
              <Toggle
                label="Encrypt Exports"
                description="Encrypt exported data files"
                enabled={settings.security?.dataDownload?.encryptExports || false}
                onChange={(value) => updateNestedSettings('security', 'dataDownload', 'encryptExports', value)}
              />
            </div>
          </div>
        </div>
      )
    }
  ].filter(section => 
    !searchQuery || 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences and privacy settings</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <div className="flex items-center text-orange-600 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2" />
                Unsaved changes
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowExportModal(true)}
              disabled={saving}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              disabled={saving}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                
                <Button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className={`${
                    saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : saveStatus === 'success' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : saveStatus === 'error' ? (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <Input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Settings Sections */}
      <div>
        {filteredSections.map((section) => (
          <SettingsSection
            key={section.key}
            title={section.title}
            description={section.description}
            icon={section.icon}
            isExpanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
            hasChanges={hasChanges}
            isLoading={saving}
          >
            {section.content}
          </SettingsSection>
        ))}
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Settings"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Export your settings to back them up or transfer to another account.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <Select
              value={exportFormat}
              onChange={setExportFormat}
              options={[
                { value: 'json', label: 'JSON - Full data with all details' },
                { value: 'csv', label: 'CSV - Simplified data for spreadsheets' }
              ]}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExportSettings}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Settings"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Import settings from a previously exported file. This will overwrite your current settings.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Drop your settings file here or click to browse
            </p>
            <input
              type="file"
              accept=".json,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportSettings(file);
                }
              }}
              className="mt-2"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
