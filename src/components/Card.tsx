import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'children'> {
  children?: ReactNode;
  hoverEffect?: boolean;
  glass?: boolean;
  animate?: boolean;
  delayIndex?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  glass = false,
  animate = false,
  delayIndex = 0,
  ...props
}) => {
  const baseStyles = cn(
    'p-6 rounded-3xl transition-all duration-300 border',
    glass 
      ? 'glass-panel shadow-soft' 
      : 'bg-white dark:bg-brandCard-dark border-gray-100 dark:border-gray-900/50 shadow-soft'
  );

  const hoverStyles = hoverEffect 
    ? 'hover:-translate-y-1 hover:shadow-premium hover:border-primary/20 dark:hover:border-primary/20' 
    : '';

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 15 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: delayIndex * 0.05,
      } : undefined}
      className={cn(baseStyles, hoverStyles, className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};
