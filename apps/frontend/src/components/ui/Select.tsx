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
      <div className="space-y-2">
        {label && (
          <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'input-resume py-4 bg-white cursor-pointer appearance-none',
            error && 'border-red-300 focus:ring-red-100',
            className
          )}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value} className="bg-white text-brand-dark">
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        {error && (
          <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';