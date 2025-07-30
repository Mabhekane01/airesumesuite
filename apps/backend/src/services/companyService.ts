import { Company, ICompany } from '../models/Company';
import { Location } from '../models/Location';
import { locationService } from './locationService';
import mongoose from 'mongoose';

interface CompanySearchOptions {
  query?: string;
  industry?: string[];
  size?: string[];
  countryCode?: string;
  stateCode?: string;
  city?: string;
  englishSpeaking?: boolean;
  remoteFriendly?: boolean;
  techStack?: string[];
  fundingStage?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'size' | 'rating' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

interface CompanySearchResult {
  id: string;
  name: string;
  industry: string;
  size: string;
  website?: string;
  description?: string;
  headquarters?: {
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    fullLocation?: string;
  };
  ratings?: {
    glassdoor?: {
      overall: number;
      workLifeBalance: number;
      compensation: number;
      culture: number;
    };
  };
  culture?: {
    remoteFriendly: boolean;
    hybridOptions: boolean;
    values?: string[];
  };
  techStack?: {
    languages: string[];
    frameworks: string[];
    cloud: string[];
  };
  fundingStage?: string;
  employeeCount?: number;
  aiInsights?: {
    recommendationScore: number;
    cultureMatch: number;
    careerGrowthPotential: number;
  };
  tags?: string[];
  priority?: string;
  isEnglishSpeaking?: boolean;
}

interface CreateCompanyData {
  name: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  website?: string;
  description?: string;
  headquarters?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  techStack?: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    cloud?: string[];
    tools?: string[];
  };
  culture?: {
    remoteFriendly?: boolean;
    hybridOptions?: boolean;
    values?: string[];
    benefits?: string[];
  };
}

class CompanyService {
  private cache = new Map<string, any>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  async initializeDatabase(): Promise<void> {
    const existingCount = await Company.countDocuments();
    if (existingCount === 0) {
      console.log('🏢 Initializing company database...');
      await this.seedMajorCompanies();
      console.log('✅ Company database initialized');
    } else {
      console.log(`🏢 Company database already contains ${existingCount} companies`);
    }
  }

  private async seedMajorCompanies(): Promise<void> {
    const majorCompanies = [
      {
        name: 'Google',
        industry: 'Technology',
        size: 'enterprise' as const,
        website: 'https://google.com',
        description: 'Multinational technology company specializing in internet-related services and products.',
        headquarters: { city: 'Mountain View', state: 'CA', country: 'United States', countryCode: 'US' },
        techStack: {
          languages: ['Java', 'Python', 'C++', 'Go', 'JavaScript'],
          frameworks: ['Angular', 'TensorFlow', 'Kubernetes'],
          cloud: ['Google Cloud Platform'],
          databases: ['Bigtable', 'Spanner', 'Cloud SQL']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Focus on the user', 'Democracy on the web', 'Fast is better than slow']
        },
        fundingStage: 'ipo',
        employeeCount: 156000
      },
      {
        name: 'Microsoft',
        industry: 'Technology',
        size: 'enterprise' as const,
        website: 'https://microsoft.com',
        description: 'Multinational technology corporation producing computer software, consumer electronics, and personal computers.',
        headquarters: { city: 'Redmond', state: 'WA', country: 'United States', countryCode: 'US' },
        techStack: {
          languages: ['C#', 'TypeScript', 'Python', 'C++', 'F#'],
          frameworks: ['.NET', 'Azure', 'React', 'Angular'],
          cloud: ['Microsoft Azure'],
          databases: ['SQL Server', 'CosmosDB']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Respect', 'Integrity', 'Accountability']
        },
        fundingStage: 'ipo',
        employeeCount: 221000
      },
      {
        name: 'Apple',
        industry: 'Technology',
        size: 'enterprise' as const,
        website: 'https://apple.com',
        description: 'Multinational technology company that designs and manufactures consumer electronics and software.',
        headquarters: { city: 'Cupertino', state: 'CA', country: 'United States', countryCode: 'US' },
        techStack: {
          languages: ['Swift', 'Objective-C', 'C++', 'Python'],
          frameworks: ['iOS', 'macOS', 'watchOS', 'tvOS'],
          cloud: ['iCloud'],
          databases: ['Core Data', 'CloudKit']
        },
        culture: {
          remoteFriendly: false,
          hybridOptions: true,
          values: ['Innovation', 'Privacy', 'Quality']
        },
        fundingStage: 'ipo',
        employeeCount: 164000
      },
      {
        name: 'Amazon',
        industry: 'Technology',
        size: 'enterprise' as const,
        website: 'https://amazon.com',
        description: 'Multinational technology company focusing on e-commerce, cloud computing, and artificial intelligence.',
        headquarters: { city: 'Seattle', state: 'WA', country: 'United States', countryCode: 'US' },
        techStack: {
          languages: ['Java', 'Python', 'JavaScript', 'C++', 'Go'],
          frameworks: ['AWS', 'React', 'Spring'],
          cloud: ['Amazon Web Services'],
          databases: ['DynamoDB', 'RDS', 'Redshift']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Customer Obsession', 'Ownership', 'Invent and Simplify']
        },
        fundingStage: 'ipo',
        employeeCount: 1540000
      },
      {
        name: 'Meta',
        industry: 'Technology',
        size: 'enterprise' as const,
        website: 'https://meta.com',
        description: 'Technology company focusing on social media, virtual reality, and the metaverse.',
        headquarters: { city: 'Menlo Park', state: 'CA', country: 'United States', countryCode: 'US' },
        techStack: {
          languages: ['JavaScript', 'Python', 'C++', 'PHP', 'Hack'],
          frameworks: ['React', 'React Native', 'PyTorch'],
          cloud: ['Facebook Infrastructure'],
          databases: ['MySQL', 'Cassandra', 'Memcached']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Move Fast', 'Be Bold', 'Focus on Impact']
        },
        fundingStage: 'ipo',
        employeeCount: 77800
      },
      {
        name: 'Shopify',
        industry: 'Technology',
        size: 'large' as const,
        website: 'https://shopify.com',
        description: 'Multinational e-commerce company providing a platform for online stores and retail point-of-sale systems.',
        headquarters: { city: 'Ottawa', state: 'ON', country: 'Canada', countryCode: 'CA' },
        techStack: {
          languages: ['Ruby', 'JavaScript', 'TypeScript', 'Go', 'Python'],
          frameworks: ['Ruby on Rails', 'React', 'GraphQL'],
          cloud: ['Google Cloud Platform', 'AWS'],
          databases: ['MySQL', 'Redis', 'Elasticsearch']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Default to Open', 'Merchant Obsessed', 'Think Global']
        },
        fundingStage: 'ipo',
        employeeCount: 10000
      },
      {
        name: 'Stripe',
        industry: 'Financial Technology',
        size: 'large' as const,
        website: 'https://stripe.com',
        description: 'Financial services and software company providing payment processing software and APIs.',
        headquarters: { city: 'San Francisco', state: 'CA', country: 'United States', countryCode: 'US' },
        techStack: {
          languages: ['Ruby', 'JavaScript', 'Python', 'Go', 'Java'],
          frameworks: ['Ruby on Rails', 'React', 'Node.js'],
          cloud: ['AWS', 'Google Cloud Platform'],
          databases: ['MongoDB', 'Redis', 'PostgreSQL']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Move with urgency and focus', 'Think rigorously', 'Trust and amplify']
        },
        fundingStage: 'private',
        employeeCount: 4000
      },
      {
        name: 'Atlassian',
        industry: 'Technology',
        size: 'large' as const,
        website: 'https://atlassian.com',
        description: 'Software company developing products for software developers and project managers.',
        headquarters: { city: 'Sydney', state: 'NSW', country: 'Australia', countryCode: 'AU' },
        techStack: {
          languages: ['Java', 'JavaScript', 'Python', 'Scala'],
          frameworks: ['Spring', 'React', 'Node.js'],
          cloud: ['AWS', 'Atlassian Cloud'],
          databases: ['PostgreSQL', 'MySQL', 'DynamoDB']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Open company, no bullshit', 'Build with heart and balance', 'Don\'t #@!% the customer']
        },
        fundingStage: 'ipo',
        employeeCount: 8813
      },
      {
        name: 'Canva',
        industry: 'Technology',
        size: 'large' as const,
        website: 'https://canva.com',
        description: 'Graphic design platform that allows users to create social media graphics, presentations, and other visual content.',
        headquarters: { city: 'Sydney', state: 'NSW', country: 'Australia', countryCode: 'AU' },
        techStack: {
          languages: ['JavaScript', 'TypeScript', 'Python', 'Java'],
          frameworks: ['React', 'Node.js', 'Django'],
          cloud: ['AWS', 'Google Cloud Platform'],
          databases: ['PostgreSQL', 'Redis', 'Elasticsearch']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['Be a good human', 'Set crazy big goals and make them happen', 'Make complex things simple']
        },
        fundingStage: 'private',
        employeeCount: 4000
      },
      {
        name: 'Spotify',
        industry: 'Technology',
        size: 'large' as const,
        website: 'https://spotify.com',
        description: 'Audio streaming and media services provider offering music, podcasts, and video content.',
        headquarters: { city: 'Stockholm', state: 'Stockholm', country: 'Sweden', countryCode: 'SE' },
        techStack: {
          languages: ['Python', 'Java', 'Scala', 'JavaScript', 'Go'],
          frameworks: ['React', 'Spring', 'Flask'],
          cloud: ['Google Cloud Platform', 'AWS'],
          databases: ['Cassandra', 'PostgreSQL', 'BigQuery']
        },
        culture: {
          remoteFriendly: true,
          hybridOptions: true,
          values: ['We are here to enable human creativity', 'We always start with our users', 'Collaboration is everything']
        },
        fundingStage: 'ipo',
        employeeCount: 9200
      }
    ];

    for (const companyData of majorCompanies) {
      try {
        // Check if company already exists
        const existingCompany = await Company.findOne({ name: companyData.name });
        if (existingCompany) continue;

        // Create a system user ID for seeded companies
        const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');

        // Find location reference for headquarters
        let locationId: mongoose.Types.ObjectId | undefined;
        if (companyData.headquarters?.city) {
          const locationResult = await locationService.autocomplete({
            query: companyData.headquarters.city,
            type: ['city'],
            countryCode: companyData.headquarters.countryCode,
            limit: 1
          });
          
          if (locationResult.length > 0) {
            locationId = new mongoose.Types.ObjectId(locationResult[0].id);
          }
        }

        const company = new Company({
          userId: systemUserId,
          name: companyData.name,
          industry: companyData.industry,
          size: companyData.size,
          website: companyData.website,
          description: companyData.description,
          headquarters: {
            ...companyData.headquarters,
            locationId
          },
          techStack: companyData.techStack,
          culture: companyData.culture,
          fundingStage: companyData.fundingStage,
          employeeCount: companyData.employeeCount,
          isVerified: true,
          dataSources: [{
            source: 'manual_seed',
            lastUpdated: new Date(),
            reliability: 'high'
          }],
          aiInsights: {
            cultureMatch: Math.floor(Math.random() * 40) + 60, // 60-100
            careerGrowthPotential: Math.floor(Math.random() * 30) + 70, // 70-100
            compensationCompetitiveness: Math.floor(Math.random() * 25) + 75, // 75-100
            workLifeBalanceScore: Math.floor(Math.random() * 40) + 60, // 60-100
            stabilityScore: companyData.fundingStage === 'ipo' ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 60,
            innovationScore: Math.floor(Math.random() * 30) + 70, // 70-100
            recommendationScore: Math.floor(Math.random() * 25) + 75, // 75-100
            keyStrengths: ['Strong technical culture', 'Growth opportunities', 'Competitive compensation'],
            bestFitRoles: ['Software Engineer', 'Product Manager', 'Data Scientist'],
            lastUpdated: new Date()
          },
          priority: 'high',
          targetCompany: true
        });

        await company.save();
        console.log(`✅ Created company: ${companyData.name}`);
      } catch (error) {
        console.error(`❌ Error creating company ${companyData.name}:`, error);
      }
    }
  }

  async searchCompanies(
    userId: string,
    options: CompanySearchOptions
  ): Promise<{ companies: CompanySearchResult[]; total: number }> {
    const cacheKey = `search:${userId}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const {
      query,
      industry,
      size,
      countryCode,
      stateCode,
      city,
      englishSpeaking,
      remoteFriendly,
      techStack,
      fundingStage,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;

    // Build search query
    const searchQuery: any = {
      $and: [
        { archived: false },
        {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            { isVerified: true } // Include verified/public companies
          ]
        }
      ]
    };

    // Text search
    if (query) {
      searchQuery.$and.push({
        $text: { $search: query }
      });
    }

    // Industry filter
    if (industry && industry.length > 0) {
      searchQuery.$and.push({ industry: { $in: industry } });
    }

    // Size filter
    if (size && size.length > 0) {
      searchQuery.$and.push({ size: { $in: size } });
    }

    // Location filters
    if (countryCode) {
      searchQuery.$and.push({ 'headquarters.countryCode': countryCode.toUpperCase() });
    }

    if (stateCode) {
      searchQuery.$and.push({ 'headquarters.stateCode': stateCode.toUpperCase() });
    }

    if (city) {
      searchQuery.$and.push({ 'headquarters.city': { $regex: city, $options: 'i' } });
    }

    // English speaking filter
    if (englishSpeaking !== undefined) {
      const englishSpeakingCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG', 'IN', 'ZA'];
      if (englishSpeaking) {
        searchQuery.$and.push({ 'headquarters.countryCode': { $in: englishSpeakingCountries } });
      } else {
        searchQuery.$and.push({ 'headquarters.countryCode': { $nin: englishSpeakingCountries } });
      }
    }

    // Remote friendly filter
    if (remoteFriendly !== undefined) {
      searchQuery.$and.push({ 'culture.remoteFriendly': remoteFriendly });
    }

    // Tech stack filter
    if (techStack && techStack.length > 0) {
      searchQuery.$and.push({
        $or: [
          { 'techStack.languages': { $in: techStack } },
          { 'techStack.frameworks': { $in: techStack } },
          { 'techStack.cloud': { $in: techStack } },
          { 'techStack.databases': { $in: techStack } }
        ]
      });
    }

    // Funding stage filter
    if (fundingStage && fundingStage.length > 0) {
      searchQuery.$and.push({ fundingStage: { $in: fundingStage } });
    }

    // Build sort criteria
    let sortCriteria: any = {};
    switch (sortBy) {
      case 'name':
        sortCriteria = { name: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'size':
        const sizeOrder = { startup: 1, small: 2, medium: 3, large: 4, enterprise: 5 };
        sortCriteria = { size: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'rating':
        sortCriteria = { 'aiInsights.recommendationScore': sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'relevance':
      default:
        if (query) {
          sortCriteria = { score: { $meta: 'textScore' } };
        } else {
          sortCriteria = { 'aiInsights.recommendationScore': -1, name: 1 };
        }
        break;
    }

    // Execute search with aggregation for better performance
    const pipeline = [
      { $match: searchQuery },
      {
        $lookup: {
          from: 'locations',
          localField: 'headquarters.locationId',
          foreignField: '_id',
          as: 'headquartersLocation'
        }
      },
      { $sort: sortCriteria },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          name: 1,
          industry: 1,
          size: 1,
          website: 1,
          description: 1,
          headquarters: 1,
          ratings: 1,
          culture: 1,
          techStack: 1,
          fundingStage: 1,
          employeeCount: 1,
          aiInsights: 1,
          tags: 1,
          priority: 1,
          headquartersLocation: { $arrayElemAt: ['$headquartersLocation', 0] }
        }
      }
    ];

    const [companies, totalCount] = await Promise.all([
      Company.aggregate(pipeline),
      Company.countDocuments(searchQuery)
    ]);

    const results: CompanySearchResult[] = companies.map(company => ({
      id: company._id.toString(),
      name: company.name,
      industry: company.industry,
      size: company.size,
      website: company.website,
      description: company.description,
      headquarters: {
        city: company.headquarters?.city,
        state: company.headquarters?.state,
        country: company.headquarters?.country,
        countryCode: company.headquarters?.countryCode,
        fullLocation: this.buildLocationString(company.headquarters, company.headquartersLocation)
      },
      ratings: company.ratings,
      culture: {
        remoteFriendly: company.culture?.remoteFriendly || false,
        hybridOptions: company.culture?.hybridOptions || false,
        values: company.culture?.values
      },
      techStack: company.techStack,
      fundingStage: company.fundingStage,
      employeeCount: company.employeeCount,
      aiInsights: company.aiInsights ? {
        recommendationScore: company.aiInsights.recommendationScore,
        cultureMatch: company.aiInsights.cultureMatch,
        careerGrowthPotential: company.aiInsights.careerGrowthPotential
      } : undefined,
      tags: company.tags,
      priority: company.priority,
      isEnglishSpeaking: this.isEnglishSpeakingCountry(company.headquarters?.countryCode)
    }));

    const result = { companies: results, total: totalCount };
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  private buildLocationString(headquarters: any, location: any): string {
    if (!headquarters) return '';
    
    const parts = [];
    if (headquarters.city) parts.push(headquarters.city);
    if (headquarters.state) parts.push(headquarters.state);
    if (location?.name && location.type === 'country') {
      parts.push(location.name);
    } else if (headquarters.country) {
      parts.push(headquarters.country);
    }
    
    return parts.join(', ');
  }

  private isEnglishSpeakingCountry(countryCode?: string): boolean {
    if (!countryCode) return false;
    const englishSpeakingCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG', 'IN', 'ZA'];
    return englishSpeakingCountries.includes(countryCode.toUpperCase());
  }

  async createCompany(
    userId: string,
    companyData: CreateCompanyData
  ): Promise<CompanySearchResult> {
    // Find location reference for headquarters
    let locationId: mongoose.Types.ObjectId | undefined;
    if (companyData.headquarters?.city) {
      const locationResult = await locationService.autocomplete({
        query: companyData.headquarters.city,
        type: ['city'],
        limit: 1
      });
      
      if (locationResult.length > 0) {
        locationId = new mongoose.Types.ObjectId(locationResult[0].id);
      }
    }

    const company = new Company({
      userId: new mongoose.Types.ObjectId(userId),
      ...companyData,
      headquarters: companyData.headquarters ? {
        ...companyData.headquarters,
        locationId
      } : undefined,
      dataSources: [{
        source: 'user_input',
        lastUpdated: new Date(),
        reliability: 'medium'
      }]
    });

    const savedCompany = await company.save();
    
    return {
      id: savedCompany._id.toString(),
      name: savedCompany.name,
      industry: savedCompany.industry,
      size: savedCompany.size,
      website: savedCompany.website,
      description: savedCompany.description,
      headquarters: {
        city: savedCompany.headquarters?.city,
        state: savedCompany.headquarters?.state,
        country: savedCompany.headquarters?.country,
        countryCode: savedCompany.headquarters?.countryCode
      },
      culture: {
        remoteFriendly: savedCompany.culture?.remoteFriendly || false,
        hybridOptions: savedCompany.culture?.hybridOptions || false,
        values: savedCompany.culture?.values
      },
      techStack: savedCompany.techStack,
      isEnglishSpeaking: this.isEnglishSpeakingCountry(savedCompany.headquarters?.countryCode)
    };
  }

  async getCompanyById(userId: string, companyId: string): Promise<CompanySearchResult | null> {
    const company = await Company.findOne({
      _id: companyId,
      $or: [
        { userId: new mongoose.Types.ObjectId(userId) },
        { isVerified: true }
      ]
    }).populate('headquarters.locationId');

    if (!company) return null;

    return {
      id: company._id.toString(),
      name: company.name,
      industry: company.industry,
      size: company.size,
      website: company.website,
      description: company.description,
      headquarters: {
        city: company.headquarters?.city,
        state: company.headquarters?.state,
        country: company.headquarters?.country,
        countryCode: company.headquarters?.countryCode,
        fullLocation: this.buildLocationString(company.headquarters, company.headquarters?.locationId)
      },
      ratings: company.ratings,
      culture: {
        remoteFriendly: company.culture?.remoteFriendly || false,
        hybridOptions: company.culture?.hybridOptions || false,
        values: company.culture?.values
      },
      techStack: company.techStack,
      fundingStage: company.fundingStage,
      employeeCount: company.employeeCount,
      aiInsights: company.aiInsights ? {
        recommendationScore: company.aiInsights.recommendationScore,
        cultureMatch: company.aiInsights.cultureMatch,
        careerGrowthPotential: company.aiInsights.careerGrowthPotential
      } : undefined,
      tags: company.tags,
      priority: company.priority,
      isEnglishSpeaking: this.isEnglishSpeakingCountry(company.headquarters?.countryCode)
    };
  }

  async getIndustries(): Promise<string[]> {
    const cacheKey = 'industries';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const industries = await Company.distinct('industry');
    const sortedIndustries = industries.sort();
    
    this.cache.set(cacheKey, { data: sortedIndustries, timestamp: Date.now() });
    return sortedIndustries;
  }

  async getTechStacks(): Promise<{ languages: string[]; frameworks: string[]; cloud: string[] }> {
    const cacheKey = 'techstacks';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const [languages, frameworks, cloud] = await Promise.all([
      Company.distinct('techStack.languages'),
      Company.distinct('techStack.frameworks'),
      Company.distinct('techStack.cloud')
    ]);

    const result = {
      languages: languages.filter(Boolean).sort(),
      frameworks: frameworks.filter(Boolean).sort(),
      cloud: cloud.filter(Boolean).sort()
    };
    
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const companyService = new CompanyService();