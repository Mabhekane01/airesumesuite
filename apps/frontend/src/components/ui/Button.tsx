import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-primary disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:from-emerald-600 hover:to-cyan-500 focus:ring-accent-primary shadow-glow-sm hover:shadow-glow-md',
    secondary: 'bg-gray-700 text-dark-text-primary hover:bg-dark-quaternary focus:ring-accent-primary border border-dark-border hover:border-accent-primary/50',
    outline: 'border border-accent-primary bg-transparent text-accent-primary hover:bg-accent-primary/10 focus:ring-accent-primary hover:shadow-glow-sm',
    ghost: 'text-dark-text-secondary hover:bg-gray-700/60 hover:text-accent-primary focus:ring-accent-primary',
    danger: 'bg-accent-danger text-white hover:bg-red-700 focus:ring-accent-danger shadow-glow-sm hover:shadow-red-500/50'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}