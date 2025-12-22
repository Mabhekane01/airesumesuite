import { Location, ILocation } from '../models/Location';
import { Company } from '../models/Company';
import mongoose from 'mongoose';

interface ExternalLocationData {
  name: string;
  type: 'country' | 'state' | 'city';
  code?: string;
  parentCode?: string;
  countryCode: string;
  stateCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  timezone?: string;
  isEnglishSpeaking?: boolean;
  flag?: string;
  currency?: string;
}

interface AutocompleteOptions {
  query: string;
  type?: ('country' | 'state' | 'city')[];
  englishSpeaking?: boolean;
  limit?: number;
  includeCoordinates?: boolean;
  countryCode?: string;
  stateCode?: string;
}

interface LocationSearchResult {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city';
  code?: string;
  countryCode: string;
  stateCode?: string;
  flag?: string;
  fullName: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isEnglishSpeaking: boolean;
  parent?: {
    id: string;
    name: string;
    type: string;
  };
}

class LocationService {
  private cache = new Map<string, any>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  async initializeDatabase(): Promise<void> {
    const existingCount = await Location.countDocuments();
    if (existingCount === 0) {
      console.log('🌍 Initializing location database...');
      await this.seedBasicData();
      console.log('✅ Location database initialized');
    } else {
      console.log(`📍 Location database already contains ${existingCount} locations`);
    }
  }

  async seedBasicData(): Promise<void> {
    const locations: ExternalLocationData[] = [
      // English-speaking countries
      {
        name: 'United States',
        type: 'country',
        code: 'US',
        countryCode: 'US',
        coordinates: { latitude: 39.8283, longitude: -98.5795 },
        population: 331000000,
        timezone: 'America/New_York',
        isEnglishSpeaking: true,
        flag: '🇺🇸',
        currency: 'USD'
      },
      {
        name: 'United Kingdom',
        type: 'country',
        code: 'GB',
        countryCode: 'GB',
        coordinates: { latitude: 55.3781, longitude: -3.4360 },
        population: 67000000,
        timezone: 'Europe/London',
        isEnglishSpeaking: true,
        flag: '🇬🇧',
        currency: 'GBP'
      },
      {
        name: 'Canada',
        type: 'country',
        code: 'CA',
        countryCode: 'CA',
        coordinates: { latitude: 56.1304, longitude: -106.3468 },
        population: 38000000,
        timezone: 'America/Toronto',
        isEnglishSpeaking: true,
        flag: '🇨🇦',
        currency: 'CAD'
      },
      {
        name: 'Australia',
        type: 'country',
        code: 'AU',
        countryCode: 'AU',
        coordinates: { latitude: -25.2744, longitude: 133.7751 },
        population: 26000000,
        timezone: 'Australia/Sydney',
        isEnglishSpeaking: true,
        flag: '🇦🇺',
        currency: 'AUD'
      },
      {
        name: 'New Zealand',
        type: 'country',
        code: 'NZ',
        countryCode: 'NZ',
        coordinates: { latitude: -40.9006, longitude: 174.8860 },
        population: 5100000,
        timezone: 'Pacific/Auckland',
        isEnglishSpeaking: true,
        flag: '🇳🇿',
        currency: 'NZD'
      },
      {
        name: 'Ireland',
        type: 'country',
        code: 'IE',
        countryCode: 'IE',
        coordinates: { latitude: 53.4129, longitude: -8.2439 },
        population: 5000000,
        timezone: 'Europe/Dublin',
        isEnglishSpeaking: true,
        flag: '🇮🇪',
        currency: 'EUR'
      },
      {
        name: 'Singapore',
        type: 'country',
        code: 'SG',
        countryCode: 'SG',
        coordinates: { latitude: 1.3521, longitude: 103.8198 },
        population: 5900000,
        timezone: 'Asia/Singapore',
        isEnglishSpeaking: true,
        flag: '🇸🇬',
        currency: 'SGD'
      },
      {
        name: 'India',
        type: 'country',
        code: 'IN',
        countryCode: 'IN',
        coordinates: { latitude: 20.5937, longitude: 78.9629 },
        population: 1380000000,
        timezone: 'Asia/Kolkata',
        isEnglishSpeaking: true,
        flag: '🇮🇳',
        currency: 'INR'
      },
      {
        name: 'South Africa',
        type: 'country',
        code: 'ZA',
        countryCode: 'ZA',
        coordinates: { latitude: -30.5595, longitude: 22.9375 },
        population: 60000000,
        timezone: 'Africa/Johannesburg',
        isEnglishSpeaking: true,
        flag: '🇿🇦',
        currency: 'ZAR'
      }
    ];

    const usBatchSize = 50; // Process in batches to avoid memory issues
    const usStates = [
      { name: 'California', code: 'CA', coords: { lat: 36.7783, lng: -119.4179 } },
      { name: 'New York', code: 'NY', coords: { lat: 40.7128, lng: -74.0060 } },
      { name: 'Texas', code: 'TX', coords: { lat: 31.9686, lng: -99.9018 } },
      { name: 'Florida', code: 'FL', coords: { lat: 27.7663, lng: -82.6404 } },
      { name: 'Illinois', code: 'IL', coords: { lat: 40.6331, lng: -89.3985 } },
      { name: 'Pennsylvania', code: 'PA', coords: { lat: 41.2033, lng: -77.1945 } },
      { name: 'Ohio', code: 'OH', coords: { lat: 40.4173, lng: -82.9071 } },
      { name: 'Georgia', code: 'GA', coords: { lat: 32.1656, lng: -82.9001 } },
      { name: 'North Carolina', code: 'NC', coords: { lat: 35.7596, lng: -79.0193 } },
      { name: 'Michigan', code: 'MI', coords: { lat: 44.3148, lng: -85.6024 } },
      { name: 'New Jersey', code: 'NJ', coords: { lat: 40.0583, lng: -74.4057 } },
      { name: 'Virginia', code: 'VA', coords: { lat: 37.4316, lng: -78.6569 } },
      { name: 'Washington', code: 'WA', coords: { lat: 47.7511, lng: -120.7401 } },
      { name: 'Arizona', code: 'AZ', coords: { lat: 34.0489, lng: -111.0937 } },
      { name: 'Massachusetts', code: 'MA', coords: { lat: 42.4072, lng: -71.3824 } },
      { name: 'Tennessee', code: 'TN', coords: { lat: 35.5175, lng: -86.5804 } },
      { name: 'Indiana', code: 'IN', coords: { lat: 40.2732, lng: -86.1349 } },
      { name: 'Missouri', code: 'MO', coords: { lat: 37.9643, lng: -91.8318 } },
      { name: 'Maryland', code: 'MD', coords: { lat: 39.0458, lng: -76.6413 } },
      { name: 'Wisconsin', code: 'WI', coords: { lat: 43.7844, lng: -88.7879 } },
      { name: 'Colorado', code: 'CO', coords: { lat: 39.7392, lng: -104.9903 } },
      { name: 'Minnesota', code: 'MN', coords: { lat: 46.7296, lng: -94.6859 } },
      { name: 'Alabama', code: 'AL', coords: { lat: 32.3617, lng: -86.2792 } },
      { name: 'Louisiana', code: 'LA', coords: { lat: 31.2448, lng: -92.1450 } },
      { name: 'Kentucky', code: 'KY', coords: { lat: 37.8393, lng: -84.2700 } },
      { name: 'Oregon', code: 'OR', coords: { lat: 44.9319, lng: -123.0351 } },
      { name: 'Oklahoma', code: 'OK', coords: { lat: 35.0078, lng: -97.0929 } },
      { name: 'Connecticut', code: 'CT', coords: { lat: 41.6032, lng: -73.0877 } },
      { name: 'Utah', code: 'UT', coords: { lat: 39.3210, lng: -111.0937 } },
      { name: 'Iowa', code: 'IA', coords: { lat: 41.8780, lng: -93.0977 } },
      { name: 'Nevada', code: 'NV', coords: { lat: 38.8026, lng: -116.4194 } },
      { name: 'Arkansas', code: 'AR', coords: { lat: 35.2010, lng: -91.8318 } },
      { name: 'Mississippi', code: 'MS', coords: { lat: 32.3547, lng: -89.3985 } },
      { name: 'Kansas', code: 'KS', coords: { lat: 39.0119, lng: -98.4842 } },
      { name: 'New Mexico', code: 'NM', coords: { lat: 34.5199, lng: -105.8701 } },
      { name: 'Nebraska', code: 'NE', coords: { lat: 41.4925, lng: -99.9018 } },
      { name: 'West Virginia', code: 'WV', coords: { lat: 38.5976, lng: -80.4549 } },
      { name: 'Idaho', code: 'ID', coords: { lat: 44.0682, lng: -114.7420 } },
      { name: 'Hawaii', code: 'HI', coords: { lat: 19.8968, lng: -155.5828 } },
      { name: 'New Hampshire', code: 'NH', coords: { lat: 43.1939, lng: -71.5724 } },
      { name: 'Maine', code: 'ME', coords: { lat: 45.2538, lng: -69.4455 } },
      { name: 'Montana', code: 'MT', coords: { lat: 47.0527, lng: -109.6333 } },
      { name: 'Rhode Island', code: 'RI', coords: { lat: 41.7001, lng: -71.4774 } },
      { name: 'Delaware', code: 'DE', coords: { lat: 38.9108, lng: -75.5277 } },
      { name: 'South Dakota', code: 'SD', coords: { lat: 43.9695, lng: -99.9018 } },
      { name: 'North Dakota', code: 'ND', coords: { lat: 47.7511, lng: -100.7837 } },
      { name: 'Alaska', code: 'AK', coords: { lat: 64.0685, lng: -152.2782 } },
      { name: 'Vermont', code: 'VT', coords: { lat: 44.5588, lng: -72.5805 } },
      { name: 'Wyoming', code: 'WY', coords: { lat: 43.0759, lng: -107.2903 } }
    ];

    const majorCities = [
      { name: 'New York', state: 'NY', country: 'US', coords: { lat: 40.7128, lng: -74.0060 }, pop: 8336000 },
      { name: 'Los Angeles', state: 'CA', country: 'US', coords: { lat: 34.0522, lng: -118.2437 }, pop: 3979000 },
      { name: 'Chicago', state: 'IL', country: 'US', coords: { lat: 41.8781, lng: -87.6298 }, pop: 2693000 },
      { name: 'Houston', state: 'TX', country: 'US', coords: { lat: 29.7604, lng: -95.3698 }, pop: 2320000 },
      { name: 'Phoenix', state: 'AZ', country: 'US', coords: { lat: 33.4484, lng: -112.0740 }, pop: 1680000 },
      { name: 'Philadelphia', state: 'PA', country: 'US', coords: { lat: 39.9526, lng: -75.1652 }, pop: 1584000 },
      { name: 'San Antonio', state: 'TX', country: 'US', coords: { lat: 29.4241, lng: -98.4936 }, pop: 1547000 },
      { name: 'San Diego', state: 'CA', country: 'US', coords: { lat: 32.7157, lng: -117.1611 }, pop: 1423000 },
      { name: 'Dallas', state: 'TX', country: 'US', coords: { lat: 32.7767, lng: -96.7970 }, pop: 1343000 },
      { name: 'San Jose', state: 'CA', country: 'US', coords: { lat: 37.3382, lng: -121.8863 }, pop: 1021000 },
      { name: 'Austin', state: 'TX', country: 'US', coords: { lat: 30.2672, lng: -97.7431 }, pop: 978000 },
      { name: 'San Francisco', state: 'CA', country: 'US', coords: { lat: 37.7749, lng: -122.4194 }, pop: 873000 },
      { name: 'Seattle', state: 'WA', country: 'US', coords: { lat: 47.6062, lng: -122.3321 }, pop: 753000 },
      { name: 'Denver', state: 'CO', country: 'US', coords: { lat: 39.7392, lng: -104.9903 }, pop: 715000 },
      { name: 'Boston', state: 'MA', country: 'US', coords: { lat: 42.3601, lng: -71.0589 }, pop: 685000 },
      
      // International cities
      { name: 'London', state: 'England', country: 'GB', coords: { lat: 51.5074, lng: -0.1278 }, pop: 9540000 },
      { name: 'Toronto', state: 'ON', country: 'CA', coords: { lat: 43.6532, lng: -79.3832 }, pop: 2930000 },
      { name: 'Vancouver', state: 'BC', country: 'CA', coords: { lat: 49.2827, lng: -123.1207 }, pop: 675000 },
      { name: 'Montreal', state: 'QC', country: 'CA', coords: { lat: 45.5017, lng: -73.5673 }, pop: 1780000 },
      { name: 'Sydney', state: 'NSW', country: 'AU', coords: { lat: -33.8688, lng: 151.2093 }, pop: 5312000 },
      { name: 'Melbourne', state: 'VIC', country: 'AU', coords: { lat: -37.8136, lng: 144.9631 }, pop: 5078000 },
      { name: 'Auckland', state: 'Auckland', country: 'NZ', coords: { lat: -36.8485, lng: 174.7633 }, pop: 1695000 },
      { name: 'Dublin', state: 'Leinster', country: 'IE', coords: { lat: 53.3498, lng: -6.2603 }, pop: 544000 },
      { name: 'Singapore', state: 'Singapore', country: 'SG', coords: { lat: 1.3521, lng: 103.8198 }, pop: 5454000 },
      { name: 'Mumbai', state: 'Maharashtra', country: 'IN', coords: { lat: 19.0760, lng: 72.8777 }, pop: 20411000 },
      { name: 'Bangalore', state: 'Karnataka', country: 'IN', coords: { lat: 12.9716, lng: 77.5946 }, pop: 12765000 },
      { name: 'Delhi', state: 'Delhi', country: 'IN', coords: { lat: 28.7041, lng: 77.1025 }, pop: 32900000 },
      { name: 'Cape Town', state: 'Western Cape', country: 'ZA', coords: { lat: -33.9249, lng: 18.4241 }, pop: 4618000 },
      { name: 'Johannesburg', state: 'Gauteng', country: 'ZA', coords: { lat: -26.2041, lng: 28.0473 }, pop: 5635000 }
    ];

    try {
      // Create countries first
      for (const locationData of locations) {
        await this.createLocationIfNotExists(locationData);
      }

      // Create US states
      const usCountry = await Location.findOne({ type: 'country', code: 'US' });
      if (usCountry) {
        for (const state of usStates) {
          await this.createLocationIfNotExists({
            name: state.name,
            type: 'state',
            code: state.code,
            countryCode: 'US',
            stateCode: state.code,
            coordinates: { latitude: state.coords.lat, longitude: state.coords.lng },
            isEnglishSpeaking: true
          }, new mongoose.Types.ObjectId(usCountry._id as string));
        }
      }

      // Create major cities
      for (const city of majorCities) {
        const stateLocation = await Location.findOne({
          type: 'state',
          countryCode: city.country,
          $or: [
            { code: city.state },
            { name: city.state }
          ]
        });

        await this.createLocationIfNotExists({
          name: city.name,
          type: 'city',
          countryCode: city.country,
          stateCode: city.state,
          coordinates: { latitude: city.coords.lat, longitude: city.coords.lng },
          population: city.pop,
          isEnglishSpeaking: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG', 'IN', 'ZA'].includes(city.country)
        }, stateLocation ? new mongoose.Types.ObjectId(stateLocation._id as string) : undefined);
      }

    } catch (error) {
      console.error('Error seeding location data:', error);
      throw error;
    }
  }

  private async createLocationIfNotExists(
    locationData: ExternalLocationData,
    parentId?: mongoose.Types.ObjectId
  ): Promise<ILocation> {
    const existing = await Location.findOne({
      name: locationData.name,
      type: locationData.type,
      countryCode: locationData.countryCode
    });

    if (existing) {
      return existing;
    }

    const searchTerms = [
      locationData.name.toLowerCase(),
      ...(locationData.code ? [locationData.code.toLowerCase()] : [])
    ];

    const location = new Location({
      ...locationData,
      parentId,
      searchTerms,
      metadata: {
        majorCity: locationData.type === 'city' && (locationData.population || 0) > 500000,
        capital: locationData.name === 'Washington' || locationData.name === 'London' || 
               locationData.name === 'Ottawa' || locationData.name === 'Canberra',
        techHub: ['San Francisco', 'Seattle', 'Austin', 'Boston', 'New York', 'London', 
                 'Toronto', 'Vancouver', 'Sydney', 'Singapore', 'Bangalore'].includes(locationData.name),
        businessHub: ['New York', 'London', 'Singapore', 'Hong Kong', 'Tokyo', 'Frankfurt'].includes(locationData.name)
      }
    });

    return await location.save();
  }

  async autocomplete(options: AutocompleteOptions): Promise<LocationSearchResult[]> {
    const cacheKey = `autocomplete:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const {
      query,
      type = ['country', 'state', 'city'],
      englishSpeaking,
      limit = 10,
      includeCoordinates = false,
      countryCode,
      stateCode
    } = options;

    const searchQuery: any = {
      $and: [
        { type: { $in: type } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { searchTerms: { $regex: query, $options: 'i' } },
            { code: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    };

    if (englishSpeaking !== undefined) {
      searchQuery.$and.push({ isEnglishSpeaking: englishSpeaking });
    }

    if (countryCode) {
      searchQuery.$and.push({ countryCode: countryCode.toUpperCase() });
    }

    if (stateCode) {
      searchQuery.$and.push({ stateCode: stateCode.toUpperCase() });
    }

    const locations = await Location.find(searchQuery)
      .populate('parent', 'name type code')
      .sort({
        'metadata.capital': -1,
        'metadata.majorCity': -1,
        'metadata.techHub': -1,
        population: -1,
        name: 1
      })
      .limit(limit);

    const results: LocationSearchResult[] = locations.map(location => ({
      id: location._id.toString(),
      name: location.name,
      type: location.type,
      code: location.code,
      countryCode: location.countryCode,
      stateCode: location.stateCode,
      flag: location.flag,
      fullName: this.buildFullName(location),
      coordinates: includeCoordinates ? location.coordinates : undefined,
      isEnglishSpeaking: location.isEnglishSpeaking || false,
      parent: location.parentId ? {
        id: location.parentId.toString(),
        name: '',
        type: 'country' as const
      } : undefined
    }));

    this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  private buildFullName(location: ILocation): string {
    if (location.type === 'country') {
      return location.name;
    }
    
    if (location.type === 'state' && location.$parent) {
      return `${location.name}, ${location.$parent.name}`;
    }
    
    if (location.type === 'city') {
      if (location.stateCode && location.countryCode) {
        return `${location.name}, ${location.stateCode}, ${location.countryCode}`;
      }
      return location.name;
    }
    
    return location.name;
  }

  async getLocationById(id: string): Promise<LocationSearchResult | null> {
    const location = await Location.findById(id).populate('parent', 'name type code');
    if (!location) return null;

    return {
      id: location._id.toString(),
      name: location.name,
      type: location.type,
      code: location.code,
      countryCode: location.countryCode,
      stateCode: location.stateCode,
      flag: location.flag,
      fullName: this.buildFullName(location),
      coordinates: location.coordinates,
      isEnglishSpeaking: location.isEnglishSpeaking || false,
      parent: location.parentId ? {
        id: location.parentId.toString(),
        name: '',
        type: 'country' as const
      } : undefined
    };
  }

  async getEnglishSpeakingCountries(): Promise<LocationSearchResult[]> {
    const countries = await Location.find({
      type: 'country',
      isEnglishSpeaking: true
    }).sort({ name: 1 });

    return countries.map(country => ({
      id: country._id.toString(),
      name: country.name,
      type: country.type,
      code: country.code,
      countryCode: country.countryCode,
      flag: country.flag,
      fullName: country.name,
      isEnglishSpeaking: true
    }));
  }

  async getStatesForCountry(countryCode: string): Promise<LocationSearchResult[]> {
    const states = await Location.find({
      type: 'state',
      countryCode: countryCode.toUpperCase()
    }).sort({ name: 1 });

    return states.map(state => ({
      id: state._id.toString(),
      name: state.name,
      type: state.type,
      code: state.code,
      countryCode: state.countryCode,
      stateCode: state.stateCode,
      fullName: state.name,
      isEnglishSpeaking: state.isEnglishSpeaking || false
    }));
  }

  async getCitiesForState(countryCode: string, stateCode?: string): Promise<LocationSearchResult[]> {
    const query: any = {
      type: 'city',
      countryCode: countryCode.toUpperCase()
    };

    if (stateCode) {
      query.stateCode = stateCode.toUpperCase();
    }

    const cities = await Location.find(query)
      .sort({
        'metadata.majorCity': -1,
        'metadata.techHub': -1,
        population: -1,
        name: 1
      })
      .limit(100);

    return cities.map(city => ({
      id: city._id.toString(),
      name: city.name,
      type: city.type,
      countryCode: city.countryCode,
      stateCode: city.stateCode,
      fullName: this.buildFullName(city),
      coordinates: city.coordinates,
      isEnglishSpeaking: city.isEnglishSpeaking || false
    }));
  }

  async updateCompanyLocationReferences(): Promise<void> {
    const companies = await Company.find({
      $or: [
        { 'headquarters.city': { $exists: true } },
        { 'offices.city': { $exists: true } }
      ]
    });

    for (const company of companies) {
      let updated = false;

      // Update headquarters location reference
      if (company.headquarters?.city && !company.headquarters.locationId) {
        const location = await this.findBestLocationMatch(
          company.headquarters.city,
          company.headquarters.state,
          company.headquarters.country
        );
        
        if (location) {
          company.headquarters.locationId = new mongoose.Types.ObjectId(location.id);
          company.headquarters.countryCode = location.countryCode;
          company.headquarters.stateCode = location.stateCode;
          updated = true;
        }
      }

      // Update office location references
      for (const office of company.offices || []) {
        if (office.city && !office.locationId) {
          const location = await this.findBestLocationMatch(
            office.city,
            office.state,
            office.country
          );
          
          if (location) {
            office.locationId = new mongoose.Types.ObjectId(location.id);
            office.countryCode = location.countryCode;
            office.stateCode = location.stateCode;
            updated = true;
          }
        }
      }

      if (updated) {
        await company.save();
      }
    }
  }

  private async findBestLocationMatch(
    city: string,
    state?: string,
    country?: string
  ): Promise<LocationSearchResult | null> {
    const results = await this.autocomplete({
      query: city,
      type: ['city'],
      limit: 5
    });

    // Try to find exact match considering state and country
    for (const result of results) {
      if (result.name.toLowerCase() === city.toLowerCase()) {
        if (state && result.stateCode?.toLowerCase() === state.toLowerCase()) {
          return result;
        }
        if (country && result.countryCode.toLowerCase() === country.toLowerCase()) {
          return result;
        }
      }
    }

    // Return first close match
    return results.length > 0 ? results[0] : null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const locationService = new LocationService();