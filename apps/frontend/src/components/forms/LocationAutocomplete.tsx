import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDownIcon, MapPinIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface LocationOption {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city';
  code?: string;
  countryCode: string;
  stateCode?: string;
  flag?: string;
  fullName: string;
  isEnglishSpeaking: boolean;
  parent?: {
    id: string;
    name: string;
    type: string;
  };
}

interface LocationAutocompleteProps {
  value?: LocationOption | null;
  onChange: (location: LocationOption | null) => void;
  placeholder?: string;
  types?: ('country' | 'state' | 'city')[];
  englishSpeaking?: boolean;
  countryCode?: string;
  stateCode?: string;
  includeCoordinates?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Search for a location...",
  types = ['country', 'state', 'city'],
  englishSpeaking,
  countryCode,
  stateCode,
  includeCoordinates = false,
  className = '',
  disabled = false,
  required = false,
  error
}) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        type: types.join(','),
        limit: '10',
        includeCoordinates: includeCoordinates.toString()
      });

      if (englishSpeaking !== undefined) {
        params.append('englishSpeaking', englishSpeaking.toString());
      }
      if (countryCode) {
        params.append('countryCode', countryCode);
      }
      if (stateCode) {
        params.append('stateCode', stateCode);
      }

      const response = await fetch(`/api/v1/locations/autocomplete?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setOptions(result.data);
      } else {
        console.error('Location search failed:', result.message);
        setOptions([]);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [types, englishSpeaking, countryCode, stateCode, includeCoordinates]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedIndex(-1);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newQuery.length >= 2) {
      setIsLoading(true);
      setIsOpen(true);
      debounceRef.current = setTimeout(() => {
        debouncedSearch(newQuery);
      }, 300);
    } else {
      setOptions([]);
      setIsOpen(false);
      setIsLoading(false);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: LocationOption) => {
    setQuery(option.fullName);
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange(option);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && options[selectedIndex]) {
          handleOptionSelect(options[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clicks outside component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when value changes externally
  useEffect(() => {
    if (value) {
      setQuery(value.fullName);
    } else {
      setQuery('');
    }
  }, [value]);

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'country':
        return <GlobeAltIcon className="h-4 w-4" />;
      case 'state':
        return <MapPinIcon className="h-4 w-4" />;
      case 'city':
        return <MapPinIcon className="h-4 w-4" />;
      default:
        return <MapPinIcon className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'country':
        return 'Country';
      case 'state':
        return 'State/Province';
      case 'city':
        return 'City';
      default:
        return type;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-3 pr-10 border rounded-lg shadow-sm 
            focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
            disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          `}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
          ) : (
            <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {options.map((option, index) => (
                <li
                  key={option.id}
                  className={`
                    px-4 py-3 cursor-pointer flex items-center space-x-3 hover:bg-gray-50
                    ${index === selectedIndex ? 'bg-blue-50 border-l-4 border-teal-500' : ''}
                  `}
                  onClick={() => handleOptionSelect(option)}
                >
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {option.flag && <span className="text-lg">{option.flag}</span>}
                    <div className="text-gray-400">
                      {getTypeIcon(option.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {option.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getTypeLabel(option.type)}
                      {option.parent && ` • ${option.parent.name}`}
                      {option.isEnglishSpeaking && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          English Speaking
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {option.code && (
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400 font-mono">
                        {option.code}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : query.length >= 2 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No locations found matching "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
