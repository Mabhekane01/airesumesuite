import { useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { Resume, JobApplication } from '../types';

/**
 * Hook to sync real data with the search index
 * Call this hook in components where you load data to keep search up to date
 */
export const useSearchData = () => {
  const { updateSearchIndex } = useSearch();

  const syncResumes = (resumes: Resume[]) => {
    updateSearchIndex({ resumes });
  };

  const syncJobApplications = (jobApplications: JobApplication[]) => {
    updateSearchIndex({ jobApplications });
  };

  const syncAllData = (data: {
    resumes?: Resume[];
    jobApplications?: JobApplication[];
  }) => {
    updateSearchIndex(data);
  };

  return {
    syncResumes,
    syncJobApplications,
    syncAllData
  };
};

/**
 * Auto-sync hook - automatically syncs data when it changes
 * Use this in your main data-loading components
 */
export const useAutoSyncSearch = (data: {
  resumes?: Resume[];
  jobApplications?: JobApplication[];
}) => {
  const { updateSearchIndex } = useSearch();

  useEffect(() => {
    if (data.resumes || data.jobApplications) {
      updateSearchIndex(data);
    }
  }, [data.resumes, data.jobApplications, updateSearchIndex]);
};