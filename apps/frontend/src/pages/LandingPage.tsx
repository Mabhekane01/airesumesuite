import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  CpuChipIcon,
  BoltIcon,
  ShieldCheckIcon,
  BeakerIcon,
  CodeBracketIcon,
  CloudIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  EyeIcon,
  TrophyIcon,
  GlobeAltIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import AuthModal from "../components/auth/AuthModal";
import { useAuthStore } from "../stores/authStore";

const advancedFeatures = [
  {
    icon: AcademicCapIcon,
    title: "LaTeX PDF Engine",
    subtitle: "Publication-Quality Documents",
    description:
      "Professional LaTeX compilation delivers academic-grade typography that makes HTML-to-PDF converters look amateur.",
    tech: "TexLive Engine + Vector Graphics",
    color: "from-emerald-500 to-teal-600",
    highlight: "Enterprise Grade",
  },
  {
    icon: CpuChipIcon,
    title: "Multi-AI Intelligence",
    subtitle: "Claude + GPT-4 + Gemini",
    description:
      "Three AI models working together with intelligent fallbacks ensure 99.9% availability and superior content quality.",
    tech: "Smart Consensus Engine",
    color: "from-emerald-500 to-violet-600",
    highlight: "99.9% Uptime",
  },
  {
    icon: BoltIcon,
    title: "Real-time Analytics",
    subtitle: "Performance Intelligence",
    description:
      "Advanced metrics and insights powered by machine learning algorithms to optimize your job search strategy.",
    tech: "ML-Powered Insights",
    color: "from-orange-500 to-amber-600",
    highlight: "ML Powered",
  },
  {
    icon: ShieldCheckIcon,
    title: "Enterprise Security",
    subtitle: "Bank-Grade Protection",
    description:
      "JWT authentication, encrypted data transmission, and SOC 2 compliance ensure your data stays secure.",
    tech: "Zero-Trust Architecture",
    color: "from-blue-500 to-cyan-600",
    highlight: "SOC 2 Ready",
  },
];

const techStack = [
  { name: "React 18", category: "Frontend", color: "text-teal-400" },
  { name: "TypeScript", category: "Language", color: "text-teal-300" },
  { name: "Node.js", category: "Backend", color: "text-green-400" },
  { name: "MongoDB", category: "Database", color: "text-green-300" },
  { name: "Redis", category: "Cache", color: "text-red-400" },
  { name: "Docker", category: "Deploy", color: "text-teal-500" },
  { name: "LaTeX", category: "Engine", color: "text-emerald-400" },
  { name: "Claude AI", category: "AI", color: "text-emerald-400" },
  { name: "GPT-4", category: "AI", color: "text-emerald-300" },
  { name: "Gemini", category: "AI", color: "text-indigo-400" },
];

const performanceMetrics = [
  {
    metric: "2-15s",
    label: "PDF Generation",
    detail: "LaTeX Compilation",
    icon: DocumentTextIcon,
    color: "text-emerald-400",
  },
  {
    metric: "99.97%",
    label: "System Uptime",
    detail: "Last 12 Months",
    icon: ShieldCheckIcon,
    color: "text-teal-400",
  },
  {
    metric: "< 200ms",
    label: "API Response",
    detail: "Global Average",
    icon: BoltIcon,
    color: "text-orange-400",
  },
  {
    metric: "94%",
    label: "Cache Hit Rate",
    detail: "Multi-Layer Cache",
    icon: CloudIcon,
    color: "text-cyan-400",
  },
];

const comparisons = [
  {
    feature: "PDF Quality",
    us: "LaTeX Academic Grade",
    others: "Basic HTML-to-PDF",
    advantage: true,
  },
  {
    feature: "AI Reliability",
    us: "Multi-AI with Fallbacks",
    others: "Single AI Provider",
    advantage: true,
  },
  {
    feature: "Architecture",
    us: "Enterprise Scalable",
    others: "Monolithic Apps",
    advantage: true,
  },
  {
    feature: "Templates",
    us: "33+ Professional LaTeX",
    others: "10-20 Basic Templates",
    advantage: true,
  },
];

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Senior ML Engineer",
    company: "Google DeepMind",
    content:
      "The LaTeX quality is incredible - looks like my PhD thesis. Finally, a resume builder that understands professional typography.",
    rating: 5,
    highlight: "PhD-Level Quality",
  },
  {
    name: "Marcus Rodriguez",
    role: "VP Engineering",
    company: "Stripe",
    content:
      "Multi-AI system is genius. When OpenAI was down, it seamlessly switched to Claude. Never experienced downtime.",
    rating: 5,
    highlight: "0 Downtime",
  },
  {
    name: "Emily Watson",
    role: "Product Director",
    company: "Airbnb",
    content:
      "This is not just a resume builder - it's a career intelligence platform. The analytics helped me negotiate 40% higher salary.",
    rating: 5,
    highlight: "+40% Salary",
  },
];

const pricingPlans = [
  {
    name: "Professional",
    price: 19,
    period: "month",
    description: "Perfect for individual job seekers",
    features: [
      "Unlimited LaTeX Resumes",
      "AI Content Generation",
      "33+ Premium Templates",
      "Cover Letter Generator",
      "Basic Analytics",
      "PDF/DOCX Downloads",
    ],
    highlight: false,
  },
  {
    name: "Enterprise",
    price: 39,
    period: "month",
    description: "Advanced features for serious professionals",
    features: [
      "Everything in Professional",
      "Multi-AI Career Coach",
      "Advanced Analytics & Insights",
      "Job Application Tracking",
      "Interview Preparation AI",
      "Priority Support",
      "API Access",
    ],
    highlight: true,
  },
  {
    name: "Teams",
    price: 99,
    period: "month",
    description: "For teams and organizations",
    features: [
      "Everything in Enterprise",
      "10 Team Members",
      "Admin Dashboard",
      "Collaboration Features",
      "Custom Branding",
      "SSO Integration",
      "White-label Options",
    ],
    highlight: false,
  },
];

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const { isAuthenticated } = useAuthStore();
  const { scrollY } = useScroll();

  // Parallax effects
  const yBg = useTransform(scrollY, [0, 1000], [0, -300]);
  const yText = useTransform(scrollY, [0, 1000], [0, -100]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      return;
    }
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark overflow-hidden">
      {/* Advanced CSS for glassy effects - using inline styles instead */}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <motion.div
          className="absolute inset-0"
          style={{
            y: yBg,
            background:
              "radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
          }}
        />

        {/* Floating Tech Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              className={`absolute ${tech.color} opacity-20 text-sm font-mono`}
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                left: `${10 + ((i * 8) % 80)}%`,
                top: `${10 + ((i * 12) % 80)}%`,
              }}
            >
              {tech.name}
            </motion.div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
            style={{ y: yText }}
          >
            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 glass-card rounded-full mb-8 glow-effect">
              <CpuChipIcon className="h-5 w-5 text-emerald-400 mr-2" />
              <span className="text-sm font-medium text-white">
                Enterprise Career Intelligence Platform
              </span>
              <div className="ml-3 px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-xs font-bold text-white">
                LaTeX + Multi-AI
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              <span className="block text-white mb-2">Where</span>
              <span className="block bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                Artificial Intelligence
              </span>
              <span className="block text-white">Meets</span>
              <span className="block bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Career Excellence
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Revolutionary career platform powered by{" "}
              <span className="text-emerald-400 font-semibold">
                LaTeX document engine
              </span>
              ,{" "}
              <span className="text-teal-400 font-semibold">
                multi-AI intelligence
              </span>
              , and{" "}
              <span className="text-emerald-400 font-semibold">
                enterprise architecture
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="group glass-card glass-card-hover px-8 py-4 rounded-2xl font-medium text-lg text-white transition-all duration-300 flex items-center glow-effect"
                >
                  Access Platform
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGetStarted}
                    className="group bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-medium text-lg transition-all duration-300 shadow-2xl glow-effect flex items-center"
                  >
                    Experience the Future
                    <RocketLaunchIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthModalOpen(true);
                    }}
                    className="glass-card glass-card-hover px-8 py-4 rounded-2xl font-medium text-lg text-white transition-all duration-300"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {performanceMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6 text-center glow-effect"
                >
                  <Icon className={`h-8 w-8 ${metric.color} mx-auto mb-3`} />
                  <div
                    className={`text-2xl md:text-3xl font-bold ${metric.color} mb-1`}
                  >
                    {metric.metric}
                  </div>
                  <div className="text-white font-medium mb-1">
                    {metric.label}
                  </div>
                  <div className="text-gray-400 text-sm">{metric.detail}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Technology Showcase Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Built on </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Cutting-Edge Technology
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Enterprise-grade architecture that delivers professional results
            </p>
          </motion.div>

          {/* Advanced Features Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {advancedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="glass-card glass-card-hover rounded-3xl p-8 relative overflow-hidden group"
                >
                  {/* Background Gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center`}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-gray-400 mb-1">
                          {feature.tech}
                        </div>
                        <div className="px-3 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                          {feature.highlight}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <div className="text-lg font-medium text-emerald-300 mb-4">
                      {feature.subtitle}
                    </div>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Technology Stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="glass-card rounded-3xl p-8 glow-effect"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Enterprise Technology Stack
              </h3>
              <p className="text-gray-300">
                Modern, scalable, and battle-tested technologies
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {techStack.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  whileHover={{ scale: 1.1 }}
                  className="glass-card rounded-xl p-4 text-center group cursor-pointer"
                >
                  <div
                    className={`${tech.color} font-mono text-lg font-bold mb-2`}
                  >
                    {tech.name}
                  </div>
                  <div className="text-gray-400 text-sm">{tech.category}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Why We're </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Different
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Professional-grade technology vs. amateur tools
            </p>
          </motion.div>

          <div className="glass-card rounded-3xl overflow-hidden glow-effect">
            <div className="grid grid-cols-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-6">
              <div className="text-gray-400 font-medium">Feature</div>
              <div className="text-center">
                <div className="text-emerald-400 font-bold text-lg">
                  AI Job Suite
                </div>
                <div className="text-emerald-300 text-sm">Enterprise Grade</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 font-bold text-lg">Others</div>
                <div className="text-gray-500 text-sm">Basic Tools</div>
              </div>
            </div>

            {comparisons.map((comp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="grid grid-cols-3 p-6 border-b border-gray-700/30 last:border-b-0 hover:bg-white/5 transition-colors"
              >
                <div className="text-white font-medium">{comp.feature}</div>
                <div className="text-center">
                  <div className="text-emerald-400 font-semibold flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {comp.us}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">{comp.others}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Trusted by </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Industry Leaders
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Professionals from top companies love our platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="glass-card glass-card-hover rounded-3xl p-8 relative group"
              >
                <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                  {testimonial.highlight}
                </div>

                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>

                <p className="text-gray-300 mb-6 italic leading-relaxed">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-gray-400">{testimonial.role}</div>
                    <div className="text-emerald-400 text-sm">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Simple, </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Transparent Pricing
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Choose the plan that fits your career goals
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`glass-card rounded-3xl p-8 relative group ${
                  plan.highlight
                    ? "ring-2 ring-emerald-500/50 glow-effect scale-105 z-10"
                    : "glass-card-hover"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-white">
                      ${plan.price}
                    </span>
                    <span className="text-gray-400">/{plan.period}</span>
                  </div>
                  <p className="text-gray-300">{plan.description}</p>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-emerald-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGetStarted}
                  className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg"
                      : "glass-card glass-card-hover text-white"
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              <span className="text-white">Ready to Transform</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Your Career?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Join thousands of professionals who've revolutionized their job
              search with our enterprise-grade platform.
            </p>

            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="group bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 shadow-2xl glow-effect flex items-center justify-center"
                >
                  Start Free Trial
                  <RocketLaunchIcon className="h-6 w-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>
            )}
          </motion.div>
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
