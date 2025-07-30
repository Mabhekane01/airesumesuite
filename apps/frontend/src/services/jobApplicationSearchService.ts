interface JobApplication {
  _id: string;
  id?: string;
  jobTitle: string;
  companyName: string;
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
  status: "applied" | "under_review" | "phone_screen" | "technical_assessment" | 
          "first_interview" | "second_interview" | "final_interview" | 
          "offer_received" | "offer_accepted" | "rejected" | "withdrawn";
  priority: "high" | "medium" | "low";
  jobUrl?: string;
  notes?: string;
  nextAction?: {
    type: string;
    date: string;
    description: string;
  };
  interviews: Array<{
    id: string;
    type: string;
    date: string;
    interviewer: string;
    status: "scheduled" | "completed" | "cancelled";
  }>;
  communications: Array<{
    id: string;
    type: "email" | "call" | "message";
    date: string;
    subject: string;
    content: string;
  }>;
}

export interface JobApplicationSearchFilters {
  status?: string[];
  priority?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  salaryRange?: {
    min: number;
    max: number;
  };
  remote?: boolean;
  location?: string;
}

export interface JobApplicationSortOptions {
  field: 'appliedDate' | 'jobTitle' | 'companyName' | 'status' | 'priority' | 'salary';
  direction: 'asc' | 'desc';
}

class JobApplicationSearchService {
  private applications: JobApplication[] = [];

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  }

  private calculateRelevanceScore(application: JobApplication, query: string): number {
    const normalizedQuery = this.normalizeText(query);
    const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
    
    if (queryWords.length === 0) return 0;

    let score = 0;

    // Job title search (highest priority)
    const jobTitleScore = this.getTextScore(application.jobTitle, normalizedQuery, queryWords);
    score += jobTitleScore * 10;

    // Company name search (high priority)
    const companyScore = this.getTextScore(application.companyName || application.company || '', normalizedQuery, queryWords);
    score += companyScore * 8;

    // Location search
    const locationText = this.getLocationText(application);
    const locationScore = this.getTextScore(locationText, normalizedQuery, queryWords);
    score += locationScore * 6;

    // Status search
    const statusScore = this.getTextScore(application.status.replace('_', ' '), normalizedQuery, queryWords);
    score += statusScore * 4;

    // Notes search
    const notesScore = this.getTextScore(application.notes || '', normalizedQuery, queryWords);
    score += notesScore * 3;

    // Communications search
    const communicationsText = application.communications?.map(c => `${c.subject} ${c.content}`).join(' ') || '';
    const commScore = this.getTextScore(communicationsText, normalizedQuery, queryWords);
    score += commScore * 2;

    // Interviews search
    const interviewText = application.interviews?.map(i => `${i.type} ${i.interviewer}`).join(' ') || '';
    const interviewScore = this.getTextScore(interviewText, normalizedQuery, queryWords);
    score += interviewScore * 2;

    return score;
  }

  private getTextScore(text: string, query: string, queryWords: string[]): number {
    const normalizedText = this.normalizeText(text);
    let score = 0;

    // Exact phrase match (highest score)
    if (normalizedText.includes(query)) {
      score += 15;
    }

    // Individual word matching
    queryWords.forEach(queryWord => {
      const textWords = normalizedText.split(' ');
      
      // Exact word match
      if (textWords.includes(queryWord)) {
        score += 10;
      }
      
      // Word starts with query
      if (textWords.some(word => word.startsWith(queryWord))) {
        score += 7;
      }
      
      // Partial word match
      if (textWords.some(word => word.includes(queryWord))) {
        score += 3;
      }
    });

    return score;
  }

  private getLocationText(application: JobApplication): string {
    if (application.jobLocation) {
      const { city, state, country, remote } = application.jobLocation;
      const locationParts = [city, state, country].filter(Boolean);
      const locationStr = locationParts.join(', ');
      return remote ? `${locationStr} remote` : locationStr;
    }
    return application.location || '';
  }

  private parseDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date(0); // Return epoch for missing dates
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }

  private parseSalary(salary: string): number {
    if (!salary) return 0;
    // Extract numbers from salary string (e.g., "$120,000 - $150,000" -> 120000)
    const numbers = salary.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      return parseInt(numbers[0].replace(/,/g, ''));
    }
    return 0;
  }

  updateApplications(applications: JobApplication[]) {
    this.applications = applications || [];
    console.log('📚 SearchService: Updated with', this.applications.length, 'applications');
  }

  searchApplications(query: string, filters?: JobApplicationSearchFilters, sortOptions?: JobApplicationSortOptions): JobApplication[] {
    console.log('🔍 SearchService: Starting search', { 
      query, 
      hasFilters: filters && Object.keys(filters).length > 0,
      sortOptions,
      totalApps: this.applications.length 
    });

    let results = [...this.applications];

    // Apply text search only if query is provided
    if (query && query.trim().length > 0) {
      console.log('🔍 Applying text search for:', query);
      const scoredResults = results
        .map(app => ({
          application: app,
          score: this.calculateRelevanceScore(app, query)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.application);
      
      console.log('🔍 Text search results:', scoredResults.length, 'applications');
      results = scoredResults;
    }

    // Apply filters if provided
    if (filters && Object.keys(filters).length > 0) {
      console.log('🔍 Applying filters:', filters);
      const beforeFilterCount = results.length;
      results = this.applyFilters(results, filters);
      console.log('🔍 Filter results:', results.length, 'applications (was', beforeFilterCount, ')');
    }

    // Apply sorting (default to newest first if no sort specified)
    const defaultSortOptions: JobApplicationSortOptions = {
      field: 'appliedDate',
      direction: 'desc'
    };
    const sortToUse = sortOptions || defaultSortOptions;
    results = this.applySorting(results, sortToUse);

    console.log('🔍 Final search results:', results.length, 'applications');
    return results;
  }

  private applyFilters(applications: JobApplication[], filters: JobApplicationSearchFilters): JobApplication[] {
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
        const appDate = this.parseDate(app.appliedDate || app.applicationDate);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (appDate < startDate || appDate > endDate) return false;
      }

      // Salary range filter
      if (filters.salaryRange && app.salary) {
        const appSalary = this.parseSalary(app.salary);
        if (appSalary < filters.salaryRange.min || appSalary > filters.salaryRange.max) return false;
      }

      // Remote filter
      if (filters.remote !== undefined) {
        const isRemote = app.jobLocation?.remote || this.getLocationText(app).toLowerCase().includes('remote');
        if (isRemote !== filters.remote) return false;
      }

      // Location filter
      if (filters.location) {
        const locationText = this.getLocationText(app);
        if (!locationText.toLowerCase().includes(filters.location.toLowerCase())) return false;
      }

      return true;
    });
  }

  private applySorting(applications: JobApplication[], sortOptions: JobApplicationSortOptions): JobApplication[] {
    return applications.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'appliedDate':
          aValue = this.parseDate(a.appliedDate || a.applicationDate);
          bValue = this.parseDate(b.appliedDate || b.applicationDate);
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
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'salary':
          aValue = this.parseSalary(a.salary || '');
          bValue = this.parseSalary(b.salary || '');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOptions.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Get quick stats for filters
  getApplicationStats(): {
    totalApplications: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    recentApplications: number;
  } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    let recentApplications = 0;

    this.applications.forEach(app => {
      // Count statuses
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      
      // Count priorities
      priorityCounts[app.priority] = (priorityCounts[app.priority] || 0) + 1;
      
      // Count recent applications
      const appDate = this.parseDate(app.appliedDate || app.applicationDate);
      if (appDate >= thirtyDaysAgo) {
        recentApplications++;
      }
    });

    return {
      totalApplications: this.applications.length,
      statusCounts,
      priorityCounts,
      recentApplications
    };
  }

  // Get suggestions for empty search
  getSearchSuggestions(): string[] {
    const jobTitles = [...new Set(this.applications.map(app => app.jobTitle))].slice(0, 5);
    const companies = [...new Set(this.applications.map(app => app.companyName || app.company || ''))].slice(0, 5);
    
    return [
      ...jobTitles.slice(0, 3),
      ...companies.slice(0, 2),
      'remote',
      'interview',
      'pending',
      'offer'
    ].filter(Boolean);
  }
}

export const jobApplicationSearchService = new JobApplicationSearchService();