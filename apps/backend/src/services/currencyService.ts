import { Currency, ICurrency } from '../models/Currency';

interface CurrencyData {
  code: string;
  name: string;
  symbol: string;
  countries: string[];
  subunit?: string;
  subunitToUnit?: number;
  symbolNative?: string;
  decimalDigits?: number;
  rounding?: number;
  isEnglishSpeakingPrimary?: boolean;
  metadata?: {
    type: 'fiat' | 'cryptocurrency' | 'commodity';
    isDigital: boolean;
    centralBank?: string;
    introduced?: Date;
  };
}

interface CurrencySearchOptions {
  query?: string;
  englishSpeaking?: boolean;
  countryCode?: string;
  limit?: number;
}

interface CurrencySearchResult {
  id: string;
  code: string;
  name: string;
  symbol: string;
  countries: string[];
  displaySymbol: string;
  isEnglishSpeakingPrimary: boolean;
  subunit?: string;
  decimalDigits: number;
}

class CurrencyService {
  private cache = new Map<string, any>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  async initializeDatabase(): Promise<void> {
    const existingCount = await Currency.countDocuments();
    if (existingCount === 0) {
      console.log('💰 Initializing currency database...');
      await this.seedCurrencyData();
      console.log('✅ Currency database initialized');
    } else {
      console.log(`💰 Currency database already contains ${existingCount} currencies`);
    }
  }

  private async seedCurrencyData(): Promise<void> {
    const currencies: CurrencyData[] = [
      // Primary English-speaking countries
      {
        code: 'USD',
        name: 'United States Dollar',
        symbol: '$',
        symbolNative: '$',
        countries: ['US', 'AS', 'GU', 'MH', 'FM', 'MP', 'PW', 'PR', 'TC', 'VI', 'VG', 'BQ', 'EC', 'SV', 'TL', 'ZW'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Federal Reserve System',
          introduced: new Date('1792-04-02')
        }
      },
      {
        code: 'GBP',
        name: 'British Pound Sterling',
        symbol: '£',
        symbolNative: '£',
        countries: ['GB', 'IM', 'JE', 'GG', 'FK', 'GI', 'GS', 'IO', 'PN', 'SH', 'TA'],
        subunit: 'Penny',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of England',
          introduced: new Date('1971-02-15')
        }
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        symbolNative: '$',
        countries: ['CA'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Canada',
          introduced: new Date('1858-01-01')
        }
      },
      {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        symbolNative: '$',
        countries: ['AU', 'CX', 'CC', 'HM', 'KI', 'NR', 'NF', 'TV'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Reserve Bank of Australia',
          introduced: new Date('1966-02-14')
        }
      },
      {
        code: 'NZD',
        name: 'New Zealand Dollar',
        symbol: 'NZ$',
        symbolNative: '$',
        countries: ['NZ', 'CK', 'NU', 'PN', 'TK'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Reserve Bank of New Zealand',
          introduced: new Date('1967-07-10')
        }
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        symbolNative: '€',
        countries: ['IE', 'MT', 'CY'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'European Central Bank',
          introduced: new Date('1999-01-01')
        }
      },
      {
        code: 'SGD',
        name: 'Singapore Dollar',
        symbol: 'S$',
        symbolNative: '$',
        countries: ['SG'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Monetary Authority of Singapore',
          introduced: new Date('1967-06-12')
        }
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        symbolNative: '₹',
        countries: ['IN'],
        subunit: 'Paisa',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Reserve Bank of India',
          introduced: new Date('1950-01-26')
        }
      },
      {
        code: 'ZAR',
        name: 'South African Rand',
        symbol: 'R',
        symbolNative: 'R',
        countries: ['ZA', 'LS', 'NA', 'SZ'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'South African Reserve Bank',
          introduced: new Date('1961-02-14')
        }
      },
      
      // Caribbean English-speaking countries
      {
        code: 'XCD',
        name: 'East Caribbean Dollar',
        symbol: 'EC$',
        symbolNative: '$',
        countries: ['AG', 'DM', 'GD', 'MS', 'KN', 'LC', 'VC', 'AI'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Eastern Caribbean Central Bank',
          introduced: new Date('1965-10-06')
        }
      },
      {
        code: 'JMD',
        name: 'Jamaican Dollar',
        symbol: 'J$',
        symbolNative: '$',
        countries: ['JM'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Jamaica',
          introduced: new Date('1969-09-08')
        }
      },
      {
        code: 'BBD',
        name: 'Barbadian Dollar',
        symbol: 'Bds$',
        symbolNative: '$',
        countries: ['BB'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Barbados',
          introduced: new Date('1973-07-05')
        }
      },
      {
        code: 'TTD',
        name: 'Trinidad and Tobago Dollar',
        symbol: 'TT$',
        symbolNative: '$',
        countries: ['TT'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Trinidad and Tobago',
          introduced: new Date('1964-01-01')
        }
      },
      {
        code: 'BSD',
        name: 'Bahamian Dollar',
        symbol: 'B$',
        symbolNative: '$',
        countries: ['BS'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of The Bahamas',
          introduced: new Date('1966-05-25')
        }
      },
      {
        code: 'GYD',
        name: 'Guyanese Dollar',
        symbol: 'GY$',
        symbolNative: '$',
        countries: ['GY'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Guyana',
          introduced: new Date('1966-05-26')
        }
      },
      {
        code: 'BZD',
        name: 'Belize Dollar',
        symbol: 'BZ$',
        symbolNative: '$',
        countries: ['BZ'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Belize',
          introduced: new Date('1973-01-01')
        }
      },
      
      // African English-speaking countries
      {
        code: 'NGN',
        name: 'Nigerian Naira',
        symbol: '₦',
        symbolNative: '₦',
        countries: ['NG'],
        subunit: 'Kobo',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Nigeria',
          introduced: new Date('1973-01-01')
        }
      },
      {
        code: 'KES',
        name: 'Kenyan Shilling',
        symbol: 'KSh',
        symbolNative: 'Ksh',
        countries: ['KE'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Kenya',
          introduced: new Date('1966-09-14')
        }
      },
      {
        code: 'GHS',
        name: 'Ghanaian Cedi',
        symbol: 'GH₵',
        symbolNative: '₵',
        countries: ['GH'],
        subunit: 'Pesewa',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Ghana',
          introduced: new Date('2007-07-01')
        }
      },
      {
        code: 'UGX',
        name: 'Ugandan Shilling',
        symbol: 'USh',
        symbolNative: 'USh',
        countries: ['UG'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 0,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Uganda',
          introduced: new Date('1987-05-15')
        }
      },
      {
        code: 'TZS',
        name: 'Tanzanian Shilling',
        symbol: 'TSh',
        symbolNative: 'TSh',
        countries: ['TZ'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Tanzania',
          introduced: new Date('1966-06-14')
        }
      },
      {
        code: 'BWP',
        name: 'Botswana Pula',
        symbol: 'P',
        symbolNative: 'P',
        countries: ['BW'],
        subunit: 'Thebe',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Botswana',
          introduced: new Date('1976-08-23')
        }
      },
      {
        code: 'ZMW',
        name: 'Zambian Kwacha',
        symbol: 'ZK',
        symbolNative: 'ZK',
        countries: ['ZM'],
        subunit: 'Ngwee',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Zambia',
          introduced: new Date('2013-01-01')
        }
      },
      {
        code: 'MWK',
        name: 'Malawian Kwacha',
        symbol: 'MK',
        symbolNative: 'MK',
        countries: ['MW'],
        subunit: 'Tambala',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Reserve Bank of Malawi',
          introduced: new Date('1971-02-15')
        }
      },
      
      // Pacific English-speaking countries
      {
        code: 'FJD',
        name: 'Fijian Dollar',
        symbol: 'FJ$',
        symbolNative: '$',
        countries: ['FJ'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Reserve Bank of Fiji',
          introduced: new Date('1969-01-15')
        }
      },
      {
        code: 'PGK',
        name: 'Papua New Guinean Kina',
        symbol: 'K',
        symbolNative: 'K',
        countries: ['PG'],
        subunit: 'Toea',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Papua New Guinea',
          introduced: new Date('1975-04-19')
        }
      },
      {
        code: 'VUV',
        name: 'Vanuatu Vatu',
        symbol: 'VT',
        symbolNative: 'VT',
        countries: ['VU'],
        subunit: null,
        subunitToUnit: 1,
        decimalDigits: 0,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Reserve Bank of Vanuatu',
          introduced: new Date('1981-07-30')
        }
      },
      {
        code: 'SBD',
        name: 'Solomon Islands Dollar',
        symbol: 'SI$',
        symbolNative: '$',
        countries: ['SB'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Solomon Islands',
          introduced: new Date('1977-10-24')
        }
      },
      {
        code: 'WST',
        name: 'Samoan Tala',
        symbol: 'WS$',
        symbolNative: '$',
        countries: ['WS'],
        subunit: 'Sene',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Samoa',
          introduced: new Date('1967-07-10')
        }
      },
      {
        code: 'TOP',
        name: 'Tongan Paʻanga',
        symbol: 'T$',
        symbolNative: 'T$',
        countries: ['TO'],
        subunit: 'Seniti',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'National Reserve Bank of Tonga',
          introduced: new Date('1967-04-03')
        }
      },
      
      // Other currencies used in English-speaking regions
      {
        code: 'LRD',
        name: 'Liberian Dollar',
        symbol: 'L$',
        symbolNative: '$',
        countries: ['LR'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Liberia',
          introduced: new Date('1943-01-01')
        }
      },
      {
        code: 'SLL',
        name: 'Sierra Leonean Leone',
        symbol: 'Le',
        symbolNative: 'Le',
        countries: ['SL'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank of Sierra Leone',
          introduced: new Date('1964-08-04')
        }
      },
      {
        code: 'GMD',
        name: 'Gambian Dalasi',
        symbol: 'D',
        symbolNative: 'D',
        countries: ['GM'],
        subunit: 'Butut',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of The Gambia',
          introduced: new Date('1971-07-01')
        }
      },
      {
        code: 'LKR',
        name: 'Sri Lankan Rupee',
        symbol: 'Rs',
        symbolNative: 'රු',
        countries: ['LK'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Central Bank of Sri Lanka',
          introduced: new Date('1972-05-22')
        }
      },
      {
        code: 'MYR',
        name: 'Malaysian Ringgit',
        symbol: 'RM',
        symbolNative: 'RM',
        countries: ['MY'],
        subunit: 'Sen',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bank Negara Malaysia',
          introduced: new Date('1975-08-01')
        }
      },
      {
        code: 'BND',
        name: 'Brunei Dollar',
        symbol: 'B$',
        symbolNative: '$',
        countries: ['BN'],
        subunit: 'Sen',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Autoriti Monetari Brunei Darussalam',
          introduced: new Date('1967-06-12')
        }
      },
      {
        code: 'HKD',
        name: 'Hong Kong Dollar',
        symbol: 'HK$',
        symbolNative: '$',
        countries: ['HK'],
        subunit: 'Cent',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Hong Kong Monetary Authority',
          introduced: new Date('1863-01-01')
        }
      },
      {
        code: 'PHP',
        name: 'Philippine Peso',
        symbol: '₱',
        symbolNative: '₱',
        countries: ['PH'],
        subunit: 'Sentimo',
        subunitToUnit: 100,
        decimalDigits: 2,
        isEnglishSpeakingPrimary: true,
        metadata: {
          type: 'fiat',
          isDigital: false,
          centralBank: 'Bangko Sentral ng Pilipinas',
          introduced: new Date('1949-01-03')
        }
      }
    ];

    try {
      for (const currencyData of currencies) {
        const existing = await Currency.findOne({ code: currencyData.code });
        if (existing) continue;

        const searchTerms = [
          currencyData.name.toLowerCase(),
          currencyData.code.toLowerCase(),
          ...(currencyData.subunit ? [currencyData.subunit.toLowerCase()] : []),
          ...currencyData.countries.map(c => c.toLowerCase())
        ];

        const currency = new Currency({
          ...currencyData,
          searchTerms,
          isActive: true
        });

        await currency.save();
        console.log(`✅ Created currency: ${currencyData.code} - ${currencyData.name}`);
      }
    } catch (error) {
      console.error('Error seeding currency data:', error);
      throw error;
    }
  }

  async searchCurrencies(options: CurrencySearchOptions): Promise<CurrencySearchResult[]> {
    const cacheKey = `currencies:search:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const {
      query,
      englishSpeaking,
      countryCode,
      limit = 50
    } = options;

    let searchQuery: any = { isActive: true };

    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { searchTerms: { $regex: query, $options: 'i' } }
      ];
    }

    if (englishSpeaking !== undefined) {
      searchQuery.isEnglishSpeakingPrimary = englishSpeaking;
    }

    if (countryCode) {
      searchQuery.countries = countryCode.toUpperCase();
    }

    const currencies = await Currency.find(searchQuery)
      .sort({ isEnglishSpeakingPrimary: -1, name: 1 })
      .limit(limit);

    const results: CurrencySearchResult[] = currencies.map(currency => ({
      id: currency._id.toString(),
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      countries: currency.countries,
      displaySymbol: `${currency.symbol} (${currency.code})`,
      isEnglishSpeakingPrimary: currency.isEnglishSpeakingPrimary,
      subunit: currency.subunit,
      decimalDigits: currency.decimalDigits
    }));

    this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  async getEnglishSpeakingCurrencies(): Promise<CurrencySearchResult[]> {
    return this.searchCurrencies({ englishSpeaking: true });
  }

  async getCurrenciesByCountry(countryCode: string): Promise<CurrencySearchResult[]> {
    return this.searchCurrencies({ countryCode });
  }

  async getAllCurrencies(): Promise<CurrencySearchResult[]> {
    const cacheKey = 'currencies:all';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const currencies = await Currency.find({ isActive: true })
      .sort({ isEnglishSpeakingPrimary: -1, name: 1 });

    const results: CurrencySearchResult[] = currencies.map(currency => ({
      id: currency._id.toString(),
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      countries: currency.countries,
      displaySymbol: `${currency.symbol} (${currency.code})`,
      isEnglishSpeakingPrimary: currency.isEnglishSpeakingPrimary,
      subunit: currency.subunit,
      decimalDigits: currency.decimalDigits
    }));

    this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const currencyService = new CurrencyService();