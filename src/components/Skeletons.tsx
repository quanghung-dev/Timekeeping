import React from 'react';

/**
 * Skeleton pulse animation wrapper
 */
const SkeletonPulse: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`animate-pulse ${className || ''}`}>{children}</div>
);

/**
 * Dashboard Stats Card Skeleton
 */
export const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-6 rounded-3xl bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <SkeletonPulse className="flex items-center space-x-4">
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 h-12 w-12" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
            </div>
          </SkeletonPulse>
        </div>
      ))}
    </div>
  );
};

/**
 * Calendar Grid Skeleton
 */
export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 p-6 rounded-3xl shadow-soft">
      <SkeletonPulse className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
          <div className="flex space-x-2">
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-8" />
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-8" />
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mx-auto" />
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-3">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-50 dark:bg-slate-900/30 rounded-2xl" />
          ))}
        </div>
      </SkeletonPulse>
    </div>
  );
};

/**
 * Table Record List Skeleton
 */
export const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 rounded-3xl shadow-soft overflow-hidden">
      <SkeletonPulse>
        <div className="p-5 border-b border-gray-100 dark:border-gray-900/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:max-w-xs" />
          <div className="flex gap-2">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl w-24" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl w-24" />
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="flex justify-between border-b border-gray-50 dark:border-gray-900/30 pb-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16" />
            ))}
          </div>
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="flex justify-between items-center py-1">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-28" />
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-14" />
            </div>
          ))}
        </div>
      </SkeletonPulse>
    </div>
  );
};

/**
 * Recharts Graph Loader Skeleton
 */
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 p-6 rounded-3xl shadow-soft">
      <SkeletonPulse className="space-y-6">
        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
        
        <div className="h-60 bg-slate-50 dark:bg-slate-900/30 rounded-2xl flex items-end justify-around p-4">
          {[...Array(12)].map((_, i) => {
            const heights = ['h-24', 'h-36', 'h-16', 'h-40', 'h-20', 'h-32', 'h-48', 'h-12', 'h-28', 'h-44', 'h-30', 'h-18'];
            return (
              <div key={i} className={`w-8 ${heights[i % heights.length]} bg-slate-100 dark:bg-slate-800 rounded-t-lg`} />
            );
          })}
        </div>
      </SkeletonPulse>
    </div>
  );
};
