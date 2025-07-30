import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
import AuthModal from '../components/auth/AuthModal';
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

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Software Engineer',
    company: 'Google',
    content: 'AI Job Suite helped me land my dream job at Google. The resume optimization was incredible!',
    rating: 5
  },
  {
    name: 'Michael Chen',
    role: 'Product Manager',
    company: 'Microsoft',
    content: 'The cover letter generator saved me hours of writing. Got 3x more interview calls!',
    rating: 5
  },
  {
    name: 'Emily Davis',
    role: 'Data Scientist',
    company: 'Netflix',
    content: 'Amazing job tracking features. I never missed a follow-up again. Highly recommended!',
    rating: 5
  }
];

const stats = [
  { number: '50K+', label: 'Resumes Created' },
  { number: '95%', label: 'ATS Pass Rate' },
  { number: '3x', label: 'More Interviews' },
  { number: '4.9/5', label: 'User Rating' }
];

export default function LandingPage() {
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-dark">
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-accent-primary rounded-full opacity-30"
                animate={{
                  x: [0, 100, 0],
                  y: [0, -100, 0],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 10 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-full shadow-lg">
                <SparklesIcon className="h-4 w-4 mr-2" />
                AI-Powered Job Search Suite
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8"
            >
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Land Your Dream Job
              </span>
              <br />
              <span className="text-dark-text-primary">with AI Power</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-dark-text-secondary mb-12 max-w-3xl mx-auto"
            >
              Create ATS-optimized resumes, generate personalized cover letters, and track your job applications with our AI-powered suite. Get hired faster than ever before.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-medium text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg flex items-center group"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGetStarted}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-medium text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg flex items-center group"
                  >
                    Get Started Free
                    <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setAuthMode('login');
                      setAuthModalOpen(true);
                    }}
                    className="border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg font-medium text-lg hover:bg-purple-600 hover:text-white transition-all duration-200"
                  >
                    Sign In
                  </motion.button>
                </>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-dark-text-secondary mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Get Hired</span>
            </h2>
            <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto">
              Our comprehensive suite of AI-powered tools helps you create outstanding job applications and track your progress.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="card-dark rounded-2xl p-6 shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-dark-text-secondary">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-dark-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Professionals</span>
            </h2>
            <p className="text-xl text-dark-text-secondary max-w-3xl mx-auto">
              See how AI Job Suite has helped thousands of professionals land their dream jobs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="card-dark rounded-2xl p-6 shadow-dark-lg"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-dark-text-secondary mb-4">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-dark-text-muted">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Job Search?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who have successfully landed their dream jobs with AI Job Suite.
            </p>
            {!isAuthenticated && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                className="bg-dark-text-primary text-accent-primary px-8 py-4 rounded-lg font-medium text-lg hover:bg-dark-text-secondary/10 transition-all duration-200 shadow-lg"
              >
                Start Your Free Trial
              </motion.button>
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