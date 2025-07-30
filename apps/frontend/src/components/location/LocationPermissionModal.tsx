import React, { useState } from 'react';
import { MapPinIcon, GlobeAmericasIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { locationService } from '../../services/locationService';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationDetected?: (location: any) => void;
  showBenefits?: boolean;
}

export default function LocationPermissionModal({ 
  isOpen, 
  onClose, 
  onLocationDetected,
  showBenefits = true 
}: LocationPermissionModalProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnableLocation = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const location = await locationService.getUserLocation();
      console.log('📍 Location detected:', location);
      
      if (onLocationDetected) {
        onLocationDetected(location);
      }
      
      onClose();
    } catch (error) {
      console.error('Location detection failed:', error);
      setError('Unable to detect your location. You can still use the app, but location-based features will be limited.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-primary rounded-lg shadow-xl max-w-md w-full mx-4 border border-dark-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-dark-accent/20 rounded-full">
              <MapPinIcon className="w-8 h-8 text-dark-accent" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-dark-text-primary text-center mb-2">
            Enable Location Services
          </h2>
          
          <p className="text-dark-text-secondary text-center mb-6">
            We'd like to access your location to provide personalized salary insights and job recommendations.
          </p>

          {/* Benefits */}
          {showBenefits && (
            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-3">
                <ChartBarIcon className="w-5 h-5 text-dark-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-dark-text-primary font-medium text-sm">Local Salary Insights</h4>
                  <p className="text-dark-text-muted text-xs">Get accurate salary data for your city and region</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <GlobeAmericasIcon className="w-5 h-5 text-dark-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-dark-text-primary font-medium text-sm">Market Comparisons</h4>
                  <p className="text-dark-text-muted text-xs">Compare opportunities across different cities</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPinIcon className="w-5 h-5 text-dark-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-dark-text-primary font-medium text-sm">Local Job Market</h4>
                  <p className="text-dark-text-muted text-xs">See trending opportunities in your area</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Privacy Note */}
          <div className="bg-dark-secondary/50 rounded-lg p-3 mb-6">
            <p className="text-dark-text-muted text-xs">
              🔒 Your location data is only used to provide relevant insights and is not shared with third parties. 
              You can disable this at any time in your settings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 text-dark-text-secondary hover:text-dark-text-primary 
                       border border-dark-border hover:border-dark-text-muted rounded-lg 
                       transition-colors duration-200"
              disabled={isDetecting}
            >
              Skip for now
            </button>
            
            <button
              onClick={handleEnableLocation}
              disabled={isDetecting}
              className="flex-1 px-4 py-2 bg-dark-accent hover:bg-dark-accent/80 
                       text-white rounded-lg transition-colors duration-200 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-2"
            >
              {isDetecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Detecting...</span>
                </>
              ) : (
                <span>Enable Location</span>
              )}
            </button>
          </div>

          {/* Alternative options */}
          <div className="mt-4 text-center">
            <p className="text-dark-text-muted text-xs">
              Don't want to share location? You can manually set your city in 
              <button 
                onClick={onClose}
                className="text-dark-accent hover:text-dark-accent/80 ml-1"
              >
                Settings
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage location permission modal
export const useLocationPermission = () => {
  const [showModal, setShowModal] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  const requestLocation = () => {
    if (!hasAsked) {
      setShowModal(true);
      setHasAsked(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    requestLocation,
    closeModal,
    hasAsked
  };
};