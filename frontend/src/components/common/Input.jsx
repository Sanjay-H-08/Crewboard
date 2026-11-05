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
          className="text-xs font-semibold uppercase tracking-wider text-crew-text-secondary font-heading flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-crew-terracotta">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-crew-text-secondary/70 pointer-events-none flex items-center justify-center">
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
          className={`w-full bg-crew-surface text-crew-text-primary text-sm rounded border transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action disabled:bg-crew-bg disabled:text-crew-text-secondary disabled:cursor-not-allowed ${
            Icon ? 'pl-9' : 'pl-3.5'
          } ${isPassword ? 'pr-10' : 'pr-3.5'} py-2 ${
            error
              ? 'border-crew-danger focus:border-crew-danger focus:ring-crew-danger/20'
              : 'border-crew-border hover:border-crew-sand'
          }`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-crew-text-secondary hover:text-crew-text-primary transition-colors p-0.5 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-crew-danger font-medium mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-crew-text-secondary mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
