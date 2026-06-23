import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Radio, FileText, BarChart2, Settings, Menu, X,
  ChevronRight, Search, LogOut, User, Award, Zap
} from 'lucide-react';
import { useViolations } from '../../context/ViolationContext.jsx';

// ── Logo mark ──────────────────────────────────────────────────────────────
function TVLogo() {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="#2563EB" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M20 8L30 20L20 32L10 20L20 8Z" fill="url(#navLogoGrad2)" opacity="0.9" />
        <circle cx="20" cy="20" r="4" fill="white" opacity="0.95" />
        <circle cx="20" cy="20" r="2" fill="#1D4ED8" />
        <defs>
          <linearGradient id="navLogoGrad2" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <span className="font-bold text-sm tracking-tight" style={{ color: 'hsl(40,6%,95%)' }}>TrafficVision AI</span>
        <div className="text-[8px] text-blue-400 font-semibold tracking-widest uppercase leading-none mt-0.5">
          Traffic Intelligence Platform
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { state, actions } = useViolations();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { path: '/',            label: 'Home',           icon: Shield,   public: true },
    { path: '/detection',   label: 'Upload & Detect', icon: Radio },
    { path: '/evidence',    label: 'Evidence',        icon: FileText },
    { path: '/search',      label: 'Plate Search',    icon: Search },
    { path: '/analytics',   label: 'Analytics',       icon: BarChart2 },
    { path: '/performance', label: 'Accuracy',        icon: Award },
    { path: '/admin',       label: 'Command',         icon: Settings },
  ];

  const visibleItems = navItems.filter(item => item.public || state.user);

  return (
    <>
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(5,2,9,0.92)' : 'rgba(5,2,9,0.80)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <TVLogo />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {visibleItems.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-150"
                    style={{
                      color: active ? '#60A5FA' : 'rgba(255,255,255,0.45)',
                      background: active ? 'rgba(37,99,235,0.10)' : 'transparent',
                      border: active ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                    }}
                  >
                    <Icon size={11} />
                    {item.label}
                    {active && <span className="w-1 h-1 rounded-full bg-blue-400 ml-0.5" />}
                  </Link>
                );
              })}
            </div>

            {/* Right side auth */}
            <div className="hidden md:flex items-center gap-3">
              {state.user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)' }}>
                      <User size={11} className="text-blue-400" />
                    </div>
                    {state.user.name}
                  </Link>
                  <button
                    onClick={() => actions.logout()}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: 'rgba(239,68,68,0.75)', border: '1px solid transparent' }}
                  >
                    <LogOut size={12} /> Exit
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#1d4ed8)', boxShadow: '0 2px 12px rgba(37,99,235,0.35)' }}
                >
                  <Zap size={11} /> Login
                  <ChevronRight size={11} />
                </Link>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg transition"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden border-t px-4 pb-5 pt-3 space-y-1"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(5,2,9,0.97)' }}
          >
            {visibleItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase transition-all"
                  style={{
                    color: active ? '#60A5FA' : 'rgba(255,255,255,0.5)',
                    background: active ? 'rgba(37,99,235,0.10)' : 'transparent',
                    border: active ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                  }}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 border-t mt-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              {state.user ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs px-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Logged in as <span className="text-white/70 font-semibold">{state.user.name}</span>
                  </span>
                  <button
                    onClick={() => { setMobileOpen(false); actions.logout(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"
                    style={{ color: 'rgba(239,68,68,0.7)' }}
                  >
                    <LogOut size={13} /> Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center text-white font-bold text-xs py-2.5 rounded-xl mt-1 transition"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#1d4ed8)' }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
