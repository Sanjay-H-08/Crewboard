import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CreateTeamModal from '../modals/CreateTeamModal';
import JoinTeamModal from '../modals/JoinTeamModal';
import CreateProjectModal from '../modals/CreateProjectModal';

export default function AppLayout() {
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);

  function handleProjectCreated() {
    setProjectRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-crew-bg flex flex-col text-crew-text-primary">
      <Navbar
        onOpenCreateTeam={() => setCreateTeamOpen(true)}
        onOpenJoinTeam={() => setJoinTeamOpen(true)}
        onOpenCreateProject={() => setCreateProjectOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Outlet
          context={{
            openCreateTeam: () => setCreateTeamOpen(true),
            openJoinTeam: () => setJoinTeamOpen(true),
            openCreateProject: () => setCreateProjectOpen(true),
            projectRefreshTrigger,
          }}
        />
      </main>

      <footer className="border-t border-crew-border bg-crew-surface/60 py-5 text-center text-xs text-crew-text-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Crewboard — Student Project Management & Contribution Tracking</span>
          <span className="text-[11px] text-crew-text-secondary/80">Warm Editorial Productivity</span>
        </div>
      </footer>

      {/* Global Modals */}
      <CreateTeamModal
        isOpen={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
      />

      <JoinTeamModal
        isOpen={joinTeamOpen}
        onClose={() => setJoinTeamOpen(false)}
      />

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
