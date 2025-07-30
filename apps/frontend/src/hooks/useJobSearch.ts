/**
 * Enterprise Job Search Hook
 * Robust React hook for job application searching with caching, debouncing, and error handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  searchService, 
  SearchOptions, 
  SearchResult, 
  SearchStats, 
  JobApplication,
  SearchFilters,
  SortOptions
} from '../services/searchService';

interface UseJobSearchOptions {
  debounceMs?: number;
  cacheResults?: boolean;
  autoSearch?: boolean;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  initialSort?: SortOptions;
}

interface UseJobSearchReturn {
  // State
  results: SearchResult | null;
  isLoading: boolean;
  error: string | null;
  stats: SearchStats | null;
  suggestions: string[];
  
  // Actions
  search: (options: SearchOptions) => Promise<void>;
  clearSearch: () => void;
  setApplications: (applications: JobApplication[]) => void;
  exportResults: (format: 'json' | 'csv') => Promise<string>;
  
  // Utilities
  refresh: () => Promise<void>;
  getStats: () => SearchStats | null;
}

export function useJobSearch(options: UseJobSearchOptions = {}): UseJobSearchReturn {
  const {
    debounceMs = 300,
    cacheResults = true,
    autoSearch = true,
    initialQuery = '',
    initialFilters = {},
    initialSort = { field: 'appliedDate', direction: 'desc' }
  } = options;

  // State
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Refs for managing async operations
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchOptionsRef = useRef<SearchOptions | null>(null);

  /**
   * Update applications in search service
   */
  const setApplications = useCallback((applications: JobApplication[]) => {
    try {
      searchService.setApplications(applications);
      
      // Update stats
      const newStats = searchService.getStatistics();
      setStats(newStats);
      
      // Update suggestions
      const newSuggestions = searchService.getSuggestions();
      setSuggestions(newSuggestions);
      
      // Auto-search if enabled
      if (autoSearch && lastSearchOptionsRef.current) {
        search(lastSearchOptionsRef.current);
      }
      
    } catch (err) {
      console.error('❌ useJobSearch: Error setting applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to update applications');
    }
  }, [autoSearch]);

  /**
   * Perform search with comprehensive error handling
   */
  const performSearch = useCallback(async (searchOptions: SearchOptions) => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    lastSearchOptionsRef.current = searchOptions;

    try {
      console.log('🔍 useJobSearch: Starting search', searchOptions);
      
      const searchResult = await searchService.search(searchOptions);
      
      // Check if request was aborted
      if (!abortControllerRef.current.signal.aborted) {
        setResults(searchResult);
        console.log(`🔍 useJobSearch: Search completed - ${searchResult.filteredCount} results in ${searchResult.searchTime}ms`);
      }
      
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        console.error('❌ useJobSearch: Search error:', err);
        setError(errorMessage);
        setResults(null);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Debounced search function
   */
  const search = useCallback(async (searchOptions: SearchOptions) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(searchOptions);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  /**
   * Immediate search (no debouncing)
   */
  const searchImmediate = useCallback(async (searchOptions: SearchOptions) => {
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    await performSearch(searchOptions);
  }, [performSearch]);

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setResults(null);
    setError(null);
    setIsLoading(false);
    lastSearchOptionsRef.current = null;
    
    console.log('🔍 useJobSearch: Search cleared');
  }, []);

  /**
   * Refresh current search
   */
  const refresh = useCallback(async () => {
    if (lastSearchOptionsRef.current) {
      console.log('🔍 useJobSearch: Refreshing search');
      await searchImmediate(lastSearchOptionsRef.current);
    }
  }, [searchImmediate]);

  /**
   * Export search results
   */
  const exportResults = useCallback(async (format: 'json' | 'csv'): Promise<string> => {
    if (!lastSearchOptionsRef.current) {
      throw new Error('No search results to export');
    }

    try {
      console.log(`🔍 useJobSearch: Exporting results as ${format}`);
      return await searchService.exportResults(lastSearchOptionsRef.current, format);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      console.error('❌ useJobSearch: Export error:', err);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Get current statistics
   */
  const getStats = useCallback((): SearchStats | null => {
    return stats;
  }, [stats]);

  /**
   * Initialize with default search if autoSearch is enabled
   */
  useEffect(() => {
    if (autoSearch && (initialQuery || Object.keys(initialFilters).length > 0)) {
      const initialOptions: SearchOptions = {
        query: initialQuery,
        filters: initialFilters,
        sort: initialSort
      };
      
      search(initialOptions);
    }
  }, [autoSearch, initialQuery, initialFilters, initialSort, search]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cancel any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    results,
    isLoading,
    error,
    stats,
    suggestions,
    
    // Actions
    search,
    clearSearch,
    setApplications,
    exportResults,
    
    // Utilities
    refresh,
    getStats
  };
}

/**
 * Simplified hook for basic job title search
 */
export function useJobTitleSearch(applications: JobApplication[] = []) {
  const [query, setQuery] = useState('');
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchHook = useJobSearch({
    debounceMs: 200,
    autoSearch: false
  });

  // Update applications when prop changes
  useEffect(() => {
    if (applications.length > 0) {
      searchHook.setApplications(applications);
      setFilteredApplications(applications);
    }
  }, [applications, searchHook]);

  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setFilteredApplications(applications);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        await searchHook.search({
          query: query.trim(),
          sort: { field: 'appliedDate', direction: 'desc' }
        });
        
        if (searchHook.results) {
          setFilteredApplications(searchHook.results.applications);
        }
      } catch (error) {
        console.error('Job title search error:', error);
        setFilteredApplications([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [query, applications, searchHook]);

  return {
    query,
    setQuery,
    filteredApplications,
    isSearching,
    totalResults: searchHook.results?.filteredCount || 0,
    searchTime: searchHook.results?.searchTime || 0
  };
}