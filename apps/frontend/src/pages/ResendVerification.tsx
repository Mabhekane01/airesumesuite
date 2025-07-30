import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:3001';

export default function ResendVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get email from URL params or location state
  const emailFromUrl = searchParams.get('email');
  const emailFromState = location.state?.email;
  const [email, setEmail] = useState(emailFromUrl || emailFromState || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success('Verification email sent! Please check your inbox.');
      } else {
        if (response.status === 429) {
          toast.error('Please wait before requesting another verification email.');
        } else if (data.errors?.[0]?.includes('already verified')) {
          toast.info('This email is already verified. You can log in normally.');
          navigate('/', { state: { showLogin: true } });
        } else {
          toast.error(data.message || 'Failed to send verification email');
        }
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToLogin = () => {
    navigate('/', { state: { showLogin: true } });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-dark-secondary rounded-xl shadow-2xl border border-dark-border p-8 text-center"
        >
          <div className="mx-auto w-16 h-16 mb-6">
            <EnvelopeIcon className="w-16 h-16 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Verification Email Sent! 📧
          </h1>
          <p className="text-gray-300 mb-6">
            We've sent a new verification link to <strong>{email}</strong>. 
            Please check your inbox and click the verification link.
          </p>
          
          <div className="bg-dark-tertiary border border-dark-border rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-purple-400 mb-2">
              Can't find the email?
            </h3>
            <ul className="text-xs text-gray-400 space-y-1 text-left">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Wait a few minutes for delivery</li>
            </ul>
          </div>

          <div className="space-y-3">
            <motion.button
              onClick={handleGoToLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
            >
              Go to Login
            </motion.button>
            <Link
              to="/"
              className="block w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-dark-secondary rounded-xl shadow-2xl border border-dark-border p-8"
      >
        <button
          onClick={handleGoBack}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 mb-4">
            <EnvelopeIcon className="w-16 h-16 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Resend Verification Email
          </h1>
          <p className="text-gray-300">
            Enter your email address to receive a new verification link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your email address"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Verification Email'
            )}
          </motion.button>
        </form>

        <div className="mt-6 pt-6 border-t border-dark-border text-center">
          <p className="text-sm text-gray-400 mb-4">
            Already verified your email?
          </p>
          <button
            onClick={handleGoToLogin}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Sign in to your account
          </button>
        </div>

        <div className="mt-6 bg-dark-tertiary border border-dark-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">
            ⚠️ Rate Limiting
          </h3>
          <p className="text-xs text-gray-400">
            For security, you can only request a new verification email every 5 minutes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}