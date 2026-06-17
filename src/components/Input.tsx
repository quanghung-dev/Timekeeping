import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  label,
  error,
  leftIcon,
  rightAction,
  type = 'text',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark tracking-wide px-1"
        >
          {label}
        </label>
      )}
      
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 text-gray-900 placeholder-gray-400 font-medium rounded-2xl py-3 px-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10',
            'dark:bg-slate-900/40 dark:border-slate-800/80 dark:hover:border-slate-700/80 dark:focus:border-primary/50 dark:text-gray-100 dark:placeholder-gray-500',
            leftIcon && 'pl-11',
            rightAction && 'pr-11',
            error && 'border-danger focus:border-danger focus:ring-danger/10 dark:border-danger/60 dark:focus:border-danger/60 dark:focus:ring-danger/10',
            className
          )}
          {...props}
        />
        
        {rightAction && (
          <div className="absolute right-3.5 flex items-center justify-center">
            {rightAction}
          </div>
        )}
      </div>
      
      {error && (
        <span className="text-xs text-danger font-medium px-1 mt-0.5 animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
