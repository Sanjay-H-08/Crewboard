import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  if (compact) {
    return (
      <div className="flex items-center p-0.5 rounded-lg bg-crew-bg border border-crew-border">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              title={`Switch to ${opt.label} appearance`}
              className={`p-1.5 rounded-md transition-all duration-150 ${
                isActive
                  ? 'bg-crew-surface text-crew-text-primary shadow-subtle font-semibold border border-crew-border/60'
                  : 'text-crew-text-tertiary hover:text-crew-text-primary'
              }`}
              aria-label={`${opt.label} theme`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between p-0.5 rounded-lg bg-crew-bg border border-crew-border">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium rounded-md transition-all duration-150 ${
              isActive
                ? 'bg-crew-surface text-crew-text-primary font-semibold shadow-subtle border border-crew-border/60'
                : 'text-crew-text-secondary hover:text-crew-text-primary'
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
