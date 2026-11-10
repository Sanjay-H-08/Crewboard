import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Mail, Lock, User, ShieldCheck } from 'lucide-react';

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Keep mode in sync if prop changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setFieldErrors({});
  }, [initialMode]);

  function validate() {
    const errors = {};
    if (mode === 'register') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        errors.fullName = 'Full name must be at least 2 characters.';
      }
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid academic email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (mode === 'register') {
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters.';
      } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        errors.password = 'Password must contain at least 1 letter and 1 number.';
      }

      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(fullName.trim(), email.trim(), password);
      }
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-crew-bg flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-md bg-crew-action flex items-center justify-center text-crew-surface font-heading font-bold text-xl shadow-subtle">
            C
          </div>
          <span className="font-heading font-bold text-2xl text-crew-text-primary tracking-tight">
            Crewboard
          </span>
        </div>
        <p className="text-sm text-crew-text-secondary max-w-sm font-medium">
          Collaborative clarity, transparent ownership, and objective workload analytics for student teams.
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-crew-surface border border-crew-border rounded-lg shadow-card p-8">
        {/* Mode Toggle Switch */}
        <div className="flex border-b border-crew-border mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setFieldErrors({});
            }}
            className={`flex-1 pb-3 text-sm font-heading font-semibold text-center transition-colors relative ${
              mode === 'login'
                ? 'text-crew-action'
                : 'text-crew-text-secondary hover:text-crew-text-primary'
            }`}
          >
            Sign In
            {mode === 'login' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-crew-action rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setFieldErrors({});
            }}
            className={`flex-1 pb-3 text-sm font-heading font-semibold text-center transition-colors relative ${
              mode === 'register'
                ? 'text-crew-action'
                : 'text-crew-text-secondary hover:text-crew-text-primary'
            }`}
          >
            Create Account
            {mode === 'register' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-crew-action rounded-full" />
            )}
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Input
              id="full-name"
              label="Full Name"
              placeholder="e.g. Marcus Vance"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={User}
              error={fieldErrors.fullName}
              required
              autoFocus={mode === 'register'}
            />
          )}

          <Input
            id="auth-email"
            label="Academic Email"
            type="email"
            placeholder="e.g. marcus.vance@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            error={fieldErrors.email}
            required
            autoFocus={mode === 'login'}
          />

          <Input
            id="auth-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={Lock}
            error={fieldErrors.password}
            helperText={
              mode === 'register'
                ? 'Minimum 8 characters with at least 1 letter and 1 number.'
                : undefined
            }
            required
          />

          {mode === 'register' && (
            <Input
              id="auth-confirm-password"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              error={fieldErrors.confirmPassword}
              required
            />
          )}

          <div className="pt-2">
            <Button
              type="submit"
              loading={loading}
              className="w-full py-2.5 text-sm font-semibold"
            >
              {mode === 'login' ? 'Sign In to Crewboard' : 'Create Account & Sign In'}
            </Button>
          </div>
        </form>

        {/* Switch hint */}
        <div className="mt-6 pt-5 border-t border-crew-border text-center text-xs text-crew-text-secondary">
          {mode === 'login' ? (
            <span>
              Don’t have a project account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setFieldErrors({});
                }}
                className="font-semibold text-crew-action hover:underline focus:outline-none"
              >
                Register here
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setFieldErrors({});
                }}
                className="font-semibold text-crew-action hover:underline focus:outline-none"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Trust & Spec Badge */}
      <div className="mt-8 flex items-center gap-2 text-xs text-crew-text-secondary">
        <ShieldCheck className="w-4 h-4 text-crew-action" />
        <span>Strict Multi-Tenant Isolation & Argon2 Security</span>
      </div>
    </div>
  );
}
