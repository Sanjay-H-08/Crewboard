import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getInitials } from '../../utils/formatters';
import {
  ChevronDown,
  Plus,
  KeyRound,
  LogOut,
  Users,
  LayoutDashboard,
  Check,
  FolderKanban,
} from 'lucide-react';

export default function Navbar({ onOpenCreateTeam, onOpenJoinTeam, onOpenCreateProject }) {
  const { user, logout } = useAuth();
  const { teams, activeTeam, activeTeamId, selectTeam } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();

  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const teamDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target)) {
        setTeamDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isDashboard = location.pathname === '/dashboard';
  const isTeamOverview = location.pathname.startsWith('/teams');

  return (
    <header className="border-b border-crew-border bg-crew-surface/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand + Team Switcher */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-crew-action flex items-center justify-center text-crew-surface font-heading font-bold text-base shadow-subtle group-hover:bg-crew-action-hover transition-colors">
              C
            </div>
            <span className="font-heading font-bold text-xl text-crew-text-primary tracking-tight">
              Crewboard
            </span>
          </Link>

          {/* Team Selector Dropdown */}
          <div className="relative" ref={teamDropdownRef}>
            <button
              type="button"
              onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-crew-bg hover:bg-crew-sand/20 border border-crew-border text-crew-text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-crew-action/20"
              aria-expanded={teamDropdownOpen}
              aria-haspopup="true"
            >
              <Users className="w-3.5 h-3.5 text-crew-text-secondary" />
              <span className="max-w-[140px] sm:max-w-[180px] truncate">
                {activeTeam ? activeTeam.name : 'Select Team'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-crew-text-secondary" />
            </button>

            {teamDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-crew-surface rounded-md border border-crew-border shadow-card py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-xs font-semibold text-crew-text-secondary uppercase tracking-wider font-heading border-b border-crew-border/60">
                  Your Teams
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {teams.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-crew-text-secondary italic">
                      No teams joined yet
                    </div>
                  ) : (
                    teams.map((team) => {
                      const isSelected = team.id === activeTeamId;
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            selectTeam(team.id);
                            setTeamDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-crew-bg transition-colors ${
                            isSelected ? 'font-semibold text-crew-action bg-crew-sand/10' : 'text-crew-text-primary'
                          }`}
                        >
                          <span className="truncate">{team.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-crew-action flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1.5 mt-1 border-t border-crew-border/60 px-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTeamDropdownOpen(false);
                      onOpenCreateTeam();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-sm text-xs font-medium text-crew-action hover:bg-crew-sand/20 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Team
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTeamDropdownOpen(false);
                      onOpenJoinTeam();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-sm text-xs font-medium text-crew-text-secondary hover:text-crew-text-primary hover:bg-crew-bg flex items-center gap-2 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Join Team with Code
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isDashboard
                  ? 'text-crew-action bg-crew-action/10 font-semibold'
                  : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-crew-bg'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            {activeTeamId && (
              <Link
                to={`/teams/${activeTeamId}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isTeamOverview
                    ? 'text-crew-action bg-crew-action/10 font-semibold'
                    : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-crew-bg'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                Team & Analytics
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Actions + Profile Menu */}
        <div className="flex items-center gap-3">
          {activeTeamId && (
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-crew-action text-crew-surface hover:bg-crew-action-hover transition-colors shadow-subtle"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 rounded-full md:rounded-md hover:bg-crew-bg border border-transparent hover:border-crew-border transition-colors focus:outline-none focus:ring-2 focus:ring-crew-action/20"
              aria-label="User menu"
              aria-expanded={userDropdownOpen}
            >
              <div className="w-7 h-7 rounded-full bg-crew-action/20 border border-crew-action/30 flex items-center justify-center text-crew-action font-heading font-bold text-xs">
                {getInitials(user?.full_name)}
              </div>
              <span className="hidden md:inline-block text-xs font-medium text-crew-text-primary max-w-[120px] truncate">
                {user?.full_name || 'Account'}
              </span>
              <ChevronDown className="hidden md:block w-3.5 h-3.5 text-crew-text-secondary" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-crew-surface rounded-md border border-crew-border shadow-card py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-crew-border/60">
                  <div className="text-xs font-semibold text-crew-text-primary truncate">
                    {user?.full_name}
                  </div>
                  <div className="text-[11px] text-crew-text-secondary truncate mt-0.5">
                    {user?.email}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-crew-danger hover:bg-crew-danger/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
