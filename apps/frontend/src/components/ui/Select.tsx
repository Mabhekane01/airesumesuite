import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  children?: React.ReactNode;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helpText, className, required, children, options, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-dark-text-primary">
            {label}
            {required && <span className="text-accent-danger ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'input-field-dark',
            error && 'border-accent-danger focus:ring-accent-danger focus:border-accent-danger',
            className
          )}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-700 text-dark-text-primary">
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        {error && (
          <p className="text-sm text-accent-danger">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-sm text-dark-text-muted">{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';