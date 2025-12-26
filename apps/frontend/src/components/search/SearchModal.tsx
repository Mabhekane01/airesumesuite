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
  SparklesIcon,
  CommandLineIcon,
  CpuChipIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { globalSearchService as searchService, GlobalSearchResult } from '../../services/searchService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getResultIcon = (type: GlobalSearchResult['type']) => {
  switch (type) {
    case 'resume':
      return <DocumentTextIcon className="h-5 w-5 text-brand-blue" />;
    case 'job_application':
      return <BriefcaseIcon className="h-5 w-5 text-brand-dark opacity-60" />;
    case 'cover_letter':
      return <PencilIcon className="h-5 w-5 text-brand-orange" />;
    case 'skill':
      return <SparklesIcon className="h-5 w-5 text-brand-success" />;
    default:
      return <ChartBarIcon className="h-5 w-5 text-text-tertiary" />;
  }
};

const getResultTypeLabel = (type: GlobalSearchResult['type']) => {
  switch (type) {
    case 'resume': return 'Architecture';
    case 'job_application': return 'Deployment';
    case 'cover_letter': return 'Narrative';
    case 'skill': return 'Protocol';
    default: return 'Asset';
  }
};

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowDown': e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, results.length - 1)); break;
        case 'ArrowUp': e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); break;
        case 'Enter': 
          e.preventDefault(); 
          if (results[selectedIndex]) handleResultClick(results[selectedIndex]); 
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleResultClick = (result: GlobalSearchResult) => {
    navigate(result.href);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-brand-dark/20 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Search Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-white border border-surface-200 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[70vh]"
        >
          {/* Search Input */}
          <div className="flex items-center p-6 border-b border-surface-100 bg-white relative z-10">
            <CommandLineIcon className="w-6 h-6 text-text-tertiary mr-4" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Execute intelligence query..."
              autoComplete="off"
              className="flex-1 bg-transparent text-lg font-black text-brand-dark placeholder:text-text-tertiary outline-none"
            />
            <button
              onClick={handleClose}
              className="p-2 text-text-tertiary hover:text-brand-dark hover:bg-surface-50 rounded-xl transition-all"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-surface-50/30 custom-scrollbar">
            {isLoading ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Parsing Repository...</p>
              </div>
            ) : results.length === 0 && query.trim() ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-surface-200 flex items-center justify-center mx-auto text-text-tertiary opacity-30 shadow-sm">
                  <MagnifyingGlassIcon className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-text-secondary">Null signal detected for "{query}"</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {!query.trim() && (
                  <div className="px-4 py-2 mb-2">
                    <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Dynamic Suggestions</p>
                  </div>
                )}
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-5 p-5 cursor-pointer rounded-2xl transition-all duration-300 group border-2 ${
                      index === selectedIndex
                        ? 'bg-brand-blue/5 border-brand-blue shadow-lg scale-[1.01]'
                        : 'bg-white border-transparent hover:border-brand-blue/20 hover:bg-white'
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                      index === selectedIndex ? 'bg-brand-blue text-white border-brand-blue' : 'bg-surface-50 border-surface-100'
                    }`}>
                      {index === selectedIndex ? <CpuChipIcon className="w-6 h-6" /> : getResultIcon(result.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-base font-black tracking-tight ${index === selectedIndex ? 'text-brand-dark' : 'text-brand-dark opacity-80'}`}>
                          {result.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                          index === selectedIndex ? 'bg-brand-blue text-white border-brand-blue' : 'bg-surface-50 text-text-tertiary border-surface-200'
                        }`}>
                          {getResultTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className={`text-xs font-bold truncate ${index === selectedIndex ? 'text-brand-blue' : 'text-text-tertiary'}`}>
                        {result.subtitle}
                      </p>
                    </div>
                    
                    <ChevronRightIcon className={`w-5 h-5 transition-all duration-300 ${
                      index === selectedIndex ? 'text-brand-blue translate-x-0' : 'text-text-tertiary -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
                    }`} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-surface-100 bg-white relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-surface-100 border border-surface-200 rounded-md text-[10px] font-black text-brand-dark shadow-sm">TAB</kbd>
                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-surface-100 border border-surface-200 rounded-md text-[10px] font-black text-brand-dark shadow-sm">ESC</kbd>
                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Abort</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-success" />
              <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">{results.length} Active Nodes</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}