import React, { useState, useEffect } from 'react';
import {
  StarIcon,
  CreditCardIcon,
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
  HeartIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { locationCurrencyService, PricingData } from '../../services/locationCurrencyService';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  popular?: boolean;
}

export default function EnterpriseUpgrade() {
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPayment, setSelectedPayment] = useState<string>('stripe');
  const [processing, setProcessing] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(true);
  const [currencyUpdating, setCurrencyUpdating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const { user } = useAuthStore();

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'stripe',
      name: 'Credit Card',
      icon: '💳',
      description: 'Visa, Mastercard, Amex - Instant activation',
      available: true,
      popular: true
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '🅿️',
      description: 'Pay securely with your PayPal account',
      available: true
    }
  ];

  const enterpriseFeatures = [
    {
      icon: <RocketLaunchIcon className="w-6 h-6" />,
      title: 'Unlimited AI Resume Generation',
      description: 'Create unlimited professional resumes with advanced AI optimization and ATS compliance',
      free: false,
      enterprise: true,
      highlight: true
    },
    {
      icon: <SparklesIcon className="w-6 h-6" />,
      title: 'AI-Powered Cover Letters',
      description: 'Generate personalized, compelling cover letters for every job application',
      free: false,
      enterprise: true,
      highlight: true
    },
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: 'Smart Career Coach',
      description: 'Get personalized career advice, interview prep, and salary negotiation tips',
      free: false,
      enterprise: true,
      highlight: true
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: 'Priority Support',
      description: '24/7 premium support with dedicated success manager',
      free: false,
      enterprise: true
    },
    {
      icon: <GlobeAltIcon className="w-6 h-6" />,
      title: 'Advanced Analytics',
      description: 'Deep insights into your job search performance with actionable recommendations',
      free: '✓',
      enterprise: true
    },
    {
      icon: <CheckIcon className="w-6 h-6" />,
      title: 'Application Tracking',
      description: 'Comprehensive job application management and follow-up system',
      free: '✓',
      enterprise: true
    }
  ];

  useEffect(() => {
    fetchPricingData();
    
    const interval = setInterval(() => {
      refreshCurrencyRates();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      setLocationDetecting(true);
      
      const pricingData = await locationCurrencyService.calculatePricing();
      setPricing(pricingData);
      
      toast.success(`🌍 Location detected: ${pricingData.location.country}`, {
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
      toast.error('Failed to load pricing information');
      
      try {
        const fallbackData = await locationCurrencyService.calculatePricing();
        setPricing(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback pricing failed:', fallbackError);
      }
    } finally {
      setLoading(false);
      setLocationDetecting(false);
    }
  };

  const refreshCurrencyRates = async () => {
    if (!pricing) return;
    
    try {
      setCurrencyUpdating(true);
      
      const updatedPricing = await locationCurrencyService.calculatePricing();
      
      const monthlyDiff = Math.abs(updatedPricing.localMonthly - pricing.localMonthly) / pricing.localMonthly;
      const yearlyDiff = Math.abs(updatedPricing.localYearly - pricing.localYearly) / pricing.localYearly;
      
      if (monthlyDiff > 0.01 || yearlyDiff > 0.01) {
        setPricing(updatedPricing);
        toast.info('💱 Currency rates updated');
      }
      
    } catch (error) {
      console.warn('Failed to refresh currency rates:', error);
    } finally {
      setCurrencyUpdating(false);
    }
  };

  const handleUpgrade = async () => {
    if (!pricing) return;
    
    try {
      setProcessing(true);
      
      const amount = selectedPlan === 'monthly' ? pricing.localMonthly : pricing.localYearly;
      
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planType: selectedPlan,
          paymentMethod: selectedPayment,
          amount,
          currency: pricing.currency,
          location: pricing.location
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (selectedPayment === 'stripe') {
          window.location.href = data.checkoutUrl;
        } else if (selectedPayment === 'paypal') {
          window.location.href = data.paypalUrl;
        }
      } else {
        toast.error(data.message || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent-primary/30 border-t-accent-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-accent-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-dark-text-primary">Loading Enterprise Upgrade</h3>
            <p className="text-dark-text-secondary text-sm">Detecting location and calculating pricing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="text-center space-y-4 max-w-md card-dark rounded-lg border border-dark-border p-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <XMarkIcon className="w-6 h-6 text-red-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-dark-text-primary">Unable to Load Pricing</h3>
            <p className="text-dark-text-secondary text-sm">We're having trouble loading your personalized pricing. Please try again.</p>
            <button 
              onClick={fetchPricingData}
              className="px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg font-medium transition-all duration-200 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-primary/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent-secondary/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <StarIconSolid className="w-8 h-8 text-accent-primary animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold gradient-text-dark">
              Enterprise Upgrade
            </h1>
          </div>
          
          <p className="text-base md:text-lg text-dark-text-secondary max-w-2xl mx-auto">
            Unlock unlimited AI-powered features for your job search
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-dark-text-muted">
            <div className="flex items-center space-x-1">
              <LockClosedIcon className="w-3 h-3" />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <ShieldCheckIcon className="w-3 h-3" />
              <span>30-day guarantee</span>
            </div>
            <div className="flex items-center space-x-1">
              <HeartIcon className="w-3 h-3" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Location & Currency Info */}
        <div className="mb-6">
          <div className="glass-dark rounded-xl border border-dark-border p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <MapPinIcon className={`w-4 h-4 ${locationDetecting ? 'text-accent-primary animate-pulse' : 'text-blue-400'}`} />
                <div>
                  <p className="text-dark-text-primary text-sm font-medium">
                    {locationDetecting ? 'Detecting...' : pricing.location.country}
                  </p>
                  {pricing.location.city && (
                    <p className="text-dark-text-muted text-xs">{pricing.location.city}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2">
                <CurrencyDollarIcon className={`w-4 h-4 ${currencyUpdating ? 'text-accent-primary animate-pulse' : 'text-green-400'}`} />
                <div>
                  <p className="text-dark-text-primary text-sm font-medium">
                    {pricing.currency} {currencyUpdating && '(updating...)'}
                  </p>
                  {pricing.exchangeRate !== 1 && (
                    <p className="text-dark-text-muted text-xs">
                      1 ZAR = {pricing.exchangeRate.toFixed(4)} {pricing.currency}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-end space-x-2">
                <ClockIcon className="w-4 h-4 text-accent-primary" />
                <div>
                  <p className="text-dark-text-primary text-sm font-medium">Live Rates</p>
                  <p className="text-dark-text-muted text-xs">
                    {pricing.lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {!pricing.location.isAfricanCountry && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center space-x-2 bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-lg border border-yellow-500/20 text-xs">
                  <InformationCircleIcon className="w-3 h-3" />
                  <span>International pricing (2x base rate)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className={`relative cursor-pointer transition-all duration-300 ${
              selectedPlan === 'monthly' 
                ? 'ring-2 ring-accent-primary shadow-glow-sm' 
                : ''
            }`}>
              <div className="card-dark rounded-lg border border-dark-border p-6 h-full hover:border-accent-primary/50 transition-colors">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-3">Monthly</h3>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-dark-text-primary">
                      {pricing.currencySymbol}{pricing.localMonthly}
                    </div>
                    <p className="text-dark-text-secondary text-sm">per month</p>
                    {pricing.exchangeRate !== 1 && (
                      <p className="text-dark-text-muted text-xs">
                        ≈ R{Math.round(pricing.localMonthly / pricing.exchangeRate)} ZAR
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    selectedPlan === 'monthly'
                      ? 'bg-accent-primary text-white shadow-glow-sm'
                      : 'border border-dark-border text-dark-text-secondary hover:border-accent-primary/50 hover:text-accent-primary'
                  }`}
                >
                  {selectedPlan === 'monthly' ? (
                    <span className="flex items-center justify-center space-x-2">
                      <CheckIconSolid className="w-4 h-4" />
                      <span>Selected</span>
                    </span>
                  ) : (
                    'Select Monthly'
                  )}
                </button>
              </div>
            </div>

            {/* Yearly Plan */}
            <div className={`relative cursor-pointer transition-all duration-300 ${
              selectedPlan === 'yearly' 
                ? 'ring-2 ring-accent-primary shadow-glow-sm' 
                : ''
            }`}>
              {/* Best Value Badge */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center space-x-1">
                  <FireIcon className="w-3 h-3" />
                  <span>BEST VALUE</span>
                </div>
              </div>
              
              <div className="card-dark rounded-lg border border-dark-border p-6 h-full hover:border-accent-primary/50 transition-colors">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-3">Yearly</h3>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-dark-text-primary">
                      {pricing.currencySymbol}{pricing.localYearly}
                    </div>
                    <p className="text-dark-text-secondary text-sm">per year</p>
                    {pricing.exchangeRate !== 1 && (
                      <p className="text-dark-text-muted text-xs">
                        ≈ R{Math.round(pricing.localYearly / pricing.exchangeRate)} ZAR
                      </p>
                    )}
                    <div className="bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full inline-block border border-green-500/30">
                      Save {pricing.currencySymbol}{pricing.yearlySavings} ({pricing.savingsPercentage}%)
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    selectedPlan === 'yearly'
                      ? 'bg-accent-primary text-white shadow-glow-sm'
                      : 'border border-dark-border text-dark-text-secondary hover:border-accent-primary/50 hover:text-accent-primary'
                  }`}
                >
                  {selectedPlan === 'yearly' ? (
                    <span className="flex items-center justify-center space-x-2">
                      <CheckIconSolid className="w-4 h-4" />
                      <span>Selected</span>
                    </span>
                  ) : (
                    'Select Yearly'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-dark-text-primary mb-2">What's Included</h2>
            <p className="text-dark-text-secondary text-sm">Compare features and see what makes Enterprise special</p>
            
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="inline-flex items-center space-x-2 bg-dark-secondary/50 hover:bg-dark-secondary text-dark-text-primary px-4 py-2 rounded-lg transition-all duration-200 text-sm border border-dark-border hover:border-accent-primary/50"
              >
                <span>{showComparison ? 'Hide' : 'Show'} Feature Comparison</span>
                <ArrowRightIcon className={`w-3 h-3 transition-transform duration-200 ${showComparison ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enterpriseFeatures.map((feature, index) => (
              <div
                key={index}
                className={`card-dark rounded-lg border border-dark-border p-4 hover:border-accent-primary/50 transition-all duration-300 ${
                  feature.highlight ? 'ring-1 ring-accent-primary/30' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    feature.highlight 
                      ? 'bg-accent-primary/20' 
                      : 'bg-dark-secondary/50'
                  }`}>
                    <div className="text-accent-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-dark-text-primary mb-1">
                      {feature.title}
                      {feature.highlight && (
                        <span className="ml-1 text-xs bg-accent-primary text-white px-2 py-0.5 rounded-full">
                          AI
                        </span>
                      )}
                    </h3>
                    <p className="text-dark-text-secondary text-xs leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Comparison Table */}
          {showComparison && (
            <div className="mt-6 card-dark rounded-lg border border-dark-border p-4 animate-slide-up-soft">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left py-3 px-2 text-dark-text-primary font-semibold text-sm">Features</th>
                      <th className="text-center py-3 px-2 text-dark-text-primary font-semibold text-sm">Free</th>
                      <th className="text-center py-3 px-2 text-dark-text-primary font-semibold text-sm">
                        <div className="flex items-center justify-center space-x-1">
                          <StarIconSolid className="w-4 h-4 text-accent-primary" />
                          <span>Enterprise</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseFeatures.map((feature, index) => (
                      <tr key={index} className="border-b border-dark-border/50 hover:bg-dark-secondary/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-2">
                            <div className="text-accent-primary">
                              {React.cloneElement(feature.icon, { className: "w-4 h-4" })}
                            </div>
                            <div>
                              <div className="font-medium text-dark-text-primary text-sm">{feature.title}</div>
                              <div className="text-xs text-dark-text-secondary">{feature.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          {feature.free === true || feature.free === '✓' ? (
                            <CheckIconSolid className="w-4 h-4 text-green-400 mx-auto" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 text-dark-text-muted mx-auto" />
                          )}
                        </td>
                        <td className="text-center py-3 px-2">
                          <CheckIconSolid className="w-4 h-4 text-green-400 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="card-dark rounded-lg border border-dark-border p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-dark-text-primary mb-2">Choose Payment Method</h3>
            <p className="text-dark-text-secondary text-sm">Secure, encrypted payment processing</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`cursor-pointer p-4 rounded-lg border transition-all duration-200 ${
                  selectedPayment === method.id
                    ? 'border-accent-primary bg-accent-primary/10 shadow-glow-sm'
                    : 'border-dark-border bg-dark-secondary/30 hover:border-accent-primary/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{method.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-dark-text-primary text-sm">{method.name}</h4>
                      {method.popular && (
                        <span className="bg-accent-primary text-white text-xs px-2 py-0.5 rounded-full">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <p className="text-dark-text-secondary text-xs">{method.description}</p>
                  </div>
                  {selectedPayment === method.id && (
                    <CheckIconSolid className="w-4 h-4 text-accent-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Security Notice */}
          <div className="flex items-center justify-center space-x-2 text-xs text-dark-text-muted bg-dark-secondary/20 rounded-lg p-3 mb-6">
            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
            <span>256-bit SSL • PCI compliant • No payment details stored</span>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={handleUpgrade}
            disabled={processing}
            className="w-full bg-gradient-to-r from-accent-primary to-accent-secondary hover:shadow-glow-lg text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <RocketLaunchIcon className="w-5 h-5" />
                <span>
                  Upgrade for {pricing.currencySymbol}{selectedPlan === 'monthly' ? pricing.localMonthly : pricing.localYearly}
                  {selectedPlan === 'monthly' ? '/month' : '/year'}
                </span>
                <ArrowRightIcon className="w-5 h-5" />
              </div>
            )}
          </button>

          <div className="text-center mt-4 text-dark-text-muted text-xs">
            30-day guarantee • Cancel anytime • No hidden fees
          </div>
        </div>
      </div>
    </div>
  );
}