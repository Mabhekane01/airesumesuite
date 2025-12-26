import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  BellIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useNotifications } from "../../contexts/NotificationContext";
import AuthModal from "../auth/AuthModal";
import NotificationDropdown, { NavNotification } from "./NotificationDropdown";

export default function Header() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [notificationDropdownOpen, setNotificationDropdownOpen] =
    useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: ChartBarIcon,
      current: location.pathname === "/dashboard",
    },
    {
      name: "Resume Builder",
      href: "/resume-builder",
      icon: DocumentTextIcon,
      current: location.pathname.startsWith("/resume-builder"),
    },
    {
      name: "Job Tracker",
      href: "/job-tracker",
      icon: BriefcaseIcon,
      current: location.pathname.startsWith("/job-tracker"),
    },
  ];

  const publicNavigation = [
    {
      name: "Job Board",
      href: "/jobs",
      icon: BriefcaseIcon,
      current: location.pathname === "/jobs",
    },
  ];

  const handleAuthClick = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Convert INotification to NavNotification format with proper error handling
  const convertToNavNotifications = (
    notifications: any[]
  ): NavNotification[] => {
    if (!Array.isArray(notifications)) {
      console.warn("🔔 Notifications is not an array:", notifications);
      return [];
    }

    return notifications
      .map((notification) => {
        if (!notification) {
          console.warn("🔔 Null notification found");
          return null;
        }

        return {
          id: notification._id || notification.id || "",
          type:
            notification.type === "deadline"
              ? "deadline"
              : notification.type === "error"
                ? "warning"
                : notification.type || "info",
          title: notification.title || "Notification",
          message: notification.message || "",
          timestamp: notification.createdAt || new Date().toISOString(),
          read: Boolean(notification.read),
          action: notification.action
            ? {
                label: notification.action.label || "View",
                href: notification.action.url || "#",
              }
            : undefined,
        };
      })
      .filter(Boolean) as NavNotification[];
  };

  const navNotifications = convertToNavNotifications(notifications) as unknown as NavNotification[];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/95 backdrop-blur-lg border-b border-surface-200/70 sticky top-0 z-40 overflow-visible"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 overflow-visible">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center"
            >
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-glow-sm animate-glow-pulse">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <span className="text-xl font-bold gradient-text-dark">
                  Job Suite
                </span>
              </Link>
            </motion.div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center justify-center">
              <div className="flex items-center space-x-2 bg-gray-700/80 backdrop-blur-sm p-1 rounded-full border border-surface-200">
                {publicNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`nav-link-dark ${
                        item.current ? "nav-link-active-dark" : ""
                      }`}
                    >
                      {item.current && (
                        <motion.div
                          layoutId="active-nav-link-public"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full shadow-glow-sm border border-emerald-500/30"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}
                      <Icon className="relative h-4 w-4" />
                      <span className="relative">{item.name}</span>
                    </Link>
                  );
                })}
                {isAuthenticated && navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`nav-link-dark ${
                        item.current ? "nav-link-active-dark" : ""
                      }`}
                    >
                      {item.current && (
                        <motion.div
                          layoutId="active-nav-link"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full shadow-glow-sm border border-emerald-500/30"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}
                      <Icon className="relative h-4 w-4" />
                      <span className="relative">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Auth Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  {/* Notification Bell */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setNotificationDropdownOpen(!notificationDropdownOpen)
                      }
                      className="p-2 rounded-full hover:bg-surface-50/60 transition-all duration-300 hover:shadow-glow-sm relative"
                    >
                      <BellIcon className="h-5 w-5 text-text-secondary hover:text-emerald-500 transition-colors" />
                      {/* Notification Badge */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        </span>
                      )}
                    </motion.button>

                    {/* Notification Dropdown */}
                    {notificationDropdownOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setNotificationDropdownOpen(false)}
                        />
                        <NotificationDropdown
                          notifications={navNotifications}
                          onMarkAsRead={markAsRead}
                          onMarkAllAsRead={markAllAsRead}
                          onClearAll={clearAll}
                        />
                      </>
                    )}
                  </div>
                </>
              ) : null}
              {isAuthenticated && user ? (
                <Menu as="div" className="relative z-50">
                  <Menu.Button className="flex items-center space-x-2 p-2 rounded-full hover:bg-surface-50/60 transition-all duration-300 hover:shadow-glow-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-glow-sm">
                      <span className="text-white text-sm font-medium">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-text-primary hidden sm:block">
                      {user.firstName}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items
                      className="absolute right-0 mt-2 w-48 bg-gray-700/95 backdrop-blur-lg rounded-lg shadow-dark-xl border border-surface-200 focus:outline-none z-50"
                      style={{ zIndex: 999999 }}
                    >
                      <div className="p-2">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/dashboard/account"
                              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md transition-all duration-200 text-text-primary ${
                                active
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : ""
                              }`}
                            >
                              <Cog6ToothIcon className="h-4 w-4" />
                              <span>Account Manager</span>
                            </Link>
                          )}
                        </Menu.Item>
                        <div className="border-t border-surface-200 my-1"></div>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md transition-all duration-200 text-accent-danger ${
                                active ? "bg-accent-danger/10" : ""
                              }`}
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              <span>Sign out</span>
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              ) : (
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAuthClick("login")}
                    className="text-text-secondary hover:text-emerald-500 transition-all duration-300 font-medium"
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAuthClick("register")}
                    className="btn-primary-dark"
                  >
                    Create Account
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
