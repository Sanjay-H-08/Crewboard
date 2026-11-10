import React, { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';

export default function JoinCodeCard({ team }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!team?.join_code) return;
    navigator.clipboard.writeText(team.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-crew-action" />
          <h3 className="font-heading font-bold text-sm text-crew-text-primary tracking-tight">
            Team Join Code
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-crew-warning bg-crew-sand/20 px-2 py-0.5 rounded border border-crew-sand/30">
          6–8 Chars
        </span>
      </div>

      <p className="text-xs text-crew-text-secondary leading-relaxed">
        Share this unique join code with your college group members. When teammates sign up and enter
        this code, they instantly gain access to your team's workspace and projects.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 bg-crew-bg border border-crew-border rounded px-4 py-2.5 font-mono font-bold text-base tracking-widest text-crew-text-primary text-center select-all">
          {team?.join_code || 'CREW-CODE'}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2.5 rounded bg-crew-action text-crew-surface hover:bg-crew-action-hover font-medium text-xs flex items-center gap-1.5 transition-colors shadow-subtle focus:outline-none focus:ring-2 focus:ring-crew-action"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-crew-surface" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
