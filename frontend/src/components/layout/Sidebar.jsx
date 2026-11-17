import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getInitials } from '../../utils/formatters';
import ThemeToggle from '../common/ThemeToggle';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  MessageSquare,
  GraduationCap,
  LogOut,
  Plus,
  KeyRound,
  ChevronDown,
  Check,
  FolderPlus,
  X,
  Search,
} from 'lucide-react';

export default function Sidebar({
  onOpenCreateTeam,
  onOpenJoinTeam,
  onOpenCreateProject,
  onToggleChat,
  unreadChatCount = 0,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { user, logout, isTeacher } = useAuth();
  const { teams, activeTeam, activeTeamId, selectTeam } = useTeam();
  const navigate = useNavigate();

  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const teamDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target)) {
        setTeamDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Derive active role badge
  let roleBadge = 'Member';
  let roleBadgeColor = 'bg-crew-bg text-crew-text-secondary border-crew-border';
  if (isTeacher) {
    roleBadge = 'Teacher / Supervisor';
    roleBadgeColor = 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/40';
  } else if (activeTeam?.role === 'owner' || activeTeam?.role === 'leader') {
    roleBadge = 'Team Leader';
    roleBadgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40';
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[240px] bg-crew-bg flex flex-col justify-between flex-shrink-0 min-h-screen transition-transform duration-200 ease-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-panel' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3 sm:p-4 space-y-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1">
            <NavLink to="/dashboard" onClick={onCloseMobile} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#181B20] dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-bold text-sm shadow-sm transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="font-heading font-bold text-base text-crew-text-primary tracking-tight leading-none block">
                  Crewboard
                </span>
                <span className="text-[10px] text-crew-text-secondary font-medium tracking-wider uppercase block mt-0.5">
                  Academic Platform
                </span>
              </div>
            </NavLink>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Search Bar (Directly matching Reference Image 1) */}
          <div className="px-1">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-crew-surface border border-crew-border shadow-subtle text-crew-text-secondary hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer group">
              <div className="flex items-center gap-2 text-xs">
                <Search className="w-3.5 h-3.5 text-crew-text-tertiary group-hover:text-crew-text-primary transition-colors" />
                <span className="text-xs text-crew-text-tertiary group-hover:text-crew-text-secondary">Search...</span>
              </div>
              <span className="text-[10px] font-mono text-crew-text-tertiary border border-crew-border/60 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </div>

          {/* User Identity & Role Card */}
          <div className="p-3 rounded-xl bg-crew-surface border border-crew-border shadow-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-crew-bg border border-crew-border text-crew-text-primary font-heading font-bold text-xs flex items-center justify-center flex-shrink-0">
                {getInitials(user?.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-crew-text-primary truncate block">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-crew-text-secondary truncate block">
                  {user?.email}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-crew-border/60 flex items-center justify-between">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${roleBadgeColor}`}
              >
                {roleBadge}
              </span>
              <span className="text-[10px] text-crew-text-secondary font-mono">
                {user?.system_role || 'student'}
              </span>
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1">
            {/* Teacher Navigation */}
            {isTeacher && (
              <NavLink
                to="/teacher"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 font-semibold shadow-sm'
                      : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                  }`
                }
              >
                <GraduationCap className="w-4 h-4" />
                Teacher Portal
              </NavLink>
            )}

            {/* Student & Leader Navigation */}
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 font-semibold shadow-sm'
                    : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>

            <NavLink
              to="/my-tasks"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 font-semibold shadow-sm'
                    : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`
              }
            >
              <CheckSquare className="w-4 h-4" />
              My Deliverables
            </NavLink>

            {activeTeamId && (
              <>
                <NavLink
                  to={`/teams/${activeTeamId}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 font-semibold shadow-sm'
                        : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                    }`
                  }
                >
                  <Users className="w-4 h-4" />
                  Team Overview & Roster
                </NavLink>

                <button
                  type="button"
                  onClick={onToggleChat}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Team Chat</span>
                  </div>
                  {unreadChatCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </nav>

          {/* Team / Workspace Dropdown Section */}
          {!isTeacher && (
            <div className="pt-2" ref={teamDropdownRef}>
              <div className="text-[10px] font-semibold text-crew-text-secondary uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                <span>Workspace</span>
                <button
                  type="button"
                  onClick={onOpenCreateTeam}
                  className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-secondary hover:text-crew-text-primary"
                  title="Create Team"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border border-crew-border bg-crew-surface hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-primary font-medium transition-colors shadow-subtle"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Users className="w-3.5 h-3.5 text-crew-text-secondary flex-shrink-0" />
                    <span className="truncate">
                      {activeTeam ? activeTeam.name : 'Select Team...'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-crew-text-secondary flex-shrink-0" />
                </button>

                {teamDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-crew-surface rounded-xl border border-crew-border shadow-modal py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-semibold text-crew-text-secondary uppercase tracking-wider border-b border-crew-border/60">
                      Your Teams
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {teams.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-crew-text-secondary italic">
                          No teams joined yet
                        </div>
                      ) : (
                        teams.map((t) => {
                          const isSelected = t.id === activeTeamId;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                selectTeam(t.id);
                                setTeamDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-crew-bg transition-colors ${
                                isSelected
                                  ? 'font-semibold text-crew-text-primary bg-black/5 dark:bg-white/5'
                                  : 'text-crew-text-secondary hover:text-crew-text-primary'
                              }`}
                            >
                              <span className="truncate">{t.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-crew-text-primary flex-shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="pt-1 mt-1 border-t border-crew-border/60 px-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTeamDropdownOpen(false);
                          onOpenCreateTeam();
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-crew-bg text-crew-text-primary font-medium flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Team
                      </button>
                      {onOpenCreateProject && activeTeamId && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeamDropdownOpen(false);
                            onOpenCreateProject();
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-crew-bg text-crew-text-primary font-medium flex items-center gap-2"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          New Project Deliverable
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setTeamDropdownOpen(false);
                          onOpenJoinTeam();
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-crew-bg text-crew-text-secondary hover:text-crew-text-primary flex items-center gap-2"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-crew-text-tertiary" />
                        Join with Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer, Appearance Selector & Logout */}
        <div className="p-3 sm:p-4 space-y-3">
          <div className="p-2 rounded-xl bg-crew-surface border border-crew-border shadow-subtle">
            <div className="text-[10px] font-semibold text-crew-text-secondary uppercase tracking-wider mb-1 px-1">
              Appearance
            </div>
            <ThemeToggle compact={false} />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-crew-text-secondary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
