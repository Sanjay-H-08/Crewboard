import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TeamChatDrawer from '../chat/TeamChatDrawer';
import CreateTeamModal from '../modals/CreateTeamModal';
import JoinTeamModal from '../modals/JoinTeamModal';
import CreateProjectModal from '../modals/CreateProjectModal';
import ThemeToggle from '../common/ThemeToggle';
import ErrorBoundary from '../common/ErrorBoundary';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Plus, Menu } from 'lucide-react';

export default function AppLayout() {
  const { isTeacher } = useAuth();
  const { activeTeam, activeTeamId } = useTeam();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);

  function handleProjectCreated() {
    setProjectRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-crew-bg flex text-crew-text-primary antialiased">
      {/* 240px Persistent Dual-Tier Sidebar */}
      <Sidebar
        onOpenCreateTeam={() => setCreateTeamOpen(true)}
        onOpenJoinTeam={() => setJoinTeamOpen(true)}
        onOpenCreateProject={() => setCreateProjectOpen(true)}
        onToggleChat={() => setChatDrawerOpen(!chatDrawerOpen)}
        unreadChatCount={0}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area Container - Framed Island Geometry */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen p-2.5 sm:p-3.5 md:p-4 lg:p-5">
        <div className="flex-1 flex flex-col bg-crew-surface border border-crew-border rounded-2xl lg:rounded-3xl shadow-subtle overflow-hidden min-h-[calc(100vh-2.5rem)]">
          {/* Top Context Header */}
          <header className="h-14 border-b border-crew-border bg-crew-surface px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-lg hover:bg-crew-bg text-crew-text-secondary hover:text-crew-text-primary"
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>

              {activeTeam && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-heading font-bold text-crew-text-primary">
                    {activeTeam.name}
                  </span>
                  <span className="text-crew-border">|</span>
                  <span className="text-crew-text-secondary">
                    {activeTeam.member_count || 1} Member{activeTeam.member_count === 1 ? '' : 's'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <ThemeToggle compact={true} />

              {activeTeamId && (
                <button
                  type="button"
                  onClick={() => setChatDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-crew-bg hover:bg-crew-selected border border-crew-border text-crew-text-primary transition-colors shadow-subtle"
                  title="Open Team Discussion Room"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-crew-text-secondary" />
                  <span className="hidden sm:inline">Team Chat</span>
                </button>
              )}

              {!isTeacher && activeTeamId && (
                <button
                  type="button"
                  onClick={() => setCreateProjectOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Project</span>
                </button>
              )}
            </div>
          </header>

          {/* Content Outlet */}
          <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 overflow-y-auto">
            <ErrorBoundary>
              <Outlet
                context={{
                  openCreateTeam: () => setCreateTeamOpen(true),
                  openJoinTeam: () => setJoinTeamOpen(true),
                  openCreateProject: () => setCreateProjectOpen(true),
                  projectRefreshTrigger,
                }}
              />
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <footer className="border-t border-crew-border bg-crew-surface/60 py-3.5 px-6 text-center text-xs text-crew-text-secondary mt-auto flex-shrink-0">
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-crew-text-secondary font-medium">Crewboard — Academic Collaboration & Deliverables Platform</span>
              <span className="text-[11px] text-crew-text-tertiary font-mono">Flowboard Edition</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Team Chat Drawer (4-Second Delta Polling) */}
      <TeamChatDrawer
        isOpen={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
        teamId={activeTeamId}
        teamName={activeTeam?.name}
      />

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
