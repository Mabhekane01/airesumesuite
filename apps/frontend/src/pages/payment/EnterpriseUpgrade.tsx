import React, { useState, useEffect } from 'react';
import {
  StarIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  BoltIcon,
  SparklesIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  InformationCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  LockClosedIcon,
  FireIcon,
  RocketLaunchIcon,
  HeartIcon,
  CommandLineIcon,
  CpuChipIcon,
  ChevronRightIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { locationCurrencyService, PricingData } from '../../services/locationCurrencyService';
import { paystackService } from '../../services/paystackService';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnterpriseUpgrade() {
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [processing, setProcessing] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(true);
  const { user, isAuthenticated, accessToken } = useAuthStore();

  const enterpriseFeatures = [
    { icon: <RocketLaunchIcon />, title: 'Unlimited AI Generation', desc: 'Continuous optimization logic' },
    { icon: <SparklesIcon />, title: 'Advanced Semantic Sync', desc: 'Deep ATS matching protocols' },
    { icon: <BoltIcon />, title: 'Real-time Career Coach', desc: 'Cognitive trajectory planning' },
    { icon: <ShieldCheckIcon />, title: 'Encryption Tier-1', desc: 'Institutional data protection' },
    { icon: <GlobeAltIcon />, title: 'Global Market Grid', desc: 'Direct node scraping access' },
    { icon: <ChartBarIcon />, title: 'Institutional Analytics', desc: 'Success delta visualization' }
  ];

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const pricingData = await locationCurrencyService.calculatePricing();
      setPricing(pricingData);
      toast.success(`Node Identified: ${pricingData.location.country}`);
    } catch (error) {
      toast.error('Failed to load local pricing.');
    } finally {
      setLoading(false);
      setLocationDetecting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!pricing || !user?.email || !isAuthenticated || !accessToken) return;
    try {
      setProcessing(true);
      const amount = selectedPlan === 'monthly' ? pricing.localMonthly : pricing.localYearly;
      const response = await paystackService.processEnterpriseUpgrade(selectedPlan, amount, pricing.currency, user.email, pricing.location);
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

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-slide-up-soft relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-blue/[0.02] rounded-full blur-[140px]" />
      </div>

      {/* --- HEADER --- */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-10">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-surface-200 text-brand-blue font-black uppercase tracking-[0.3em] text-[10px] shadow-sm shadow-brand-blue/5">
          <StarIconSolid className="w-4 h-4 animate-pulse" />
          Enterprise Deployment Layer
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black text-brand-dark tracking-tighter leading-none">
          Scale Your <span className="text-brand-blue">Impact.</span>
        </h1>
        <p className="text-xl text-text-secondary font-bold opacity-80 leading-relaxed">
          Initialize the complete career engineering stack. 
          Unlimited deployments, institutional intelligence, and real-time trajectory optimization.
        </p>
      </div>

      {/* --- LOCATION CONSOLE --- */}
      <div className="bg-white border border-surface-200 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-center gap-10">
        <div className="flex items-center gap-3">
          <MapPinIcon className="w-5 h-5 text-brand-blue opacity-60" />
          <span className="text-xs font-black text-brand-dark uppercase tracking-widest">{pricing.location.country} Node</span>
        </div>
        <div className="w-px h-4 bg-surface-200 hidden md:block" />
        <div className="flex items-center gap-3">
          <CurrencyDollarIcon className="w-5 h-5 text-brand-success opacity-60" />
          <span className="text-xs font-black text-brand-dark uppercase tracking-widest">Active Currency: {pricing.currency}</span>
        </div>
        <div className="w-px h-4 bg-surface-200 hidden md:block" />
        <div className="flex items-center gap-3">
          <LockClosedIcon className="w-5 h-5 text-text-tertiary opacity-60" />
          <span className="text-xs font-black text-text-tertiary uppercase tracking-widest">SSL Encrypted Terminal</span>
        </div>
      </div>

      {/* --- PRICING ARCHITECTURE --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Monthly */}
        <div 
          onClick={() => setSelectedPlan('monthly')}
          className={`cursor-pointer group relative p-1 transition-all duration-500 rounded-[3rem] ${selectedPlan === 'monthly' ? 'bg-surface-200 shadow-2xl' : 'hover:bg-surface-100'}`}
        >
          <div className="bg-white p-12 rounded-[2.85rem] border border-surface-200 h-full flex flex-col items-center text-center space-y-8 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 transition-all duration-500 ${selectedPlan === 'monthly' ? 'bg-brand-blue' : 'bg-transparent'}`} />
            <div>
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-4">Standard Protocol</p>
              <h3 className="text-2xl font-black text-brand-dark">Monthly Sync</h3>
            </div>
            <div className="space-y-1">
              <div className="text-6xl font-black text-brand-dark tracking-tighter">
                {pricing.currencySymbol}{pricing.localMonthly}
              </div>
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Per 30-Day Cycle</p>
            </div>
            <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all ${selectedPlan === 'monthly' ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20' : 'bg-surface-50 text-text-tertiary border border-surface-200'}`}>
              {selectedPlan === 'monthly' ? 'Initialized' : 'Select Protocol'}
            </button>
          </div>
        </div>

        {/* Yearly */}
        <div 
          onClick={() => setSelectedPlan('yearly')}
          className={`cursor-pointer group relative p-1 transition-all duration-500 rounded-[3.5rem] ${selectedPlan === 'yearly' ? 'bg-brand-blue shadow-[0_40px_80px_-20px_rgba(26,145,240,0.3)] scale-[1.02]' : 'hover:bg-brand-blue/10 shadow-xl'}`}
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-brand-orange text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest border-2 border-white">Maximum Yield</div>
          </div>
          <div className="bg-white p-12 rounded-[3.35rem] border border-surface-200 h-full flex flex-col items-center text-center space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-blue/[0.02] pointer-events-none" />
            <div>
              <p className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] mb-4">Priority Architecture</p>
              <h3 className="text-2xl font-black text-brand-dark">Annual Deployment</h3>
            </div>
            <div className="space-y-1">
              <div className="text-6xl font-black text-brand-blue tracking-tighter">
                {pricing.currencySymbol}{pricing.localYearly}
              </div>
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Per 365-Day Cycle</p>
              <div className="mt-4 px-4 py-1.5 bg-brand-success/10 text-brand-success text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-success/20">
                Save {pricing.savingsPercentage}% Logic Overhead
              </div>
            </div>
            <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all ${selectedPlan === 'yearly' ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/30' : 'bg-surface-50 text-text-tertiary border border-surface-200'}`}>
              {selectedPlan === 'yearly' ? 'System Primed' : 'Select Protocol'}
            </button>
          </div>
        </div>
      </div>

      {/* --- FEATURE MATRIX --- */}
      <div className="bg-white border border-surface-200 rounded-[3rem] p-12 md:p-20 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-3xl font-black text-brand-dark tracking-tight leading-tight">Institutional <br />Capabilities.</h2>
            <p className="text-base font-bold text-text-secondary opacity-80 leading-relaxed">
              Unlock the core AI infrastructure designed for high-performance career scale.
            </p>
            <div className="pt-6">
              <div className="flex items-center gap-3 text-brand-success">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Verified System Integrity</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {enterpriseFeatures.map((f, i) => (
              <div key={i} className="p-6 bg-surface-50 border border-surface-200 rounded-[2rem] group hover:border-brand-blue/30 hover:bg-white transition-all duration-500 shadow-sm hover:shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-brand-blue mb-4 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all">
                  {React.cloneElement(f.icon as any, { className: "w-5 h-5" })}
                </div>
                <h4 className="text-base font-black text-brand-dark tracking-tight mb-1">{f.title}</h4>
                <p className="text-[11px] font-bold text-text-secondary opacity-70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- FINAL ACTION --- */}
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleUpgrade}
          disabled={processing}
          className="w-full bg-brand-dark text-white p-8 rounded-[2rem] flex items-center justify-between group shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <RocketLaunchIcon className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] mb-1">Execute Protocol</p>
              <h3 className="text-3xl font-black tracking-tight">Deploy Enterprise.</h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none mb-1">Secure Transaction</p>
              <p className="text-xl font-black text-brand-blue tracking-tighter">
                {pricing.currencySymbol}{selectedPlan === 'monthly' ? pricing.localMonthly : pricing.localYearly}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand-blue group-hover:border-brand-blue transition-all">
              {processing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <ChevronRightIcon className="w-6 h-6 stroke-[3]" />}
            </div>
          </div>
        </button>
        <div className="mt-8 flex justify-center gap-8 text-[10px] font-black text-text-tertiary uppercase tracking-widest">
          <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-success" /> No Hidden Nodes</div>
          <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-success" /> 30-Day Satisfaction Delta</div>
          <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-success" /> Abort Anytime</div>
        </div>
      </div>
    </div>
  );
}