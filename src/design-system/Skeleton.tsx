import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'stat' | 'table';
  lines?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  variant = 'text', 
  lines = 1,
  className = '' 
}) => {
  const baseClass = "animate-pulse bg-white/10 rounded-lg";
  
  if (variant === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className={`${baseClass} h-4 ${
               i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'
            }`} 
          />
        ))}
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className={`p-5 bg-white/5 border border-white/10 rounded-2xl ${className}`}>
        <div className="flex justify-between items-start">
          <div className="space-y-3 w-1/2">
            <div className={`${baseClass} h-3 w-3/4`} />
            <div className={`${baseClass} h-8 w-full`} />
          </div>
          <div className={`${baseClass} w-10 h-10 rounded-xl`} />
        </div>
        <div className={`${baseClass} mt-4 h-3 w-1/3`} />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4 ${className}`}>
        <div className="flex gap-4 items-center">
          <div className={`${baseClass} w-12 h-12 rounded-full`} />
          <div className="space-y-2 flex-1">
            <div className={`${baseClass} h-4 w-1/3`} />
            <div className={`${baseClass} h-3 w-1/4`} />
          </div>
        </div>
        <div className="space-y-2">
          <div className={`${baseClass} h-20 w-full`} />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`w-full overflow-hidden rounded-xl border border-white/10 ${className}`}>
        <div className="h-12 bg-white/5 border-b border-white/10 flex items-center px-4 gap-4">
          <div className={`${baseClass} h-4 w-1/4`} />
          <div className={`${baseClass} h-4 w-1/4`} />
          <div className={`${baseClass} h-4 w-1/4`} />
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-16 border-b border-white/5 flex items-center px-4 gap-4">
            <div className={`${baseClass} h-4 w-1/4`} />
            <div className={`${baseClass} h-4 w-1/3`} />
            <div className={`${baseClass} h-4 w-1/5`} />
          </div>
        ))}
      </div>
    );
  }

  return <div className={`${baseClass} h-full w-full ${className}`} />;
};
