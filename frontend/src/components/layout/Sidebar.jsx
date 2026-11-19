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
  FolderGit2,
  Kanban,
  FileText,
  Award,
  Sparkles,
  TrendingUp,
  Layers,
  BarChart3,
  Printer,
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
  let roleBadgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  if (isTeacher) {
    roleBadge = 'Teacher / Supervisor';
    roleBadgeColor = 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40';
  } else if (activeTeam?.role === 'owner' || activeTeam?.role === 'leader') {
    roleBadge = 'Team Leader';
    roleBadgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40';
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
      isActive
        ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 font-semibold shadow-xs'
        : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5'
    }`;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-[268px] bg-white dark:bg-[#11141A] border-r border-crew-border/90 flex flex-col justify-between flex-shrink-0 h-screen transition-transform duration-200 ease-out md:translate-x-0 overflow-hidden ${
          mobileOpen ? 'translate-x-0 shadow-panel' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Tier 1: Fixed Brand Header & Search */}
        <div className="p-4 border-b border-crew-border/70 flex-shrink-0 space-y-3.5 bg-white dark:bg-[#11141A]">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-0.5">
            <NavLink to={isTeacher ? '/teacher' : '/dashboard'} onClick={onCloseMobile} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-white dark:to-slate-100 flex items-center justify-center text-white dark:text-gray-900 font-bold text-sm shadow-xs flex-shrink-0">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="font-heading font-extrabold text-base text-crew-text-primary tracking-tight leading-none block">
                  Crewboard
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase block mt-1">
                  Academic Platform
                </span>
              </div>
            </NavLink>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-secondary"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Search Bar */}
          <div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-crew-border/90 shadow-subtle text-crew-text-secondary hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer group">
              <div className="flex items-center gap-2.5 text-xs">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-crew-text-primary transition-colors flex-shrink-0" />
                <span className="text-xs text-slate-400 group-hover:text-crew-text-secondary">Search workspace...</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 border border-crew-border/80 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </div>
        </div>

        {/* Tier 2: Independent Scrollable Middle Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 min-h-0 scrollbar-thin">
          {/* User Identity Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/60 dark:to-[#14171E] border border-crew-border/90 shadow-subtle space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                {getInitials(user?.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-crew-text-primary truncate block leading-tight">
                  {user?.full_name}
                </span>
                <span className="text-[10px] text-crew-text-tertiary truncate block font-mono">
                  {user?.email}
                </span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-crew-border/60 flex items-center justify-between">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${roleBadgeColor}`}
              >
                {roleBadge}
              </span>
              <span className="text-[10px] text-crew-text-tertiary font-mono capitalize">
                {user?.system_role || 'student'}
              </span>
            </div>
          </div>

          {/* =============================================================== */}
          {/* TEACHER NAVIGATION                                              */}
          {/* =============================================================== */}
          {isTeacher ? (
            <div className="space-y-4">
              {/* Group 1: Teaching Overview */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-crew-text-tertiary px-3 mb-1">
                  Teaching Overview
                </div>
                <NavLink to="/teacher" end className={navLinkClass}>
                  <GraduationCap className="w-[18px] h-[18px] flex-shrink-0 text-purple-500" />
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/teacher/projects" className={navLinkClass}>
                  <Layers className="w-[18px] h-[18px] flex-shrink-0 text-blue-500" />
                  <span>Assigned Projects</span>
                </NavLink>
                <NavLink to="/teacher/teams" className={navLinkClass}>
                  <Users className="w-[18px] h-[18px] flex-shrink-0 text-amber-500" />
                  <span>Teams & Students</span>
                </NavLink>
              </div>

              {/* Group 2: Assessment */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-crew-text-tertiary px-3 mb-1">
                  Assessment
                </div>
                <NavLink to="/teacher/contributions" className={navLinkClass}>
                  <Award className="w-[18px] h-[18px] flex-shrink-0 text-emerald-500" />
                  <span>Student Contributions</span>
                </NavLink>
                <NavLink to="/teacher/submissions" className={navLinkClass}>
                  <FileText className="w-[18px] h-[18px] flex-shrink-0 text-purple-500" />
                  <span>Submissions & Files</span>
                </NavLink>
                <NavLink to="/teacher/assessments" className={navLinkClass}>
                  <CheckSquare className="w-[18px] h-[18px] flex-shrink-0 text-teal-500" />
                  <span>Rubric Scoring</span>
                </NavLink>
              </div>

              {/* Group 3: Analytics & Reports */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-crew-text-tertiary px-3 mb-1">
                  Analytics & Reports
                </div>
                <NavLink to="/teacher/analytics" className={navLinkClass}>
                  <BarChart3 className="w-[18px] h-[18px] flex-shrink-0 text-indigo-500" />
                  <span>Class & Team Charts</span>
                </NavLink>
                <NavLink to="/teacher/reports" className={navLinkClass}>
                  <Printer className="w-[18px] h-[18px] flex-shrink-0 text-slate-500" />
                  <span>Academic Reports</span>
                </NavLink>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* STUDENT NAVIGATION                                              */
            /* =============================================================== */
            <div className="space-y-4">
              {/* Group 1: Workspace */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-crew-text-tertiary px-3 mb-1">
                  Workspace
                </div>
                <NavLink to="/dashboard" end className={navLinkClass}>
                  <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0 text-indigo-500" />
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/projects" className={navLinkClass}>
                  <FolderGit2 className="w-[18px] h-[18px] flex-shrink-0 text-blue-500" />
                  <span>My Projects</span>
                </NavLink>
                <NavLink to="/my-tasks" className={navLinkClass}>
                  <CheckSquare className="w-[18px] h-[18px] flex-shrink-0 text-teal-500" />
                  <span>My Deliverables</span>
                </NavLink>
                <NavLink to="/kanban" className={navLinkClass}>
                  <Kanban className="w-[18px] h-[18px] flex-shrink-0 text-purple-500" />
                  <span>Kanban Board</span>
                </NavLink>
                <NavLink to="/teams" className={navLinkClass}>
                  <Users className="w-[18px] h-[18px] flex-shrink-0 text-amber-500" />
                  <span>Team Workspace</span>
                </NavLink>
                {activeTeamId && (
                  <button
                    type="button"
                    onClick={onToggleChat}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-[18px] h-[18px] flex-shrink-0 text-sky-500" />
                      <span>Team Chat</span>
                    </div>
                    {unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Group 2: My Learning */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-crew-text-tertiary px-3 mb-1">
                  My Learning
                </div>
                <NavLink to="/submissions" className={navLinkClass}>
                  <FileText className="w-[18px] h-[18px] flex-shrink-0 text-purple-500" />
                  <span>Learning Journal</span>
                </NavLink>
                <NavLink to="/feedback" className={navLinkClass}>
                  <Award className="w-[18px] h-[18px] flex-shrink-0 text-emerald-500" />
                  <span>Feedback & Rubrics</span>
                </NavLink>
                <NavLink to="/achievements" className={navLinkClass}>
                  <Sparkles className="w-[18px] h-[18px] flex-shrink-0 text-amber-500" />
                  <span>Achievements</span>
                </NavLink>
                <NavLink to="/progress" className={navLinkClass}>
                  <TrendingUp className="w-[18px] h-[18px] flex-shrink-0 text-indigo-500" />
                  <span>My Progress</span>
                </NavLink>
              </div>

              {/* Group 3: Workspace & Team Select */}
              <div className="pt-2 border-t border-crew-border/60" ref={teamDropdownRef}>
                <div className="text-[10px] font-bold text-crew-text-tertiary uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                  <span>Active Group</span>
                  <button
                    type="button"
                    onClick={onOpenCreateTeam}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-crew-text-primary"
                    title="Create Team"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border border-crew-border bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-crew-text-primary font-medium transition-colors shadow-subtle"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="truncate">
                        {activeTeam ? activeTeam.name : 'Select Team...'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  </button>

                  {teamDropdownOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-white dark:bg-[#1A1F29] rounded-xl border border-crew-border shadow-modal py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1 text-[10px] font-bold text-crew-text-tertiary uppercase tracking-wider border-b border-crew-border/60">
                        Your Teams
                      </div>
                      <div className="max-h-40 overflow-y-auto py-1">
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
                                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                  isSelected
                                    ? 'font-bold text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
                                    : 'text-crew-text-secondary hover:text-crew-text-primary'
                                }`}
                              >
                                <span className="truncate">{t.name}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
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
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-crew-text-primary font-medium flex items-center gap-2"
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
                            className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-crew-text-primary font-medium flex items-center gap-2"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            New Project Topic
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setTeamDropdownOpen(false);
                            onOpenJoinTeam();
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-crew-text-secondary hover:text-crew-text-primary flex items-center gap-2"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          Join with Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tier 3: Fixed Footer & Logout */}
        <div className="p-3.5 border-t border-crew-border/70 flex-shrink-0 mt-auto bg-white dark:bg-[#11141A] space-y-2.5">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-crew-border shadow-subtle">
            <div className="text-[10px] font-bold text-crew-text-tertiary uppercase tracking-wider mb-1 px-1">
              Appearance
            </div>
            <ThemeToggle compact={false} />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
