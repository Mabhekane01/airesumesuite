import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useFieldValidation, getValidationStatus } from '../../hooks/useFormValidation';
import { formatCurrency, formatDate } from '../../utils/validation';

interface BaseInputProps {
  name: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
  autoFocus?: boolean;
}

interface ValidatedInputProps extends BaseInputProps {
  type?: 'text' | 'email' | 'url' | 'tel' | 'number' | 'password' | 'date' | 'datetime-local';
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  spellCheck?: boolean;
}

interface ValidatedTextareaProps extends BaseInputProps {
  rows?: number;
  maxLength?: number;
  minLength?: number;
  spellCheck?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

interface ValidatedSelectProps extends BaseInputProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  multiple?: boolean;
}

interface ValidatedDateInputProps extends BaseInputProps {
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
}

interface ValidatedSalaryInputProps extends Omit<BaseInputProps, 'value' | 'onChange'> {
  minValue: number;
  maxValue: number;
  currency: string;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onCurrencyChange: (value: string) => void;
}

// Base input component with validation
export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
  autoFocus = false,
  min,
  max,
  step,
  pattern,
  maxLength,
  minLength,
  autoComplete,
  spellCheck = true,
}) => {
  const {
    error,
    touched,
    showError,
    isValidating,
    validate,
    setTouched,
  } = useFieldValidation(name);

  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = getValidationStatus({ [name]: error }, { [name]: touched }, name);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
    
    // Validate on change
    if (touched) {
      validate(newValue);
    }
  }, [onChange, validate, touched, type]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(localValue);
    onBlur?.();
  }, [setTouched, validate, localValue, onBlur]);

  const getInputClasses = () => {
    let classes = `input-field-dark w-full ${className}`;
    
    switch (status) {
      case 'error':
        classes += ' border-red-500 focus:border-red-500 focus:ring-red-500';
        break;
      case 'success':
        classes += ' border-green-500 focus:border-green-500 focus:ring-green-500';
        break;
      default:
        classes += ' border-dark-border focus:border-dark-accent focus:ring-dark-accent';
    }
    
    if (disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }
    
    return classes;
  };

  const renderIcon = () => {
    if (isValidating) {
      return (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-accent"></div>
        </div>
      );
    }
    
    switch (status) {
      case 'error':
        return (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          </div>
        );
      case 'success':
        return (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-dark-text-secondary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={type}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          maxLength={maxLength}
          minLength={minLength}
          autoComplete={autoComplete}
          spellCheck={spellCheck}
          className={getInputClasses()}
          aria-invalid={showError}
          aria-describedby={showError ? `${name}-error` : undefined}
        />
        {renderIcon()}
      </div>
      
      {showError && (
        <p id={`${name}-error`} className="text-sm text-red-500 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {helpText && !showError && (
        <p className="text-sm text-dark-text-muted flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          {helpText}
        </p>
      )}
    </div>
  );
};

// Validated textarea component
export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
  autoFocus = false,
  rows = 4,
  maxLength,
  minLength,
  spellCheck = true,
  resize = 'vertical',
}) => {
  const {
    error,
    touched,
    showError,
    isValidating,
    validate,
    setTouched,
  } = useFieldValidation(name);

  const [localValue, setLocalValue] = useState(value);
  const [charCount, setCharCount] = useState(value?.length || 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const status = getValidationStatus({ [name]: error }, { [name]: touched }, name);

  useEffect(() => {
    setLocalValue(value);
    setCharCount(value?.length || 0);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setCharCount(newValue.length);
    onChange(newValue);
    
    if (touched) {
      validate(newValue);
    }
  }, [onChange, validate, touched]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(localValue);
    onBlur?.();
  }, [setTouched, validate, localValue, onBlur]);

  const getTextareaClasses = () => {
    let classes = `input-field-dark w-full resize-${resize} ${className}`;
    
    switch (status) {
      case 'error':
        classes += ' border-red-500 focus:border-red-500 focus:ring-red-500';
        break;
      case 'success':
        classes += ' border-green-500 focus:border-green-500 focus:ring-green-500';
        break;
      default:
        classes += ' border-dark-border focus:border-dark-accent focus:ring-dark-accent';
    }
    
    if (disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }
    
    return classes;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="block text-sm font-medium text-dark-text-secondary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {maxLength && (
          <span className={`text-xs ${charCount > maxLength * 0.9 ? 'text-yellow-500' : 'text-dark-text-muted'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={name}
          name={name}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          rows={rows}
          maxLength={maxLength}
          minLength={minLength}
          spellCheck={spellCheck}
          className={getTextareaClasses()}
          aria-invalid={showError}
          aria-describedby={showError ? `${name}-error` : undefined}
        />
        
        {isValidating && (
          <div className="absolute top-2 right-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-accent"></div>
          </div>
        )}
      </div>
      
      {showError && (
        <p id={`${name}-error`} className="text-sm text-red-500 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {helpText && !showError && (
        <p className="text-sm text-dark-text-muted flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          {helpText}
        </p>
      )}
    </div>
  );
};

// Validated select component
export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
  multiple = false,
}) => {
  const {
    error,
    touched,
    showError,
    validate,
    setTouched,
  } = useFieldValidation(name);

  const status = getValidationStatus({ [name]: error }, { [name]: touched }, name);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = multiple 
      ? Array.from(e.target.selectedOptions, (option) => option.value)
      : e.target.value;
    
    onChange(newValue);
    
    if (touched) {
      validate(newValue);
    }
  }, [onChange, validate, touched, multiple]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(value);
    onBlur?.();
  }, [setTouched, validate, value, onBlur]);

  const getSelectClasses = () => {
    let classes = `input-field-dark w-full ${className}`;
    
    switch (status) {
      case 'error':
        classes += ' border-red-500 focus:border-red-500 focus:ring-red-500';
        break;
      case 'success':
        classes += ' border-green-500 focus:border-green-500 focus:ring-green-500';
        break;
      default:
        classes += ' border-dark-border focus:border-dark-accent focus:ring-dark-accent';
    }
    
    if (disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }
    
    return classes;
  };

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-dark-text-secondary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        multiple={multiple}
        className={getSelectClasses()}
        aria-invalid={showError}
        aria-describedby={showError ? `${name}-error` : undefined}
      >
        {placeholder && !multiple && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      
      {showError && (
        <p id={`${name}-error`} className="text-sm text-red-500 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {helpText && !showError && (
        <p className="text-sm text-dark-text-muted flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          {helpText}
        </p>
      )}
    </div>
  );
};

// Enhanced date input with min/max validation
export const ValidatedDateInput: React.FC<ValidatedDateInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
  minDate,
  maxDate,
  showTime = false,
}) => {
  const formatDateForInput = (date: Date | string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    if (showTime) {
      return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    }
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const min = minDate ? formatDateForInput(minDate) : undefined;
  const max = maxDate ? formatDateForInput(maxDate) : undefined;

  return (
    <ValidatedInput
      name={name}
      label={label}
      type={showTime ? 'datetime-local' : 'date'}
      value={formatDateForInput(value)}
      onChange={(val) => onChange(val ? new Date(val) : null)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      min={min}
      max={max}
    />
  );
};

// Salary range input component
export const ValidatedSalaryInput: React.FC<ValidatedSalaryInputProps> = ({
  name,
  label,
  minValue,
  maxValue,
  currency,
  onMinChange,
  onMaxChange,
  onCurrencyChange,
  disabled = false,
  required = false,
  className = '',
  helpText,
}) => {
  const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD (C$)' },
    { value: 'AUD', label: 'AUD (A$)' },
    { value: 'JPY', label: 'JPY (¥)' },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-dark-text-secondary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValidatedInput
          name={`${name}_min`}
          label="Minimum"
          type="number"
          value={minValue}
          onChange={onMinChange}
          placeholder="50000"
          disabled={disabled}
          min={0}
          step={1000}
          className={className}
        />
        
        <ValidatedInput
          name={`${name}_max`}
          label="Maximum"
          type="number"
          value={maxValue}
          onChange={onMaxChange}
          placeholder="80000"
          disabled={disabled}
          min={0}
          step={1000}
          className={className}
        />
        
        <ValidatedSelect
          name={`${name}_currency`}
          label="Currency"
          value={currency}
          onChange={onCurrencyChange}
          options={currencies}
          disabled={disabled}
          className={className}
        />
      </div>
      
      {minValue > 0 && maxValue > 0 && (
        <div className="text-sm text-dark-text-muted">
          Range: {formatCurrency(minValue, currency)} - {formatCurrency(maxValue, currency)}
        </div>
      )}
      
      {helpText && (
        <p className="text-sm text-dark-text-muted flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          {helpText}
        </p>
      )}
    </div>
  );
};