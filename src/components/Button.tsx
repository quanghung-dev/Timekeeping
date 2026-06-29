import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'animate' | 'children'> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  animate?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  animate = true,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none select-none';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-premium hover:shadow-glow',
    secondary: 'bg-primary-soft text-primary hover:bg-primary/20 dark:bg-primary-soft dark:text-primary-light',
    success: 'bg-success text-white hover:bg-green-600 shadow-sm',
    danger: 'bg-danger text-white hover:bg-red-600 shadow-sm',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const buttonContent = (
    <>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </>
  );

  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={animate && !isDisabled ? { scale: 1.02 } : undefined}
      whileTap={animate && !isDisabled ? { scale: 0.98 } : undefined}
      transition={animate ? { type: 'spring', stiffness: 400, damping: 15 } : undefined}
      disabled={isDisabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
};
