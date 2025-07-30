import axios from 'axios';
import { locationService } from './locationService';
import { LocationErrorHandler, LocationError, LocationErrorCodes } from '../utils/locationErrorHandler';

interface CityApiResponse {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  population: number;
  is_capital: boolean;
}

interface CountryData {
  name: { common: string; official: string };
  cca2: string;
  cca3: string;
  population: number;
  area: number;
  flag: string;
  region: string;
  subregion: string;
  capital?: string[];
  languages?: { [key: string]: string };
  currencies?: { [key: string]: { name: string; symbol: string } };
  timezones: string[];
  borders?: string[];
  gini?: { [year: string]: number };
  continents: string[];
}

interface PopularCityData {
  name: string;
  country: string;
  countryCode: string;
  population: number;
  coordinates: { latitude: number; longitude: number };
  isCapital: boolean;
  economicRank?: number;
  salaryMultiplier?: number;
}

class LocationApiService {
  private cache = new Map<string, { data: any; expiry: Date }>();
  private apiNinjasKey = process.env.API_NINJAS_KEY;
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  async getPopularCitiesByCountry(countryCode: string, limit: number = 20): Promise<PopularCityData[]> {
    const cacheKey = `popular_cities_${countryCode}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }

    try {
      // Validate country code first
      const countryValidation = LocationErrorHandler.handleCountryValidation(countryCode);
      if (!countryValidation.isValid) {
        LocationErrorHandler.logLocationError(countryValidation.error!, { operation: 'getPopularCitiesByCountry' });
        return this.getFallbackCities(countryCode, limit);
      }

      const validatedCountryCode = countryValidation.countryCode!;

      // First get country data
      const countryData = await this.getCountryData(validatedCountryCode);
      if (!countryData) {
        throw new LocationError(
          `Country data not available: ${validatedCountryCode}`,
          LocationErrorCodes.COUNTRY_NOT_FOUND,
          validatedCountryCode
        );
      }

      // Get cities from multiple sources with error handling
      const [apiNinjasCities, internalCities, enhancedCities] = await Promise.allSettled([
        this.getCitiesFromApiNinjas(validatedCountryCode, limit),
        this.getCitiesFromInternal(validatedCountryCode, limit),
        this.getEnhancedCityData(validatedCountryCode, limit)
      ]);

      // Combine and deduplicate results
      const allCities: PopularCityData[] = [];
      let hasAnyData = false;
      
      if (apiNinjasCities.status === 'fulfilled') {
        allCities.push(...apiNinjasCities.value);
        hasAnyData = true;
      } else {
        const error = LocationErrorHandler.handleLocationApiError(apiNinjasCities.reason, {
          countryCode: validatedCountryCode,
          operation: 'getCitiesFromApiNinjas'
        });
        LocationErrorHandler.logLocationError(error);
      }
      
      if (internalCities.status === 'fulfilled') {
        allCities.push(...internalCities.value);
        hasAnyData = true;
      } else {
        console.warn('Internal cities fetch failed:', internalCities.reason);
      }
      
      if (enhancedCities.status === 'fulfilled') {
        allCities.push(...enhancedCities.value);
        hasAnyData = true;
      }

      if (!hasAnyData) {
        throw new LocationError(
          `No city data available for ${validatedCountryCode}`,
          LocationErrorCodes.INSUFFICIENT_DATA,
          validatedCountryCode
        );
      }

      // Remove duplicates and rank by population/economic importance
      const uniqueCities = this.deduplicateAndRankCities(allCities, countryData);
      const topCities = uniqueCities.slice(0, limit);

      // Cache the results
      this.cache.set(cacheKey, {
        data: topCities,
        expiry: new Date(Date.now() + this.cacheExpiry)
      });

      return topCities;
    } catch (error) {
      if (error instanceof LocationError) {
        LocationErrorHandler.logLocationError(error, { operation: 'getPopularCitiesByCountry', limit });
      } else {
        const locationError = LocationErrorHandler.handleLocationApiError(error, {
          countryCode,
          operation: 'getPopularCitiesByCountry'
        });
        LocationErrorHandler.logLocationError(locationError);
      }
      
      // Return fallback data with proper error handling
      return this.getFallbackCities(countryCode, limit);
    }
  }

  private async getCitiesFromApiNinjas(countryCode: string, limit: number): Promise<PopularCityData[]> {
    if (!this.apiNinjasKey) {
      throw new Error('API Ninjas key not configured');
    }

    // Get cities with minimum population to filter for major cities
    const minPopulation = this.getMinPopulationByCountry(countryCode);
    
    const response = await axios.get('https://api.api-ninjas.com/v1/city', {
      headers: { 'X-Api-Key': this.apiNinjasKey },
      params: {
        country: countryCode,
        min_population: minPopulation,
        limit: Math.min(limit * 2, 30) // Get more to allow for filtering
      },
      timeout: 10000
    });

    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((city: CityApiResponse) => ({
      name: city.name,
      country: this.getCountryName(city.country),
      countryCode: city.country,
      population: city.population,
      coordinates: {
        latitude: city.latitude,
        longitude: city.longitude
      },
      isCapital: city.is_capital,
      economicRank: this.calculateEconomicRank(city),
      salaryMultiplier: this.calculateSalaryMultiplier(city)
    }));
  }

  private async getCitiesFromInternal(countryCode: string, limit: number): Promise<PopularCityData[]> {
    const cities = await locationService.getCitiesForState(countryCode);
    
    return cities.slice(0, limit).map(city => ({
      name: city.name,
      country: this.getCountryName(countryCode),
      countryCode: countryCode,
      population: 0, // Will be enhanced later
      coordinates: city.coordinates || { latitude: 0, longitude: 0 },
      isCapital: false,
      economicRank: 0,
      salaryMultiplier: 1.0
    }));
  }

  private async getEnhancedCityData(countryCode: string, limit: number): Promise<PopularCityData[]> {
    // Enhanced city data based on economic research and known major cities
    const enhancedCityDatabase = this.getEnhancedCityDatabase();
    const countryCities = enhancedCityDatabase.filter(city => city.countryCode === countryCode);
    
    return countryCities
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, limit);
  }

  private getEnhancedCityDatabase(): PopularCityData[] {
    return [
      // United States - Major tech and business hubs
      { name: 'San Francisco', country: 'United States', countryCode: 'US', population: 3592294, coordinates: { latitude: 37.7749, longitude: -122.4194 }, isCapital: false, economicRank: 1, salaryMultiplier: 2.0 },
      { name: 'New York', country: 'United States', countryCode: 'US', population: 8336817, coordinates: { latitude: 40.7128, longitude: -74.0060 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.8 },
      { name: 'Seattle', country: 'United States', countryCode: 'US', population: 753675, coordinates: { latitude: 47.6062, longitude: -122.3321 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.7 },
      { name: 'Austin', country: 'United States', countryCode: 'US', population: 978908, coordinates: { latitude: 30.2672, longitude: -97.7431 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.4 },
      { name: 'Boston', country: 'United States', countryCode: 'US', population: 685094, coordinates: { latitude: 42.3601, longitude: -71.0589 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.6 },
      { name: 'Los Angeles', country: 'United States', countryCode: 'US', population: 3979576, coordinates: { latitude: 34.0522, longitude: -118.2437 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.5 },
      { name: 'Chicago', country: 'United States', countryCode: 'US', population: 2693976, coordinates: { latitude: 41.8781, longitude: -87.6298 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.3 },
      { name: 'Denver', country: 'United States', countryCode: 'US', population: 715522, coordinates: { latitude: 39.7392, longitude: -104.9903 }, isCapital: false, economicRank: 3, salaryMultiplier: 1.3 },
      { name: 'Atlanta', country: 'United States', countryCode: 'US', population: 498715, coordinates: { latitude: 33.7490, longitude: -84.3880 }, isCapital: false, economicRank: 3, salaryMultiplier: 1.2 },
      { name: 'Washington', country: 'United States', countryCode: 'US', population: 705749, coordinates: { latitude: 38.9072, longitude: -77.0369 }, isCapital: true, economicRank: 2, salaryMultiplier: 1.5 },

      // Canada
      { name: 'Toronto', country: 'Canada', countryCode: 'CA', population: 2930000, coordinates: { latitude: 43.6532, longitude: -79.3832 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.2 },
      { name: 'Vancouver', country: 'Canada', countryCode: 'CA', population: 675218, coordinates: { latitude: 49.2827, longitude: -123.1207 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.1 },
      { name: 'Montreal', country: 'Canada', countryCode: 'CA', population: 1780000, coordinates: { latitude: 45.5017, longitude: -73.5673 }, isCapital: false, economicRank: 2, salaryMultiplier: 1.0 },
      { name: 'Calgary', country: 'Canada', countryCode: 'CA', population: 1336000, coordinates: { latitude: 51.0447, longitude: -114.0719 }, isCapital: false, economicRank: 3, salaryMultiplier: 1.1 },
      { name: 'Ottawa', country: 'Canada', countryCode: 'CA', population: 994837, coordinates: { latitude: 45.4215, longitude: -75.6972 }, isCapital: true, economicRank: 2, salaryMultiplier: 1.1 },

      // United Kingdom
      { name: 'London', country: 'United Kingdom', countryCode: 'GB', population: 9540000, coordinates: { latitude: 51.5074, longitude: -0.1278 }, isCapital: true, economicRank: 1, salaryMultiplier: 0.9 },
      { name: 'Manchester', country: 'United Kingdom', countryCode: 'GB', population: 547000, coordinates: { latitude: 53.4808, longitude: -2.2426 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.7 },
      { name: 'Edinburgh', country: 'United Kingdom', countryCode: 'GB', population: 540000, coordinates: { latitude: 55.9533, longitude: -3.1883 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.7 },
      { name: 'Birmingham', country: 'United Kingdom', countryCode: 'GB', population: 1140000, coordinates: { latitude: 52.4862, longitude: -1.8904 }, isCapital: false, economicRank: 3, salaryMultiplier: 0.6 },
      { name: 'Cambridge', country: 'United Kingdom', countryCode: 'GB', population: 145000, coordinates: { latitude: 52.2053, longitude: 0.1218 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.8 },

      // Australia
      { name: 'Sydney', country: 'Australia', countryCode: 'AU', population: 5312000, coordinates: { latitude: -33.8688, longitude: 151.2093 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.1 },
      { name: 'Melbourne', country: 'Australia', countryCode: 'AU', population: 5078000, coordinates: { latitude: -37.8136, longitude: 144.9631 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.0 },
      { name: 'Brisbane', country: 'Australia', countryCode: 'AU', population: 2560000, coordinates: { latitude: -27.4705, longitude: 153.0260 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.9 },
      { name: 'Perth', country: 'Australia', countryCode: 'AU', population: 2130000, coordinates: { latitude: -31.9505, longitude: 115.8605 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.9 },

      // Germany
      { name: 'Berlin', country: 'Germany', countryCode: 'DE', population: 3669000, coordinates: { latitude: 52.5200, longitude: 13.4050 }, isCapital: true, economicRank: 1, salaryMultiplier: 0.8 },
      { name: 'Munich', country: 'Germany', countryCode: 'DE', population: 1488000, coordinates: { latitude: 48.1351, longitude: 11.5820 }, isCapital: false, economicRank: 1, salaryMultiplier: 0.9 },
      { name: 'Hamburg', country: 'Germany', countryCode: 'DE', population: 1899000, coordinates: { latitude: 53.5511, longitude: 9.9937 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.8 },
      { name: 'Frankfurt', country: 'Germany', countryCode: 'DE', population: 753000, coordinates: { latitude: 50.1109, longitude: 8.6821 }, isCapital: false, economicRank: 1, salaryMultiplier: 0.9 },

      // India
      { name: 'Bangalore', country: 'India', countryCode: 'IN', population: 12765000, coordinates: { latitude: 12.9716, longitude: 77.5946 }, isCapital: false, economicRank: 1, salaryMultiplier: 0.35 },
      { name: 'Mumbai', country: 'India', countryCode: 'IN', population: 20411000, coordinates: { latitude: 19.0760, longitude: 72.8777 }, isCapital: false, economicRank: 1, salaryMultiplier: 0.35 },
      { name: 'Delhi', country: 'India', countryCode: 'IN', population: 32900000, coordinates: { latitude: 28.7041, longitude: 77.1025 }, isCapital: true, economicRank: 1, salaryMultiplier: 0.35 },
      { name: 'Hyderabad', country: 'India', countryCode: 'IN', population: 10004000, coordinates: { latitude: 17.3850, longitude: 78.4867 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.30 },
      { name: 'Pune', country: 'India', countryCode: 'IN', population: 7764000, coordinates: { latitude: 18.5204, longitude: 73.8567 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.30 },

      // Singapore
      { name: 'Singapore', country: 'Singapore', countryCode: 'SG', population: 5454000, coordinates: { latitude: 1.3521, longitude: 103.8198 }, isCapital: true, economicRank: 1, salaryMultiplier: 1.3 },

      // Netherlands
      { name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', population: 1158000, coordinates: { latitude: 52.3676, longitude: 4.9041 }, isCapital: true, economicRank: 1, salaryMultiplier: 0.9 },
      { name: 'Rotterdam', country: 'Netherlands', countryCode: 'NL', population: 651000, coordinates: { latitude: 51.9244, longitude: 4.4777 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.8 },

      // Switzerland
      { name: 'Zurich', country: 'Switzerland', countryCode: 'CH', population: 434000, coordinates: { latitude: 47.3769, longitude: 8.5417 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.4 },
      { name: 'Geneva', country: 'Switzerland', countryCode: 'CH', population: 203000, coordinates: { latitude: 46.2044, longitude: 6.1432 }, isCapital: false, economicRank: 1, salaryMultiplier: 1.3 },

      // France
      { name: 'Paris', country: 'France', countryCode: 'FR', population: 11020000, coordinates: { latitude: 48.8566, longitude: 2.3522 }, isCapital: true, economicRank: 1, salaryMultiplier: 0.8 },
      { name: 'Lyon', country: 'France', countryCode: 'FR', population: 2280000, coordinates: { latitude: 45.7640, longitude: 4.8357 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.7 },

      // Japan
      { name: 'Tokyo', country: 'Japan', countryCode: 'JP', population: 37400000, coordinates: { latitude: 35.6762, longitude: 139.6503 }, isCapital: true, economicRank: 1, salaryMultiplier: 1.0 },
      { name: 'Osaka', country: 'Japan', countryCode: 'JP', population: 18967000, coordinates: { latitude: 34.6937, longitude: 135.5023 }, isCapital: false, economicRank: 2, salaryMultiplier: 0.9 }
    ];
  }

  private deduplicateAndRankCities(cities: PopularCityData[], countryData: CountryData): PopularCityData[] {
    const cityMap = new Map<string, PopularCityData>();
    
    // Merge cities with same name, preferring higher quality data
    cities.forEach(city => {
      const key = `${city.name.toLowerCase()}_${city.countryCode}`;
      const existing = cityMap.get(key);
      
      if (!existing || this.getCityDataQuality(city) > this.getCityDataQuality(existing)) {
        cityMap.set(key, city);
      }
    });

    // Convert back to array and sort by importance
    return Array.from(cityMap.values()).sort((a, b) => {
      // Primary sort: Economic rank (lower is better)
      if (a.economicRank !== b.economicRank) {
        return (a.economicRank || 999) - (b.economicRank || 999);
      }
      
      // Secondary sort: Capital cities first
      if (a.isCapital !== b.isCapital) {
        return a.isCapital ? -1 : 1;
      }
      
      // Tertiary sort: Population
      return b.population - a.population;
    });
  }

  private getCityDataQuality(city: PopularCityData): number {
    let quality = 0;
    
    if (city.population > 0) quality += 2;
    if (city.economicRank && city.economicRank > 0) quality += 3;
    if (city.salaryMultiplier && city.salaryMultiplier !== 1.0) quality += 2;
    if (city.coordinates.latitude !== 0 && city.coordinates.longitude !== 0) quality += 1;
    
    return quality;
  }

  private getMinPopulationByCountry(countryCode: string): number {
    const populationThresholds: { [key: string]: number } = {
      'US': 100000,  // Major US cities
      'CA': 50000,   // Canadian cities
      'GB': 100000,  // UK cities
      'AU': 50000,   // Australian cities
      'DE': 100000,  // German cities
      'FR': 100000,  // French cities
      'IN': 500000,  // Indian cities (higher threshold due to density)
      'CN': 1000000, // Chinese cities
      'JP': 200000,  // Japanese cities
      'SG': 0,       // Singapore (city-state)
      'CH': 20000,   // Swiss cities (smaller country)
      'NL': 50000,   // Dutch cities
      'default': 100000
    };
    
    return populationThresholds[countryCode] || populationThresholds['default'];
  }

  private calculateEconomicRank(city: CityApiResponse): number {
    // Simple heuristic based on population and capital status
    if (city.is_capital) return 1;
    if (city.population > 1000000) return 1;
    if (city.population > 500000) return 2;
    return 3;
  }

  private calculateSalaryMultiplier(city: CityApiResponse): number {
    // Basic salary multiplier based on known patterns
    const cityMultipliers: { [key: string]: number } = {
      'san francisco': 2.0,
      'new york': 1.8,
      'seattle': 1.7,
      'zurich': 1.4,
      'geneva': 1.3,
      'singapore': 1.3,
      'london': 0.9,
      'tokyo': 1.0
    };
    
    return cityMultipliers[city.name.toLowerCase()] || 1.0;
  }

  private async getCountryData(countryCode: string): Promise<CountryData | null> {
    const cacheKey = `country_${countryCode}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }

    try {
      const response = await axios.get(`https://restcountries.com/v3.1/alpha/${countryCode}`, {
        timeout: 5000
      });

      if (response.data && response.data.length > 0) {
        const countryData = response.data[0];
        this.cache.set(cacheKey, {
          data: countryData,
          expiry: new Date(Date.now() + this.cacheExpiry)
        });
        return countryData;
      }
    } catch (error) {
      console.warn(`Could not fetch country data for ${countryCode}:`, error);
    }

    return null;
  }

  private getCountryName(countryCode: string): string {
    const countryNames: { [key: string]: string } = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'IN': 'India',
      'SG': 'Singapore',
      'CH': 'Switzerland',
      'NL': 'Netherlands',
      'JP': 'Japan',
      'CN': 'China'
    };
    
    return countryNames[countryCode] || countryCode;
  }

  private getFallbackCities(countryCode: string, limit: number): PopularCityData[] {
    // First try enhanced database
    const enhancedDb = this.getEnhancedCityDatabase();
    const matchingCities = enhancedDb.filter(city => city.countryCode === countryCode);
    
    if (matchingCities.length > 0) {
      return matchingCities.slice(0, limit);
    }

    // If no data in enhanced DB, use error handler fallback
    const fallbackData = LocationErrorHandler.createFallbackLocationData(countryCode, limit);
    return fallbackData.cities;
  }

  async getGlobalPopularCities(limit: number = 50): Promise<PopularCityData[]> {
    const cacheKey = `global_popular_cities_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }

    try {
      const enhancedDb = this.getEnhancedCityDatabase();
      const topGlobalCities = enhancedDb
        .sort((a, b) => {
          // Sort by economic rank first, then population
          if (a.economicRank !== b.economicRank) {
            return (a.economicRank || 999) - (b.economicRank || 999);
          }
          return b.population - a.population;
        })
        .slice(0, limit);

      this.cache.set(cacheKey, {
        data: topGlobalCities,
        expiry: new Date(Date.now() + this.cacheExpiry)
      });

      return topGlobalCities;
    } catch (error) {
      console.error('Error fetching global popular cities:', error);
      return [];
    }
  }

  async getCityEconomicData(cityName: string, countryCode: string): Promise<{
    salaryMultiplier: number;
    economicRank: number;
    costOfLivingIndex?: number;
  } | null> {
    const enhancedDb = this.getEnhancedCityDatabase();
    const city = enhancedDb.find(c => 
      c.name.toLowerCase() === cityName.toLowerCase() && 
      c.countryCode === countryCode
    );

    if (city) {
      return {
        salaryMultiplier: city.salaryMultiplier || 1.0,
        economicRank: city.economicRank || 3,
        costOfLivingIndex: this.getCostOfLivingIndex(cityName, countryCode)
      };
    }

    return null;
  }

  private getCostOfLivingIndex(cityName: string, countryCode: string): number {
    // Simplified cost of living index (NYC = 100)
    const costIndex: { [key: string]: number } = {
      'san francisco_US': 120,
      'new york_US': 100,
      'seattle_US': 85,
      'london_GB': 90,
      'zurich_CH': 130,
      'singapore_SG': 95,
      'tokyo_JP': 90,
      'bangalore_IN': 25,
      'mumbai_IN': 30
    };

    const key = `${cityName.toLowerCase()}_${countryCode}`;
    return costIndex[key] || 60; // Default moderate cost of living
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const locationApiService = new LocationApiService();