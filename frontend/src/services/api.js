import axios from 'axios';

// Default to Vite proxy (/api) if VITE_API_URL is not explicitly specified,
// or use full URL if set.
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT bearer token
api.interceptors.request.use(
  (config) => {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('crewboard_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle unauthenticated 401 redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('crewboard_token');
        localStorage.removeItem('crewboard_user');
      }
      // Redirect to login if not already on an auth route
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Format API error into a user-friendly string
 */
export function formatApiError(error, defaultMsg = 'An unexpected error occurred.') {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(detail);
  }
  if (error?.message) {
    if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the backend server. Please verify the service is running.';
    }
    return error.message;
  }
  return defaultMsg;
}

// -------------------------------------------------------------
// Domain Service Methods mapping strictly to docs/API_CONTRACT.md
// -------------------------------------------------------------

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data),
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data),
  getMe: () => api.get('/auth/me').then((res) => res.data),
};

export const teamsService = {
  list: () => api.get('/teams').then((res) => res.data),
  get: (teamId) => api.get(`/teams/${teamId}`).then((res) => res.data),
  create: (payload) => api.post('/teams', payload).then((res) => res.data),
  join: (joinCode) => api.post('/teams/join', { join_code: joinCode }).then((res) => res.data),
  getActivity: (teamId, params = {}) => api.get(`/teams/${teamId}/activity`, { params }).then((res) => res.data),
};

export const projectsService = {
  list: (teamId) => {
    const params = teamId ? { team_id: teamId } : {};
    return api.get('/projects', { params }).then((res) => res.data);
  },
  get: (projectId) => api.get(`/projects/${projectId}`).then((res) => res.data),
  create: (payload) => api.post('/projects', payload).then((res) => res.data),
  getAnalytics: (projectId) => api.get(`/projects/${projectId}/analytics`).then((res) => res.data),
};

export const tasksService = {
  listByProject: (projectId, params = {}) => {
    // Clean out empty/all filter params
    const cleanParams = {};
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.priority && params.priority !== 'all') cleanParams.priority = params.priority;
    if (params.assigned_to && params.assigned_to !== 'all') cleanParams.assigned_to = params.assigned_to;
    return api.get(`/projects/${projectId}/tasks`, { params: cleanParams }).then((res) => res.data);
  },
  create: (payload) => api.post('/tasks', payload).then((res) => res.data),
  update: (taskId, payload) => api.patch(`/tasks/${taskId}`, payload).then((res) => res.data),
};

export default api;
