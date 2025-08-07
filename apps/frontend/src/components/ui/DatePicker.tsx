import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format, parse, isValid } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  allowFuture?: boolean;
  allowManualInput?: boolean;
  format?: 'MM/yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy';
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date...",
  required = false,
  error,
  helpText,
  disabled = false,
  allowFuture = true,
  allowManualInput = true,
  format: dateFormat = 'MM/yyyy'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate months for dropdown
  const generateMonthOptions = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 50;
    const endYear = allowFuture ? currentYear + 10 : currentYear;

    for (let year = endYear; year >= startYear; year--) {
      for (let month = 11; month >= 0; month--) {
        const date = new Date(year, month, 1);
        if (!allowFuture && date > new Date()) continue;
        
        months.push({
          value: format(date, 'yyyy-MM'),
          label: format(date, 'MMMM yyyy'),
          year,
          month
        });
      }
    }
    return months;
  };

  const monthOptions = generateMonthOptions();

  // Update display value when value prop changes
  useEffect(() => {
    if (value) {
      try {
        if (dateFormat === 'MM/yyyy') {
          // Handle MM/yyyy format or yyyy-MM format
          let parsedDate;
          if (value.includes('/')) {
            parsedDate = parse(value, 'MM/yyyy', new Date());
          } else {
            parsedDate = parse(value + '-01', 'yyyy-MM-dd', new Date());
          }
          
          if (isValid(parsedDate)) {
            setDisplayValue(format(parsedDate, 'MMMM yyyy'));
            setInputValue(format(parsedDate, 'MM/yyyy'));
          } else {
            setDisplayValue(value);
            setInputValue(value);
          }
        } else {
          const parsedDate = parse(value, dateFormat === 'yyyy-MM-dd' ? 'yyyy-MM-dd' : 'MM/dd/yyyy', new Date());
          if (isValid(parsedDate)) {
            setDisplayValue(format(parsedDate, dateFormat === 'yyyy-MM-dd' ? 'MMM dd, yyyy' : 'MMM dd, yyyy'));
            setInputValue(value);
          } else {
            setDisplayValue(value);
            setInputValue(value);
          }
        }
      } catch (error) {
        setDisplayValue(value);
        setInputValue(value);
      }
    } else {
      setDisplayValue('');
      setInputValue('');
    }
  }, [value, dateFormat]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthSelect = (monthValue: string) => {
    if (dateFormat === 'MM/yyyy') {
      const [year, month] = monthValue.split('-');
      const formattedValue = `${month}/${year}`;
      onChange(formattedValue);
    } else {
      onChange(monthValue + '-01'); // Add day for full date formats
    }
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (allowManualInput) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    if (allowManualInput && inputValue !== value) {
      onChange(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getPlaceholderText = () => {
    switch (dateFormat) {
      case 'MM/yyyy':
        return 'MM/YYYY (e.g., 01/2024)';
      case 'yyyy-MM-dd':
        return 'YYYY-MM-DD (e.g., 2024-01-15)';
      case 'MM/dd/yyyy':
        return 'MM/DD/YYYY (e.g., 01/15/2024)';
      default:
        return placeholder;
    }
  };

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-dark-text-primary">
          {label}
          {required && <span className="text-accent-danger ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {allowManualInput ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            disabled={disabled}
            className={clsx(
              'input-field-dark pr-10',
              error && 'border-accent-danger focus:ring-accent-danger focus:border-accent-danger',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={clsx(
              'input-field-dark pr-10 text-left cursor-pointer',
              error && 'border-accent-danger focus:ring-accent-danger focus:border-accent-danger',
              disabled && 'opacity-50 cursor-not-allowed',
              !displayValue && 'text-dark-text-muted'
            )}
          >
            {displayValue || getPlaceholderText()}
          </button>
        )}
        
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <CalendarIcon className="w-5 h-5 text-dark-text-secondary" />
        </button>
        
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full max-w-xs bg-dark-secondary border border-dark-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {monthOptions.length > 0 ? (
              monthOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleMonthSelect(option.value)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm hover:bg-dark-border transition-colors',
                    value?.startsWith(option.value.replace('-', '/')) && 'bg-accent-primary text-white'
                  )}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-dark-text-muted">
                No options available
              </div>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-accent-danger">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-sm text-dark-text-muted">{helpText}</p>
      )}
    </div>
  );
}