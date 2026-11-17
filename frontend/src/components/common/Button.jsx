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
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs h-8 px-2.5 rounded-lg gap-1.5',
    md: 'text-xs sm:text-sm h-9 px-3.5 rounded-xl gap-2',
    lg: 'text-sm h-10 px-4.5 rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-semibold focus:ring-gray-900/20 shadow-sm',
    secondary:
      'bg-crew-bg text-crew-text-primary hover:bg-crew-selected border border-crew-border focus:ring-crew-border/40',
    outline:
      'bg-crew-surface text-crew-text-primary border border-crew-border hover:bg-crew-bg focus:ring-crew-border/40 shadow-subtle',
    ghost:
      'bg-transparent text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5 focus:ring-crew-border/30',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500/40 shadow-subtle',
    terracotta:
      'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500/40 shadow-subtle',
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
