/**
 * Enterprise-Grade Job Application Search Service
 * Robust, scalable, and comprehensive search implementation
 */

// Comprehensive interfaces
export interface JobApplication {
  _id: string;
  id?: string;
  jobTitle: string;
  companyName?: string;
  company?: string;
  location?: string;
  jobLocation?: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
  };
  salary?: string;
  appliedDate?: string;
  applicationDate: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  jobUrl?: string;
  notes?: string;
  nextAction?: {
    type: string;
    date: string;
    description: string;
  };
  metrics?: {
    applicationScore?: number;
  };
  interviews: Interview[];
  communications: Communication[];
  tags?: string[];
  archived?: boolean;
}

export type ApplicationStatus = 
  | 'applied' 
  | 'under_review' 
  | 'phone_screen' 
  | 'technical_assessment'
  | 'first_interview' 
  | 'second_interview' 
  | 'final_interview' 
  | 'offer_received'
  | 'offer_accepted' 
  | 'rejected' 
  | 'withdrawn';

export type ApplicationPriority = 'low' | 'medium' | 'high';

export type SortField = 'appliedDate' | 'jobTitle' | 'companyName' | 'status' | 'priority' | 'salary';
export type SortDirection = 'asc' | 'desc';

interface Interview {
  id: string;
  type: string;
  date: string;
  interviewer: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Communication {
  id: string;
  type: 'email' | 'call' | 'message';
  date: string;
  subject: string;
  content: string;
}

export interface SearchFilters {
  status?: ApplicationStatus[];
  priority?: ApplicationPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  salaryRange?: {
    min: number;
    max: number;
  };
  remote?: boolean;
  location?: string;
  company?: string;
  tags?: string[];
  archived?: boolean;
}

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

export interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResult {
  applications: JobApplication[];
  totalCount: number;
  filteredCount: number;
  searchTime: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

export interface SearchStats {
  totalApplications: number;
  statusCounts: Record<ApplicationStatus, number>;
  priorityCounts: Record<ApplicationPriority, number>;
  recentApplications: number;
  companyCounts: Record<string, number>;
  averageApplicationsPerMonth: number;
  topJobTitles: Array<{ title: string; count: number }>;
}

/**
 * Advanced text search algorithms
 */
class TextSearchEngine {
  private static readonly WORD_BOUNDARY = /\b/g;
  private static readonly STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
  ]);

  /**
   * Normalize text for searching
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Extract meaningful terms from query
   */
  private static extractTerms(query: string): string[] {
    return this.normalizeText(query)
      .split(' ')
      .filter(term => term.length > 1 && !this.STOPWORDS.has(term));
  }

  /**
   * Calculate relevance score for text matching
   */
  static calculateRelevanceScore(text: string, query: string): number {
    if (!text || !query) return 0;

    const normalizedText = this.normalizeText(text);
    const normalizedQuery = this.normalizeText(query);
    const queryTerms = this.extractTerms(query);

    let score = 0;

    // Exact match bonus
    if (normalizedText === normalizedQuery) {
      score += 100;
    }

    // Phrase match bonus
    if (normalizedText.includes(normalizedQuery)) {
      score += 50;
    }

    // Term matching
    queryTerms.forEach(term => {
      // Exact term match
      const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = normalizedText.match(termRegex);
      if (matches) {
        score += matches.length * 10;
      }

      // Partial term match
      if (normalizedText.includes(term)) {
        score += 5;
      }

      // Start of word match
      const startRegex = new RegExp(`\\b${term}`, 'gi');
      if (normalizedText.match(startRegex)) {
        score += 7;
      }
    });

    // Length penalty for very long text
    if (normalizedText.length > 100) {
      score *= 0.9;
    }

    return score;
  }

  /**
   * Advanced fuzzy matching
   */
  static fuzzyMatch(text: string, query: string, threshold: number = 0.6): boolean {
    const score = this.calculateRelevanceScore(text, query);
    return score > threshold * 10;
  }
}

/**
 * Main Search Service Class
 */
export class JobApplicationSearchService {
  private applications: JobApplication[] = [];
  private searchCache = new Map<string, SearchResult>();
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clear cache periodically
    setInterval(() => this.clearExpiredCache(), this.CACHE_TTL);
  }

  /**
   * Update applications dataset
   */
  setApplications(applications: JobApplication[]): void {
    try {
      this.applications = this.validateApplications(applications);
      this.lastUpdate = Date.now();
      this.clearCache();
      
      console.log(`🔍 SearchService: Loaded ${this.applications.length} applications`);
    } catch (error) {
      console.error('❌ SearchService: Error setting applications:', error);
      throw new Error('Failed to update applications dataset');
    }
  }

  /**
   * Validate applications data
   */
  private validateApplications(applications: JobApplication[]): JobApplication[] {
    if (!Array.isArray(applications)) {
      throw new Error('Applications must be an array');
    }

    return applications.filter(app => {
      if (!app || typeof app !== 'object') return false;
      if (!app._id || !app.jobTitle) return false;
      return true;
    });
  }

  /**
   * Main search function
   */
  async search(options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      if (this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey)!;
        console.log(`🔍 SearchService: Cache hit for query: "${options.query}"`);
        return cached;
      }

      // Perform search
      let results = [...this.applications];

      // Apply text search
      if (options.query && options.query.trim()) {
        results = this.performTextSearch(results, options.query.trim());
      }

      // Apply filters
      if (options.filters) {
        results = this.applyFilters(results, options.filters);
      }

      // Apply sorting
      if (options.sort) {
        results = this.applySorting(results, options.sort);
      }

      // Apply pagination
      const pagination = options.pagination || { page: 1, limit: 50 };
      const paginatedResults = this.applyPagination(results, pagination);

      const searchTime = performance.now() - startTime;

      const result: SearchResult = {
        applications: paginatedResults.applications,
        totalCount: this.applications.length,
        filteredCount: results.length,
        searchTime: Math.round(searchTime * 100) / 100,
        hasMore: paginatedResults.hasMore,
        page: pagination.page,
        totalPages: paginatedResults.totalPages
      };

      // Cache result
      this.searchCache.set(cacheKey, result);

      console.log(`🔍 SearchService: Search completed in ${result.searchTime}ms`);
      console.log(`   Query: "${options.query}"`);
      console.log(`   Results: ${result.filteredCount}/${result.totalCount}`);

      return result;

    } catch (error) {
      console.error('❌ SearchService: Search failed:', error);
      throw new Error('Search operation failed');
    }
  }

  /**
   * Perform advanced text search
   */
  private performTextSearch(applications: JobApplication[], query: string): JobApplication[] {
    const scoredResults = applications
      .map(app => ({
        application: app,
        score: this.calculateApplicationScore(app, query)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.application);

    console.log(`🔍 TextSearch: Found ${scoredResults.length} matches for "${query}"`);
    return scoredResults;
  }

  /**
   * Calculate comprehensive application score
   */
  private calculateApplicationScore(app: JobApplication, query: string): number {
    let totalScore = 0;

    // Job title (highest weight)
    const titleScore = TextSearchEngine.calculateRelevanceScore(app.jobTitle, query);
    totalScore += titleScore * 10;

    // Company name (high weight)  
    const companyName = app.companyName || app.company || '';
    const companyScore = TextSearchEngine.calculateRelevanceScore(companyName, query);
    totalScore += companyScore * 8;

    // Location (medium weight)
    const location = this.getLocationString(app);
    const locationScore = TextSearchEngine.calculateRelevanceScore(location, query);
    totalScore += locationScore * 6;

    // Notes (medium weight)
    if (app.notes) {
      const notesScore = TextSearchEngine.calculateRelevanceScore(app.notes, query);
      totalScore += notesScore * 4;
    }

    // Tags (medium weight)
    if (app.tags && app.tags.length > 0) {
      const tagsString = app.tags.join(' ');
      const tagsScore = TextSearchEngine.calculateRelevanceScore(tagsString, query);
      totalScore += tagsScore * 3;
    }

    // Communications (low weight)
    if (app.communications && app.communications.length > 0) {
      const commText = app.communications
        .map(c => `${c.subject} ${c.content}`)
        .join(' ');
      const commScore = TextSearchEngine.calculateRelevanceScore(commText, query);
      totalScore += commScore * 2;
    }

    return totalScore;
  }

  /**
   * Get formatted location string
   */
  private getLocationString(app: JobApplication): string {
    if (app.location) return app.location;
    
    if (app.jobLocation) {
      const parts = [
        app.jobLocation.city,
        app.jobLocation.state,
        app.jobLocation.country
      ].filter(Boolean);
      
      const location = parts.join(', ');
      return app.jobLocation.remote ? `${location} (Remote)` : location;
    }
    
    return '';
  }

  /**
   * Apply comprehensive filters
   */
  private applyFilters(applications: JobApplication[], filters: SearchFilters): JobApplication[] {
    return applications.filter(app => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(app.status)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(app.priority)) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const appDate = new Date(app.appliedDate || app.applicationDate);
        if (appDate < filters.dateRange.start || appDate > filters.dateRange.end) {
          return false;
        }
      }

      // Salary range filter
      if (filters.salaryRange) {
        const salary = this.extractSalaryNumber(app.salary);
        if (salary < filters.salaryRange.min || salary > filters.salaryRange.max) {
          return false;
        }
      }

      // Remote filter
      if (filters.remote !== undefined) {
        const isRemote = app.jobLocation?.remote || 
          this.getLocationString(app).toLowerCase().includes('remote');
        if (isRemote !== filters.remote) return false;
      }

      // Location filter
      if (filters.location) {
        const location = this.getLocationString(app).toLowerCase();
        if (!location.includes(filters.location.toLowerCase())) return false;
      }

      // Company filter
      if (filters.company) {
        const company = (app.companyName || app.company || '').toLowerCase();
        if (!company.includes(filters.company.toLowerCase())) return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        if (!app.tags || !filters.tags.some(tag => app.tags!.includes(tag))) {
          return false;
        }
      }

      // Archived filter
      if (filters.archived !== undefined) {
        if (!!app.archived !== filters.archived) return false;
      }

      return true;
    });
  }

  /**
   * Extract salary number from string
   */
  private extractSalaryNumber(salary?: string): number {
    if (!salary) return 0;
    
    const numbers = salary.match(/\d+/g);
    if (!numbers || numbers.length === 0) return 0;
    
    // Take the first number and handle common formats
    const num = parseInt(numbers[0].replace(/,/g, ''));
    
    // If it's a very small number, assume it's hourly and convert to annual
    if (num < 100) return num * 2080; // 40 hours * 52 weeks
    
    return num;
  }

  /**
   * Apply sophisticated sorting
   */
  private applySorting(applications: JobApplication[], sort: SortOptions): JobApplication[] {
    return applications.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'appliedDate':
          aValue = new Date(a.appliedDate || a.applicationDate || 0).getTime();
          bValue = new Date(b.appliedDate || b.applicationDate || 0).getTime();
          break;

        case 'jobTitle':
          aValue = (a.jobTitle || '').toLowerCase();
          bValue = (b.jobTitle || '').toLowerCase();
          break;

        case 'companyName':
          aValue = (a.companyName || a.company || '').toLowerCase();
          bValue = (b.companyName || b.company || '').toLowerCase();
          break;

        case 'status':
          // Custom status ordering
          const statusOrder: Record<ApplicationStatus, number> = {
            'offer_accepted': 9,
            'offer_received': 8,
            'final_interview': 7,
            'second_interview': 6,
            'first_interview': 5,
            'technical_assessment': 4,
            'phone_screen': 3,
            'under_review': 2,
            'applied': 1,
            'rejected': 0,
            'withdrawn': -1
          };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;

        case 'priority':
          const priorityOrder: Record<ApplicationPriority, number> = {
            'high': 3,
            'medium': 2,
            'low': 1
          };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;

        case 'salary':
          aValue = this.extractSalaryNumber(a.salary);
          bValue = this.extractSalaryNumber(b.salary);
          break;

        default:
          return 0;
      }

      if (sort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  /**
   * Apply pagination
   */
  private applyPagination(applications: JobApplication[], pagination: { page: number; limit: number }) {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedApps = applications.slice(start, end);
    
    return {
      applications: paginatedApps,
      hasMore: end < applications.length,
      totalPages: Math.ceil(applications.length / pagination.limit)
    };
  }

  /**
   * Generate comprehensive statistics
   */
  getStatistics(): SearchStats {
    const statusCounts: Record<ApplicationStatus, number> = {} as any;
    const priorityCounts: Record<ApplicationPriority, number> = {} as any;
    const companyCounts: Record<string, number> = {};
    const jobTitleCounts: Record<string, number> = {};
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let recentApplications = 0;

    this.applications.forEach(app => {
      // Count statuses
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      
      // Count priorities
      priorityCounts[app.priority] = (priorityCounts[app.priority] || 0) + 1;
      
      // Count companies
      const company = app.companyName || app.company || 'Unknown';
      companyCounts[company] = (companyCounts[company] || 0) + 1;
      
      // Count job titles
      jobTitleCounts[app.jobTitle] = (jobTitleCounts[app.jobTitle] || 0) + 1;
      
      // Count recent applications
      const appDate = new Date(app.appliedDate || app.applicationDate || 0);
      if (appDate >= thirtyDaysAgo) {
        recentApplications++;
      }
    });

    // Calculate average applications per month
    const oldestApp = this.applications.reduce((oldest, app) => {
      const appDate = new Date(app.appliedDate || app.applicationDate || 0);
      const oldestDate = new Date(oldest.appliedDate || oldest.applicationDate || 0);
      return appDate < oldestDate ? app : oldest;
    }, this.applications[0]);

    const monthsSinceFirst = oldestApp ? 
      Math.max(1, Math.ceil((Date.now() - new Date(oldestApp.appliedDate || oldestApp.applicationDate || 0).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 1;
    
    const averageApplicationsPerMonth = this.applications.length / monthsSinceFirst;

    // Top job titles
    const topJobTitles = Object.entries(jobTitleCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([title, count]) => ({ title, count }));

    return {
      totalApplications: this.applications.length,
      statusCounts,
      priorityCounts,
      recentApplications,
      companyCounts,
      averageApplicationsPerMonth: Math.round(averageApplicationsPerMonth * 10) / 10,
      topJobTitles
    };
  }

  /**
   * Get search suggestions based on data
   */
  getSuggestions(query?: string): string[] {
    const suggestions = new Set<string>();

    // Add job titles
    this.applications.forEach(app => {
      if (app.jobTitle) {
        suggestions.add(app.jobTitle);
        
        // Add individual words from job titles
        const words = app.jobTitle.split(/\s+/).filter(word => word.length > 2);
        words.forEach(word => suggestions.add(word));
      }
    });

    // Add company names
    this.applications.forEach(app => {
      const company = app.companyName || app.company;
      if (company) suggestions.add(company);
    });

    const suggestionArray = Array.from(suggestions);

    // If query provided, filter and sort by relevance
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      return suggestionArray
        .filter(s => s.toLowerCase().includes(queryLower))
        .sort((a, b) => {
          const aScore = TextSearchEngine.calculateRelevanceScore(a, query);
          const bScore = TextSearchEngine.calculateRelevanceScore(b, query);
          return bScore - aScore;
        })
        .slice(0, 10);
    }

    return suggestionArray.slice(0, 20);
  }

  /**
   * Cache management
   */
  private generateCacheKey(options: SearchOptions): string {
    return JSON.stringify({
      query: options.query,
      filters: options.filters,
      sort: options.sort,
      pagination: options.pagination,
      timestamp: Math.floor(this.lastUpdate / this.CACHE_TTL)
    });
  }

  private clearCache(): void {
    this.searchCache.clear();
  }

  private clearExpiredCache(): void {
    // Implementation would clear expired cache entries
    // For now, just clear all cache periodically
    if (this.searchCache.size > 100) {
      this.clearCache();
    }
  }

  /**
   * Export search results
   */
  async exportResults(options: SearchOptions, format: 'json' | 'csv'): Promise<string> {
    const results = await this.search(options);
    
    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['Job Title', 'Company', 'Status', 'Priority', 'Applied Date', 'Location'];
      const rows = results.applications.map(app => [
        app.jobTitle,
        app.companyName || app.company || '',
        app.status,
        app.priority,
        app.appliedDate || app.applicationDate,
        this.getLocationString(app)
      ]);
      
      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
    
    throw new Error('Unsupported export format');
  }
}

// Create singleton instance
export const searchService = new JobApplicationSearchService();

export interface SearchResult {
  id: string;
  type: 'resume' | 'job_application' | 'cover_letter' | 'skill' | 'company';
  title: string;
  subtitle: string;
  description: string;
  data: any;
  score: number;
  href: string;
}

export interface SearchIndex {
  resumes: Resume[];
  jobApplications: JobApplication[];
  coverLetters: CoverLetter[];
}

class SearchService {
  private index: SearchIndex = {
    resumes: [],
    jobApplications: [],
    coverLetters: []
  };

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  }

  private calculateRelevanceScore(text: string, query: string): number {
    const normalizedText = this.normalizeText(text);
    const normalizedQuery = this.normalizeText(query);
    const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
    
    if (queryWords.length === 0) return 0;

    let score = 0;
    const textWords = normalizedText.split(' ');

    queryWords.forEach(queryWord => {
      // Exact match bonus
      if (normalizedText.includes(queryWord)) {
        score += 10;
      }
      
      // Word start match bonus
      if (textWords.some(word => word.startsWith(queryWord))) {
        score += 5;
      }
      
      // Partial match bonus
      if (textWords.some(word => word.includes(queryWord))) {
        score += 2;
      }
    });

    // Title/important field bonus
    if (text.toLowerCase().includes(query.toLowerCase())) {
      score += 15;
    }

    return score;
  }

  updateIndex(data: Partial<SearchIndex>) {
    if (data.resumes) this.index.resumes = data.resumes;
    if (data.jobApplications) this.index.jobApplications = data.jobApplications;
    if (data.coverLetters) this.index.coverLetters = data.coverLetters;
  }

  private searchResumes(query: string): SearchResult[] {
    const results: SearchResult[] = [];

    this.index.resumes.forEach(resume => {
      // Search in personal info
      const personalInfoText = `${resume.personalInfo?.firstName} ${resume.personalInfo?.lastName} ${resume.personalInfo?.professionalTitle} ${resume.personalInfo?.email}`;
      const personalScore = this.calculateRelevanceScore(personalInfoText, query);

      // Search in professional summary
      const summaryScore = this.calculateRelevanceScore(resume.professionalSummary || '', query);

      // Search in work experience
      let workScore = 0;
      resume.workExperience?.forEach(exp => {
        const expText = `${exp.jobTitle} ${exp.company} ${exp.responsibilities?.join(' ')} ${exp.achievements?.join(' ')}`;
        workScore += this.calculateRelevanceScore(expText, query);
      });

      // Search in skills
      let skillScore = 0;
      resume.skills?.forEach(skill => {
        skillScore += this.calculateRelevanceScore(skill.name, query);
      });

      // Search in education
      let eduScore = 0;
      resume.education?.forEach(edu => {
        const eduText = `${edu.institution} ${edu.degree} ${edu.fieldOfStudy}`;
        eduScore += this.calculateRelevanceScore(eduText, query);
      });

      // Search in projects
      let projectScore = 0;
      resume.projects?.forEach(project => {
        const projectText = `${project.name} ${project.description} ${project.technologies?.join(' ')}`;
        projectScore += this.calculateRelevanceScore(projectText, query);
      });

      const totalScore = personalScore + summaryScore + workScore + skillScore + eduScore + projectScore;

      if (totalScore > 0) {
        results.push({
          id: resume.id || Math.random().toString(),
          type: 'resume',
          title: `${resume.personalInfo?.firstName} ${resume.personalInfo?.lastName}'s Resume`,
          subtitle: resume.personalInfo?.professionalTitle || 'Resume',
          description: resume.professionalSummary?.substring(0, 150) + '...' || 'No summary available',
          data: resume,
          score: totalScore,
          href: '/dashboard/resume/edit'
        });
      }
    });

    return results;
  }

  private searchJobApplications(query: string): SearchResult[] {
    const results: SearchResult[] = [];

    this.index.jobApplications.forEach(app => {
      const appText = `${app.jobTitle} ${app.companyName} ${app.location} ${app.status} ${app.notes || ''}`;
      const score = this.calculateRelevanceScore(appText, query);

      if (score > 0) {
        results.push({
          id: app.id || Math.random().toString(),
          type: 'job_application',
          title: `${app.jobTitle} at ${app.companyName}`,
          subtitle: `${app.status} • Applied ${new Date(app.appliedDate).toLocaleDateString()}`,
          description: `Location: ${app.location}${app.salary ? ` • Salary: ${app.salary}` : ''}`,
          data: app,
          score,
          href: `/dashboard/applications/${app.id}`
        });
      }
    });

    return results;
  }

  private searchCoverLetters(query: string): SearchResult[] {
    const results: SearchResult[] = [];

    this.index.coverLetters.forEach(letter => {
      const letterText = `${letter.jobTitle} ${letter.companyName} ${letter.content}`;
      const score = this.calculateRelevanceScore(letterText, query);

      if (score > 0) {
        results.push({
          id: letter.id || Math.random().toString(),
          type: 'cover_letter',
          title: `Cover Letter for ${letter.jobTitle}`,
          subtitle: `${letter.companyName} • ${letter.tone} tone`,
          description: letter.content.substring(0, 150) + '...',
          data: letter,
          score,
          href: `/dashboard/cover-letter/${letter.id}`
        });
      }
    });

    return results;
  }

  private searchQuickActions(query: string): SearchResult[] {
    const quickActions = [
      {
        id: 'new-resume',
        title: 'Create New Resume',
        subtitle: 'Build a new ATS-optimized resume',
        description: 'Start building a new resume from scratch with our AI-powered tools',
        keywords: 'resume create new build cv curriculum vitae',
        href: '/dashboard/resume/templates'
      },
      {
        id: 'new-application',
        title: 'Add Job Application',
        subtitle: 'Track a new job application',
        description: 'Add and track a new job application with status updates',
        keywords: 'job application add new track apply',
        href: '/dashboard/applications/new'
      },
      {
        id: 'new-cover-letter',
        title: 'Generate Cover Letter',
        subtitle: 'Create a personalized cover letter',
        description: 'Generate a tailored cover letter for your job applications',
        keywords: 'cover letter generate create new write',
        href: '/dashboard/cover-letter/new'
      },
      {
        id: 'analytics',
        title: 'Application Analytics',
        subtitle: 'View your job search progress',
        description: 'See insights and analytics about your job applications',
        keywords: 'analytics insights progress stats statistics dashboard',
        href: '/dashboard/analytics'
      }
    ];

    const results: SearchResult[] = [];

    quickActions.forEach(action => {
      const searchText = `${action.title} ${action.subtitle} ${action.description} ${action.keywords}`;
      const score = this.calculateRelevanceScore(searchText, query);

      if (score > 0) {
        results.push({
          id: action.id,
          type: 'skill',
          title: action.title,
          subtitle: action.subtitle,
          description: action.description,
          data: action,
          score: score + 20, // Boost quick actions
          href: action.href
        });
      }
    });

    return results;
  }

  search(query: string, maxResults: number = 10): SearchResult[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = this.normalizeText(query);
    
    // Search across all data types
    const allResults = [
      ...this.searchQuickActions(normalizedQuery),
      ...this.searchResumes(normalizedQuery),
      ...this.searchJobApplications(normalizedQuery),
      ...this.searchCoverLetters(normalizedQuery)
    ];

    // Sort by relevance score and return top results
    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  // Get suggestions for empty search
  getQuickSuggestions(): SearchResult[] {
    return [
      {
        id: 'suggestion-resume',
        type: 'skill',
        title: 'Build Resume',
        subtitle: 'Create or edit your resume',
        description: 'Use our AI-powered resume builder',
        data: null,
        score: 0,
        href: '/dashboard/resume/templates'
      },
      {
        id: 'suggestion-jobs',
        type: 'skill',
        title: 'Track Jobs',
        subtitle: 'Manage job applications',
        description: 'Add and track your job applications',
        data: null,
        score: 0,
        href: '/dashboard/applications'
      },
      {
        id: 'suggestion-cover-letter',
        type: 'skill',
        title: 'Cover Letters',
        subtitle: 'Generate cover letters',
        description: 'Create personalized cover letters',
        data: null,
        score: 0,
        href: '/dashboard/cover-letter'
      },
      {
        id: 'suggestion-analytics',
        type: 'skill',
        title: 'Analytics',
        subtitle: 'View your progress',
        description: 'See job search insights',
        data: null,
        score: 0,
        href: '/dashboard/analytics'
      }
    ];
  }
}

export const globalSearchService = new SearchService();