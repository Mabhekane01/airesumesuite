import React, { useState, useEffect } from "react";
import { motion, useScroll } from "framer-motion";
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  BellIcon,
  SparklesIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useNotifications } from "../../contexts/NotificationContext";
import AuthModalSimple from "../auth/AuthModalSimple";
import NotificationDropdown from "./NotificationDropdown";

// Modern Floating Navigation Component
const FloatingNavigation = React.memo(() => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  const authNavigation = [
    {
      name: "DocTracker",
      href: "/document-manager",
      icon: FolderIcon,
      current: location.pathname === "/document-manager",
    },
    {
      name: "Resume",
      href: "/dashboard/resume/templates",
      icon: DocumentTextIcon,
      current: location.pathname.startsWith("/dashboard/resume"),
    },
    {
      name: "Cover Letters",
      href: "/dashboard/cover-letter",
      icon: PencilIcon,
      current: location.pathname.startsWith("/dashboard/cover-letter"),
    },
    {
      name: "Applications",
      href: "/dashboard/applications",
      icon: BriefcaseIcon,
      current: location.pathname.startsWith("/dashboard/applications"),
    },
  ];

  const publicNavigation = [
    {
      name: "DocTracker",
      href: "/document-manager",
      icon: FolderIcon,
      current: location.pathname === "/document-manager",
    },
    {
      name: "Templates",
      href: "/templates",
      icon: DocumentTextIcon,
      current: location.pathname === "/templates",
    },
    {
      name: "PDF Editor",
      href: "/pdf-editor",
      icon: PencilIcon,
      current: location.pathname === "/pdf-editor",
    },
  ];

  const navigation = isAuthenticated ? authNavigation : publicNavigation;

  return (
    <div className="flex items-center space-x-1 bg-gray-800/20 backdrop-blur-2xl border border-white/8 rounded-2xl p-1.5 shadow-lg">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div key={item.name} className="relative">
            <Link
              to={item.href}
              className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                item.current ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {item.current && (
                <motion.div
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative h-4 w-4 z-10" />
              <span className="relative z-10 hidden sm:block">{item.name}</span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
});

interface HeaderSimpleProps {
  onHeaderVisibilityChange: (visible: boolean) => void;
}

export default function HeaderSimple({
  onHeaderVisibilityChange,
}: HeaderSimpleProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [notificationDropdownOpen, setNotificationDropdownOpen] =
    useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const { scrollY } = useScroll();
  const location = useLocation();

  // Check if we're on the document manager main interface (authenticated users only)
  const isDocumentManagerMainInterface =
    location.pathname === "/document-manager" && isAuthenticated;

  // Handle scroll effects
  useEffect(() => {
    const unsubscribe = scrollY.onChange((latest) => {
      setScrolled(latest > 20);
    });
    return () => unsubscribe();
  }, [scrollY]);

  // Handle double-click to show/hide header (only on document manager main interface)
  useEffect(() => {
    if (!isDocumentManagerMainInterface) {
      setIsHeaderVisible(true);
      return;
    }

    // On document manager main interface, start with header hidden
    setIsHeaderVisible(false);

    const handleDoubleClick = () => {
      setIsHeaderVisible((prev) => !prev);
    };

    window.addEventListener("dblclick", handleDoubleClick);

    return () => {
      window.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [isDocumentManagerMainInterface]);

  // Notify parent component when header visibility changes
  useEffect(() => {
    onHeaderVisibilityChange(isHeaderVisible);
  }, [isHeaderVisible, onHeaderVisibilityChange]);

  const handleAuthClick = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Modern Floating Header */}
      {isHeaderVisible && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <motion.div
            className="max-w-6xl mx-auto"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Main Navigation Container */}
            <div
              className={`relative bg-gray-900/30 backdrop-blur-3xl border border-white/10 rounded-3xl transition-all duration-500 shadow-2xl ${
                scrolled ? "bg-gray-800/50 border-white/15 shadow-black/20" : ""
              }`}
            >
              <div className="flex items-center justify-between px-6 py-4">
                {/* Clean Typography Logo */}
                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link to="/" className="group">
                    <span className="text-2xl font-black bg-gradient-to-r from-white via-gray-200 to-emerald-200 bg-clip-text text-transparent tracking-tight group-hover:from-emerald-300 group-hover:via-teal-300 group-hover:to-white transition-all duration-500">
                      AI Job Suite
                    </span>
                  </Link>
                </motion.div>

                {/* Center Navigation - Desktop Only */}
                <div className="hidden md:block">
                  <FloatingNavigation />
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-3">
                  {isAuthenticated && user ? (
                    <>
                      {/* Notifications */}
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <button
                          onClick={() =>
                            setNotificationDropdownOpen(
                              !notificationDropdownOpen
                            )
                          }
                          className="p-2.5 bg-gray-800/20 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-gray-700/30 transition-all duration-300 shadow-lg"
                        >
                          <BellIcon className="h-5 w-5 text-gray-300 hover:text-white transition-colors" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            </span>
                          )}
                        </button>

                        {notificationDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setNotificationDropdownOpen(false)}
                            />
                            <NotificationDropdown
                              notifications={
                                notifications?.map((notification: any) => ({
                                  id: notification._id || notification.id || "",
                                  type:
                                    notification.type === "deadline"
                                      ? "deadline"
                                      : notification.type === "error"
                                        ? "warning"
                                        : notification.type || "info",
                                  title: notification.title || "Notification",
                                  message: notification.message || "",
                                  timestamp:
                                    notification.createdAt ||
                                    new Date().toISOString(),
                                  read: Boolean(notification.read),
                                  action: notification.action
                                    ? {
                                        label:
                                          notification.action.label || "View",
                                        href: notification.action.url || "#",
                                      }
                                    : undefined,
                                })) || []
                              }
                              onMarkAsRead={markAsRead}
                              onMarkAllAsRead={markAllAsRead}
                              onClearAll={clearAll}
                            />
                          </>
                        )}
                      </motion.div>

                      {/* User Menu */}
                      <Menu as="div" className="relative">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Menu.Button className="flex items-center space-x-3 p-2 bg-gray-800/20 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-gray-700/30 transition-all duration-300 shadow-lg">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {user.firstName[0]}
                                {user.lastName[0]}
                              </span>
                            </div>
                            <div className="hidden sm:block text-left">
                              <div className="text-sm font-medium text-white">
                                {user.firstName}
                              </div>
                              <div className="text-xs text-gray-400">
                                Online
                              </div>
                            </div>
                          </Menu.Button>
                        </motion.div>

                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-150"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-4 w-64 bg-gray-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl focus:outline-none z-50">
                            <div className="p-4 space-y-3">
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to="/dashboard/account"
                                    className={`flex items-center space-x-3 w-full px-3 py-3 text-sm rounded-xl transition-all duration-200 ${
                                      active
                                        ? "bg-emerald-500/20 text-white border border-emerald-500/30"
                                        : "text-gray-300 hover:text-white"
                                    }`}
                                  >
                                    <Cog6ToothIcon className="h-5 w-5" />
                                    <span>Account Settings</span>
                                  </Link>
                                )}
                              </Menu.Item>
                              <div className="border-t border-white/10"></div>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={handleLogout}
                                    className={`flex items-center space-x-3 w-full px-3 py-3 text-sm rounded-xl transition-all duration-200 ${
                                      active
                                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                        : "text-gray-300 hover:text-red-300"
                                    }`}
                                  >
                                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                    <span>Sign out</span>
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </>
                  ) : (
                    <>
                      {/* Desktop auth buttons */}
                      <div className="hidden md:flex items-center space-x-3">
                        <motion.button
                          onClick={() => handleAuthClick("login")}
                          className="text-gray-300 hover:text-white transition-all duration-300 font-medium px-4 py-2 rounded-xl hover:bg-gray-800/30"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Sign In
                        </motion.button>
                        <motion.button
                          onClick={() => handleAuthClick("register")}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium px-6 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 border border-white/20 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Create Account
                        </motion.button>
                      </div>
                    </>
                  )}

                  {/* Mobile Menu Button */}
                  <motion.button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2.5 bg-gray-800/20 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-gray-700/30 transition-all duration-300 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {mobileMenuOpen ? (
                      <XMarkIcon className="h-5 w-5 text-white" />
                    ) : (
                      <Bars3Icon className="h-5 w-5 text-gray-300" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Mobile Menu */}
              {mobileMenuOpen && (
                <motion.div
                  className="md:hidden absolute top-full left-0 right-0 mt-4 bg-gray-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl mx-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-6 space-y-4">
                    <FloatingNavigation />

                    {!isAuthenticated && (
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <button
                          onClick={() => {
                            handleAuthClick("login");
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-gray-300 hover:text-white transition-all duration-300 font-medium py-3 px-4 rounded-xl hover:bg-gray-800/30"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            handleAuthClick("register");
                            setMobileMenuOpen(false);
                          }}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg"
                        >
                          Create Account
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModalSimple
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
