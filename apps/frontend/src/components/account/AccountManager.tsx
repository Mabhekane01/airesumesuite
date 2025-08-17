import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  provider: 'local' | 'google';
  twoFactorEnabled: boolean;
  tier: string;
  lastLoginAt: string;
  createdAt: string;
  activeSessions: number;
}

interface Session {
  id: string;
  loginTime: string;
  location: {
    city?: string;
    country?: string;
  };
  browser: string;
  isCurrent: boolean;
}

export default function AccountManager() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Form states
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: ''
  });
  
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [deleteForm, setDeleteForm] = useState({
    password: '',
    confirmText: ''
  });

  const [saving, setSaving] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account');
      
      if (response.data?.success) {
        const userData = response.data.data.user;
        setUserData(userData);
        setPersonalForm({
          firstName: userData.firstName,
          lastName: userData.lastName
        });
        setEmailForm({
          email: userData.email,
          password: ''
        });
      }
    } catch (error) {
      console.error('Load account error:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get('/account/sessions');
      
      if (response.data?.success) {
        setSessions(response.data.data.sessions);
      }
    } catch (error) {
      toast.error('Failed to load sessions');
    }
  };

  const updatePersonalInfo = async () => {
    try {
      setSaving(true);
      const response = await api.put('/account/personal-info', personalForm);
      
      if (response.data?.success) {
        toast.success('Personal information updated successfully');
        await loadAccountData();
      } else {
        toast.error(response.data?.message || 'Failed to update personal information');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update personal information');
    } finally {
      setSaving(false);
    }
  };

  const updateEmail = async () => {
    try {
      setSaving(true);
      const response = await api.put('/account/email', emailForm);
      
      if (response.data?.success) {
        toast.success('Email updated successfully. Please verify your new email address.');
        setEmailForm({ ...emailForm, password: '' });
        await loadAccountData();
      } else {
        toast.error(response.data?.message || 'Failed to update email');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put('/account/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      if (response.data?.success) {
        toast.success('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(response.data?.message || 'Failed to change password');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteForm.confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    try {
      setSaving(true);
      const response = await api.delete('/account', {
        data: deleteForm
      });
      
      if (response.data?.success) {
        toast.success('Account deleted successfully');
        await logout();
        navigate('/', { replace: true });
      } else {
        toast.error(response.data?.message || 'Failed to delete account');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const response = await api.delete(`/account/sessions/${sessionId}`);
      
      if (response.data?.success) {
        toast.success('Session terminated successfully');
        await loadSessions();
      } else {
        toast.error('Failed to terminate session');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to terminate session');
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner-dark"></div>
        <span className="ml-2 text-dark-text-secondary">Loading account...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 text-accent-danger mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-dark-text-primary mb-2">Failed to Load Account</h3>
        <p className="text-dark-text-secondary mb-4">We couldn't load your account information.</p>
        <button 
          onClick={loadAccountData}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'personal', label: 'Personal Info', icon: UserIcon },
    { key: 'email', label: 'Email & Security', icon: EnvelopeIcon },
    { key: 'password', label: 'Password', icon: KeyIcon },
    { key: 'sessions', label: 'Active Sessions', icon: ComputerDesktopIcon },
    { key: 'danger', label: 'Delete Account', icon: TrashIcon }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-text-primary">Account Manager</h1>
        <p className="text-dark-text-secondary mt-2">Manage your account settings and security preferences</p>
      </div>

      {/* Account Overview */}
      <div className="card-dark p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-accent-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {userData.firstName[0]}{userData.lastName[0]}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-dark-text-primary">
              {userData.firstName} {userData.lastName}
            </h2>
            <p className="text-dark-text-secondary">{userData.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-1">
                {userData.isEmailVerified ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
                )}
                <span className="text-xs text-dark-text-secondary">
                  {userData.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <ShieldCheckIcon className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-dark-text-secondary capitalize">
                  {userData.provider} Account
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarDaysIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-dark-text-secondary">
                  Member since {new Date(userData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'sessions') {
                loadSessions();
              }
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-accent-primary text-white'
                : 'text-dark-text-secondary hover:bg-dark-quaternary/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card-dark p-6">
        {/* Personal Info Tab */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text-primary mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={personalForm.firstName}
                    onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                    className="input-field-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-text-primary mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={personalForm.lastName}
                    onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                    className="input-field-dark w-full"
                  />
                </div>
              </div>
              <button
                onClick={updatePersonalInfo}
                disabled={saving}
                className="btn-primary mt-4"
              >
                {saving ? 'Updating...' : 'Update Information'}
              </button>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Email Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text-primary mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    className="input-field-dark w-full"
                  />
                </div>
                {userData.provider === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-dark-text-primary mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      className="input-field-dark w-full"
                      placeholder="Enter your current password"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={updateEmail}
                disabled={saving || emailForm.email === userData.email}
                className="btn-primary mt-4"
              >
                {saving ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="space-y-6">
            {userData.provider === 'local' ? (
              <div>
                <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text-primary mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="input-field-dark w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.current ? (
                          <EyeSlashIcon className="w-4 h-4 text-dark-text-muted" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-dark-text-muted" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-text-primary mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="input-field-dark w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.new ? (
                          <EyeSlashIcon className="w-4 h-4 text-dark-text-muted" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-dark-text-muted" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-text-primary mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="input-field-dark w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.confirm ? (
                          <EyeSlashIcon className="w-4 h-4 text-dark-text-muted" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-dark-text-muted" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={changePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="btn-primary mt-4"
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldCheckIcon className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text-primary mb-2">Social Login Account</h3>
                <p className="text-dark-text-secondary">
                  You're signed in with {userData.provider}. Password changes are managed through your {userData.provider} account.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Active Sessions</h3>
              <p className="text-sm text-dark-text-secondary mb-4">
                Manage your active login sessions across different devices and browsers.
              </p>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-dark-border">
                      <div className="flex items-center space-x-3">
                        <ComputerDesktopIcon className="w-5 h-5 text-dark-text-muted" />
                        <div>
                          <p className="text-sm font-medium text-dark-text-primary">
                            {session.browser}
                            {session.isCurrent && (
                              <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                Current
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-dark-text-secondary">
                            {session.location.city && session.location.country 
                              ? `${session.location.city}, ${session.location.country}` 
                              : 'Unknown location'
                            } • {new Date(session.loginTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => terminateSession(session.id)}
                          className="text-accent-danger hover:bg-accent-danger/10 p-2 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-text-secondary">No active sessions found.</p>
              )}
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div className="border border-red-500/30 rounded-lg p-6 bg-red-500/5">
              <div className="flex items-center space-x-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
              </div>
              <p className="text-sm text-dark-text-secondary mb-6">
                Once you delete your account, there is no going back. This action will permanently delete your account and all associated data.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text-primary mb-2">
                    Type "DELETE MY ACCOUNT" to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteForm.confirmText}
                    onChange={(e) => setDeleteForm({ ...deleteForm, confirmText: e.target.value })}
                    className="input-field-dark w-full"
                    placeholder="DELETE MY ACCOUNT"
                  />
                </div>
                {userData.provider === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-dark-text-primary mb-2">
                      Enter your password
                    </label>
                    <input
                      type="password"
                      value={deleteForm.password}
                      onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
                      className="input-field-dark w-full"
                      placeholder="Your current password"
                    />
                  </div>
                )}
              </div>
              
              <button
                onClick={deleteAccount}
                disabled={saving || deleteForm.confirmText !== 'DELETE MY ACCOUNT'}
                className="btn-danger mt-6"
              >
                {saving ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}