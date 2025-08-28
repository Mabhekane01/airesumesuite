import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";
import SearchModal from "../search/SearchModal";
import DashboardHome from "./DashboardHome";
import ResumeBuilder from "../../pages/resume-builder/ResumeBuilder";
import ComprehensiveResumeBuilder from "../../pages/resume-builder/ComprehensiveResumeBuilder";
import TemplateSelection from "../../pages/resume-builder/TemplateSelection";
import ResumePreviewPage from "../../pages/resume-builder/ResumePreviewPage";
import ApplicationTracker from "../applications/ApplicationTracker";
import CreateJobApplication from "../../pages/job-tracker/CreateJobApplication";
import EditJobApplication from "../../pages/job-tracker/EditJobApplication";
import JobApplicationDetail from "../../pages/job-tracker/JobApplicationDetail";
import ApplicationAnalytics from "../../pages/job-tracker/ApplicationAnalytics";
import CareerCoachPage from "../../pages/career-coach/CareerCoachPage";
import InterviewScheduler from "../../pages/job-tracker/InterviewScheduler";
import ApiDebugInfo from "../debug/ApiDebugInfo";
import NotificationTestPage from "../../pages/NotificationTestPage";
// AccountManager import removed - now using separate account page
import EnterpriseUpgrade from "../../pages/payment/EnterpriseUpgrade";
import PaymentSuccess from "../../pages/payment/PaymentSuccess";
import DocumentManager from "../../pages/DocumentManager";
import CoverLetterDashboard from "../../pages/cover-letter/CoverLetterDashboard";
import CoverLetterGenerator from "../../pages/cover-letter/CoverLetterGenerator";
import ConversationalCoverLetterPage from "../../pages/cover-letter/ConversationalCoverLetterPage";
import SimpleConversationalBuilder from "../../components/cover-letter/SimpleConversationalBuilder";
import TestCoverLetterPage from "../../pages/cover-letter/TestCoverLetterPage";
import IntelligentCoverLetterBuilder from "../../components/cover-letter/IntelligentCoverLetterBuilder";
import ErrorBoundary from "../ErrorBoundary";
import {
  HomeIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  PowerIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../../stores/authStore";
import { toast } from "sonner";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  {
    name: "Job Posting",
    href: "/dashboard/job-posting",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    name: "Resume Builder",
    href: "/dashboard/resume/templates",
    icon: DocumentTextIcon,
  },
  {
    name: "Cover Letters",
    href: "/dashboard/cover-letter",
    icon: DocumentTextIcon,
  },
  {
    name: "Job Applications",
    href: "/dashboard/applications",
    icon: BriefcaseIcon,
  },
  { name: "Career Coach", href: "/dashboard/coach", icon: SparklesIcon },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartBarIcon },
  {
    name: "Documents",
    href: "/dashboard/documents",
    icon: ClipboardDocumentListIcon,
  },
  { name: "Calendar", href: "/dashboard/calendar", icon: CalendarIcon },
];

const quickActions = [
  {
    name: "New Application",
    href: "/dashboard/applications/new",
    icon: PlusIcon,
    color: "bg-emerald-600",
  },
  {
    name: "Build AI Resume",
    href: "/dashboard/resume/templates",
    icon: DocumentTextIcon,
    color: "bg-teal-600",
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuthStore();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
      if (!target.closest(".notifications-container")) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="spinner-dark"></div>
          <span className="text-dark-text-primary font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-dark flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-800/95 backdrop-blur-lg shadow-dark-xl border-r border-dark-border transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:translate-x-0 lg:flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-dark-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-glow-sm animate-glow-pulse">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text-dark">
                AI Job Suite
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-dark-text-secondary hover:text-accent-primary transition-all duration-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto min-h-0">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300
                    ${
                      active
                        ? "bg-accent-primary/20 text-accent-primary border-r-2 border-accent-primary shadow-glow-sm"
                        : "text-dark-text-secondary hover:bg-accent-primary/10 hover:text-accent-primary"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 transition-all duration-300
                      ${active ? "text-accent-primary" : "text-dark-text-muted group-hover:text-accent-primary"}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-dark-border">
            <h3 className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-1.5 sm:space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 glass-dark border border-accent-primary/30 hover:border-accent-primary/60 hover:shadow-glow-sm backdrop-blur-lg"
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="mr-3 p-1.5 rounded-md bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 group-hover:from-accent-primary/30 group-hover:to-accent-secondary/30 transition-all duration-300">
                    <action.icon className="h-3.5 w-3.5 text-accent-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <span className="text-dark-text-secondary group-hover:text-accent-primary transition-colors duration-300">
                    {action.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Top header */}
        <header className="bg-gray-800/95 backdrop-blur-lg shadow-dark-lg border-b border-dark-border overflow-visible relative z-50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 overflow-visible relative">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-dark-text-muted hover:text-dark-text-primary"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              {/* Search bar */}
              <div className="hidden md:block flex-1 max-w-md lg:max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-dark-text-muted" />
                  </div>
                  <button
                    onClick={() => setSearchModalOpen(true)}
                    className="input-field-dark w-full pl-9 sm:pl-10 text-sm sm:text-base text-left text-dark-text-muted hover:text-dark-text-primary transition-all duration-200 cursor-pointer group hover:border-dark-border/80 active:scale-[0.995]"
                  >
                    <span className="group-hover:text-dark-text-primary transition-colors">
                      Search resumes, applications, cover letters...
                    </span>
                    <span className="float-right text-xs bg-gray-700 group-hover:bg-dark-quaternary px-2 py-1 rounded transition-colors">
                      ⌘K
                    </span>
                  </button>
                </div>
              </div>

              {/* Mobile search button */}
              <div className="md:hidden flex-1 max-w-[200px] min-w-0">
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="w-full flex items-center justify-start px-2 sm:px-3 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-dark-border hover:border-dark-border/80 rounded-lg transition-all duration-200 text-left group active:scale-[0.98]"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 text-dark-text-muted group-hover:text-dark-text-primary mr-2 flex-shrink-0 transition-colors" />
                  <span className="text-sm text-dark-text-muted group-hover:text-dark-text-primary truncate transition-colors hidden xs:inline">
                    Search...
                  </span>
                  <span className="text-sm text-dark-text-muted group-hover:text-dark-text-primary truncate transition-colors xs:hidden">
                    Search
                  </span>
                  <div className="ml-auto text-xs text-dark-text-muted/70 bg-dark-quaternary group-hover:bg-dark-border px-1.5 py-0.5 rounded text-center min-w-[24px] transition-colors hidden sm:block">
                    ⌘K
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
              {/* Notifications */}
              <div className="relative notifications-container z-50">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 sm:p-2 text-dark-text-muted hover:text-dark-text-primary relative focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-dark-secondary rounded-lg transition-all duration-300 hover:bg-gray-700/50"
                >
                  <BellIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 bg-accent-primary rounded-full flex items-center justify-center ring-2 ring-dark-secondary">
                      <span className="text-xs font-medium text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="absolute right-0 mt-2 w-72 sm:w-80 lg:w-96 card-dark rounded-lg shadow-dark-lg z-50 animate-slide-up-soft max-w-[calc(100vw-2rem)]"
                    style={{ zIndex: 99999 }}
                  >
                    <div className="p-4 border-b border-dark-border">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-dark-text-primary">
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
                            onClick={markAllAsRead}
                            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                          >
                            Mark all read
                          </button>
                          <span className="text-dark-text-secondary">•</span>
                          <button
                            onClick={clearAll}
                            className="text-xs text-dark-text-secondary hover:text-accent-danger transition-colors"
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-4 text-center">
                          <div className="spinner-dark"></div>
                          <p className="text-sm text-dark-text-muted mt-2">
                            Loading notifications...
                          </p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-dark-text-muted">
                            No new notifications
                          </p>
                        </div>
                      ) : (
                        <div className="py-2">
                          {notifications.map((notification) => (
                            <div
                              key={notification._id}
                              className={`px-4 py-3 hover:bg-gray-700/60 transition-all duration-200 cursor-pointer border-l-2 ${
                                notification.read
                                  ? "border-transparent"
                                  : "border-accent-primary bg-accent-primary/5"
                              }`}
                              onClick={() =>
                                !notification.read &&
                                markAsRead(notification._id)
                              }
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  {notification.type === "success" && (
                                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                  )}
                                  {notification.type === "warning" && (
                                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                                  )}
                                  {notification.type === "deadline" && (
                                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                                  )}
                                  {notification.type === "info" && (
                                    <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p
                                      className={`text-sm font-medium ${
                                        notification.read
                                          ? "text-dark-text-secondary"
                                          : "text-dark-text-primary"
                                      }`}
                                    >
                                      {notification.title}
                                    </p>
                                    <span className="text-xs text-dark-text-secondary/70">
                                      {Math.floor(
                                        (new Date().getTime() -
                                          new Date(
                                            notification.createdAt
                                          ).getTime()) /
                                          60000
                                      )}
                                      m ago
                                    </span>
                                  </div>
                                  <p className="text-xs text-dark-text-secondary mt-1">
                                    {notification.message}
                                  </p>
                                  {notification.action && (
                                    <button className="text-xs text-accent-primary hover:text-accent-primary/80 mt-2 font-medium">
                                      {notification.action.label} →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative user-menu-container z-50">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center hover:shadow-glow-sm transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-dark-secondary"
                >
                  <span className="text-white text-xs sm:text-sm font-medium">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 sm:w-56 card-dark rounded-lg shadow-dark-lg z-50 animate-slide-up-soft"
                    style={{ zIndex: 999999 }}
                  >
                    <div className="p-3 border-b border-dark-border">
                      <p className="text-sm font-medium text-dark-text-primary truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-dark-text-muted truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="p-2">
                      {/* Show current tier */}
                      <div className="px-3 py-2 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-dark-text-muted">
                            Current Plan
                          </span>
                          <div className="flex items-center space-x-1">
                            {user.tier === "enterprise" ? (
                              <>
                                <StarIcon className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs font-medium text-yellow-400">
                                  Pro
                                </span>
                              </>
                            ) : user.tier === "pro" ? (
                              <>
                                <StarIcon className="w-3 h-3 text-blue-400" />
                                <span className="text-xs font-medium text-blue-400">
                                  Pro
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                <span className="text-xs font-medium text-gray-400">
                                  Free
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {user.tier === "free" && (
                        <Link
                          to="/dashboard/upgrade"
                          className="flex items-center px-3 py-2 text-sm text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors mb-1"
                          onClick={() => {
                            setShowUserMenu(false);
                            setSidebarOpen(false);
                          }}
                        >
                          <StarIcon className="w-4 h-4 mr-2" />
                          Upgrade to Pro
                        </Link>
                      )}

                      <Link
                        to="/account"
                        className="flex items-center px-3 py-2 text-sm text-dark-text-secondary hover:bg-dark-quaternary/50 rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          setSidebarOpen(false);
                        }}
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-2" />
                        Account Settings
                      </Link>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm text-accent-danger hover:bg-accent-danger/10 rounded-lg transition-colors"
                      >
                        <PowerIcon className="w-4 h-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto min-h-0">
          <ErrorBoundary>
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="resume/templates" element={<TemplateSelection />} />
              <Route
                path="resume/comprehensive"
                element={<ComprehensiveResumeBuilder />}
              />
              <Route
                path="resume/preview/:id"
                element={<ResumePreviewPage />}
              />
              <Route path="applications" element={<ApplicationTracker />} />
              <Route
                path="applications/new"
                element={<CreateJobApplication />}
              />
              <Route
                path="applications/:applicationId/edit"
                element={<EditJobApplication />}
              />
              <Route
                path="applications/:applicationId"
                element={<JobApplicationDetail />}
              />
              <Route path="coach" element={<CareerCoachPage />} />
              <Route path="analytics" element={<ApplicationAnalytics />} />
              <Route path="documents" element={<DocumentManager />} />
              <Route path="calendar" element={<InterviewScheduler />} />
              <Route path="cover-letter" element={<CoverLetterGenerator />} />
              <Route
                path="cover-letter/ai"
                element={<CoverLetterGenerator />}
              />
              <Route
                path="cover-letter/builder"
                element={<CoverLetterGenerator />}
              />
              <Route
                path="job-posting"
                element={
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-dark-text-primary mb-4">
                      Job Posting
                    </h2>
                    <p className="text-dark-text-secondary">
                      Job posting features coming soon!
                    </p>
                  </div>
                }
              />
              {/* Account route removed - now handled by separate /account page */}
              <Route path="upgrade" element={<EnterpriseUpgrade />} />
              <Route path="upgrade/success" element={<PaymentSuccess />} />
              <Route path="debug" element={<ApiDebugInfo />} />
              <Route
                path="notifications/test"
                element={<NotificationTestPage />}
              />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
}
