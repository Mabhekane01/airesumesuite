import React, { useState, useEffect } from "react";
import { motion, useScroll } from "framer-motion";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
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
      name: "Job Board",
      href: "/jobs",
      icon: MagnifyingGlassIcon,
      current: location.pathname === "/jobs",
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
      name: "Job Board",
      href: "/jobs",
      icon: MagnifyingGlassIcon,
      current: location.pathname === "/jobs",
    },
    {
      name: "Templates",
      href: "/templates",
      icon: DocumentTextIcon,
      current: location.pathname === "/templates",
    },
  ];

  const navigation = isAuthenticated ? authNavigation : publicNavigation;

  return (
    <div className="flex items-center space-x-1 bg-white border border-surface-200 rounded-full p-1.5 shadow-resume">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.name} className="relative">
            <Link
              to={item.href}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                item.current 
                  ? "text-white bg-brand-blue shadow-sm" 
                  : "text-text-secondary hover:text-brand-blue hover:bg-surface-50"
              }`}
            >
              <Icon className="relative h-4 w-4 z-10" />
              <span className="relative z-10 hidden sm:block">{item.name}</span>
            </Link>
          </div>
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

  // Handle scroll effects
  useEffect(() => {
    const unsubscribe = scrollY.onChange((latest) => {
      setScrolled(latest > 20);
    });
    return () => unsubscribe();
  }, [scrollY]);

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
        <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
          <motion.div
            className="max-w-6xl mx-auto pointer-events-auto"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Main Navigation Container */}
            <div
              className={`relative rounded-full transition-all duration-500 ${
                scrolled 
                  ? "bg-white/90 backdrop-blur-md border border-surface-200 shadow-resume py-2 px-2" 
                  : "bg-transparent py-4 px-0"
              }`}
            >
              <div className="flex items-center justify-between px-4">
                {/* Logo */}
                <div className="flex items-center">
                  <Link to="/" className="group flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <span className="text-xl font-display font-bold text-brand-dark tracking-tight">
                      JobSuite
                    </span>
                  </Link>
                </div>

                {/* Center Navigation - Desktop Only */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <FloatingNavigation />
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-3">
                  {isAuthenticated && user ? (
                    <>
                      {/* Notifications */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setNotificationDropdownOpen(
                              !notificationDropdownOpen
                            )
                          }
                          className="p-2.5 rounded-full bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-all duration-300 relative group"
                        >
                          <BellIcon className="h-5 w-5 text-text-secondary group-hover:text-brand-blue transition-colors" />
                          {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-brand-blue rounded-full border-2 border-white"></span>
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
                                  type: notification.type || "info",
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
                                })) || []
                              }
                              onMarkAsRead={markAsRead}
                              onMarkAllAsRead={markAllAsRead}
                              onClearAll={clearAll}
                            />
                          </>
                        )}
                      </div>

                      {/* User Menu */}
                      <Menu as="div" className="relative">
                        <div>
                          <Menu.Button className="flex items-center space-x-3 pl-2 pr-1 py-1 rounded-full bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-all duration-300">
                            <div className="hidden sm:block text-right pr-2">
                              <div className="text-sm font-medium text-brand-dark leading-none">
                                {user.firstName}
                              </div>
                            </div>
                            <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center ring-2 ring-white">
                              <span className="text-white text-xs font-bold">
                                {user.firstName[0]}
                              </span>
                            </div>
                          </Menu.Button>
                        </div>

                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-150"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-4 w-64 bg-white border border-surface-200 rounded-xl shadow-resume p-2 focus:outline-none z-50 origin-top-right">
                            <Menu.Item>
                              {({ active }) => (
                                <Link
                                  to="/dashboard/account"
                                  className={`flex items-center space-x-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                                    active
                                      ? "bg-surface-50 text-brand-blue"
                                      : "text-text-secondary hover:text-brand-dark"
                                  }`}
                                >
                                  <Cog6ToothIcon className="h-4 w-4" />
                                  <span>Settings</span>
                                </Link>
                              )}
                            </Menu.Item>
                            <div className="h-px bg-surface-100 my-1"></div>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={handleLogout}
                                  className={`flex items-center space-x-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                                    active
                                      ? "bg-red-50 text-red-600"
                                      : "text-text-secondary hover:text-red-600"
                                  }`}
                                >
                                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                  <span>Sign out</span>
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </>
                  ) : (
                    <>
                      {/* Desktop auth buttons */}
                      <div className="hidden md:flex items-center space-x-3">
                        <button
                          onClick={() => handleAuthClick("login")}
                          className="text-text-secondary hover:text-brand-dark transition-colors text-sm font-medium px-4 py-2"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => handleAuthClick("register")}
                          className="bg-brand-blue text-white hover:bg-blue-600 transition-colors text-sm font-bold px-5 py-2.5 rounded-full shadow-lg hover:scale-105 transform duration-200"
                        >
                          Get Started
                        </button>
                      </div>
                    </>
                  )}

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2.5 text-text-secondary hover:text-brand-dark rounded-full hover:bg-surface-100 transition-colors"
                  >
                    {mobileMenuOpen ? (
                      <XMarkIcon className="h-6 w-6" />
                    ) : (
                      <Bars3Icon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Menu */}
              {mobileMenuOpen && (
                <motion.div
                  className="md:hidden absolute top-full left-0 right-0 mt-4 mx-2 bg-white border border-surface-200 rounded-2xl shadow-resume p-4 z-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="space-y-4">
                    <FloatingNavigation />

                    {!isAuthenticated && (
                      <div className="pt-4 border-t border-surface-100 space-y-3 flex flex-col">
                        <button
                          onClick={() => {
                            handleAuthClick("login");
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-text-secondary hover:text-brand-dark py-3 font-medium"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            handleAuthClick("register");
                            setMobileMenuOpen(false);
                          }}
                          className="w-full btn-primary py-3"
                        >
                          Get Started
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