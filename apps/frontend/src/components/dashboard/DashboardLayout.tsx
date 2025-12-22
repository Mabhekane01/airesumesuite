import { useState, useEffect } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  Outlet // Import Outlet
} from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";
import SearchModal from "../search/SearchModal";
import DashboardHome from "./DashboardHome"; // Keep import for DashboardHome if it's meant to be the index element
import {
  HomeIcon,
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  PowerIcon,
  BellIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../../stores/authStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  {
    name: "Job Board",
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
    icon: PencilIcon,
  },
  {
    name: "Job Applications",
    href: "/dashboard/applications",
    icon: BriefcaseIcon,
  },
  { 
    name: "Resume Tracking", 
    href: "/dashboard/analytics/resume-tracking", 
    icon: EyeIcon 
  },
  { name: "Career Coach", href: "/dashboard/coach", icon: SparklesIcon },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartBarIcon },
  { name: "Calendar", href: "/dashboard/calendar", icon: CalendarIcon },
];

const quickActions = [
  {
    name: "New Application",
    href: "/dashboard/applications/new",
    icon: PlusIcon,
    color: "bg-brand-blue",
  },
  {
    name: "Build AI Resume",
    href: "/dashboard/resume/templates",
    icon: SparklesIcon,
    color: "bg-brand-success",
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
    if (!isLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    // Check if the current path starts with the href, for nested active states
    return location.pathname.startsWith(href);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
          <span className="text-brand-dark font-black uppercase tracking-widest text-xs">Initializing Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-[#FAFAFB] flex overflow-hidden font-sans">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            <div
              className="fixed inset-0 bg-brand-dark/20 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-[70] w-72 bg-white border-r border-surface-200 transform transition-transform duration-500 ease-[0.16, 1, 0.3, 1] lg:relative lg:transform-none lg:translate-x-0 lg:flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-8 border-b border-surface-100">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20 group-hover:scale-110 transition-transform duration-300">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-black text-brand-dark tracking-tighter">
                AI Job Suite
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-text-tertiary hover:text-brand-blue hover:bg-surface-50 rounded-xl transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            <div className="px-4 mb-4">
              <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Command Center</h3>
            </div>
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all duration-300
                    ${
                      active
                        ? "bg-brand-blue text-white shadow-xl shadow-brand-blue/20"
                        : "text-text-secondary hover:bg-surface-50 hover:text-brand-blue"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 transition-all duration-300
                      ${active ? "text-white" : "text-text-tertiary group-hover:text-brand-blue"}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-6 border-t border-surface-100 space-y-4">
            <h3 className="px-2 text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">
              Rapid Deployment
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className="group flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all duration-300 bg-surface-50 border border-surface-200 hover:border-brand-blue/30 hover:bg-white hover:shadow-lg shadow-sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`mr-3 p-2 rounded-xl ${action.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-brand-dark group-hover:text-brand-blue transition-colors">
                    {action.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* User Brief info in sidebar footer */}
          <div className="p-6 border-t border-surface-100 bg-surface-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-dark flex items-center justify-center font-black text-white text-sm shadow-sm">
                {(user.firstName?.[0] || 'U') + (user.lastName?.[0] || 'N')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-brand-dark truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest truncate">{user.tier} Account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 h-20 flex-shrink-0 relative z-[50]">
          <div className="flex items-center justify-between h-full px-6 sm:px-10">
            <div className="flex items-center gap-6 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-text-tertiary hover:text-brand-dark hover:bg-surface-50 rounded-xl transition-all"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              {/* Search bar */}
              <div className="hidden md:block flex-1 max-w-xl">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
                  </div>
                  <button
                    onClick={() => setSearchModalOpen(true)}
                    className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-left text-text-tertiary hover:border-brand-blue/30 hover:bg-white hover:shadow-sm transition-all flex items-center justify-between group"
                  >
                    <span>Search Intelligence...</span>
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black text-text-tertiary bg-white border border-surface-200 rounded-lg group-hover:text-brand-blue group-hover:border-brand-blue/30">
                      ⌘K
                    </kbd>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              {/* Notifications */}
              <div className="relative notifications-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 rounded-2xl border transition-all duration-300 relative group ${
                    showNotifications ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" : "bg-white border-surface-200 text-text-tertiary hover:border-brand-blue/30 hover:text-brand-blue shadow-sm"
                  }`}
                >
                  <BellIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 font-black text-[10px] ${
                      showNotifications ? "bg-white text-brand-blue border-brand-blue" : "bg-brand-blue text-white border-white"
                    }`}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-white border border-surface-200 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden z-[100]"
                    >
                      <div className="p-6 border-b border-surface-100 bg-surface-50/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-black text-brand-dark uppercase tracking-widest">
                            Alert Logs
                          </h3>
                          {unreadCount > 0 && (
                            <span className="px-2.5 py-1 text-[10px] font-black bg-brand-blue text-white rounded-lg uppercase tracking-wider">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="flex items-center gap-4">
                            <button
                              onClick={markAllAsRead}
                              className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline"
                            >
                              Clear Signal
                            </button>
                            <span className="text-surface-300">•</span>
                            <button
                              onClick={clearAll}
                              className="text-[10px] font-black text-text-tertiary uppercase tracking-widest hover:text-brand-dark"
                            >
                              Flush All
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notificationsLoading ? (
                          <div className="p-12 text-center">
                            <div className="w-8 h-8 border-3 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Scanning...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-12 text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-surface-50 border border-surface-200 flex items-center justify-center mx-auto text-text-tertiary opacity-50">
                              <BellIcon className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Zero Alerts Detected</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-surface-50">
                            {notifications.map((notification) => (
                              <div
                                key={notification._id}
                                className={`px-6 py-5 hover:bg-surface-50 transition-all duration-200 cursor-pointer relative group ${
                                  !notification.read ? "bg-brand-blue/[0.02]" : ""
                                }`}
                                onClick={() => !notification.read && markAsRead(notification._id)}
                              >
                                {!notification.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue" />}
                                <div className="flex items-start gap-4">
                                  <div className="mt-1">
                                    {notification.type === "success" && <div className="h-2 w-2 bg-brand-success rounded-full shadow-[0_0_8px_rgba(46,204,113,0.5)]"></div>}
                                    {notification.type === "warning" && <div className="h-2 w-2 bg-brand-orange rounded-full"></div>}
                                    {notification.type === "deadline" && <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>}
                                    {notification.type === "info" && <div className="h-2 w-2 bg-brand-blue rounded-full"></div>}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <p className={`text-sm font-black tracking-tight leading-none ${notification.read ? "text-text-secondary" : "text-brand-dark"}`}>
                                        {notification.title}
                                      </p>
                                      <span className="text-[9px] font-black text-text-tertiary uppercase tracking-tighter flex-shrink-0">
                                        {Math.floor((new Date().getTime() - new Date(notification.createdAt).getTime()) / 60000)}m
                                      </span>
                                    </div>
                                    <p className="text-xs font-bold text-text-secondary leading-relaxed opacity-80">
                                      {notification.message}
                                    </p>
                                    {notification.action && (
                                      <button className="text-[10px] font-black text-brand-blue uppercase tracking-widest pt-2 flex items-center gap-1 group/btn">
                                        {notification.action.label} <ChevronRightIcon className="w-2.5 h-2.5 group-hover/btn:translate-x-1 transition-transform" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User menu */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-3 p-1 pr-4 rounded-2xl border transition-all duration-300 ${
                    showUserMenu ? "bg-brand-dark border-brand-dark text-white shadow-xl" : "bg-white border-surface-200 hover:border-brand-blue/30 shadow-sm"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${
                    showUserMenu ? "bg-brand-blue text-white" : "bg-brand-dark text-white"
                  }`}>
                    {(user.firstName?.[0] || 'U') + (user.lastName?.[0] || 'N')}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className={`text-xs font-black tracking-tight leading-none ${showUserMenu ? "text-white" : "text-brand-dark"}`}>{user.firstName} {user.lastName}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${showUserMenu ? "text-white/60" : "text-text-tertiary"}`}>{user.tier}</p>
                  </div>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 top-full mt-4 w-64 bg-white border border-surface-200 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden z-[100]"
                    >
                      <div className="p-6 border-b border-surface-100 bg-surface-50/50">
                        <p className="text-sm font-black text-brand-dark tracking-tight">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-1">
                          {user.email}
                        </p>
                      </div>
                      <div className="p-3 space-y-1">
                        <div className="px-4 py-3 mb-2 bg-surface-50 rounded-2xl border border-surface-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">System Tier</span>
                          <div className="flex items-center gap-1.5">
                            {user.tier === "enterprise" ? (
                              <StarIcon className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-surface-300" />
                            )}
                            <span className={`text-[10px] font-black uppercase tracking-widest ${user.tier === 'enterprise' ? 'text-brand-orange' : 'text-text-tertiary'}`}>
                              {user.tier}
                            </span>
                          </div>
                        </div>

                        {user.tier !== "enterprise" && (
                          <Link
                            to="/dashboard/upgrade"
                            className="flex items-center px-4 py-3 text-sm font-bold text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all group"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <StarIcon className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                            Upgrade to Enterprise
                          </Link>
                        )}

                        <Link
                          to="/dashboard/account"
                          className="flex items-center px-4 py-3 text-sm font-bold text-text-secondary hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all group"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Cog6ToothIcon className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-500" />
                          Account Manager
                        </Link>

                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                        >
                          <PowerIcon className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto custom-scrollbar relative">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
          <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-[1600px] mx-auto">
            {/* The Outlet will render the matched child route component here */}
            <Outlet />
          </div>
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