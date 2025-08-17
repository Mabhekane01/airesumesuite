import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, CheckIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useFieldValidation } from '../../hooks/useFormValidation';

interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  meta?: any;
}

interface AutocompleteInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string, option?: AutocompleteOption) => void;
  onBlur?: () => void;
  options: AutocompleteOption[];
  searchFunction?: (query: string) => AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
  allowCustomValue?: boolean;
  maxDisplayOptions?: number;
  minSearchLength?: number;
  debounceMs?: number;
  loading?: boolean;
  clearable?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  searchFunction,
  placeholder = 'Type to search...',
  disabled = false,
  required = false,
  className = '',
  helpText,
  allowCustomValue = true,
  maxDisplayOptions = 10,
  minSearchLength = 0,
  debounceMs = 200,
  loading = false,
  clearable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    error,
    touched,
    showError,
    validate,
    setTouched,
  } = useFieldValidation(name);

  // Filter options based on search query
  const filterOptions = useCallback((query: string) => {
    if (query.length < minSearchLength) {
      return options.slice(0, maxDisplayOptions);
    }

    let filtered: AutocompleteOption[];
    
    if (searchFunction) {
      filtered = searchFunction(query);
    } else {
      const lowerQuery = query.toLowerCase();
      filtered = options.filter(option =>
        option.label.toLowerCase().includes(lowerQuery) ||
        option.value.toLowerCase().includes(lowerQuery) ||
        option.description?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort by relevance (exact matches first, then starts with, then contains)
    filtered.sort((a, b) => {
      const aLabel = a.label.toLowerCase();
      const bLabel = b.label.toLowerCase();
      const query_lower = query.toLowerCase();
      
      if (aLabel === query_lower && bLabel !== query_lower) return -1;
      if (bLabel === query_lower && aLabel !== query_lower) return 1;
      
      if (aLabel.startsWith(query_lower) && !bLabel.startsWith(query_lower)) return -1;
      if (bLabel.startsWith(query_lower) && !aLabel.startsWith(query_lower)) return 1;
      
      return aLabel.localeCompare(bLabel);
    });

    return filtered.slice(0, maxDisplayOptions);
  }, [options, searchFunction, minSearchLength, maxDisplayOptions]);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      const filtered = filterOptions(query);
      setFilteredOptions(filtered);
      setHighlightedIndex(-1);
    }, debounceMs);

    setSearchTimeout(timeout);
  }, [filterOptions, debounceMs, searchTimeout]);

  // Initialize filtered options
  useEffect(() => {
    const filtered = filterOptions(searchQuery);
    setFilteredOptions(filtered);
  }, [filterOptions, searchQuery]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setIsOpen(true);
    
    if (allowCustomValue) {
      onChange(newValue);
    }
    
    handleSearch(newValue);
    
    if (touched) {
      validate(newValue);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: AutocompleteOption) => {
    setSearchQuery(option.label);
    onChange(option.value, option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    validate(option.value);
    inputRef.current?.blur();
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay to allow option click to register
    setTimeout(() => {
      setIsOpen(false);
      setTouched(true);
      
      // If no option was selected and custom values not allowed, revert
      if (!allowCustomValue && searchQuery !== value) {
        const selectedOption = options.find(opt => opt.value === value);
        setSearchQuery(selectedOption?.label || '');
      }
      
      validate(value);
      onBlur?.();
    }, 150);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    if (filteredOptions.length === 0) {
      handleSearch(searchQuery);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        } else if (allowCustomValue) {
          onChange(searchQuery);
          setIsOpen(false);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const getInputClasses = () => {
    let classes = `input-field-dark w-full pr-10 ${className}`;
    
    if (showError) {
      classes += ' border-red-500 focus:border-red-500 focus:ring-red-500';
    } else if (touched && !error) {
      classes += ' border-green-500 focus:border-green-500 focus:ring-green-500';
    } else {
      classes += ' border-dark-border focus:border-dark-accent focus:ring-dark-accent';
    }
    
    if (disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }
    
    return classes;
  };

  // Find selected option for display
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || searchQuery;

  return (
    <div ref={containerRef} className="relative space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-dark-text-secondary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={getInputClasses()}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${name}-error` : undefined}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-accent"></div>
          )}
          
          {clearable && value && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-dark-text-muted hover:text-dark-text-primary rounded"
              tabIndex={-1}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-dark-text-muted hover:text-dark-text-primary rounded"
            tabIndex={-1}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-dark-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul
              ref={listRef}
              role="listbox"
              className="py-1"
            >
              {filteredOptions.map((option, index) => (
                <li
                  key={`${option.value}-${index}`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  className={`px-3 py-2 cursor-pointer flex items-center space-x-3 ${
                    highlightedIndex === index
                      ? 'bg-dark-accent/20 text-dark-accent'
                      : 'hover:bg-dark-quaternary/50 text-dark-text-primary'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleOptionSelect(option)}
                >
                  {option.icon && (
                    <span className="text-lg">{option.icon}</span>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-dark-text-muted truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                  
                  {option.value === value && (
                    <CheckIcon className="w-4 h-4 text-dark-accent" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-4 text-center text-dark-text-muted">
              <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery.length < minSearchLength
                  ? `Type at least ${minSearchLength} characters to search`
                  : 'No results found'
                }
              </p>
              {allowCustomValue && searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(searchQuery);
                    setIsOpen(false);
                  }}
                  className="mt-2 text-xs text-dark-accent hover:text-dark-accent/80 underline"
                >
                  Use "{searchQuery}" as custom value
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {showError && (
        <p id={`${name}-error`} className="text-sm text-red-500 flex items-center">
          <XMarkIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {helpText && !showError && (
        <p className="text-sm text-dark-text-muted">
          {helpText}
        </p>
      )}
    </div>
  );
};