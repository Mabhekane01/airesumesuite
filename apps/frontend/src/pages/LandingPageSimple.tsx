import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  FolderIcon,
  CpuChipIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AuthModal from "../components/auth/AuthModalSimple";
import { useAuthStore } from "../stores/authStore";

const features = [
  {
    icon: DocumentTextIcon,
    title: "AI Resume Builder",
    description:
      "Create professional resumes with AI-powered optimization for ATS compatibility. Choose from 30+ professional templates.",
    color: "from-blue-500 to-purple-600",
  },
  {
    icon: PencilIcon,
    title: "Cover Letter Generator",
    description:
      "Generate personalized cover letters that match your target job perfectly.",
    color: "from-emerald-500 to-pink-600",
  },
  {
    icon: FolderIcon,
    title: "Document Manager",
    description:
      "Organize, preview, download, and share all your resumes and cover letters in one centralized dashboard.",
    color: "from-indigo-500 to-blue-600",
  },
  {
    icon: DocumentArrowUpIcon,
    title: "PDF Editor Suite",
    description:
      "Advanced PDF editing with watermarks, security, digital signatures, form creation, and OCR capabilities.",
    color: "from-red-500 to-pink-600",
  },
  {
    icon: CpuChipIcon,
    title: "Job Intelligence Platform",
    description:
      "AI-powered job market analysis with multi-source scraping, skill extraction, and salary predictions.",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: BriefcaseIcon,
    title: "Job Application Tracker",
    description:
      "Track applications, interviews, and follow-ups in one organized dashboard.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: ChartBarIcon,
    title: "Analytics & Insights",
    description:
      "Get detailed insights on your job search performance and improvement areas.",
    color: "from-orange-500 to-red-600",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "ATS Optimization",
    description:
      "Advanced ATS scanning and optimization ensures your resume passes through applicant tracking systems.",
    color: "from-cyan-500 to-blue-600",
  },
];

const stats = [
  { number: "50K+", label: "Resumes Created" },
  { number: "30+", label: "Professional Templates" },
  { number: "95%", label: "ATS Pass Rate" },
  { number: "4.9/5", label: "User Rating" },
];

// Development Notice Popup Component
function DevelopmentNotice({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-3xl p-8 max-w-md mx-auto shadow-2xl animate-slide-up-soft glow-effect">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 glass-card border border-accent-primary/30 rounded-2xl flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-white text-center mb-3">
            🚧 Development Notice
          </h3>
          <p className="text-orange-200 text-sm leading-relaxed">
            This application is currently in active development. Many features
            are still being built and may not work as expected.
          </p>
        </div>

        {/* Feature Status */}
        <div className="glass-card bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-300">
              Working: Resume Builder, Document Manager
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-yellow-300">
              Partial: PDF Editor, Cover Letters
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-red-300">
              Coming Soon: Job Intelligence Platform
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="text-orange-100 text-xs">
          We're working hard to bring you a complete job search suite. Please
          expect regular updates and improvements!
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 glass-card glass-card-hover text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default function LandingPageSimple() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [showDevNotice, setShowDevNotice] = useState(true);

  // Handle auth error messages from URL parameters
  useEffect(() => {
    const authError = searchParams.get("auth");
    const message = searchParams.get("message");

    if (authError === "error" && message) {
      let errorMessage = "Authentication failed";

      switch (message) {
        case "authentication_failed":
          errorMessage = "Google authentication failed. Please try again.";
          break;
        case "server_error":
          errorMessage = "A server error occurred. Please try again later.";
          break;
        case "missing_tokens":
          errorMessage =
            "Authentication tokens were not received. Please try again.";
          break;
        case "callback_error":
          errorMessage =
            "An error occurred while processing your sign-in. Please try again.";
          break;
        default:
          errorMessage = decodeURIComponent(message);
      }

      toast.error(errorMessage);

      // Clean up URL parameters
      const url = window.location.href;
      const urlObj = new URL(url);
      urlObj.searchParams.delete("auth");
      urlObj.searchParams.delete("message");
      window.history.replaceState({}, "", urlObj.toString());
    }
  }, [searchParams]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      return;
    }
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Development Notice Popup */}
      <DevelopmentNotice
        isOpen={showDevNotice}
        onClose={() => setShowDevNotice(false)}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 lg:py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-accent-primary rounded-full opacity-20 animate-glow-pulse animate-float-gentle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-accent-secondary rounded-full opacity-10 animate-float-gentle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8 animate-slide-up-soft">
              <span className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-medium rounded-full shadow-glow-md animate-glow-pulse">
                <SparklesIcon className="h-4 w-4 mr-2 animate-float-gentle" />
                AI-Powered Job Search Suite
              </span>
            </div>

            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 animate-slide-up-soft"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="gradient-text-dark animate-gradient">
                Land Your Dream Job
              </span>
              <br />
              <span className="text-dark-text-primary">with AI Power</span>
            </h1>

            <p
              className="text-xl text-dark-text-secondary mb-12 max-w-3xl mx-auto animate-slide-up-soft"
              style={{ animationDelay: "0.4s" }}
            >
              Create ATS-optimized resumes from 30+ templates, generate
              personalized cover letters, manage documents, edit PDFs, and
              leverage our job intelligence platform. Get hired faster than ever
              before.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up-soft"
              style={{ animationDelay: "0.6s" }}
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary-dark px-8 py-4 text-lg flex items-center group transform hover:scale-105 shadow-glow-md"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleGetStarted}
                    className="btn-primary-dark px-8 py-4 text-lg flex items-center group transform hover:scale-105 shadow-glow-md hover:shadow-glow-lg"
                  >
                    Create Free Account ✨
                    <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/templates"
                      className="btn-secondary-dark px-6 py-3 text-base flex items-center group transform hover:scale-105"
                    >
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      View Templates
                    </Link>
                    <Link
                      to="/pdf-editor"
                      className="btn-secondary-dark px-6 py-3 text-base flex items-center group transform hover:scale-105"
                    >
                      <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                      PDF Editor
                    </Link>
                    <button
                      onClick={() => {
                        setAuthMode("login");
                        setAuthModalOpen(true);
                      }}
                      className="btn-secondary-dark px-6 py-3 text-base transform hover:scale-105"
                    >
                      Sign In
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center animate-slide-up-soft hover:animate-float-gentle"
                  style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                >
                  <div className="text-3xl font-bold gradient-text-dark">
                    {stat.number}
                  </div>
                  <div className="text-dark-text-secondary mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-dark-text-primary">
              Complete Job Search{" "}
              <span className="gradient-text-dark">Platform</span> 🚀
            </h2>
            <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto">
              From AI resume building and document management to PDF editing and
              job market intelligence - everything you need for a successful
              career in one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="card-glass-dark p-6 hover:shadow-glow-md transition-all duration-300 transform hover:-translate-y-2 animate-slide-up-soft group"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-text-primary group-hover:text-accent-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-dark-text-secondary">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resume Templates Showcase */}
      <section className="py-20 bg-gray-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-slide-up-soft">
              <div>
                <div className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-dark-border rounded-full px-4 py-2 mb-6">
                  <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-dark-text-secondary">
                    30+ Professional Templates
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-dark-text-primary">
                  <span className="gradient-text-dark">AI-Powered</span> Resume
                  Templates
                </h2>

                <p className="text-xl text-dark-text-secondary leading-relaxed mb-8">
                  Create stunning, ATS-optimized resumes with our professionally
                  designed templates. Each template is crafted by career experts
                  and enhanced with AI to ensure maximum impact with hiring
                  managers.
                </p>
              </div>

              {/* Template Features */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <CheckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      ATS-Optimized Design
                    </h3>
                    <p className="text-dark-text-secondary">
                      Every template passes through Applicant Tracking Systems
                      with 95%+ success rate, ensuring your resume reaches human
                      reviewers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      AI Content Enhancement
                    </h3>
                    <p className="text-dark-text-secondary">
                      Templates work seamlessly with our AI writing assistant to
                      optimize keywords, phrases, and formatting for maximum
                      impact.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <DocumentTextIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      Industry-Specific Options
                    </h3>
                    <p className="text-dark-text-secondary">
                      Choose from templates tailored for tech, finance,
                      healthcare, creative industries, and more. Each designed
                      for specific career paths.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/templates"
                  className="btn-primary-dark px-8 py-4 text-lg inline-flex items-center justify-center group transform hover:scale-105 shadow-glow-md"
                >
                  Browse All Templates
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/pdf-editor"
                  className="btn-secondary-dark px-8 py-4 text-lg inline-flex items-center justify-center group transform hover:scale-105"
                >
                  <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                  Try PDF Editor
                </Link>
              </div>
            </div>

            {/* Right Template Preview */}
            <div
              className="relative animate-slide-up-soft"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="relative group">
                {/* Popular Badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-semibold px-4 py-2 rounded-full z-10 shadow-glow-md animate-glow-pulse">
                  ⭐ Most Popular
                </div>

                {/* Template Preview Card */}
                <div className="relative card-glass-dark p-6 hover:shadow-glow-lg transition-all duration-500 transform group-hover:scale-105 border border-dark-border/50 hover:border-accent-primary/50">
                  <div className="relative overflow-hidden rounded-xl mb-6 bg-white shadow-2xl">
                    <img
                      src="/templates/template01/33592.jpeg"
                      alt="Modern Professional Resume Template"
                      className="w-full h-96 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Overlay Info */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        Modern Professional
                      </h4>
                      <p className="text-sm text-gray-600">
                        Clean design • ATS-Optimized • AI-Enhanced
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                      Modern Professional Template
                    </h3>
                    <p className="text-dark-text-secondary mb-4">
                      Our most popular template combines clean design with ATS
                      optimization
                    </p>

                    <div className="flex items-center justify-center gap-4 text-sm text-dark-text-muted">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        95% ATS Pass Rate
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        AI-Enhanced
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Excellence Section */}
      <section className="py-20 bg-gray-800/30 relative overflow-hidden">
        {/* Dark Theme Background Effects */}
        <div className="absolute inset-0">
          {/* Neural Network Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
                             radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)`,
            }}
          ></div>

          {/* Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-accent-primary rounded-full opacity-30 animate-float-gentle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-dark-border rounded-full px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-dark-text-secondary">
                AI-Powered Technology Stack
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text-dark">
              Powered by World-Class AI
            </h2>
            <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto leading-relaxed">
              We integrate the most advanced AI models from leading technology
              companies to deliver unprecedented results for your career
              advancement.
            </p>
          </div>

          {/* Premium AI Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* OpenAI */}
            <div className="group relative animate-slide-up-soft">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* OpenAI Logo */}
                  <div className="w-16 h-16 mb-4 bg-gray-700 rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img
                      src="/openai-color.svg"
                      alt="OpenAI"
                      className="w-10 h-10"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                    OpenAI
                  </h3>
                  <div className="text-sm text-green-400 font-semibold mb-3">
                    GPT-4 Turbo
                  </div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">
                    Advanced natural language processing for intelligent resume
                    optimization and cover letter generation.
                  </p>
                </div>
              </div>
            </div>

            {/* Anthropic Claude */}
            <div
              className="group relative animate-slide-up-soft"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* Claude Logo */}
                  <div className="w-16 h-16 mb-4 bg-gray-700 rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img
                      src="/claude-color.svg"
                      alt="Claude"
                      className="w-10 h-10"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                    Anthropic
                  </h3>
                  <div className="text-sm text-orange-400 font-semibold mb-3">
                    Claude 3.5 Sonnet
                  </div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">
                    Constitutional AI for thoughtful content analysis and
                    professional writing assistance.
                  </p>
                </div>
              </div>
            </div>

            {/* Google Gemini */}
            <div
              className="group relative animate-slide-up-soft"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* Gemini Logo */}
                  <div className="w-16 h-16 mb-4 bg-gray-700 rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img
                      src="/gemini-color.svg"
                      alt="Gemini"
                      className="w-10 h-10"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                    Google
                  </h3>
                  <div className="text-sm text-teal-400 font-semibold mb-3">
                    Gemini Pro
                  </div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">
                    Multimodal AI capabilities for comprehensive document
                    analysis and optimization.
                  </p>
                </div>
              </div>
            </div>

            {/* Qwen */}
            <div
              className="group relative animate-slide-up-soft"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* Qwen Logo */}
                  <div className="w-16 h-16 mb-4 bg-gray-700 rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img
                      src="/qwen-color.svg"
                      alt="Qwen"
                      className="w-10 h-10"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                    Alibaba
                  </h3>
                  <div className="text-sm text-red-400 font-semibold mb-3">
                    Qwen-Max
                  </div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">
                    Enterprise-grade language model for advanced reasoning and
                    content optimization.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Capabilities Showcase */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div
              className="text-center group animate-slide-up-soft"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark-text-primary mb-3">
                Neural Content Generation
              </h3>
              <p className="text-dark-text-secondary leading-relaxed">
                Multiple AI models collaborate to create personalized,
                ATS-optimized content that resonates with hiring managers.
              </p>
            </div>

            <div
              className="text-center group animate-slide-up-soft"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl mb-6 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
                <ChartBarIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark-text-primary mb-3">
                Predictive ATS Analysis
              </h3>
              <p className="text-dark-text-secondary leading-relaxed">
                Advanced algorithms analyze job postings to predict ATS
                compatibility with 98.5% accuracy.
              </p>
            </div>

            <div
              className="text-center group animate-slide-up-soft"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-pink-600 rounded-2xl mb-6 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
                <BriefcaseIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark-text-primary mb-3">
                Intelligent Job Matching
              </h3>
              <p className="text-dark-text-secondary leading-relaxed">
                Deep learning models analyze job requirements and company
                culture for optimal application targeting.
              </p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div
            className="card-glass-dark border border-dark-border rounded-2xl p-8 text-center animate-slide-up-soft"
            style={{ animationDelay: "0.7s" }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">
                  98.5%
                </div>
                <div className="text-dark-text-secondary text-sm">
                  ATS Pass Rate
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">
                  4.2x
                </div>
                <div className="text-dark-text-secondary text-sm">
                  More Interviews
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">
                  2.8M+
                </div>
                <div className="text-dark-text-secondary text-sm">
                  AI Operations Daily
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">
                  99.9%
                </div>
                <div className="text-dark-text-secondary text-sm">
                  Uptime SLA
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Intelligence Platform Section */}
      <section className="py-20 bg-gray-800/40 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-slide-up-soft">
              <div>
                <div className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-dark-border rounded-full px-4 py-2 mb-6">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-dark-text-secondary">
                    Coming Soon • In Development
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-dark-text-primary">
                  <span className="gradient-text-dark">Job Intelligence</span>{" "}
                  Platform
                </h2>

                <p className="text-xl text-dark-text-secondary leading-relaxed mb-8">
                  Advanced job market intelligence powered by AI-driven web
                  scraping. Get real-time insights directly from thousands of
                  company career pages and vacancy portals across different
                  countries.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <MagnifyingGlassIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      Direct Company Career Page Scraping
                    </h3>
                    <p className="text-dark-text-secondary">
                      Aggregate job postings directly from thousands of company
                      career pages and corporate vacancy portals across multiple
                      countries in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <ChartBarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      Global Market Intelligence & Analytics
                    </h3>
                    <p className="text-dark-text-secondary">
                      Track hiring trends, salary ranges, emerging skills across
                      different countries and regions. Get competitive
                      intelligence on company-specific hiring patterns.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <CpuChipIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      AI-Powered Job Matching
                    </h3>
                    <p className="text-dark-text-secondary">
                      Advanced NLP and machine learning algorithms analyze job
                      requirements, extract skills, and provide personalized job
                      recommendations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-purple-300 font-semibold">
                    Development Status
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our Job Intelligence Platform is currently in active
                  development. We're building a comprehensive microservices
                  architecture that directly scrapes thousands of company career
                  pages worldwide, providing unfiltered access to corporate job
                  postings.
                  <span className="text-purple-300 font-medium">
                    {" "}
                    Expected launch: Q2 2025
                  </span>
                </p>
              </div>
            </div>

            {/* Right Visual */}
            <div
              className="relative animate-slide-up-soft"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="relative group">
                {/* Coming Soon Badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-full z-10 shadow-glow-md animate-glow-pulse">
                  🚀 Coming Soon
                </div>

                {/* Mock Job Intelligence Dashboard */}
                <div className="relative card-glass-dark p-6 hover:shadow-glow-lg transition-all duration-500 border border-dark-border/50">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-dark-text-primary">
                        Company Career Intelligence
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-dark-text-secondary">
                          Live Scraping
                        </span>
                      </div>
                    </div>

                    {/* Mock Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-300">
                          8,247
                        </div>
                        <div className="text-xs text-gray-400">
                          Companies Scraped
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-300">
                          52
                        </div>
                        <div className="text-xs text-gray-400">Countries</div>
                      </div>
                    </div>

                    {/* Mock Job Listings */}
                    <div className="space-y-3">
                      {[
                        {
                          title: "Senior Software Engineer",
                          company: "Microsoft Corp",
                          salary: "$165K-$220K",
                          location: "Seattle, WA",
                          source: "careers.microsoft.com",
                        },
                        {
                          title: "Product Manager",
                          company: "Shopify Inc",
                          salary: "€95K-€125K",
                          location: "Berlin, Germany",
                          source: "shopify.com/careers",
                        },
                        {
                          title: "Data Scientist",
                          company: "Netflix",
                          salary: "$180K-$250K",
                          location: "Los Angeles, CA",
                          source: "jobs.netflix.com",
                        },
                      ].map((job, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-dark-text-primary">
                                {job.title}
                              </h4>
                              <p className="text-xs text-dark-text-secondary">
                                {job.company} • {job.location}
                              </p>
                              <p className="text-xs text-purple-400 mt-1">
                                Source: {job.source}
                              </p>
                            </div>
                            <div className="text-xs text-green-400 font-medium">
                              {job.salary}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Document Manager Section */}
      <section className="py-20 bg-gray-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Visual */}
            <div className="relative animate-slide-up-soft order-2 lg:order-1">
              <div className="relative group">
                {/* In Development Badge */}
                <div className="absolute -top-4 -left-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full z-10 shadow-glow-md animate-glow-pulse">
                  🔧 In Development
                </div>

                {/* Mock Document Manager Interface */}
                <div className="relative card-glass-dark p-6 hover:shadow-glow-lg transition-all duration-500 border border-dark-border/50">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-dark-text-primary">
                        Document Analytics
                      </h3>
                      <div className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                        Papermark-like
                      </div>
                    </div>

                    {/* Mock Document with Analytics */}
                    <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 rounded-lg p-4 border border-indigo-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <DocumentTextIcon className="w-6 h-6 text-indigo-300" />
                        <div>
                          <div className="text-sm font-medium text-dark-text-primary">
                            John_Doe_Resume.pdf
                          </div>
                          <div className="text-xs text-dark-text-secondary">
                            Shared 2 hours ago
                          </div>
                        </div>
                      </div>

                      {/* Analytics */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-300">
                            24
                          </div>
                          <div className="text-xs text-gray-400">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-300">
                            8
                          </div>
                          <div className="text-xs text-gray-400">
                            Unique Viewers
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-300">
                            3m 24s
                          </div>
                          <div className="text-xs text-gray-400">Avg Time</div>
                        </div>
                      </div>

                      {/* View History */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400 mb-2">
                          Recent Activity
                        </div>
                        {[
                          {
                            viewer: "HR Manager",
                            time: "10 min ago",
                            duration: "4m 12s",
                          },
                          {
                            viewer: "Tech Lead",
                            time: "1 hour ago",
                            duration: "2m 45s",
                          },
                          {
                            viewer: "Recruiter",
                            time: "2 hours ago",
                            duration: "5m 18s",
                          },
                        ].map((activity, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center text-xs bg-gray-800/50 rounded p-2"
                          >
                            <span className="text-dark-text-secondary">
                              {activity.viewer}
                            </span>
                            <span className="text-gray-400">
                              {activity.time}
                            </span>
                            <span className="text-green-400">
                              {activity.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div
              className="space-y-8 animate-slide-up-soft order-1 lg:order-2"
              style={{ animationDelay: "0.1s" }}
            >
              <div>
                <div className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-dark-border rounded-full px-4 py-2 mb-6">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-dark-text-secondary">
                    Coming Soon • In Development
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-dark-text-primary">
                  Smart{" "}
                  <span className="gradient-text-dark">Document Manager</span>
                </h2>

                <p className="text-xl text-dark-text-secondary leading-relaxed mb-8">
                  Papermark-inspired document sharing with advanced analytics.
                  Share your resumes and documents securely while tracking
                  viewer engagement, time spent, and detailed analytics.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <ChartBarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      Advanced Document Analytics
                    </h3>
                    <p className="text-dark-text-secondary">
                      Track who views your documents, how long they spend on
                      each page, and get detailed engagement metrics like
                      Papermark.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <FolderIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      Secure Document Sharing
                    </h3>
                    <p className="text-dark-text-secondary">
                      Share resumes and portfolios with custom domains, password
                      protection, and expiration dates. Perfect for job
                      applications.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      AI-Powered Insights
                    </h3>
                    <p className="text-dark-text-secondary">
                      Get AI recommendations on document performance, optimal
                      sharing times, and content suggestions based on viewer
                      behavior.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></div>
                  <span className="text-indigo-300 font-semibold">
                    Development Status
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our Document Manager is being built as an open-source
                  alternative to DocSend and Papermark, with enhanced AI
                  features for job seekers.
                  <span className="text-indigo-300 font-medium">
                    {" "}
                    Expected launch: Q1 2025
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-accent-primary to-accent-secondary relative overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-white/10 rounded-full animate-float-gentle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-slide-up-soft">
              Ready to Transform Your Job Search? 💼
            </h2>
            <p
              className="text-xl text-white/80 mb-8 max-w-2xl mx-auto animate-slide-up-soft"
              style={{ animationDelay: "0.2s" }}
            >
              Join thousands of professionals who have successfully landed their
              dream jobs with AI Job Suite.
            </p>
            {!isAuthenticated && (
              <button
                onClick={handleGetStarted}
                className="bg-white text-accent-primary px-8 py-4 rounded-lg font-medium text-lg hover:bg-gray-100 transition-all duration-300 shadow-glow-lg transform hover:scale-105 animate-slide-up-soft"
                style={{ animationDelay: "0.4s" }}
              >
                Create Your Free Account ✨
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
