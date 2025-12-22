import React from 'react';
import { CurrencyInput, SalaryPeriodInput } from './SpecializedInputs';
import { ValidatedInput } from './ValidatedInput';
import { formatCurrency } from '../../utils/validation';
import { CURRENCIES } from '../../data/standardData';

interface EnhancedSalaryInputProps {
  name: string;
  label: string;
  minValue: number;
  maxValue: number;
  currency: string;
  period: string;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onCurrencyChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
  showRange?: boolean;
}

export const EnhancedSalaryInput: React.FC<EnhancedSalaryInputProps> = ({
  name,
  label,
  minValue,
  maxValue,
  currency,
  period,
  onMinChange,
  onMaxChange,
  onCurrencyChange,
  onPeriodChange,
  disabled = false,
  required = false,
  className = '',
  helpText = 'Enter the expected salary range and currency',
  showRange = true,
}) => {
  const currencyData = CURRENCIES.find(c => c.code === currency);
  const currencySymbol = currencyData?.symbol || '$';

  const formatInputValue = (value: number): string => {
    return value > 0 ? value.toString() : '';
  };

  const parseInputValue = (value: string | number): number => {
    // Handle different input types
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value !== 'string') {
      return 0;
    }
    
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const getSalaryDisplayText = () => {
    if (minValue > 0 && maxValue > 0) {
      try {
        const min = formatCurrency(minValue, currency);
        const max = formatCurrency(maxValue, currency);
        return `Range: ${min} - ${max} ${period}`;
      } catch {
        return `Range: ${currencySymbol}${minValue.toLocaleString()} - ${currencySymbol}${maxValue.toLocaleString()} ${period}`;
      }
    } else if (minValue > 0) {
      try {
        return `Minimum: ${formatCurrency(minValue, currency)} ${period}`;
      } catch {
        return `Minimum: ${currencySymbol}${minValue.toLocaleString()} ${period}`;
      }
    } else if (maxValue > 0) {
      try {
        return `Maximum: ${formatCurrency(maxValue, currency)} ${period}`;
      } catch {
        return `Maximum: ${currencySymbol}${maxValue.toLocaleString()} ${period}`;
      }
    }
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {getSalaryDisplayText() && (
          <span className="text-sm text-dark-text-muted">
            {getSalaryDisplayText()}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Minimum Salary */}
        <div className="relative">
          <ValidatedInput
            name={`${name}_min`}
            label="Minimum"
            type="number"
            value={formatInputValue(minValue)}
            onChange={(value) => onMinChange(parseInputValue(value))}
            placeholder="50000"
            disabled={disabled}
            min={0}
            step={1000}
            helpText={`Minimum ${period} salary`}
          />
          <div className="absolute left-3 top-[1.875rem] text-dark-text-muted pointer-events-none">
            {currencySymbol}
          </div>
        </div>
        
        {/* Maximum Salary */}
        <div className="relative">
          <ValidatedInput
            name={`${name}_max`}
            label="Maximum"
            type="number"
            value={formatInputValue(maxValue)}
            onChange={(value) => onMaxChange(parseInputValue(value))}
            placeholder="80000"
            disabled={disabled}
            min={0}
            step={1000}
            helpText={`Maximum ${period} salary`}
          />
          <div className="absolute left-3 top-[1.875rem] text-dark-text-muted pointer-events-none">
            {currencySymbol}
          </div>
        </div>
        
        {/* Currency */}
        <CurrencyInput
          name={`${name}_currency`}
          label="Currency"
          value={currency}
          onChange={onCurrencyChange}
          disabled={disabled}
          helpText="Select currency"
        />
        
        {/* Period */}
        <SalaryPeriodInput
          name={`${name}_period`}
          label="Pay Period"
          value={period}
          onChange={onPeriodChange}
          disabled={disabled}
          helpText="How often paid"
        />
      </div>
      
      {/* Salary Range Validation */}
      {minValue > 0 && maxValue > 0 && minValue > maxValue && (
        <div className="text-sm text-red-500 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Maximum salary should be greater than minimum salary
        </div>
      )}
      
      {/* Salary Guidelines */}
      {(minValue > 0 || maxValue > 0) && (
        <div className="bg-surface-50/20 border border-surface-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-text-secondary mb-2">💡 Salary Tips</h4>
          <ul className="text-xs text-dark-text-muted space-y-1">
            <li>• Research market rates on Glassdoor, PayScale, or Levels.fyi</li>
            <li>• Consider total compensation (benefits, equity, bonuses)</li>
            <li>• Leave room for negotiation in your range</li>
            <li>• Factor in cost of living for the location</li>
          </ul>
        </div>
      )}
      
      {helpText && !getSalaryDisplayText() && (
        <p className="text-sm text-dark-text-muted">
          {helpText}
        </p>
      )}
    </div>
  );
};
