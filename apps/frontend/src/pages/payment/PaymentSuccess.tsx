import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  HomeIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { paystackService } from '../../services/paystackService';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuthStore();
  const [verificationState, setVerificationState] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
    paymentDetails: any;
  }>({
    loading: true,
    success: false,
    error: null,
    paymentDetails: null
  });

  // Get reference once and memoize it
  const paymentRef = useMemo(() => {
    const ref = searchParams.get('reference') || searchParams.get('trxref');
    console.log('Payment reference extracted:', ref);
    return ref;
  }, [searchParams]);

  useEffect(() => {
    if (!paymentRef) {
      console.log('No payment reference found');
      toast.error('No payment reference found');
      navigate('/dashboard/upgrade');
      return;
    }

    // Create a controller to cancel the request if component unmounts
    const controller = new AbortController();
    let hasShownToast = false;

    const verifyPayment = async () => {
      try {
        console.log('=== STARTING PAYMENT VERIFICATION ===');
        console.log('Reference:', paymentRef);
        
        // Retrieve planType from localStorage
        const planType = localStorage.getItem('selectedPlanType');
        if (!planType) {
          toast.error('Could not determine subscription plan. Please try again.');
          navigate('/dashboard/upgrade');
          return;
        }

        const verification = await paystackService.verifyPayment(paymentRef, planType);
        console.log('Verification response:', verification);
        
        // Check if component was unmounted
        if (controller.signal.aborted) {
          console.log('Component unmounted, aborting verification');
          return;
        }
        
        if (verification.success) {
          console.log('Payment verification SUCCESS');
          
          // Show toast only once
          if (!hasShownToast) {
            hasShownToast = true;
            toast.success('🎉 Payment verified successfully!');
          }
          
          // Update state
          setVerificationState({
            loading: false,
            success: true,
            error: null,
            paymentDetails: verification.data
          });
          
          // Refresh user profile
          console.log('Refreshing user profile...');
          try {
            await refreshUserProfile();
            console.log('=== PROFILE REFRESH COMPLETED ===');
          } catch (error) {
            console.error('Profile refresh failed:', error);
          }
          
        } else {
          console.log('Payment verification FAILED');
          setVerificationState({
            loading: false,
            success: false,
            error: 'Payment verification unsuccessful',
            paymentDetails: null
          });
          
          if (!hasShownToast) {
            hasShownToast = true;
            toast.error('Payment verification unsuccessful');
          }
          
          setTimeout(() => navigate('/dashboard/upgrade'), 3000);
        }
      } catch (error: any) {
        console.error('Payment verification ERROR:', error);
        
        if (!controller.signal.aborted) {
          setVerificationState({
            loading: false,
            success: false,
            error: error.message || 'Payment verification failed',
            paymentDetails: null
          });
          
          if (!hasShownToast) {
            hasShownToast = true;
            toast.error('Payment verification failed');
          }
          
          setTimeout(() => navigate('/dashboard/upgrade'), 3000);
        }
      }
    };

    verifyPayment();

    // Cleanup function
    return () => {
      console.log('PaymentSuccess component unmounting, aborting requests');
      controller.abort();
    };
  }, [paymentRef]); // Only depend on paymentRef

  if (verificationState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent-primary/30 border-t-accent-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-accent-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-dark-text-primary">Verifying Payment</h3>
            <p className="text-dark-text-secondary text-sm">Please wait while we confirm your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent-primary/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <CheckCircleIconSolid className="w-20 h-20 text-green-400 animate-bounce" />
              <div className="absolute -top-2 -right-2">
                <SparklesIcon className="w-8 h-8 text-accent-primary animate-pulse" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold gradient-text-dark mb-4">
            Payment Successful! 🎉
          </h1>
          
          <p className="text-xl text-dark-text-secondary mb-2">
            Welcome to AI Job Suite Enterprise
          </p>
          
          <p className="text-dark-text-muted">
            Your account has been upgraded and all premium features are now active
          </p>
        </div>

        {/* Payment Details */}
        {verificationState.paymentDetails && (
          <div className="card-dark rounded-xl border border-dark-border p-6 mb-8">
            <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
              Payment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Reference:</span>
                  <span className="text-dark-text-primary font-mono">{verificationState.paymentDetails.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Amount:</span>
                  <span className="text-dark-text-primary font-semibold">
                    {paystackService.formatAmount(verificationState.paymentDetails.amount)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Status:</span>
                  <span className="text-green-400 font-semibold flex items-center">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    {verificationState.paymentDetails.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Date:</span>
                  <span className="text-dark-text-primary">
                    {verificationState.paymentDetails.paid_at ? new Date(verificationState.paymentDetails.paid_at).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Features Now Available */}
        <div className="card-dark rounded-xl border border-dark-border p-6 mb-8">
          <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center">
            <RocketLaunchIcon className="w-5 h-5 text-accent-primary mr-2" />
            Premium Features Now Active
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Unlimited AI Resume Generation',
              'AI-Powered Cover Letters',
              'Smart Career Coach',
              'Priority Support',
              'Advanced Analytics',
              'Application Tracking',
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircleIconSolid className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-dark-text-primary">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-accent-primary to-accent-secondary hover:shadow-glow-lg text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
          >
            <RocketLaunchIcon className="w-5 h-5" />
            <span>Start Using Enterprise Features</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center space-x-2 border border-dark-border text-dark-text-primary hover:border-accent-primary/50 hover:text-accent-primary py-3 px-6 rounded-lg transition-all duration-300"
          >
            <HomeIcon className="w-5 h-5" />
            <span>Go to Dashboard</span>
          </button>
        </div>

        {/* Support Information */}
        <div className="text-center mt-12 space-y-2">
          <p className="text-dark-text-secondary text-sm">
            Need help getting started with your Enterprise features?
          </p>
          <p className="text-dark-text-muted text-sm">
            Contact our support team at{' '}
            <a 
              href="mailto:support@airesumesuite.com" 
              className="text-accent-primary hover:text-accent-secondary transition-colors"
            >
              support@airesumesuite.com
            </a>
          </p>
        </div>

        {/* Celebration Animation */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {[...Array(6)].map((_, i) => (
            <StarIcon
              key={i}
              className={`absolute w-6 h-6 text-yellow-400 animate-ping opacity-75 ${
                i % 2 === 0 ? 'animate-bounce' : 'animate-pulse'
              }`}
              style={{
                top: `${20 + (i * 15)}%`,
                left: `${10 + (i * 15)}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + (i * 0.3)}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}