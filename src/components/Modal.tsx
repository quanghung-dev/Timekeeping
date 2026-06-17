import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  // Prevent body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Content Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'relative w-full overflow-hidden bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 shadow-premium rounded-3xl z-10 flex flex-col max-h-[90vh]',
              sizeStyles[size]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-gray-900/30">
              {title ? (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
