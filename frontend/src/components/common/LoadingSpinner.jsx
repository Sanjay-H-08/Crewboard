import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  fullScreen = false,
  className = '',
}) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 text-crew-action ${className}`}>
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin`} />
      {message && <p className="text-xs font-medium text-crew-text-secondary">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-crew-bg flex items-center justify-center p-6">
        {content}
      </div>
    );
  }

  return content;
}
