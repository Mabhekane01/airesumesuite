/**
 * Enterprise Job Title Search System
 * Clean, powerful, reliable search focused on job titles only
 */

interface JobApplication {
  _id: string;
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
  [key: string]: any;
}

interface SearchFilters {
  status?: string[];
  priority?: string[];
  remote?: boolean;
  location?: string;
}

interface SortOptions {
  field: 'appliedDate' | 'jobTitle' | 'companyName' | 'status' | 'priority';
  direction: 'asc' | 'desc';
}

class EnterpriseJobSearch {
  private applications: JobApplication[] = [];

  /**
   * Set applications data
   */
  setApplications(applications: JobApplication[]): void {
    this.applications = applications || [];
    console.log(`🏢 Enterprise Search: Loaded ${this.applications.length} applications`);
  }

  /**
   * Search applications by job title only
   * Enterprise-grade matching algorithm
   */
  searchByJobTitle(query: string): JobApplication[] {
    if (!query || !query.trim()) {
      console.log('🏢 Enterprise Search: Empty query, returning all applications');
      return [...this.applications];
    }

    const searchQuery = query.trim().toLowerCase();
    console.log(`🏢 Enterprise Search: Searching for job title: "${searchQuery}"`);

    const results = this.applications.filter(app => {
      const jobTitle = (app.jobTitle || '').toLowerCase();
      
      // Enterprise matching: exact word matching and partial matching
      const exactMatch = jobTitle === searchQuery;
      const containsMatch = jobTitle.includes(searchQuery);
      const wordMatch = this.matchWords(jobTitle, searchQuery);
      
      const matches = exactMatch || containsMatch || wordMatch;
      
      if (matches) {
        console.log(`✅ MATCH: "${app.jobTitle}" matches "${query}"`);
      }
      
      return matches;
    });

    console.log(`🏢 Enterprise Search: Found ${results.length} matching applications`);
    return results;
  }

  /**
   * Advanced word matching for job titles
   */
  private matchWords(jobTitle: string, searchQuery: string): boolean {
    const jobWords = jobTitle.split(/\s+/).filter(word => word.length > 0);
    const searchWords = searchQuery.split(/\s+/).filter(word => word.length > 0);
    
    // Check if all search words are found in the job title
    return searchWords.every(searchWord => 
      jobWords.some(jobWord => 
        jobWord.includes(searchWord) || searchWord.includes(jobWord)
      )
    );
  }

  /**
   * Apply filters to search results
   */
  applyFilters(applications: JobApplication[], filters: SearchFilters): JobApplication[] {
    let results = [...applications];

    if (filters.status && filters.status.length > 0) {
      results = results.filter(app => filters.status!.includes(app.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      results = results.filter(app => filters.priority!.includes(app.priority));
    }

    if (filters.remote !== undefined) {
      results = results.filter(app => {
        const isRemote = app.jobLocation?.remote || 
          (app.location && app.location.toLowerCase().includes('remote'));
        return isRemote === filters.remote;
      });
    }

    if (filters.location && filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase().trim();
      results = results.filter(app => {
        const appLocation = (app.location || '').toLowerCase();
        const city = (app.jobLocation?.city || '').toLowerCase();
        const state = (app.jobLocation?.state || '').toLowerCase();
        
        return appLocation.includes(locationQuery) || 
               city.includes(locationQuery) || 
               state.includes(locationQuery);
      });
    }

    return results;
  }

  /**
   * Sort applications
   */
  sortApplications(applications: JobApplication[], sortOptions: SortOptions): JobApplication[] {
    return applications.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
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
        default:
          return 0;
      }

      if (sortOptions.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  /**
   * Complete search with filters and sorting
   */
  fullSearch(
    query: string = '', 
    filters: SearchFilters = {}, 
    sortOptions: SortOptions = { field: 'appliedDate', direction: 'desc' }
  ): JobApplication[] {
    
    console.log(`🏢 Enterprise Search: Full search initiated`);
    console.log(`   Query: "${query}"`);
    console.log(`   Filters:`, filters);
    console.log(`   Sort:`, sortOptions);

    // Step 1: Search by job title
    let results = this.searchByJobTitle(query);

    // Step 2: Apply filters
    if (Object.keys(filters).length > 0) {
      const beforeFilter = results.length;
      results = this.applyFilters(results, filters);
      console.log(`🏢 Enterprise Search: Filters applied: ${beforeFilter} → ${results.length}`);
    }

    // Step 3: Sort results
    results = this.sortApplications(results, sortOptions);

    console.log(`🏢 Enterprise Search: Final results: ${results.length} applications`);
    return results;
  }

  /**
   * Generate statistics
   */
  generateStats(): {
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
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      priorityCounts[app.priority] = (priorityCounts[app.priority] || 0) + 1;
      
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
}

// Export singleton instance
export const enterpriseSearch = new EnterpriseJobSearch();
export type { SearchFilters, SortOptions };