import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-amber-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-crew-text-tertiary pointer-events-none flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full bg-crew-surface text-crew-text-primary text-xs sm:text-sm rounded-xl border transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-gray-400 dark:focus:border-gray-500 disabled:bg-crew-bg disabled:text-crew-text-secondary disabled:cursor-not-allowed shadow-subtle ${
            Icon ? 'pl-9' : 'pl-3.5'
          } ${isPassword ? 'pr-10' : 'pr-3.5'} py-2 h-9 sm:h-9.5 ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-crew-border hover:border-gray-300 dark:hover:border-gray-600'
          }`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-crew-text-tertiary hover:text-crew-text-primary focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-crew-text-secondary">{helperText}</p>
      ) : null}
    </div>
  );
}
