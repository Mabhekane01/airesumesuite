import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  HomeIcon,
  StarIcon,
  CommandLineIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { paystackService } from '../../services/paystackService';
import { motion } from 'framer-motion';

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

  const paymentRef = useMemo(() => searchParams.get('reference') || searchParams.get('trxref'), [searchParams]);

  useEffect(() => {
    if (!paymentRef) {
      navigate('/dashboard/upgrade');
      return;
    }

    const controller = new AbortController();
    const verifyPayment = async () => {
      try {
        const planType = localStorage.getItem('selectedPlanType');
        if (!planType) {
          navigate('/dashboard/upgrade');
          return;
        }

        const verification = await paystackService.verifyPayment(paymentRef, planType);
        if (controller.signal.aborted) return;
        
        if (verification.success) {
          toast.success('🎉 Transaction Verified. Welcome to Enterprise.');
          setVerificationState({ loading: false, success: true, error: null, paymentDetails: verification.data });
          await refreshUserProfile();
        } else {
          setVerificationState({ loading: false, success: false, error: 'Verification failed', paymentDetails: null });
          setTimeout(() => navigate('/dashboard/upgrade'), 3000);
        }
      } catch (error: any) {
        if (!controller.signal.aborted) {
          setVerificationState({ loading: false, success: false, error: error.message, paymentDetails: null });
          setTimeout(() => navigate('/dashboard/upgrade'), 3000);
        }
      }
    };

    verifyPayment();
    return () => controller.abort();
  }, [paymentRef, navigate, refreshUserProfile]);

  if (verificationState.loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 rounded-[2.5rem] bg-white border border-surface-200 flex items-center justify-center shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-brand-blue/10 animate-pulse" />
          <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em]">Verifying Transaction Protocol...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-20 px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-success/[0.03] rounded-full blur-[140px]" />
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        {/* Success Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-[2.5rem] bg-brand-success/10 border-2 border-brand-success/20 flex items-center justify-center shadow-lg shadow-brand-success/10"
            >
              <CheckCircleIconSolid className="w-12 h-12 text-brand-success" />
            </motion.div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-display font-black text-brand-dark tracking-tighter leading-none">
            Deployment <span className="text-brand-success">Successful.</span>
          </h1>
          
          <p className="text-xl text-text-secondary font-bold max-w-2xl mx-auto opacity-80 leading-relaxed">
            System initialization complete. Your professional architecture has been upgraded to the <span className="text-brand-dark underline decoration-brand-blue/30 decoration-4">Enterprise Tier</span>.
          </p>
        </div>

        {/* Details Card */}
        {verificationState.paymentDetails && (
          <div className="bg-white border border-surface-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.1]" />
            <div className="relative z-10 space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <CommandLineIcon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-brand-dark uppercase tracking-widest">Transaction Manifest</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Reference ID</p>
                    <p className="text-sm font-mono font-bold text-brand-dark truncate bg-surface-50 p-2 rounded-lg border border-surface-100">{verificationState.paymentDetails.reference}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Yield Processed</p>
                    <p className="text-xl font-black text-brand-dark tracking-tight">{paystackService.formatAmount(verificationState.paymentDetails.amount)}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Network Status</p>
                    <div className="flex items-center gap-2 text-brand-success font-black text-sm uppercase tracking-tighter">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                      {verificationState.paymentDetails.status}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Synchronization</p>
                    <p className="text-sm font-bold text-brand-dark">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4 shadow-xl shadow-brand-blue/20 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RocketLaunchIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Return to Grid</p>
              <h3 className="text-lg font-black text-white">Access Dashboard</h3>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/coach')}
            className="bg-white border border-surface-200 p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-1">Initialize Intelligence</p>
              <h3 className="text-lg font-black text-brand-dark">AI Career Coach</h3>
            </div>
          </button>
        </div>

        <div className="text-center pt-10 border-t border-surface-100">
          <p className="text-xs font-black text-text-tertiary uppercase tracking-[0.2em] flex items-center justify-center gap-3">
            <ShieldCheckIcon className="w-4 h-4" /> System Optimized for Maximum Yield
          </p>
        </div>
      </div>
    </div>
  );
}