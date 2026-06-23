import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useViolations } from '../context/ViolationContext.jsx';

export default function Login() {
  const { state, actions } = useViolations();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (state.user && state.token) navigate('/admin');
  }, [state.user, state.token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    setAuthError(null);
    try {
      await actions.login(username, password);
      navigate('/admin');
    } catch (err) {
      setAuthError(err.message || 'Incorrect username or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.025) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-glow-pulse"
        style={{
          width: 700,
          height: 500,
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div
        className="w-full max-w-md relative z-10"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'rgba(37,99,235,0.10)',
              border: '1px solid rgba(37,99,235,0.25)',
              boxShadow: '0 0 30px rgba(37,99,235,0.15)',
            }}
          >
            <Shield size={26} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-sans" style={{ color: 'hsl(40,6%,95%)' }}>
            TrafficVision AI
          </h1>
          <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Smart Traffic Enforcement Command Portal
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(12,10,26,0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
          }}
        >
          <h2 className="text-base font-bold mb-6 font-sans" style={{ color: 'hsl(40,6%,95%)' }}>
            Operator Authorization
          </h2>

          {authError && (
            <div
              className="mb-5 p-3.5 rounded-xl flex gap-2.5 text-xs items-start"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}
            >
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Username
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text"
                  required
                  placeholder="Enter operator username"
                  className="input pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  id="tvai-username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Operator Key
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Enter security key"
                  className="input pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="tvai-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                className="w-3.5 h-3.5 rounded accent-blue-600"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="text-xs cursor-pointer select-none" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Remember access token
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-xl mt-5 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg,#2563EB,#1d4ed8)',
                boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              }}
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" />Verifying Session...</>
              ) : (
                'Authorize Access'
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-2xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Authorized personnel only. Sessions are logged under administrative security protocols.
            </p>
            <p className="text-2xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
              Default: <span className="font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>admin / admin123</span>
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-5">
          <Link to="/" className="text-xs transition" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
