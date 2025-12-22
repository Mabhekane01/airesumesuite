import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          if (data.user?.email) {
            setUserEmail(data.user.email);
          }
          toast.success('Email verified! You can now log in.');
        } else {
          if (data.message?.includes('expired') || data.errors?.[0]?.includes('expired')) {
            setStatus('expired');
            setMessage('Your verification link has expired. Please request a new one.');
          } else {
            setStatus('error');
            setMessage(data.message || 'Email verification failed.');
          }
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = () => {
    navigate('/resend-verification', { 
      state: { email: userEmail || '' } 
    });
  };

  const handleGoToLogin = () => {
    navigate('/', { state: { showLogin: true } });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-50 rounded-xl shadow-2xl border border-surface-200 p-8 text-center"
      >
        {status === 'loading' && (
          <>
            <div className="mx-auto w-16 h-16 mb-6">
              <ArrowPathIcon className="w-16 h-16 text-emerald-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-4">
              Verifying Your Email
            </h1>
            <p className="text-gray-300">
              Please wait while we verify your email address...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 mb-6">
              <CheckCircleIcon className="w-16 h-16 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-4">
              Email Verified Successfully! 🎉
            </h1>
            <p className="text-gray-300 mb-6">
              {message}
            </p>
            <motion.button
              onClick={handleGoToLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
            >
              Sign In Now
            </motion.button>
            <p className="text-sm text-gray-400 mt-4">
              You can now access all features of AI Job Suite
            </p>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="mx-auto w-16 h-16 mb-6">
              <XCircleIcon className="w-16 h-16 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-4">
              Verification Link Expired
            </h1>
            <p className="text-gray-300 mb-6">
              {message}
            </p>
            <motion.button
              onClick={handleResendVerification}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 mb-3"
            >
              Request New Verification Link
            </motion.button>
            <Link
              to="/"
              className="block w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 mb-6">
              <XCircleIcon className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-4">
              Verification Failed
            </h1>
            <p className="text-gray-300 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <motion.button
                onClick={handleResendVerification}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
              >
                Request New Verification Link
              </motion.button>
              <Link
                to="/"
                className="block w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
              >
                Back to Home
              </Link>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-surface-200">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team
          </p>
        </div>
      </motion.div>
    </div>
  );
}
