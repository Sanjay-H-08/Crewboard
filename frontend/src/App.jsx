import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import TeamOverviewPage from './pages/TeamOverviewPage';

export default function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/register" element={<AuthPage initialMode="register" />} />

          {/* Protected Application Routes wrapped in AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
            <Route path="/teams/:teamId" element={<TeamOverviewPage />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TeamProvider>
    </AuthProvider>
  );
}
