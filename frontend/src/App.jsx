import React from 'react';
import { Layers, Users, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-crew-bg flex flex-col justify-between">
      {/* Top Navbar Header */}
      <header className="border-b border-crew-border bg-crew-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-crew-action flex items-center justify-center text-crew-surface font-heading font-bold text-lg shadow-sm">
              C
            </div>
            <span className="font-heading font-bold text-xl text-crew-text-primary tracking-tight">
              Crewboard
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-crew-sand/20 text-crew-warning font-medium ml-2">
              Foundation Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/docs/API_CONTRACT.md"
              className="text-sm font-medium text-crew-text-secondary hover:text-crew-text-primary transition-colors"
            >
              API Contract
            </a>
            <div className="h-4 w-px bg-crew-border" />
            <button className="text-sm px-4 py-2 rounded bg-crew-action text-crew-surface hover:bg-crew-action-hover font-medium transition-colors shadow-subtle">
              System Ready
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="bg-crew-surface border border-crew-border rounded-lg p-10 shadow-card">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-crew-bg border border-crew-border text-xs text-crew-text-secondary font-medium mb-6">
            <ShieldCheck className="w-4 h-4 text-crew-action" />
            Warm Editorial Productivity — Project Minor Setup
          </div>

          <h1 className="font-heading text-4xl font-bold text-crew-text-primary tracking-tight mb-4">
            Collaborative Clarity for Student Teams
          </h1>

          <p className="text-crew-text-secondary text-lg leading-relaxed mb-8">
            Crewboard establishes transparent, objective task management and contribution
            tracking. The architecture is locked for parallel implementation across Developer A
            (Frontend) and Developer B (Backend).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-md border border-crew-border bg-crew-bg/50">
              <div className="flex items-center gap-2 text-crew-action font-heading font-semibold text-sm mb-1">
                <Users className="w-4 h-4" />
                Team Isolation
              </div>
              <p className="text-xs text-crew-text-secondary">
                Guaranteed multi-tenant boundaries and unique join codes.
              </p>
            </div>

            <div className="p-4 rounded-md border border-crew-border bg-crew-bg/50">
              <div className="flex items-center gap-2 text-crew-terracotta font-heading font-semibold text-sm mb-1">
                <Layers className="w-4 h-4" />
                Kanban Execution
              </div>
              <p className="text-xs text-crew-text-secondary">
                To Do, In Progress, and Done states with automated activity logs.
              </p>
            </div>

            <div className="p-4 rounded-md border border-crew-border bg-crew-bg/50">
              <div className="flex items-center gap-2 text-crew-warning font-heading font-semibold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Objective Analytics
              </div>
              <p className="text-xs text-crew-text-secondary">
                Real-time workload distribution and imbalance warnings.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-crew-border text-xs text-crew-text-secondary">
            <span>Stack: React 18 · FastAPI · PostgreSQL 16 · Tailwind CSS</span>
            <span className="font-medium text-crew-action">Ready for Phase 2 Implementation</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-crew-border bg-crew-surface/40 py-6 text-center text-xs text-crew-text-secondary">
        Crewboard — Senior Architectural Foundation
      </footer>
    </div>
  );
}

