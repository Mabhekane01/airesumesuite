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
  status: string;
  priority: string;
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
  interviews: Array<any>;
  communications: Array<any>;
}

interface SearchFilters {
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

interface SortOptions {
  field: 'appliedDate' | 'jobTitle' | 'companyName' | 'status' | 'priority' | 'salary';
  direction: 'asc' | 'desc';
}

class SearchEngine {
  private applications: JobApplication[] = [];

  // Update the dataset
  setApplications(applications: JobApplication[]): void {
    this.applications = applications || [];
    console.log('🔍 SearchEngine: Loaded', this.applications.length, 'applications');
  }

  // Main search function
  search(query: string = '', filters: SearchFilters = {}, sortOptions?: SortOptions): JobApplication[] {
    console.log('🔍 SearchEngine: Starting search', { 
      query: `"${query}"`, 
      totalApps: this.applications.length,
      hasFilters: Object.keys(filters).length > 0
    });

    let results = [...this.applications];

    // Step 1: Apply text search
    if (query && query.trim().length > 0) {
      results = this.applyTextSearch(results, query.trim());
    }

    // Step 2: Apply filters
    results = this.applyFilters(results, filters);

    // Step 3: Apply sorting
    results = this.applySorting(results, sortOptions);

    console.log('🔍 SearchEngine: Final results:', results.length);
    return results;
  }

  // Text search implementation
  private applyTextSearch(applications: JobApplication[], query: string): JobApplication[] {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    console.log('🔍 SearchEngine: Text search for terms:', searchTerms);

    const results = applications.filter(app => {
      // Get all searchable text from the application
      const searchableText = this.getSearchableText(app);
      
      // Check if ALL search terms are found (AND logic)
      const allTermsFound = searchTerms.every(term => 
        searchableText.some(text => text.includes(term))
      );

      // Debug specific searches
      if (query.toLowerCase().includes('software') || query.toLowerCase().includes('engineer')) {
        const matches = searchTerms.map(term => ({
          term,
          found: searchableText.some(text => text.includes(term)),
          searchableText: searchableText.slice(0, 2) // Show first 2 fields for debugging
        }));
        
        console.log(`🔍 MATCH TEST: "${app.jobTitle}" | ${app.companyName}:`, {
          allTermsFound,
          matches,
          id: app._id?.slice(-4)
        });
      }

      return allTermsFound;
    });

    console.log('🔍 SearchEngine: Text search results:', results.length, 'of', applications.length);
    return results;
  }

  // Extract all searchable text from an application
  private getSearchableText(app: JobApplication): string[] {
    const texts: string[] = [];

    // Job title (most important)
    if (app.jobTitle) {
      texts.push(app.jobTitle.toLowerCase());
    }

    // Company name
    if (app.companyName) {
      texts.push(app.companyName.toLowerCase());
    }
    if (app.company) {
      texts.push(app.company.toLowerCase());
    }

    // Location
    if (app.location) {
      texts.push(app.location.toLowerCase());
    }
    if (app.jobLocation?.city) {
      texts.push(app.jobLocation.city.toLowerCase());
    }
    if (app.jobLocation?.state) {
      texts.push(app.jobLocation.state.toLowerCase());
    }
    if (app.jobLocation?.country) {
      texts.push(app.jobLocation.country.toLowerCase());
    }
    if (app.jobLocation?.remote) {
      texts.push('remote');
    }

    // Notes
    if (app.notes) {
      texts.push(app.notes.toLowerCase());
    }

    // Status
    if (app.status) {
      texts.push(app.status.toLowerCase().replace('_', ' '));
    }

    // Priority
    if (app.priority) {
      texts.push(app.priority.toLowerCase());
    }

    // Next action
    if (app.nextAction?.type) {
      texts.push(app.nextAction.type.toLowerCase());
    }
    if (app.nextAction?.description) {
      texts.push(app.nextAction.description.toLowerCase());
    }

    // Communications
    if (app.communications) {
      app.communications.forEach(comm => {
        if (comm.subject) texts.push(comm.subject.toLowerCase());
        if (comm.content) texts.push(comm.content.toLowerCase());
      });
    }

    return texts;
  }

  // Apply filters
  private applyFilters(applications: JobApplication[], filters: SearchFilters): JobApplication[] {
    let results = applications;
    const initialCount = results.length;

    // Status filter
    if (filters.status && filters.status.length > 0) {
      results = results.filter(app => filters.status!.includes(app.status));
      console.log('🔍 Status filter:', filters.status, '→', results.length, 'results');
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      results = results.filter(app => filters.priority!.includes(app.priority));
      console.log('🔍 Priority filter:', filters.priority, '→', results.length, 'results');
    }

    // Date range filter
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      results = results.filter(app => {
        const appDate = new Date(app.appliedDate || app.applicationDate);
        return appDate >= startDate && appDate <= endDate;
      });
      console.log('🔍 Date range filter:', filters.dateRange, '→', results.length, 'results');
    }

    // Salary range filter
    if (filters.salaryRange && (filters.salaryRange.min > 0 || filters.salaryRange.max < 1000000)) {
      results = results.filter(app => {
        if (!app.salary) return false;
        const salary = this.extractSalaryNumber(app.salary);
        return salary >= filters.salaryRange!.min && salary <= filters.salaryRange!.max;
      });
      console.log('🔍 Salary filter:', filters.salaryRange, '→', results.length, 'results');
    }

    // Remote filter
    if (filters.remote !== undefined) {
      results = results.filter(app => {
        const isRemote = app.jobLocation?.remote || 
                        (app.location && app.location.toLowerCase().includes('remote'));
        return isRemote === filters.remote;
      });
      console.log('🔍 Remote filter:', filters.remote, '→', results.length, 'results');
    }

    // Location filter
    if (filters.location && filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase().trim();
      results = results.filter(app => {
        const locations = [
          app.location,
          app.jobLocation?.city,
          app.jobLocation?.state,
          app.jobLocation?.country
        ].filter(Boolean).map(loc => loc!.toLowerCase());
        
        return locations.some(loc => loc.includes(locationQuery));
      });
      console.log('🔍 Location filter:', filters.location, '→', results.length, 'results');
    }

    if (Object.keys(filters).length > 0) {
      console.log('🔍 Filters applied:', initialCount, '→', results.length, 'results');
    }

    return results;
  }

  // Apply sorting
  private applySorting(applications: JobApplication[], sortOptions?: SortOptions): JobApplication[] {
    const options = sortOptions || { field: 'appliedDate', direction: 'desc' };
    
    return applications.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (options.field) {
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
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'salary':
          aValue = this.extractSalaryNumber(a.salary || '');
          bValue = this.extractSalaryNumber(b.salary || '');
          break;
        default:
          return 0;
      }

      if (options.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  // Extract salary number from string
  private extractSalaryNumber(salary: string): number {
    if (!salary) return 0;
    const numbers = salary.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      return parseInt(numbers[0].replace(/,/g, ''));
    }
    return 0;
  }

  // Generate statistics
  getStats(): {
    totalApplications: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    recentApplications: number;
  } {
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let recentApplications = 0;

    this.applications.forEach(app => {
      // Count statuses
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      
      // Count priorities
      priorityCounts[app.priority] = (priorityCounts[app.priority] || 0) + 1;
      
      // Count recent applications
      const appDate = new Date(app.appliedDate || app.applicationDate || 0);
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

  // Generate search suggestions
  getSuggestions(): string[] {
    if (this.applications.length === 0) return [];

    const jobTitles = [...new Set(this.applications.map(app => app.jobTitle))];
    const companies = [...new Set(this.applications.map(app => app.companyName || app.company).filter(Boolean))];
    
    return [
      ...jobTitles.slice(0, 4),
      ...companies.slice(0, 3),
      'remote',
      'senior',
      'engineer',
      'developer',
      'manager'
    ].filter(Boolean);
  }
}

// Export singleton instance
export const searchEngine = new SearchEngine();
export type { SearchFilters, SortOptions };