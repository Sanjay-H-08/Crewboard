import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-crew-border rounded-lg bg-crew-surface/40 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-lg bg-crew-sand/20 border border-crew-sand/30 flex items-center justify-center text-crew-action mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="font-heading text-base font-bold text-crew-text-primary tracking-tight mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-crew-text-secondary max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} icon={actionIcon} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
