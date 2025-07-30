import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  PencilIcon,
  ChartBarIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { globalSearchService as searchService, SearchResult } from '../../services/searchService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getResultIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'resume':
      return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
    case 'job_application':
      return <BriefcaseIcon className="h-5 w-5 text-green-500" />;
    case 'cover_letter':
      return <PencilIcon className="h-5 w-5 text-purple-500" />;
    case 'skill':
      return <SparklesIcon className="h-5 w-5 text-accent-primary" />;
    default:
      return <ChartBarIcon className="h-5 w-5 text-gray-500" />;
  }
};

const getResultTypeLabel = (type: SearchResult['type']) => {
  switch (type) {
    case 'resume':
      return 'Resume';
    case 'job_application':
      return 'Job Application';
    case 'cover_letter':
      return 'Cover Letter';
    case 'skill':
      return 'Quick Action';
    default:
      return 'Result';
  }
};

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search
  useEffect(() => {
    if (!query.trim()) {
      setResults(searchService.getQuickSuggestions());
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const searchResults = searchService.search(query);
      setResults(searchResults);
      setSelectedIndex(0);
      setIsLoading(false);
    }, 150); // Debounce search

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    onClose();
    setQuery('');
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 md:pt-16 px-2 sm:px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Search Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-dark-tertiary/95 backdrop-blur-lg rounded-xl shadow-dark-xl border border-dark-border overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        >
          {/* Search Input */}
          <div className="flex items-center p-3 sm:p-4 border-b border-dark-border flex-shrink-0">
            <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-dark-text-secondary mr-2 sm:mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resumes, applications, cover letters..."
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              className="flex-1 bg-transparent text-dark-text-primary placeholder-dark-text-secondary focus:outline-none text-base sm:text-lg min-w-0"
            />
            <button
              onClick={handleClose}
              className="p-1 text-dark-text-secondary hover:text-dark-text-primary transition-colors flex-shrink-0 ml-2"
            >
              <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-accent-primary"></div>
                <p className="text-dark-text-secondary mt-2 text-sm sm:text-base">Searching...</p>
              </div>
            ) : results.length === 0 && query.trim() ? (
              <div className="p-6 sm:p-8 text-center">
                <MagnifyingGlassIcon className="h-10 w-10 sm:h-12 sm:w-12 text-dark-text-secondary/50 mx-auto mb-3" />
                <p className="text-dark-text-secondary text-sm sm:text-base">No results found for "{query}"</p>
                <p className="text-dark-text-secondary/70 text-xs sm:text-sm mt-1">
                  Try different keywords or check your spelling
                </p>
              </div>
            ) : (
              <div className="py-1 sm:py-2">
                {!query.trim() && (
                  <div className="px-3 sm:px-4 py-2 border-b border-dark-border">
                    <p className="text-xs font-medium text-dark-text-secondary uppercase tracking-wide">
                      Quick Actions
                    </p>
                  </div>
                )}
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center p-3 sm:p-4 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                      index === selectedIndex
                        ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                        : 'hover:bg-dark-tertiary/60 active:bg-dark-tertiary/80 touch-manipulation'
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex-shrink-0 mr-2 sm:mr-3">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <h3 className="text-sm font-medium text-dark-text-primary truncate">
                          {result.title}
                        </h3>
                        <span className="flex-shrink-0 px-2 py-1 text-xs bg-dark-secondary/60 text-dark-text-secondary rounded-full">
                          {getResultTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-xs text-dark-text-secondary mt-1 truncate">
                        {result.subtitle}
                      </p>
                      <p className="text-xs text-dark-text-secondary/70 mt-1 line-clamp-2 hidden sm:block">
                        {result.description}
                      </p>
                      {/* Mobile: Show shorter description */}
                      <p className="text-xs text-dark-text-secondary/70 mt-1 truncate sm:hidden">
                        {result.description}
                      </p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-dark-text-secondary/50 ml-1 sm:ml-2 flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-dark-border bg-dark-secondary/30 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-dark-text-secondary">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Desktop keyboard shortcuts */}
                <div className="hidden sm:flex items-center space-x-4">
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-dark-tertiary rounded text-xs">↑↓</kbd>
                    <span className="ml-1">Navigate</span>
                  </span>
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-dark-tertiary rounded text-xs">Enter</kbd>
                    <span className="ml-1">Select</span>
                  </span>
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-dark-tertiary rounded text-xs">Esc</kbd>
                    <span className="ml-1">Close</span>
                  </span>
                </div>
                {/* Mobile: Simplified help */}
                <div className="sm:hidden flex items-center space-x-3">
                  <span className="text-xs text-dark-text-secondary/70">Tap to select</span>
                </div>
              </div>
              <span className="text-xs">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}