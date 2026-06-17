import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 20, 
          delay: delayIndex * 0.05 
        }}
        className={cn(baseStyles, hoverStyles, className)}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(baseStyles, hoverStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
};

