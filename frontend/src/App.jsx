import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import TeamOverviewPage from './pages/TeamOverviewPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import MyTasksPage from './pages/MyTasksPage';

function TeacherRoute({ children }) {
  const { isTeacher } = useAuth();
  if (!isTeacher) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TeamProvider>
            <NotificationProvider>
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
                  <Route
                    path="/teacher"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage />
                      </TeacherRoute>
                    }
                  />
                  <Route path="/my-tasks" element={<MyTasksPage />} />
                  <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
                  <Route path="/teams/:teamId" element={<TeamOverviewPage />} />
                </Route>

                {/* Fallback Catch-all Route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </NotificationProvider>
          </TeamProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
