import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import MyTasksPage from './pages/MyTasksPage';
import KanbanPage from './pages/KanbanPage';
import TeamsPage from './pages/TeamsPage';
import TeamOverviewPage from './pages/TeamOverviewPage';
import SubmissionsPage from './pages/SubmissionsPage';
import FeedbackPage from './pages/FeedbackPage';
import AchievementsPage from './pages/AchievementsPage';
import ProgressPage from './pages/ProgressPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';

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
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
                  <Route path="/my-tasks" element={<MyTasksPage />} />
                  <Route path="/kanban" element={<KanbanPage />} />
                  <Route path="/teams" element={<TeamsPage />} />
                  <Route path="/teams/:teamId" element={<TeamOverviewPage />} />
                  <Route path="/submissions" element={<SubmissionsPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/achievements" element={<AchievementsPage />} />
                  <Route path="/progress" element={<ProgressPage />} />

                  {/* Teacher Supervision Routes */}
                  <Route
                    path="/teacher"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="overview" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/projects"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="projects" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/teams"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="teams" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/contributions"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="contributions" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/assessments"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="assessments" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/submissions"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="submissions" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/analytics"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="analytics" />
                      </TeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher/reports"
                    element={
                      <TeacherRoute>
                        <TeacherDashboardPage initialView="reports" />
                      </TeacherRoute>
                    }
                  />
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
