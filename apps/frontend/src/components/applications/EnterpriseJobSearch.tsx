import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { SearchFilters, SortOptions } from '../../utils/enterpriseSearch';

interface EnterpriseJobSearchProps {
  onSearch: (query: string, filters?: SearchFilters, sortOptions?: SortOptions) => void;
  stats: {
    totalApplications: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    recentApplications: number;
  };
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500' },
  { value: 'phone_screen', label: 'Phone Screen', color: 'bg-purple-500' },
  { value: 'technical_assessment', label: 'Technical Assessment', color: 'bg-orange-500' },
  { value: 'first_interview', label: 'First Interview', color: 'bg-indigo-500' },
  { value: 'second_interview', label: 'Second Interview', color: 'bg-pink-500' },
  { value: 'final_interview', label: 'Final Interview', color: 'bg-cyan-500' },
  { value: 'offer_received', label: 'Offer Received', color: 'bg-green-500' },
  { value: 'offer_accepted', label: 'Offer Accepted', color: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-500' }
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High Priority', color: 'bg-red-500' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low Priority', color: 'bg-green-500' }
];

const SORT_OPTIONS = [
  { field: 'appliedDate' as const, label: 'Application Date' },
  { field: 'jobTitle' as const, label: 'Job Title' },
  { field: 'companyName' as const, label: 'Company Name' },
  { field: 'status' as const, label: 'Status' },
  { field: 'priority' as const, label: 'Priority' }
];

export default function EnterpriseJobSearch({ 
  onSearch, 
  stats, 
  isLoading = false 
}: EnterpriseJobSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'appliedDate',
    direction: 'desc'
  });

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, searchFilters: SearchFilters, searchSort: SortOptions) => {
      console.log('🏢 EnterpriseJobSearch: Executing search', { 
        query: searchQuery, 
        hasFilters: Object.keys(searchFilters).length > 0 
      });
      onSearch(searchQuery, searchFilters, searchSort);
    }, 300),
    [onSearch]
  );

  // Trigger search when inputs change
  React.useEffect(() => {
    debouncedSearch(query, filters, sortOptions);
  }, [query, filters, sortOptions, debouncedSearch]);

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const toggleStatusFilter = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    handleFilterChange('status', newStatuses.length > 0 ? newStatuses : undefined);
  };

  const togglePriorityFilter = (priority: string) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    
    handleFilterChange('priority', newPriorities.length > 0 ? newPriorities : undefined);
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof SearchFilters];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-dark-text-secondary" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job title (e.g., Software Engineer, Product Manager)"
            className="input-field-dark w-full pl-10 pr-20 text-sm py-3"
          />
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary"></div>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md transition-all duration-200 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary/60'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">{activeFilterCount}</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-tertiary/60 rounded-lg p-3">
          <p className="text-xs text-dark-text-secondary">Total Applications</p>
          <p className="text-lg font-semibold text-dark-text-primary">{stats.totalApplications}</p>
        </div>
        <div className="bg-dark-tertiary/60 rounded-lg p-3">
          <p className="text-xs text-dark-text-secondary">Recent (30 days)</p>
          <p className="text-lg font-semibold text-accent-primary">{stats.recentApplications}</p>
        </div>
        <div className="bg-dark-tertiary/60 rounded-lg p-3">
          <p className="text-xs text-dark-text-secondary">Active Processes</p>
          <p className="text-lg font-semibold text-yellow-400">
            {(stats.statusCounts.under_review || 0) + (stats.statusCounts.phone_screen || 0) + 
             (stats.statusCounts.first_interview || 0) + (stats.statusCounts.second_interview || 0)}
          </p>
        </div>
        <div className="bg-dark-tertiary/60 rounded-lg p-3">
          <p className="text-xs text-dark-text-secondary">Offers</p>
          <p className="text-lg font-semibold text-green-400">
            {(stats.statusCounts.offer_received || 0) + (stats.statusCounts.offer_accepted || 0)}
          </p>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-dark-tertiary/40 backdrop-blur-sm rounded-lg border border-dark-border overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark-text-primary">Filters & Sorting</h3>
                <div className="flex items-center space-x-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 text-dark-text-secondary hover:text-dark-text-primary transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-medium text-dark-text-primary mb-3">Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <label
                      key={status.value}
                      className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all ${
                        filters.status?.includes(status.value)
                          ? 'bg-accent-primary/20 border border-accent-primary/30'
                          : 'bg-dark-secondary/60 hover:bg-dark-secondary/80 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(status.value) || false}
                        onChange={() => toggleStatusFilter(status.value)}
                        className="hidden"
                      />
                      <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                      <span className="text-sm text-dark-text-primary">{status.label}</span>
                      {filters.status?.includes(status.value) && (
                        <CheckIcon className="h-4 w-4 text-accent-primary ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h4 className="text-sm font-medium text-dark-text-primary mb-3">Priority</h4>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map(priority => (
                    <label
                      key={priority.value}
                      className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all ${
                        filters.priority?.includes(priority.value)
                          ? 'bg-accent-primary/20 border border-accent-primary/30'
                          : 'bg-dark-secondary/60 hover:bg-dark-secondary/80 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(priority.value) || false}
                        onChange={() => togglePriorityFilter(priority.value)}
                        className="hidden"
                      />
                      <div className={`w-3 h-3 rounded-full ${priority.color}`}></div>
                      <span className="text-sm text-dark-text-primary">{priority.label}</span>
                      {filters.priority?.includes(priority.value) && (
                        <CheckIcon className="h-4 w-4 text-accent-primary ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Sorting */}
              <div>
                <h4 className="text-sm font-medium text-dark-text-primary mb-3">Sort By</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-dark-text-secondary mb-2">Sort Field</label>
                    <select
                      value={sortOptions.field}
                      onChange={(e) => setSortOptions(prev => ({ 
                        ...prev, 
                        field: e.target.value as SortOptions['field'] 
                      }))}
                      className="input-field-dark w-full text-sm"
                    >
                      {SORT_OPTIONS.map(option => (
                        <option key={option.field} value={option.field}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-text-secondary mb-2">Direction</label>
                    <select
                      value={sortOptions.direction}
                      onChange={(e) => setSortOptions(prev => ({ 
                        ...prev, 
                        direction: e.target.value as 'asc' | 'desc' 
                      }))}
                      className="input-field-dark w-full text-sm"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-text-secondary mb-2">Location</label>
                  <input
                    type="text"
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                    placeholder="City, State, or Remote"
                    className="input-field-dark w-full text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer mt-6">
                    <input
                      type="checkbox"
                      checked={filters.remote || false}
                      onChange={(e) => handleFilterChange('remote', e.target.checked ? true : undefined)}
                      className="rounded border-dark-border bg-dark-secondary text-accent-primary focus:ring-accent-primary focus:ring-offset-dark-secondary"
                    />
                    <span className="text-sm text-dark-text-primary">Remote positions only</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}