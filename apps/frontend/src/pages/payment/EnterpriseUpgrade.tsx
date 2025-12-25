import React, { useState, useEffect } from 'react';
import {
  StarIcon,
  CheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  BoltIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { locationCurrencyService, PricingData } from '../../services/locationCurrencyService';
import { paystackService } from '../../services/paystackService';
import { motion } from 'framer-motion';

export default function EnterpriseUpgrade() {
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user, isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const pricingData = await locationCurrencyService.calculatePricing();
      setPricing(pricingData);
    } catch (error) {
      toast.error('Failed to load local pricing.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (type: 'subscription' | 'credits', planId: string, amount: number, description: string) => {
    if (!pricing || !user?.email || !isAuthenticated || !accessToken) return;
    try {
      setProcessing(true);
      
      // Store current plan selection for verification handshake
      localStorage.setItem('selectedPlanId', planId);
      localStorage.setItem('selectedPlanType', planId === 'enterprise' || planId === 'pro' ? 'monthly' : 'credits');

      // Pass metadata to identify if it's a subscription or credit purchase
      const response = await paystackService.processEnterpriseUpgrade(
        planId as any, 
        amount, 
        pricing.currency, 
        user.email, 
        pricing.location
      );
      
      window.location.href = `/dashboard/upgrade/success?reference=${response.reference}`;
    } catch (error: any) {
      if (error.message !== 'Payment cancelled by user') toast.error('Transaction failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 rounded-[2.5rem] bg-white border border-surface-200 flex items-center justify-center shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-brand-blue/10 animate-pulse" />
          <StarIcon className="w-10 h-10 text-brand-blue animate-spin-slow" />
        </div>
        <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em]">Initializing Pricing Protocol...</p>
      </div>
    );
  }

  if (!pricing) return null;

  // Calculate local prices for credit packs based on base ZAR rates
  // 5 Credits = R50 (~$2.70), 15 Credits = R120 (~$6.50), 50 Credits = R350 (~$19)
  // We'll use the currency ratio from the service if available, or rough estimates
  const getPrice = (zarPrice: number) => {
    if (pricing.currency === 'ZAR') return zarPrice;
    return Math.ceil(zarPrice / 18); // Rough conversion to USD/EUR if not ZAR
  };

  const creditPacks = [
    { credits: 5, price: getPrice(50), label: "Starter Pack", desc: "Perfect for a single application." },
    { credits: 15, price: getPrice(120), label: "Career Pack", desc: "Best value for active job seekers.", popular: true },
    { credits: 50, price: getPrice(350), label: "Power Pack", desc: "For serious career pivots." }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 animate-slide-up-soft relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-blue/[0.02] rounded-full blur-[140px]" />
      </div>

      {/* --- HEADER --- */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-10">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-surface-200 text-brand-blue font-black uppercase tracking-[0.3em] text-[10px] shadow-sm shadow-brand-blue/5">
          <RocketLaunchIcon className="w-4 h-4 animate-pulse" />
          Career Acceleration
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black text-brand-dark tracking-tighter leading-none">
          Invest in Your <span className="text-brand-blue">Future.</span>
        </h1>
        <p className="text-xl text-text-secondary font-bold opacity-80 leading-relaxed">
          Flexible options designed for your career stage. Pay per document or unlock full access.
        </p>
      </div>

      {/* --- LOCATION CONSOLE --- */}
      <div className="bg-white border border-surface-200 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-center gap-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <MapPinIcon className="w-5 h-5 text-brand-blue opacity-60" />
          <span className="text-xs font-black text-brand-dark uppercase tracking-widest">{pricing.location.country} Pricing</span>
        </div>
        <div className="w-px h-4 bg-surface-200 hidden md:block" />
        <div className="flex items-center gap-3">
          <CurrencyDollarIcon className="w-5 h-5 text-brand-success opacity-60" />
          <span className="text-xs font-black text-brand-dark uppercase tracking-widest">Currency: {pricing.currency}</span>
        </div>
        <div className="w-px h-4 bg-surface-200 hidden md:block" />
        <div className="flex items-center gap-3">
          <LockClosedIcon className="w-5 h-5 text-text-tertiary opacity-60" />
          <span className="text-xs font-black text-text-tertiary uppercase tracking-widest">Secure Payment</span>
        </div>
      </div>

      {/* --- SUBSCRIPTION OPTIONS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Pro Subscription */}
        <div className="bg-brand-dark p-10 rounded-[3rem] border border-brand-dark relative overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,145,240,0.2),transparent_60%)]" />
          <div className="relative z-10 space-y-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black mb-2">Career Boost</h3>
                <p className="text-sm font-bold text-brand-blue uppercase tracking-widest">Monthly Pro Protocol</p>
              </div>
              <SparklesIcon className="w-8 h-8 text-brand-blue" />
            </div>
            <div className="text-5xl font-black tracking-tighter">
              {pricing.currencySymbol}{pricing.localMonthly}<span className="text-lg font-bold text-white/40">/mo</span>
            </div>
            <ul className="space-y-4 text-sm font-medium">
              {[
                'Tailored AI Resume Synthesis',
                'Advanced Cover Letter Logic',
                'ATS Keyword Mapping',
                'Job Match Vectoring',
                'Zero System Watermarks'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckIconSolid className="w-5 h-5 text-brand-blue" />
                  {item}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handlePurchase('subscription', 'pro', pricing.localMonthly, 'Monthly Career Boost')}
              disabled={processing}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs bg-brand-blue text-white hover:bg-blue-600 transition-all shadow-lg shadow-brand-blue/20"
            >
              {processing ? 'Handshaking...' : 'Activate Pro Boost'}
            </button>
          </div>
        </div>

        {/* Institutional / Enterprise Tier */}
        <div className="bg-white p-10 rounded-[3rem] border border-brand-orange/20 relative overflow-hidden group hover:border-brand-orange/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <BuildingOfficeIcon className="w-24 h-24" />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-brand-dark mb-2">Institutional</h3>
                <p className="text-sm font-bold text-brand-orange uppercase tracking-widest">Enterprise Command</p>
              </div>
              <RocketLaunchIcon className="w-8 h-8 text-brand-orange" />
            </div>
            <div className="text-5xl font-black text-brand-dark tracking-tighter">
              {pricing.currencySymbol}{pricing.localMonthly * 5}<span className="text-lg font-bold text-text-tertiary">/mo</span>
            </div>
            <ul className="space-y-4 text-sm font-bold text-text-secondary">
              {[
                'Everything in Pro Protocol',
                'Bulk Credit Multipliers',
                'Institutional Intelligence Nodes',
                'Priority Processing Layer',
                'API & Dashboard Access'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckIconSolid className="w-5 h-5 text-brand-orange" />
                  {item}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handlePurchase('subscription', 'enterprise', pricing.localMonthly * 5, 'Institutional Command')}
              disabled={processing}
              className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs bg-brand-dark text-white border-2 border-brand-orange hover:bg-brand-orange transition-all shadow-2xl shadow-brand-orange/20 flex items-center justify-center gap-2 group"
            >
              {processing ? 'Calibrating...' : (
                <>
                  Unlock Institutional <RocketLaunchIcon className="w-4 h-4 text-brand-orange group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- CREDIT PACKS --- */}
      <div className="max-w-5xl mx-auto pt-10 border-t border-surface-200">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-brand-dark tracking-tight mb-4">Pay As You Go.</h2>
          <p className="text-text-secondary font-bold max-w-xl mx-auto">
            Prefer no commitment? Buy credits to use AI features whenever you need them.
            <br /><span className="text-brand-blue">1 Credit = 1 AI Action (Resume or Cover Letter)</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {creditPacks.map((pack, i) => (
            <div key={i} className={`bg-white border rounded-[2.5rem] p-8 relative overflow-hidden transition-all duration-300 hover:shadow-xl ${pack.popular ? 'border-brand-blue/30 shadow-lg scale-105 z-10' : 'border-surface-200 hover:border-brand-blue/20'}`}>
              {pack.popular && (
                <div className="absolute top-0 left-0 w-full bg-brand-blue text-white text-[9px] font-black uppercase tracking-widest text-center py-1.5">
                  Most Popular
                </div>
              )}
              <div className="space-y-6 mt-4">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/5 flex items-center justify-center text-brand-blue mb-4">
                  <BoltIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-brand-dark">{pack.label}</h3>
                  <p className="text-xs font-bold text-text-tertiary mt-1">{pack.desc}</p>
                </div>
                <div className="text-3xl font-black text-brand-dark tracking-tighter">
                  {pricing.currencySymbol}{pack.price}
                </div>
                <div className="pt-4 border-t border-surface-100">
                  <div className="flex items-center justify-between text-xs font-bold mb-4">
                    <span className="text-text-secondary">{pack.credits} AI Credits</span>
                    <span className="text-brand-success">{(pack.price / pack.credits).toFixed(0)} {pricing.currency}/credit</span>
                  </div>
                  <button 
                    onClick={() => handlePurchase('credits', `credits-${pack.credits}`, pack.price, `${pack.credits} AI Credits`)}
                    disabled={processing}
                    className={`w-full py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all ${
                      pack.popular 
                        ? 'bg-brand-dark text-white hover:bg-slate-800' 
                        : 'bg-surface-50 text-brand-dark hover:bg-surface-100 border border-surface-200'
                    }`}
                  >
                    Buy Pack
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}