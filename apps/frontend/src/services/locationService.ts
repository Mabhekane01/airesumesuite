interface LocationData {
  city?: string | null;
  country?: string | null;
  region?: string | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  accuracy?: number;
}

interface IPLocationResponse {
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
  loc?: string; // "lat,lng" format
}

class LocationService {
  private currentLocation: LocationData | null = null;
  private locationPromise: Promise<LocationData> | null = null;

  /**
   * Get user's location using multiple methods with fallbacks
   */
  async getUserLocation(): Promise<LocationData> {
    // Return cached location if available and recent (within 1 hour)
    if (this.currentLocation) {
      return this.currentLocation;
    }

    // Return existing promise if location detection is in progress
    if (this.locationPromise) {
      return this.locationPromise;
    }

    // Start location detection
    this.locationPromise = this.detectLocation();
    
    try {
      const location = await this.locationPromise;
      this.currentLocation = location;
      return location;
    } catch (error) {
      console.error('Location detection failed:', error);
      return this.getFallbackLocation();
    } finally {
      this.locationPromise = null;
    }
  }

  /**
   * Get location with user permission (most accurate)
   */
  private async getGeolocationData(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Reverse geocode to get city/country
            const locationInfo = await this.reverseGeocode(latitude, longitude);
            resolve({
              ...locationInfo,
              coordinates: { latitude, longitude },
              accuracy
            });
          } catch (error) {
            // Even if reverse geocoding fails, we have coordinates
            resolve({
              city: null,
              country: null,
              region: null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              coordinates: { latitude, longitude },
              accuracy
            } as LocationData);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Get location from IP address (fallback method)
   */
  private async getIPLocation(): Promise<LocationData> {
    try {
      // Try ipapi.co first (no API key required)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          city: data.city || null,
          country: data.country_name || null,
          region: data.region || null,
          timezone: data.timezone || null,
          coordinates: data.latitude && data.longitude ? {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude)
          } : undefined
        };
      }
    } catch (error) {
      console.warn('IP location detection failed:', error);
    }

    // Fallback to another service
    try {
      const response = await fetch('https://ipinfo.io/json');
      if (response.ok) {
        const data: IPLocationResponse = await response.json();
        const coordinates = data.loc ? {
          latitude: parseFloat(data.loc.split(',')[0]),
          longitude: parseFloat(data.loc.split(',')[1])
        } : undefined;

        return {
          city: data.city || null,
          country: data.country || null,
          region: data.region || null,
          timezone: data.timezone || null,
          coordinates
        };
      }
    } catch (error) {
      console.warn('Secondary IP location detection failed:', error);
    }

    throw new Error('IP location detection failed');
  }

  /**
   * Reverse geocode coordinates to get address info
   */
  private async reverseGeocode(latitude: number, longitude: number): Promise<Partial<LocationData>> {
    try {
      // Use backend proxy to avoid CORS issues
      const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(
        `${API_BASE_URL}/api/v1/locations/reverse-geocode?lat=${latitude}&lon=${longitude}&zoom=10`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return {
            city: result.data.city,
            country: result.data.country,
            region: result.data.region
          };
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    return { city: null, country: null };
  }

  /**
   * Main location detection logic with fallbacks
   */
  private async detectLocation(): Promise<LocationData> {
    const methods = [
      // Method 1: Browser geolocation (most accurate but requires permission)
      async () => {
        try {
          return await this.getGeolocationData();
        } catch (error) {
          console.log('Geolocation failed, trying IP-based detection');
          throw error;
        }
      },
      
      // Method 2: IP-based location (less accurate but no permission needed)
      async () => {
        return await this.getIPLocation();
      }
    ];

    for (const method of methods) {
      try {
        const location = await method();
        console.log('Location detected:', location);
        return location;
      } catch (error) {
        console.warn('Location detection method failed:', error);
      }
    }

    throw new Error('All location detection methods failed');
  }

  /**
   * Get fallback location when detection fails
   */
  private getFallbackLocation(): LocationData {
    // Try to get timezone-based guess
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let country = null;

    // Simple timezone to country mapping
    if (timezone.includes('America/New_York') || timezone.includes('America/Chicago') || 
        timezone.includes('America/Denver') || timezone.includes('America/Los_Angeles')) {
      country = 'United States';
    } else if (timezone.includes('Europe/London')) {
      country = 'United Kingdom';
    } else if (timezone.includes('Europe/')) {
      // Extract country from timezone like Europe/Paris -> France
      const parts = timezone.split('/');
      if (parts[1]) {
        const cities = {
          'Paris': 'France',
          'Berlin': 'Germany',
          'Rome': 'Italy',
          'Madrid': 'Spain',
          'Amsterdam': 'Netherlands',
          'Stockholm': 'Sweden',
          'Oslo': 'Norway',
          'Copenhagen': 'Denmark'
        };
        country = cities[parts[1]] || null;
      }
    } else if (timezone.includes('Asia/')) {
      const cities = {
        'Tokyo': 'Japan',
        'Shanghai': 'China',
        'Mumbai': 'India',
        'Singapore': 'Singapore',
        'Seoul': 'South Korea'
      };
      const parts = timezone.split('/');
      country = cities[parts[1]] || null;
    }

    return {
      city: null,
      country,
      timezone,
      coordinates: undefined
    };
  }

  /**
   * Request location permission explicitly (for better UX)
   */
  async requestLocationPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      if (result.state === 'granted') {
        return true;
      } else if (result.state === 'prompt') {
        // Permission will be requested when we call getCurrentPosition
        return true;
      }
      
      return false;
    } catch (error) {
      // Fallback: just try to get location
      return true;
    }
  }

  /**
   * Clear cached location (call when user changes location)
   */
  clearCache(): void {
    this.currentLocation = null;
    this.locationPromise = null;
  }

  /**
   * Get location for login (includes user-friendly error handling)
   */
  async getLocationForLogin(): Promise<LocationData | null> {
    try {
      const location = await this.getUserLocation();
      
      // Validate we have at least country information
      if (!location.country && !location.coordinates) {
        console.warn('Insufficient location data for login');
        return this.getFallbackLocation();
      }
      
      return location;
    } catch (error) {
      console.error('Failed to get location for login:', error);
      return this.getFallbackLocation();
    }
  }

  /**
   * Check if location detection is supported
   */
  isSupported(): boolean {
    return !!(navigator.geolocation || window.fetch);
  }

  /**
   * Get current cached location without triggering detection
   */
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }
}

export const locationService = new LocationService();
export type { LocationData };