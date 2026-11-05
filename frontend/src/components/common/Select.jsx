import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-crew-text-secondary font-heading"
        >
          {label} {required && <span className="text-crew-terracotta">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none bg-crew-surface text-crew-text-primary text-sm rounded border transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action disabled:bg-crew-bg disabled:cursor-not-allowed pl-3.5 pr-9 py-2 ${
            error
              ? 'border-crew-danger focus:border-crew-danger focus:ring-crew-danger/20'
              : 'border-crew-border hover:border-crew-sand'
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 text-crew-text-secondary pointer-events-none flex items-center justify-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-crew-danger font-medium mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-crew-text-secondary mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
