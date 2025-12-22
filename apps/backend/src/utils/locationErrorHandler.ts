export class LocationError extends Error {
  constructor(
    message: string,
    public code: string,
    public countryCode?: string,
    public cityName?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

export enum LocationErrorCodes {
  COUNTRY_NOT_FOUND = 'COUNTRY_NOT_FOUND',
  CITY_NOT_FOUND = 'CITY_NOT_FOUND',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  INVALID_COUNTRY_CODE = 'INVALID_COUNTRY_CODE',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  CURRENCY_CONVERSION_FAILED = 'CURRENCY_CONVERSION_FAILED',
  POPULATION_DATA_UNAVAILABLE = 'POPULATION_DATA_UNAVAILABLE'
}

export class LocationErrorHandler {
  static handleLocationApiError(error: any, context: {
    countryCode?: string;
    cityName?: string;
    operation: string;
  }): LocationError {
    // API Ninjas specific errors
    if (error.response?.status === 429) {
      return new LocationError(
        'API rate limit exceeded. Please try again later.',
        LocationErrorCodes.API_RATE_LIMIT,
        context.countryCode,
        context.cityName,
        error
      );
    }

    if (error.response?.status === 401) {
      return new LocationError(
        'API authentication failed. Please check API key configuration.',
        LocationErrorCodes.API_UNAVAILABLE,
        context.countryCode,
        context.cityName,
        error
      );
    }

    if (error.response?.status === 404) {
      return new LocationError(
        `Location not found: ${context.cityName || context.countryCode || 'unknown'}`,
        context.cityName ? LocationErrorCodes.CITY_NOT_FOUND : LocationErrorCodes.COUNTRY_NOT_FOUND,
        context.countryCode,
        context.cityName,
        error
      );
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new LocationError(
        'Location service is temporarily unavailable. Using cached data.',
        LocationErrorCodes.API_UNAVAILABLE,
        context.countryCode,
        context.cityName,
        error
      );
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new LocationError(
        'Location service request timed out. Using fallback data.',
        LocationErrorCodes.API_UNAVAILABLE,
        context.countryCode,
        context.cityName,
        error
      );
    }

    // Generic error
    return new LocationError(
      `Location service error during ${context.operation}: ${error.message}`,
      LocationErrorCodes.API_UNAVAILABLE,
      context.countryCode,
      context.cityName,
      error
    );
  }

  static handleCountryValidation(countryInput: string): {
    isValid: boolean;
    normalizedCountry?: string;
    countryCode?: string;
    suggestions?: string[];
    error?: LocationError;
  } {
    if (!countryInput || typeof countryInput !== 'string') {
      return {
        isValid: false,
        error: new LocationError(
          'Country name is required and must be a string',
          LocationErrorCodes.INVALID_COUNTRY_CODE
        )
      };
    }

    const normalizedInput = countryInput.toLowerCase().trim();
    
    // Country mapping with common variations
    const countryMap: { [key: string]: { name: string; code: string; alternatives: string[] } } = {
      'US': { name: 'United States', code: 'US', alternatives: ['usa', 'america', 'united states', 'u.s.', 'u.s.a.'] },
      'CA': { name: 'Canada', code: 'CA', alternatives: ['canada'] },
      'GB': { name: 'United Kingdom', code: 'GB', alternatives: ['uk', 'united kingdom', 'britain', 'great britain', 'england'] },
      'AU': { name: 'Australia', code: 'AU', alternatives: ['australia', 'aus'] },
      'DE': { name: 'Germany', code: 'DE', alternatives: ['germany', 'deutschland'] },
      'FR': { name: 'France', code: 'FR', alternatives: ['france'] },
      'JP': { name: 'Japan', code: 'JP', alternatives: ['japan'] },
      'SG': { name: 'Singapore', code: 'SG', alternatives: ['singapore'] },
      'CH': { name: 'Switzerland', code: 'CH', alternatives: ['switzerland', 'swiss'] },
      'NL': { name: 'Netherlands', code: 'NL', alternatives: ['netherlands', 'holland'] },
      'IN': { name: 'India', code: 'IN', alternatives: ['india'] },
      'CN': { name: 'China', code: 'CN', alternatives: ['china', 'prc'] },
      'BR': { name: 'Brazil', code: 'BR', alternatives: ['brazil', 'brasil'] },
      'MX': { name: 'Mexico', code: 'MX', alternatives: ['mexico'] },
      'ZA': { name: 'South Africa', code: 'ZA', alternatives: ['south africa', 'rsa'] },
      'RU': { name: 'Russia', code: 'RU', alternatives: ['russia', 'russian federation'] },
      'PL': { name: 'Poland', code: 'PL', alternatives: ['poland'] },
      'CZ': { name: 'Czech Republic', code: 'CZ', alternatives: ['czech republic', 'czechia'] },
      'SE': { name: 'Sweden', code: 'SE', alternatives: ['sweden'] },
      'NO': { name: 'Norway', code: 'NO', alternatives: ['norway'] },
      'DK': { name: 'Denmark', code: 'DK', alternatives: ['denmark'] },
      'IE': { name: 'Ireland', code: 'IE', alternatives: ['ireland'] },
      'NZ': { name: 'New Zealand', code: 'NZ', alternatives: ['new zealand'] },
      'KR': { name: 'South Korea', code: 'KR', alternatives: ['south korea', 'korea', 'republic of korea'] },
      'IL': { name: 'Israel', code: 'IL', alternatives: ['israel'] }
    };

    // Direct match by country code
    if (countryMap[normalizedInput.toUpperCase()]) {
      const country = countryMap[normalizedInput.toUpperCase()];
      return {
        isValid: true,
        normalizedCountry: country.name,
        countryCode: country.code
      };
    }

    // Search by alternatives
    for (const [code, country] of Object.entries(countryMap)) {
      if (country.alternatives.some(alt => alt === normalizedInput)) {
        return {
          isValid: true,
          normalizedCountry: country.name,
          countryCode: code
        };
      }
    }

    // Fuzzy matching for suggestions
    const suggestions: string[] = [];
    for (const [code, country] of Object.entries(countryMap)) {
      const allNames = [country.name.toLowerCase(), ...country.alternatives];
      if (allNames.some(name => name.includes(normalizedInput) || normalizedInput.includes(name))) {
        suggestions.push(country.name);
      }
    }

    return {
      isValid: false,
      suggestions: suggestions.slice(0, 3),
      error: new LocationError(
        `Country '${countryInput}' not recognized. Did you mean: ${suggestions.slice(0, 3).join(', ')}?`,
        LocationErrorCodes.COUNTRY_NOT_FOUND
      )
    };
  }

  static handleSalaryCalculationError(error: any, context: {
    jobTitle: string;
    countryCode: string;
    cityName?: string;
  }): {
    fallbackSalary: number;
    confidence: number;
    error: LocationError;
  } {
    const baseFallback = 50000; // Global fallback salary
    
    // Apply basic country multipliers even during errors
    const countryMultipliers: { [key: string]: number } = {
      'US': 1.7, 'CH': 1.9, 'NO': 1.6, 'DK': 1.5, 'SE': 1.4,
      'NL': 1.36, 'DE': 1.3, 'AU': 1.4, 'CA': 1.3, 'GB': 1.2,
      'FR': 1.1, 'JP': 1.0, 'SG': 1.3, 'IE': 1.2, 'NZ': 1.1
    };

    const multiplier = countryMultipliers[context.countryCode] || 0.6;
    const fallbackSalary = Math.round(baseFallback * multiplier);

    return {
      fallbackSalary,
      confidence: 0.3, // Low confidence for error fallback
      error: new LocationError(
        `Unable to calculate accurate salary for ${context.jobTitle} in ${context.cityName || context.countryCode}. Using regional estimate.`,
        LocationErrorCodes.INSUFFICIENT_DATA,
        context.countryCode,
        context.cityName,
        error
      )
    };
  }

  static handleCurrencyConversionError(error: any, context: {
    fromCurrency: string;
    toCurrency: string;
    amount: number;
  }): {
    convertedAmount: number;
    confidence: number;
    error: LocationError;
  } {
    // Fallback exchange rates (should be updated periodically)
    const fallbackRates: { [key: string]: number } = {
      'USD': 1.0,
      'EUR': 0.85,
      'GBP': 0.73,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'JPY': 110,
      'SGD': 1.35,
      'INR': 75,
      'CNY': 6.8
    };

    const fromRate = fallbackRates[context.fromCurrency] || 1.0;
    const toRate = fallbackRates[context.toCurrency] || 1.0;
    const convertedAmount = Math.round((context.amount / fromRate) * toRate);

    return {
      convertedAmount,
      confidence: 0.4, // Medium-low confidence for fallback rates
      error: new LocationError(
        `Currency conversion service unavailable. Using approximate exchange rate for ${context.fromCurrency} to ${context.toCurrency}.`,
        LocationErrorCodes.CURRENCY_CONVERSION_FAILED,
        undefined,
        undefined,
        error
      )
    };
  }

  static createFallbackLocationData(countryCode: string, requestedCities: number = 5): {
    cities: Array<{
      name: string;
      country: string;
      countryCode: string;
      population: number;
      coordinates: { latitude: number; longitude: number };
      isCapital: boolean;
      economicRank: number;
      salaryMultiplier: number;
    }>;
    warnings: string[];
  } {
    const fallbackData: { [key: string]: any[] } = {
      'US': [
        { name: 'New York', population: 8336000, coordinates: { latitude: 40.7128, longitude: -74.0060 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.8 },
        { name: 'Los Angeles', population: 3979000, coordinates: { latitude: 34.0522, longitude: -118.2437 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.5 },
        { name: 'San Francisco', population: 873000, coordinates: { latitude: 37.7749, longitude: -122.4194 }, isCapital: false, economicRank: 1, salaryMultiplier: 2.0 },
        { name: 'Seattle', population: 753000, coordinates: { latitude: 47.6062, longitude: -122.3321 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.7 },
        { name: 'Boston', population: 685000, coordinates: { latitude: 42.3601, longitude: -71.0589 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.6 }
      ],
      'GB': [
        { name: 'London', population: 9540000, coordinates: { latitude: 51.5074, longitude: -0.1278 }, isCapital: true, economicRank: 1, salaryMultiplier: 0.9 },
        { name: 'Manchester', population: 547000, coordinates: { latitude: 53.4808, longitude: -2.2426 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.7 },
        { name: 'Edinburgh', population: 540000, coordinates: { latitude: 55.9533, longitude: -3.1883 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.7 }
      ],
      'CA': [
        { name: 'Toronto', population: 2930000, coordinates: { latitude: 43.6532, longitude: -79.3832 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.2 },
        { name: 'Vancouver', population: 675000, coordinates: { latitude: 49.2827, longitude: -123.1207 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.1 },
        { name: 'Montreal', population: 1780000, coordinates: { latitude: 45.5017, longitude: -73.5673 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.0 }
      ]
    };

    const countryNames: { [key: string]: string } = {
      'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada',
      'AU': 'Australia', 'DE': 'Germany', 'FR': 'France'
    };

    const cities = (fallbackData[countryCode] || []).slice(0, requestedCities).map(city => ({
      ...city,
      country: countryNames[countryCode] || countryCode,
      countryCode
    }));

    const warnings = [
      'Location services are temporarily unavailable',
      'Using cached city data for analysis',
      'Salary calculations may be less accurate than normal',
      'Please try again later for updated information'
    ];

    return { cities, warnings };
  }

  static logLocationError(error: LocationError, additionalContext?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      message: error.message,
      countryCode: error.countryCode,
      cityName: error.cityName,
      originalError: error.originalError?.message,
      additionalContext
    };

    // In production, this would go to a proper logging service
    console.error('LocationError:', JSON.stringify(logData, null, 2));
  }

  static createUserFriendlyErrorResponse(error: LocationError): {
    success: boolean;
    message: string;
    errorCode: string;
    suggestions?: string[];
    fallbackData?: any;
  } {
    const baseResponse = {
      success: false,
      errorCode: error.code,
      message: error.message
    };

    switch (error.code) {
      case LocationErrorCodes.COUNTRY_NOT_FOUND:
        return {
          ...baseResponse,
          message: 'The specified country could not be found. Please check the spelling or try a different format.',
          suggestions: ['Try using the full country name', 'Check for typos', 'Use common country abbreviations (US, UK, CA)']
        };

      case LocationErrorCodes.CITY_NOT_FOUND:
        return {
          ...baseResponse,
          message: 'The specified city could not be found in our database.',
          suggestions: ['Try the closest major city', 'Check the city name spelling', 'Try including the state/province']
        };

      case LocationErrorCodes.API_RATE_LIMIT:
        return {
          ...baseResponse,
          message: 'Too many requests. Please wait a moment and try again.',
          suggestions: ['Wait 60 seconds before trying again', 'Consider using cached data for now']
        };

      case LocationErrorCodes.API_UNAVAILABLE:
        return {
          ...baseResponse,
          message: 'Location services are temporarily unavailable. Using cached data where possible.',
          suggestions: ['Try again in a few minutes', 'Results may be less accurate than normal']
        };

      default:
        return {
          ...baseResponse,
          message: 'An unexpected error occurred while processing location data.',
          suggestions: ['Please try again', 'Contact support if the problem persists']
        };
    }
  }
}