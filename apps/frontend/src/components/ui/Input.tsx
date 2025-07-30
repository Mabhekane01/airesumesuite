import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, required, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-dark-text-primary">
            {label}
            {required && <span className="text-accent-danger ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'input-field-dark',
            error && 'border-accent-danger focus:ring-accent-danger focus:border-accent-danger',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input';