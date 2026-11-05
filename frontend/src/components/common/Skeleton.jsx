import React from 'react';

export function Skeleton({ className = '', variant = 'rect' }) {
  const variantClasses = {
    circle: 'rounded-full',
    rect: 'rounded',
    text: 'rounded-sm h-4 my-1',
  };

  return (
    <div
      className={`animate-pulse bg-crew-border/60 ${variantClasses[variant] || 'rounded'} ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-crew-surface border border-crew-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}
