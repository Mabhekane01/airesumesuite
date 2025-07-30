import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helpText, className, required, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-dark-text-primary">
            {label}
            {required && <span className="text-accent-danger ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'input-field-dark min-h-[100px] resize-vertical',
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

Textarea.displayName = 'Textarea';