import React, { useState, useCallback, useMemo } from 'react';
import {
  StarIcon,
  LockClosedIcon,
  SparklesIcon,
  CpuChipIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SubscriptionModal from '../subscription/SubscriptionModal'; // Assuming this is the full-screen modal

interface PremiumFeatureGateProps {
  children: (isAccessGranted: boolean, openModal: () => void) => React.ReactNode;
  feature: string;
  description?: string;
  requiresPremium?: boolean;
  actionButtonLabel?: string;
}

export default function PremiumFeatureGate({ 
  children, 
  feature, 
  description, 
  requiresPremium = true,
  actionButtonLabel = 'Get Career Boost'
}: PremiumFeatureGateProps) {
  const { canUseAI, tier, credits } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isAccessGranted = useMemo(() => {
    if (!requiresPremium) return true;
    return canUseAI;
  }, [requiresPremium, canUseAI]);

  const openModal = useCallback(() => setShowUpgradeModal(true), []);
  const closeModal = useCallback(() => setShowUpgradeModal(false), []);

  return (
    <>
      {children(isAccessGranted, openModal)}

      <AnimatePresence>
        {showUpgradeModal && !isAccessGranted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-br from-white to-surface-50 border border-surface-200 rounded-[3rem] p-12 md:p-20 text-center max-w-2xl w-full shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden"
            >
              {/* Subtle Background */}
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
              <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-brand-blue/[0.05] rounded-full blur-[80px]" />
              
              <div className="relative z-10 space-y-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto shadow-inner text-brand-blue">
                  <LockClosedIcon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-brand-dark tracking-tight leading-none">
                  Premium Restricted.
                </h3>
                <p className="text-text-secondary text-lg font-bold leading-relaxed max-w-sm mx-auto">
                  This module requires a <span className="text-brand-blue underline decoration-brand-blue/30 decoration-4">premium subscription or AI credits</span> to initiate.
                </p>
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue/5 border border-brand-blue/10 rounded-full text-brand-blue text-[10px] font-black uppercase tracking-widest">
                  <CpuChipIcon className="w-4 h-4" />
                  {description || `${feature} requires higher clearance.`}
                </div>
              </div>
              
              <div className="mt-12 space-y-6">
                <Link
                  to="/dashboard/upgrade"
                  onClick={closeModal}
                  className="btn-primary px-10 py-5 text-lg font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 group"
                >
                  Unlock Full Access <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <div className="flex flex-col items-center gap-2 text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <StarIcon className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Your current tier: {tier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BoltIcon className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Your credits: {credits}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}