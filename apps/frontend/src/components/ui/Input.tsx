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
      <div className="space-y-2">
        {label && (
          <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'input-resume py-4',
            error && 'border-red-300 focus:ring-red-100',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input';