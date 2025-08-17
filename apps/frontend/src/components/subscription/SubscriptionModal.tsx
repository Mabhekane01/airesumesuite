import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { locationCurrencyService, PricingData } from '../../services/locationCurrencyService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  title?: string;
  description?: string;
}

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  featureName = 'AI feature',
  title,
  description 
}: SubscriptionModalProps) {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Load pricing data when modal opens
  useEffect(() => {
    if (isOpen && !pricing) {
      loadPricing();
    }
  }, [isOpen, pricing]);

  const loadPricing = async () => {
    try {
      setLoadingPricing(true);
      const pricingData = await locationCurrencyService.calculatePricing();
      setPricing(pricingData);
    } catch (error) {
      console.error('Failed to load pricing:', error);
      // Fallback to base ZAR pricing
      setPricing({
        baseMonthly: 50,
        baseYearly: 540,
        localMonthly: 50,
        localYearly: 540,
        yearlySavings: 60,
        savingsPercentage: 10,
        currency: 'ZAR',
        currencySymbol: 'R',
        exchangeRate: 1,
        location: {
          country: 'South Africa',
          countryCode: 'ZA',
          continent: 'Africa',
          currency: 'ZAR',
          currencySymbol: 'R',
          isAfricanCountry: true
        },
        lastUpdated: new Date()
      });
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/dashboard/upgrade');
  };

  const features = [
    'AI-powered resume optimization',
    'AI cover letter generation', 
    'AI career coaching',
    'Advanced job matching',
    'ATS compatibility analysis',
    'Unlimited resumes & cover letters',
    'Priority support',
    'Advanced analytics'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-700/95 backdrop-blur-lg rounded-2xl shadow-dark-2xl border border-dark-border max-w-md w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 p-6 border-b border-dark-border">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-900/50 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-dark-text-secondary" />
                </button>
                
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-3 bg-accent-primary/20 rounded-full">
                    <SparklesIcon className="h-6 w-6 text-accent-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark-text-primary">
                      {title || 'Upgrade Required'}
                    </h3>
                  </div>
                </div>
                
                <p className="text-dark-text-secondary text-sm">
                  {description || `${featureName} requires an Enterprise subscription to unlock AI-powered features.`}
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-dark-text-primary mb-3">
                    Enterprise Features Include:
                  </h4>
                  <div className="space-y-2">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-dark-text-secondary">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Preview */}
                <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                  {loadingPricing ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary"></div>
                      <span className="ml-2 text-sm text-dark-text-secondary">Loading pricing...</span>
                    </div>
                  ) : pricing ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-dark-text-secondary">Starting at</p>
                        <p className="text-2xl font-bold text-accent-primary">
                          {pricing.currencySymbol}{pricing.localMonthly}
                          <span className="text-sm text-dark-text-secondary">/month</span>
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs text-dark-text-muted">
                            {pricing.location.country} • {pricing.currency}
                          </p>
                          {pricing.exchangeRate !== 1 && (
                            <p className="text-xs text-dark-text-muted">
                              ≈ R{Math.round(pricing.localMonthly / pricing.exchangeRate)} ZAR
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-dark-text-secondary">
                          Save {pricing.savingsPercentage}% yearly
                        </p>
                        <p className="text-xs text-green-400">Cancel anytime</p>
                        {!pricing.location.isAfricanCountry && (
                          <p className="text-xs text-yellow-400 mt-1">International pricing</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-dark-text-secondary">Pricing unavailable</p>
                      <p className="text-xs text-dark-text-muted">Please visit upgrade page for details</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-dark-border rounded-lg text-dark-text-secondary hover:bg-gray-900/50 transition-colors"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={handleUpgrade}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:shadow-glow-sm transition-all duration-300"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}