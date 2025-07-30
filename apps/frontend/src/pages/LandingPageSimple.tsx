import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  PencilIcon, 
  BriefcaseIcon, 
  ChartBarIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModalSimple';
import { useAuthStore } from '../stores/authStore';

const features = [
  {
    icon: DocumentTextIcon,
    title: 'AI Resume Builder',
    description: 'Create professional resumes with AI-powered optimization for ATS compatibility.',
    color: 'from-blue-500 to-purple-600'
  },
  {
    icon: PencilIcon,
    title: 'Cover Letter Generator',
    description: 'Generate personalized cover letters that match your target job perfectly.',
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: BriefcaseIcon,
    title: 'Job Application Tracker',
    description: 'Track applications, interviews, and follow-ups in one organized dashboard.',
    color: 'from-green-500 to-blue-600'
  },
  {
    icon: ChartBarIcon,
    title: 'Analytics & Insights',
    description: 'Get detailed insights on your job search performance and improvement areas.',
    color: 'from-orange-500 to-red-600'
  }
];

const stats = [
  { number: '50K+', label: 'Resumes Created' },
  { number: '95%', label: 'ATS Pass Rate' },
  { number: '3x', label: 'More Interviews' },
  { number: '4.9/5', label: 'User Rating' }
];

export default function LandingPageSimple() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const { isAuthenticated } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      return;
    }
    setAuthMode('register');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0">
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-accent-primary rounded-full opacity-20 animate-glow-pulse animate-float-gentle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.3}s`
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
                  animationDelay: `${i * 0.5}s`
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

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 animate-slide-up-soft" style={{ animationDelay: '0.2s' }}>
              <span className="gradient-text-dark animate-gradient">
                Land Your Dream Job
              </span>
              <br />
              <span className="text-dark-text-primary">with AI Power</span>
            </h1>

            <p className="text-xl text-dark-text-secondary mb-12 max-w-3xl mx-auto animate-slide-up-soft" style={{ animationDelay: '0.4s' }}>
              Create ATS-optimized resumes, generate personalized cover letters, and track your job applications with our AI-powered suite. Get hired faster than ever before.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up-soft" style={{ animationDelay: '0.6s' }}>
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
                    Get Started Free ✨
                    <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthModalOpen(true);
                    }}
                    className="btn-secondary-dark px-8 py-4 text-lg transform hover:scale-105"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center animate-slide-up-soft hover:animate-float-gentle" style={{ animationDelay: `${0.8 + index * 0.1}s` }}>
                  <div className="text-3xl font-bold gradient-text-dark">
                    {stat.number}
                  </div>
                  <div className="text-dark-text-secondary mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-dark-text-primary">
              Everything You Need to <span className="gradient-text-dark">Get Hired</span> 🚀
            </h2>
            <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto">
              Our comprehensive suite of AI-powered tools helps you create outstanding job applications and track your progress.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="card-glass-dark p-6 hover:shadow-glow-md transition-all duration-300 transform hover:-translate-y-2 animate-slide-up-soft group"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-300 group-hover:scale-110`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-text-primary group-hover:text-accent-primary transition-colors">{feature.title}</h3>
                  <p className="text-dark-text-secondary">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI-Powered Excellence Section */}
      <section className="py-20 bg-dark-secondary/30 relative overflow-hidden">
        {/* Dark Theme Background Effects */}
        <div className="absolute inset-0">
          {/* Neural Network Grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
                             radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)`
          }}></div>
          
          {/* Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-accent-primary rounded-full opacity-30 animate-float-gentle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-dark-secondary/50 backdrop-blur-sm border border-dark-border rounded-full px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-dark-text-secondary">AI-Powered Technology Stack</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text-dark">
              Powered by World-Class AI
            </h2>
            <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto leading-relaxed">
              We integrate the most advanced AI models from leading technology companies to deliver unprecedented results for your career advancement.
            </p>
          </div>

          {/* Premium AI Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            
            {/* OpenAI */}
            <div className="group relative animate-slide-up-soft">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* OpenAI Logo */}
                  <div className="w-16 h-16 mb-4 bg-dark-tertiary rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img src="/openai-color.svg" alt="OpenAI" className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">OpenAI</h3>
                  <div className="text-sm text-green-400 font-semibold mb-3">GPT-4 Turbo</div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">Advanced natural language processing for intelligent resume optimization and cover letter generation.</p>
                </div>
              </div>
            </div>

            {/* Anthropic Claude */}
            <div className="group relative animate-slide-up-soft" style={{ animationDelay: '0.1s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* Claude Logo */}
                  <div className="w-16 h-16 mb-4 bg-dark-tertiary rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img src="/claude-color.svg" alt="Claude" className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">Anthropic</h3>
                  <div className="text-sm text-orange-400 font-semibold mb-3">Claude 3.5 Sonnet</div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">Constitutional AI for thoughtful content analysis and professional writing assistance.</p>
                </div>
              </div>
            </div>

            {/* Google Gemini */}
            <div className="group relative animate-slide-up-soft" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* Gemini Logo */}
                  <div className="w-16 h-16 mb-4 bg-dark-tertiary rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img src="/gemini-color.svg" alt="Gemini" className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">Google</h3>
                  <div className="text-sm text-blue-400 font-semibold mb-3">Gemini Pro</div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">Multimodal AI capabilities for comprehensive document analysis and optimization.</p>
                </div>
              </div>
            </div>

            {/* Qwen */}
            <div className="group relative animate-slide-up-soft" style={{ animationDelay: '0.3s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative card-glass-dark p-6 hover:shadow-glow-md transition-all duration-500 group-hover:scale-105 border border-dark-border">
                <div className="flex flex-col items-center text-center">
                  {/* Qwen Logo */}
                  <div className="w-16 h-16 mb-4 bg-dark-tertiary rounded-xl flex items-center justify-center shadow-dark-lg group-hover:shadow-glow-sm transition-all duration-500">
                    <img src="/qwen-color.svg" alt="Qwen" className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary mb-2 group-hover:text-accent-primary transition-colors">Alibaba</h3>
                  <div className="text-sm text-red-400 font-semibold mb-3">Qwen-Max</div>
                  <p className="text-sm text-dark-text-secondary leading-relaxed">Enterprise-grade language model for advanced reasoning and content optimization.</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Capabilities Showcase */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center group animate-slide-up-soft" style={{ animationDelay: '0.4s' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark-text-primary mb-3">Neural Content Generation</h3>
              <p className="text-dark-text-secondary leading-relaxed">Multiple AI models collaborate to create personalized, ATS-optimized content that resonates with hiring managers.</p>
            </div>

            <div className="text-center group animate-slide-up-soft" style={{ animationDelay: '0.5s' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mb-6 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
                <ChartBarIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark-text-primary mb-3">Predictive ATS Analysis</h3>
              <p className="text-dark-text-secondary leading-relaxed">Advanced algorithms analyze job postings to predict ATS compatibility with 98.5% accuracy.</p>
            </div>

            <div className="text-center group animate-slide-up-soft" style={{ animationDelay: '0.6s' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-glow-sm group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
                <BriefcaseIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark-text-primary mb-3">Intelligent Job Matching</h3>
              <p className="text-dark-text-secondary leading-relaxed">Deep learning models analyze job requirements and company culture for optimal application targeting.</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card-glass-dark border border-dark-border rounded-2xl p-8 text-center animate-slide-up-soft" style={{ animationDelay: '0.7s' }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">98.5%</div>
                <div className="text-dark-text-secondary text-sm">ATS Pass Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">4.2x</div>
                <div className="text-dark-text-secondary text-sm">More Interviews</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">2.8M+</div>
                <div className="text-dark-text-secondary text-sm">AI Operations Daily</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text-dark mb-2">99.9%</div>
                <div className="text-dark-text-secondary text-sm">Uptime SLA</div>
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
                animationDelay: `${i * 0.4}s`
              }}
            />
          ))}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-slide-up-soft">
              Ready to Transform Your Job Search? 💼
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto animate-slide-up-soft" style={{ animationDelay: '0.2s' }}>
              Join thousands of professionals who have successfully landed their dream jobs with AI Job Suite.
            </p>
            {!isAuthenticated && (
              <button
                onClick={handleGetStarted}
                className="bg-white text-accent-primary px-8 py-4 rounded-lg font-medium text-lg hover:bg-gray-100 transition-all duration-300 shadow-glow-lg transform hover:scale-105 animate-slide-up-soft"
                style={{ animationDelay: '0.4s' }}
              >
                Start Your Free Trial ✨
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