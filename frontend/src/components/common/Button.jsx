import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 rounded-sm gap-1.5 focus:ring-offset-1',
    md: 'text-sm px-4 py-2 rounded gap-2',
    lg: 'text-base px-5 py-2.5 rounded-md gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-crew-action text-crew-surface hover:bg-crew-action-hover focus:ring-crew-action shadow-subtle',
    secondary:
      'bg-crew-sand/20 text-crew-text-primary hover:bg-crew-sand/30 border border-crew-sand/30 focus:ring-crew-sand',
    outline:
      'bg-crew-surface text-crew-text-primary border border-crew-border hover:bg-crew-bg hover:border-crew-sand focus:ring-crew-action shadow-subtle',
    ghost:
      'bg-transparent text-crew-text-secondary hover:text-crew-text-primary hover:bg-crew-bg focus:ring-crew-border',
    danger:
      'bg-crew-danger text-crew-surface hover:bg-crew-danger/90 focus:ring-crew-danger shadow-subtle',
    terracotta:
      'bg-crew-terracotta text-crew-surface hover:bg-crew-terracotta/90 focus:ring-crew-terracotta shadow-subtle',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${
        variantClasses[variant] || variantClasses.primary
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
