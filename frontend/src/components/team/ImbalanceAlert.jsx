import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function ImbalanceAlert({ warnings = [] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-crew-warning/10 border border-crew-warning/30 rounded-lg p-5 shadow-subtle space-y-3">
      <div className="flex items-center gap-2 text-crew-warning font-heading font-bold text-sm tracking-tight">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span>Workload Imbalance & Risk Detection</span>
      </div>

      <p className="text-xs text-crew-warning leading-relaxed font-medium">
        Crewboard analyzes real task assignments and completion states to protect teams against
        free-riding and burnout. The following risk indicators have been flagged:
      </p>

      <ul className="space-y-1.5 pl-1">
        {warnings.map((warning, idx) => (
          <li
            key={idx}
            className="text-xs text-crew-text-primary flex items-start gap-2 bg-crew-surface/70 rounded p-2 border border-crew-warning/20 font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-crew-warning mt-1.5 flex-shrink-0" />
            <span>{warning}</span>
          </li>
        ))}
      </ul>

      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-crew-warning/80">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Tip: Rebalance tasks by reassigning active items from the project Kanban board.</span>
      </div>
    </div>
  );
}
