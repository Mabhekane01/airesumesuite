import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  ArrowLeftIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useAuthStore } from "../stores/authStore";
import { api } from "../services/api";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  provider: "local" | "google";
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

export default function AccountPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadAccountData();
    loadSessions();
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/account");

      if (response.data?.success) {
        const userData = response.data.data.user;
        setUserData(userData);
      }
    } catch (error) {
      console.error("Load account error:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get("/account/sessions");

      if (response.data?.success) {
        setSessions(response.data.data.sessions);
      }
    } catch (error) {
      toast.error("Failed to load sessions");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="spinner-dark"></div>
          <span className="text-dark-text-primary font-medium">
            Loading account...
          </span>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-accent-danger mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
            Failed to Load Account
          </h3>
          <p className="text-dark-text-secondary mb-4">
            We couldn't load your account information.
          </p>
          <button onClick={loadAccountData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "personal", label: "Personal Info", icon: UserIcon },
    { key: "email", label: "Email & Security", icon: EnvelopeIcon },
    { key: "password", label: "Password", icon: KeyIcon },
    { key: "sessions", label: "Active Sessions", icon: ComputerDesktopIcon },
    { key: "danger", label: "Delete Account", icon: TrashIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <div className="bg-gray-800/95 backdrop-blur-lg shadow-dark-lg border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 text-dark-text-muted hover:text-accent-primary transition-colors rounded-lg hover:bg-gray-700/50"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-glow-sm">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text-dark">
                  Account Settings
                </span>
              </div>
            </div>

            {/* Current Plan Display */}
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 bg-gray-700/50 rounded-lg border border-dark-border">
                <div className="flex items-center space-x-2">
                  {userData.tier === "enterprise" ? (
                    <>
                      <StarIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-400">
                        Enterprise
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                      <span className="text-sm font-medium text-gray-400">
                        Free
                      </span>
                    </>
                  )}
                </div>
              </div>

              {userData.tier !== "enterprise" && (
                <button
                  onClick={() => navigate("/dashboard/upgrade")}
                  className="px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:shadow-glow-sm transition-all duration-300 flex items-center space-x-2"
                >
                  <StarIcon className="w-4 h-4" />
                  <span>Upgrade</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-dark p-6 mb-8"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-accent-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {userData.firstName[0]}
                {userData.lastName[0]}
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
                    {userData.isEmailVerified
                      ? "Email Verified"
                      : "Email Not Verified"}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-dark-text-secondary">
                    {userData.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <CalendarDaysIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-dark-text-secondary">
                    Member since{" "}
                    {new Date(userData.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 border border-dark-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${
                    activeTab === tab.key
                      ? "bg-accent-primary text-white shadow-glow-sm"
                      : "text-dark-text-secondary hover:text-dark-text-primary hover:bg-gray-700/50"
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="card-dark p-6"
        >
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h3>
            <p className="text-dark-text-secondary">
              {activeTab === "personal" &&
                "Personal information management coming soon..."}
              {activeTab === "email" &&
                "Email and security settings coming soon..."}
              {activeTab === "password" &&
                "Password change functionality coming soon..."}
              {activeTab === "sessions" && "Session management coming soon..."}
              {activeTab === "danger" && "Account deletion coming soon..."}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
