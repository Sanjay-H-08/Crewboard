import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { teamsService, formatApiError } from '../services/api';
import { useAuth } from './AuthContext';

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(() => localStorage.getItem('crewboard_active_team_id') || null);
  const [activeTeamDetails, setActiveTeamDetails] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState(null);

  // Fetch user's teams
  const fetchTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setActiveTeamDetails(null);
      return;
    }
    setLoadingTeams(true);
    setTeamError(null);
    try {
      const data = await teamsService.list();
      setTeams(data || []);
      return data;
    } catch (err) {
      const msg = formatApiError(err, 'Failed to load teams.');
      setTeamError(msg);
      return [];
    } finally {
      setLoadingTeams(false);
    }
  }, [isAuthenticated]);

  // Load teams when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams();
    } else {
      setTeams([]);
      setActiveTeamId(null);
      setActiveTeamDetails(null);
    }
  }, [isAuthenticated, fetchTeams]);

  // Determine active team
  useEffect(() => {
    if (!teams.length) {
      setActiveTeamDetails(null);
      return;
    }

    // If activeTeamId is not in teams, select the first one
    const exists = teams.some((t) => t.id === activeTeamId);
    if (!exists) {
      const firstTeam = teams[0];
      setActiveTeamId(firstTeam.id);
      localStorage.setItem('crewboard_active_team_id', firstTeam.id);
    }
  }, [teams, activeTeamId]);

  // Fetch full details of the active team (including members)
  const fetchActiveTeamDetails = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      const details = await teamsService.get(teamId);
      setActiveTeamDetails(details);
    } catch {
      // If failed, fallback to basic team from teams list
      setTeams((prev) => {
        const found = prev.find((t) => t.id === teamId);
        if (found) {
          setActiveTeamDetails({
            ...found,
            members: [],
          });
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    if (activeTeamId) {
      fetchActiveTeamDetails(activeTeamId);
    }
  }, [activeTeamId, fetchActiveTeamDetails]);

  const selectTeam = useCallback((teamId) => {
    setActiveTeamId(teamId);
    localStorage.setItem('crewboard_active_team_id', teamId);
  }, []);

  const createTeam = useCallback(
    async (payload) => {
      setTeamError(null);
      try {
        const newTeam = await teamsService.create(payload);
        await fetchTeams();
        selectTeam(newTeam.id);
        return newTeam;
      } catch (err) {
        const msg = formatApiError(err, 'Failed to create team.');
        setTeamError(msg);
        throw new Error(msg);
      }
    },
    [fetchTeams, selectTeam],
  );

  const joinTeam = useCallback(
    async (joinCode) => {
      setTeamError(null);
      try {
        const joined = await teamsService.join(joinCode.trim().toUpperCase());
        await fetchTeams();
        selectTeam(joined.id);
        return joined;
      } catch (err) {
        const msg = formatApiError(err, 'Failed to join team. Please check the join code.');
        setTeamError(msg);
        throw new Error(msg);
      }
    },
    [fetchTeams, selectTeam],
  );

  const activeTeam = teams.find((t) => t.id === activeTeamId) || activeTeamDetails || null;
  const teamMembers = activeTeamDetails?.members || [];

  const value = {
    teams,
    activeTeam,
    activeTeamId,
    activeTeamDetails,
    teamMembers,
    loadingTeams,
    teamError,
    fetchTeams,
    fetchActiveTeamDetails,
    selectTeam,
    createTeam,
    joinTeam,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
