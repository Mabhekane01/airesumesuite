interface LocationData {
  country: string;
  countryCode: string;
  continent: string;
  currency: string;
  currencySymbol: string;
  isAfricanCountry: boolean;
  city?: string;
  region?: string;
  timezone?: string;
  ip?: string;
}

interface CurrencyRates {
  [key: string]: number;
}

interface PricingData {
  baseMonthly: number;
  baseYearly: number;
  localMonthly: number;
  localYearly: number;
  yearlySavings: number;
  savingsPercentage: number;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  location: LocationData;
  lastUpdated: Date;
}

class LocationCurrencyService {
  private currencyCache: Map<string, { rates: CurrencyRates; timestamp: number }> = new Map();
  private locationCache: Map<string, { data: LocationData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
  // Comprehensive list of African countries
  private readonly AFRICAN_COUNTRIES = [
    'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt', 'Morocco', 'Tunisia',
    'Algeria', 'Ethiopia', 'Uganda', 'Tanzania', 'Senegal', 'Cameroon', 'Zimbabwe',
    'Botswana', 'Namibia', 'Zambia', 'Mozambique', 'Mali', 'Burkina Faso',
    'Madagascar', 'Rwanda', 'Malawi', 'Libya', 'Sudan', 'Chad', 'Niger',
    'Angola', 'Benin', 'Burundi', 'Cape Verde', 'Central African Republic',
    'Comoros', 'Congo', 'Democratic Republic of the Congo', 'Djibouti',
    'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Gabon', 'Gambia', 'Guinea',
    'Guinea-Bissau', 'Ivory Coast', 'Lesotho', 'Liberia', 'Mauritania',
    'Mauritius', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Sudan', 'Togo'
  ];

  private readonly CURRENCY_SYMBOLS: { [key: string]: string } = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥', 'INR': '₹',
    'ZAR': 'R', 'NGN': '₦', 'KES': 'KSh', 'GHS': '₵', 'EGP': '£E',
    'MAD': 'DH', 'TND': 'DT', 'DZD': 'دج', 'ETB': 'Br', 'UGX': 'USh',
    'TZS': 'TSh', 'XOF': 'CFA', 'XAF': 'FCFA', 'ZWL': 'Z$', 'BWP': 'P',
    'NAD': 'N$', 'ZMW': 'ZK', 'MZN': 'MT', 'RWF': 'FRw', 'MWK': 'MK',
    'CAD': 'C$', 'AUD': 'A$', 'NZD': 'NZ$', 'CHF': 'Fr', 'SEK': 'kr',
    'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft',
    'RUB': '₽', 'BRL': 'R$', 'MXN': '$', 'ARS': '$', 'CLP': '$', 'COP': '$'
  };

  /**
   * Get user's current location using multiple fallback services
   */
  async getUserLocation(): Promise<LocationData> {
    try {
      // Try to get from cache first
      const cached = this.getFromLocationCache();
      if (cached) {
        return cached;
      }

      // Try multiple location services for reliability
      let locationData: LocationData | null = null;

      // Primary: ipapi.co (most reliable)
      try {
        const response = await fetch('https://ipapi.co/json/', {
          timeout: 5000,
          headers: {
            'User-Agent': 'AI Job Suite Location Service'
          }
        });

        if (response.ok) {
          const data = await response.json();
          locationData = this.parseIpapiResponse(data);
        }
      } catch (error) {
        console.warn('ipapi.co failed:', error);
      }

      // Fallback: ip-api.com
      if (!locationData) {
        try {
          const response = await fetch('http://ip-api.com/json/', {
            timeout: 5000
          });

          if (response.ok) {
            const data = await response.json();
            locationData = this.parseIpApiResponse(data);
          }
        } catch (error) {
          console.warn('ip-api.com failed:', error);
        }
      }

      // Fallback: ipgeolocation.io (requires API key but has free tier)
      if (!locationData && import.meta.env.VITE_IPGEOLOCATION_API_KEY) {
        try {
          const response = await fetch(
            `https://api.ipgeolocation.io/ipgeo?apiKey=${import.meta.env.VITE_IPGEOLOCATION_API_KEY}`,
            { timeout: 5000 }
          );

          if (response.ok) {
            const data = await response.json();
            locationData = this.parseIpGeolocationResponse(data);
          }
        } catch (error) {
          console.warn('ipgeolocation.io failed:', error);
        }
      }

      // Last resort: Use browser's built-in geolocation + reverse geocoding
      if (!locationData) {
        locationData = await this.getBrowserLocation();
      }

      // Ultimate fallback
      if (!locationData) {
        locationData = this.getDefaultLocation();
      }

      // Cache the result
      this.cacheLocationData(locationData);
      
      return locationData;

    } catch (error) {
      console.error('All location services failed:', error);
      return this.getDefaultLocation();
    }
  }

  /**
   * Get real-time currency conversion rates
   */
  async getCurrencyRates(baseCurrency: string = 'ZAR'): Promise<CurrencyRates> {
    try {
      // Check cache first
      const cached = this.getFromCurrencyCache(baseCurrency);
      if (cached) {
        return cached;
      }

      let rates: CurrencyRates | null = null;

      // Primary: Exchange Rates API (free, reliable)
      try {
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
          { timeout: 5000 }
        );

        if (response.ok) {
          const data = await response.json();
          rates = data.rates;
        }
      } catch (error) {
        console.warn('exchangerate-api.com failed:', error);
      }

      // Fallback: Fixer.io (requires API key)
      if (!rates && import.meta.env.VITE_FIXER_API_KEY) {
        try {
          const response = await fetch(
            `https://api.fixer.io/latest?access_key=${import.meta.env.VITE_FIXER_API_KEY}&base=${baseCurrency}`,
            { timeout: 5000 }
          );

          if (response.ok) {
            const data = await response.json();
            rates = data.rates;
          }
        } catch (error) {
          console.warn('fixer.io failed:', error);
        }
      }

      // Fallback: CurrencyAPI (alternative)
      if (!rates && import.meta.env.VITE_CURRENCYAPI_KEY) {
        try {
          const response = await fetch(
            `https://api.currencyapi.com/v3/latest?apikey=${import.meta.env.VITE_CURRENCYAPI_KEY}&base_currency=${baseCurrency}`,
            { timeout: 5000 }
          );

          if (response.ok) {
            const data = await response.json();
            rates = {};
            Object.keys(data.data).forEach(currency => {
              rates![currency] = data.data[currency].value;
            });
          }
        } catch (error) {
          console.warn('currencyapi.com failed:', error);
        }
      }

      // Use fallback rates if APIs fail
      if (!rates) {
        rates = this.getFallbackRates(baseCurrency);
      }

      // Cache the rates
      this.cacheCurrencyRates(baseCurrency, rates);

      return rates;

    } catch (error) {
      console.error('All currency services failed:', error);
      return this.getFallbackRates(baseCurrency);
    }
  }

  /**
   * Calculate pricing with live location and currency conversion
   */
  async calculatePricing(): Promise<PricingData> {
    try {
      // Get user location
      const location = await this.getUserLocation();
      
      // Base pricing in ZAR
      const baseMonthly = 50;
      const baseYearly = 540;
      
      // Apply location multiplier
      const multiplier = location.isAfricanCountry ? 1 : 2;
      const zarMonthly = baseMonthly * multiplier;
      const zarYearly = baseYearly * multiplier;
      
      // Get currency rates
      const rates = await this.getCurrencyRates('ZAR');
      const exchangeRate = rates[location.currency] || 1;
      
      // Convert to local currency
      const localMonthly = Math.round(zarMonthly * exchangeRate);
      const localYearly = Math.round(zarYearly * exchangeRate);
      
      // Calculate savings
      const monthlyCost = localMonthly * 12;
      const yearlySavings = monthlyCost - localYearly;
      const savingsPercentage = Math.round((yearlySavings / monthlyCost) * 100);
      
      return {
        baseMonthly,
        baseYearly,
        localMonthly,
        localYearly,
        yearlySavings,
        savingsPercentage,
        currency: location.currency,
        currencySymbol: location.currencySymbol,
        exchangeRate,
        location,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Pricing calculation failed:', error);
      // Return default ZAR pricing
      return {
        baseMonthly: 50,
        baseYearly: 540,
        localMonthly: 50,
        localYearly: 540,
        yearlySavings: 60,
        savingsPercentage: 10,
        currency: 'ZAR',
        currencySymbol: 'R',
        exchangeRate: 1,
        location: this.getDefaultLocation(),
        lastUpdated: new Date()
      };
    }
  }

  // Helper methods
  private parseIpapiResponse(data: any): LocationData {
    return {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'XX',
      continent: data.continent_code || 'Unknown',
      currency: data.currency || 'USD',
      currencySymbol: this.CURRENCY_SYMBOLS[data.currency] || '$',
      isAfricanCountry: this.AFRICAN_COUNTRIES.includes(data.country_name),
      city: data.city,
      region: data.region,
      timezone: data.timezone,
      ip: data.ip
    };
  }

  private parseIpApiResponse(data: any): LocationData {
    return {
      country: data.country || 'Unknown',
      countryCode: data.countryCode || 'XX',
      continent: data.continent || 'Unknown',
      currency: this.getCurrencyByCountry(data.countryCode) || 'USD',
      currencySymbol: this.CURRENCY_SYMBOLS[this.getCurrencyByCountry(data.countryCode) || 'USD'] || '$',
      isAfricanCountry: this.AFRICAN_COUNTRIES.includes(data.country),
      city: data.city,
      region: data.regionName,
      timezone: data.timezone,
      ip: data.query
    };
  }

  private parseIpGeolocationResponse(data: any): LocationData {
    return {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code2 || 'XX',
      continent: data.continent_name || 'Unknown',
      currency: data.currency?.code || 'USD',
      currencySymbol: data.currency?.symbol || '$',
      isAfricanCountry: this.AFRICAN_COUNTRIES.includes(data.country_name),
      city: data.city,
      region: data.state_prov,
      timezone: data.time_zone?.name,
      ip: data.ip
    };
  }

  private async getBrowserLocation(): Promise<LocationData | null> {
    // This would use browser geolocation + reverse geocoding
    // Implementation depends on having a geocoding service
    return null;
  }

  private getDefaultLocation(): LocationData {
    return {
      country: 'South Africa',
      countryCode: 'ZA',
      continent: 'Africa',
      currency: 'ZAR',
      currencySymbol: 'R',
      isAfricanCountry: true,
      city: 'Johannesburg',
      region: 'Gauteng'
    };
  }

  private getCurrencyByCountry(countryCode: string): string {
    const currencyMap: { [key: string]: string } = {
      'ZA': 'ZAR', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS', 'EG': 'EGP',
      'MA': 'MAD', 'TN': 'TND', 'DZ': 'DZD', 'ET': 'ETB', 'UG': 'UGX',
      'TZ': 'TZS', 'SN': 'XOF', 'CM': 'XAF', 'ZW': 'ZWL', 'BW': 'BWP',
      'US': 'USD', 'GB': 'GBP', 'EU': 'EUR', 'CA': 'CAD', 'AU': 'AUD'
    };
    return currencyMap[countryCode] || 'USD';
  }

  private getFallbackRates(baseCurrency: string): CurrencyRates {
    // Approximate fallback rates (should be updated regularly)
    const fallbackRates: { [key: string]: CurrencyRates } = {
      'ZAR': {
        'USD': 0.054, 'EUR': 0.049, 'GBP': 0.042, 'CAD': 0.073, 'AUD': 0.081,
        'NGN': 24.5, 'KES': 7.8, 'GHS': 0.65, 'EGP': 1.67, 'MAD': 0.54
      }
    };
    return fallbackRates[baseCurrency] || { 'USD': 1 };
  }

  // Cache management
  private getFromLocationCache(): LocationData | null {
    const cached = this.locationCache.get('current');
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private cacheLocationData(data: LocationData): void {
    this.locationCache.set('current', {
      data,
      timestamp: Date.now()
    });
  }

  private getFromCurrencyCache(currency: string): CurrencyRates | null {
    const cached = this.currencyCache.get(currency);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rates;
    }
    return null;
  }

  private cacheCurrencyRates(currency: string, rates: CurrencyRates): void {
    this.currencyCache.set(currency, {
      rates,
      timestamp: Date.now()
    });
  }
}

export const locationCurrencyService = new LocationCurrencyService();
export type { LocationData, PricingData, CurrencyRates };