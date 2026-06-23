import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightCircle, Camera, ScanLine, ShieldCheck, BarChart3,
  Menu, X, Car, FileSearch, Activity, Shield, Cpu, AlertTriangle,
  FileText, BarChart2, CheckCircle, Eye, ChevronRight, Zap,
  Video, Radio, Search, ArrowRight, Play, TrendingUp, Layers,
  Database, Server, Wifi, Globe, Award, Users, Clock, MapPin,
  RefreshCw, ChevronDown, ExternalLink
} from 'lucide-react';
import { useViolations } from '../context/ViolationContext.jsx';

// ─── TVLogo ─────────────────────────────────────────────────────────────────
function TVLogo({ size = 32, textSize = 'text-sm' }) {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="#2563EB" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M20 8L30 20L20 32L10 20L20 8Z" fill="url(#logoGradLanding)" opacity="0.9" />
        <circle cx="20" cy="20" r="4" fill="white" opacity="0.95" />
        <circle cx="20" cy="20" r="2" fill="#1D4ED8" />
        <path d="M4 11L10 14" stroke="#60A5FA" strokeWidth="1" opacity="0.6" />
        <path d="M36 11L30 14" stroke="#60A5FA" strokeWidth="1" opacity="0.6" />
        <path d="M4 29L10 26" stroke="#60A5FA" strokeWidth="1" opacity="0.6" />
        <path d="M36 29L30 26" stroke="#60A5FA" strokeWidth="1" opacity="0.6" />
        <defs>
          <linearGradient id="logoGradLanding" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <div className={`font-bold text-white tracking-tight leading-none ${textSize}`} style={{ fontFamily: 'var(--font-body)' }}>
          TrafficVision AI
        </div>
        <div className="text-[9px] text-blue-400 font-semibold tracking-widest uppercase leading-none mt-0.5">
          Traffic Intelligence Platform
        </div>
      </div>
    </div>
  );
}

// ─── Hero Navbar ─────────────────────────────────────────────────────────────
function HeroNavbar({ onNavClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { state } = useViolations();
  const dashboardPath = state.user ? '/admin' : '/login';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Home' },
    { label: 'Features' },
    { label: 'Technology' },
    { label: 'Analytics' },
    { label: 'Solutions' },
    { label: 'Documentation' },
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(5,2,9,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo */}
          <TVLogo />

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => onNavClick(link.label)}
                className="px-4 py-2 text-sm font-medium text-white/65 hover:text-white rounded-lg
                           transition-all duration-200 hover:bg-white/6 tracking-wide"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to={dashboardPath}
              className="px-5 py-2 rounded-full text-sm font-semibold text-white/80 hover:text-white
                         border border-white/15 hover:border-white/25 transition-all duration-200
                         hover:bg-white/5"
            >
              {state.user ? 'Command Center' : 'Sign In'}
            </Link>
            <Link
              to={dashboardPath}
              className="px-5 py-2 rounded-full text-sm font-bold text-white transition-all duration-200
                         hover:brightness-110 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #1d4ed8)',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
              }}
            >
              Launch Dashboard
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Gradient Divider below navbar */}
      <div
        className="fixed top-[73px] left-0 right-0 z-50 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)',
          opacity: scrolled ? 0 : 1,
          transition: 'opacity 0.4s',
        }}
      />

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col"
            style={{ background: 'rgba(5,2,9,0.97)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <TVLogo size={28} textSize="text-xs" />
              <button onClick={() => setMobileOpen(false)} className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-1">
              {navLinks.map((link) => (
                <button key={link.label} onClick={() => { setMobileOpen(false); onNavClick(link.label); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-white/70 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                  {link.label}
                </button>
              ))}
            </div>
            <div className="p-5 space-y-3 border-t border-white/8">
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)}
                className="block text-center px-5 py-3 rounded-full text-sm font-semibold text-white bg-white/8 border border-white/15 hover:bg-white/12 transition">
                {state.user ? 'Command Center' : 'Sign In'}
              </Link>
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)}
                className="block text-center px-5 py-3 rounded-full text-sm font-bold text-white transition"
                style={{ background: '#2563EB', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
                Launch Dashboard
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Premium Dashboard Mock ──────────────────────────────────────────────────
function DashboardMock() {
  const [scanPos, setScanPos] = useState(0);
  const [tick, setTick] = useState(0);
  const [bars] = useState([62, 84, 45, 92, 71, 56, 88, 73]);

  useEffect(() => {
    const t = setInterval(() => setScanPos(p => (p >= 95 ? 0 : p + 0.7)), 25);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 2800);
    return () => clearInterval(t);
  }, []);

  const events = [
    { time: '21:32:07', type: 'No Helmet',     sev: '#EF4444', plate: 'KA-05-MJ-2341' },
    { time: '21:31:55', type: 'Red Light',      sev: '#F97316', plate: 'MH-12-AB-9876' },
    { time: '21:31:42', type: 'Triple Riding',  sev: '#EF4444', plate: 'TN-01-CD-5543' },
    { time: '21:31:19', type: 'Wrong Side',     sev: '#F59E0B', plate: 'KA-01-EF-7712' },
  ];

  return (
    <div className="relative w-full max-w-[580px] ml-auto">

      {/* Glow behind card */}
      <div className="absolute -inset-6 -z-10 rounded-3xl opacity-30"
        style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.5), transparent 65%)' }} />

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(5,2,9,0.85)', backdropFilter: 'blur(24px)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(12,10,26,0.6)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[10px] font-semibold text-white/50 tracking-wide font-mono">LIVE · CAM-01 · Silk Board Junction · Bengaluru</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/70" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
            <div className="w-2 h-2 rounded-full bg-green-500/70" />
          </div>
        </div>

        {/* Camera feed */}
        <div className="relative" style={{ aspectRatio: '16/9', background: '#030106' }}>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          {/* Scene placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[10px] text-white/15 font-mono">Live feed · AI Detection Active</p>
          </div>

          {/* --- Bounding boxes --- */}
          {/* Vehicle 1 — Car */}
          <div className="absolute" style={{ top: '15%', left: '8%', width: '30%', height: '40%', border: '2px solid #3B82F6', borderRadius: 2 }}>
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm" style={{ background: '#2563EB' }}>CAR · 0.96</div>
          </div>
          {/* Vehicle 2 — Motorcycle */}
          <div className="absolute" style={{ top: '42%', left: '50%', width: '24%', height: '32%', border: '2px solid #F97316', borderRadius: 2 }}>
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm" style={{ background: '#EA580C' }}>MOTO · 0.91</div>
          </div>
          {/* Vehicle 3 — Truck */}
          <div className="absolute" style={{ top: '55%', left: '14%', width: '18%', height: '25%', border: '1.5px solid #8B5CF6', borderRadius: 2 }}>
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm" style={{ background: '#7C3AED' }}>TRUCK · 0.88</div>
          </div>
          {/* License plate */}
          <div className="absolute" style={{ top: '53%', left: '52%', width: '16%', height: '11%', border: '1.5px solid #22C55E', borderRadius: 1 }}>
            <div className="absolute -bottom-5 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm whitespace-nowrap" style={{ background: '#16A34A' }}>KA05MJ2341</div>
          </div>
          {/* No Helmet violation */}
          <div className="absolute" style={{ top: '28%', left: '54%', width: '11%', height: '15%', border: '2px solid #EF4444', borderRadius: 2 }}>
            <div className="absolute -top-5 right-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm whitespace-nowrap" style={{ background: '#DC2626' }}>NO HELMET</div>
          </div>
          {/* Triple riding */}
          <div className="absolute" style={{ top: '42%', left: '50%', width: '12%', height: '10%', border: '1.5px solid #EF4444', borderRadius: 1 }}>
            <div className="absolute -bottom-5 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm whitespace-nowrap" style={{ background: '#991B1B' }}>3-RIDER</div>
          </div>

          {/* Corner frame markers */}
          {[
            { pos: 'top-2 left-2', border: 'border-l-2 border-t-2' },
            { pos: 'top-2 right-2', border: 'border-r-2 border-t-2' },
            { pos: 'bottom-2 left-2', border: 'border-l-2 border-b-2' },
            { pos: 'bottom-2 right-2', border: 'border-r-2 border-b-2' },
          ].map(({ pos, border }) => (
            <div key={pos} className={`absolute w-5 h-5 ${pos} ${border} border-blue-500/50`} />
          ))}

          {/* Scan line */}
          <div className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ top: `${scanPos}%`, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.8) 40%, rgba(59,130,246,1) 50%, rgba(59,130,246,0.8) 60%, transparent)', boxShadow: '0 0 10px rgba(59,130,246,0.6)' }} />

          {/* Processing badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ background: 'rgba(5,2,9,0.9)', border: '1px solid rgba(34,197,94,0.35)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[8px] font-bold text-green-400 tracking-wider">38 FPS</span>
          </div>

          {/* Confidence overlay */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ background: 'rgba(5,2,9,0.9)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <span className="text-[8px] font-mono text-blue-400">mAP50: 94.2% · OCR: 98.2%</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { label: 'Objects', value: '6 detected' },
            { label: 'Plates', value: '3 read' },
            { label: 'Violations', value: '3 flagged' },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-2.5 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-[9px] text-white/35 font-medium mb-0.5">{label}</div>
              <div className="text-[11px] font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Mini charts row */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase">Detection Intensity · Last 8 Frames</span>
            <span className="text-[9px] text-blue-400 font-semibold">Live</span>
          </div>
          <div className="flex items-end gap-1 h-10">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: `rgba(37,99,235,${0.3 + h / 200})`, transition: 'height 0.4s ease' }} />
            ))}
          </div>
        </div>

        {/* Violation timeline */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase">Violation Log</span>
            <span className="text-[9px] text-blue-400 font-semibold">Auto-refresh</span>
          </div>
          <div className="space-y-1.5">
            {events.map((ev, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ev.sev }} />
                <span className="text-[9px] text-white/30 font-mono w-14 flex-shrink-0">{ev.time}</span>
                <span className="text-[10px] font-semibold text-white/75 flex-1">{ev.type}</span>
                <span className="text-[9px] font-mono text-white/30 truncate max-w-[90px]">{ev.plate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System health row */}
        <div className="px-4 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'GPU', value: '94.2%', color: '#22C55E' },
              { label: 'OCR', value: '98.2%', color: '#3B82F6' },
              { label: 'FPS', value: '38.0', color: '#A78BFA' },
              { label: 'Queue', value: '3 / hr', color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-1.5 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="text-[11px] font-bold mb-0.5" style={{ color }}>{value}</div>
                <div className="text-[8px] text-white/30 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floating Stat Card ──────────────────────────────────────────────────────
function FloatingCard({ icon: Icon, label, value, color = '#2563EB' }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-default select-none"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(20px)',
        minWidth: 168,
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <div className="text-[10px] text-white/45 font-medium leading-none mb-1">{label}</div>
        <div className="text-sm font-bold text-white leading-none">{value}</div>
      </div>
    </div>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = '', prefix = '', duration = 2000 }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setCurrent(Math.round(ease * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{prefix}{current.toLocaleString()}{suffix}</span>;
}

// ─── Pipeline Step ────────────────────────────────────────────────────────────
function PipelineStep({ step, total, label, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-4">
      {/* Node */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
          style={{ background: `${color}18`, borderColor: `${color}55` }}>
          <Icon size={16} style={{ color }} />
        </div>
        {step < total && (
          <div className="w-px flex-1 mt-2 mb-0" style={{ minHeight: 28, background: `linear-gradient(to bottom, ${color}40, transparent)` }} />
        )}
      </div>
      {/* Label */}
      <div className="pb-6">
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${color}80` }}>Stage {step}</span>
        <p className="text-sm font-semibold text-white/85 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Trusted By Marquee ───────────────────────────────────────────────────────
const TRUSTED_ORGS = [
  { name: 'Karnataka Traffic Police', abbr: 'KTP' },
  { name: 'Smart City Networks', abbr: 'SCN' },
  { name: 'Urban Mobility Authority', abbr: 'UMA' },
  { name: 'Road Safety Board', abbr: 'RSB' },
  { name: 'Traffic Operations Center', abbr: 'TOC' },
  { name: 'Municipal Transport Services', abbr: 'MTS' },
  { name: 'Enterprise Security Division', abbr: 'ESD' },
  { name: 'National Highway Authority', abbr: 'NHA' },
  { name: 'City Surveillance Bureau', abbr: 'CSB' },
  { name: 'AI Mobility Institute', abbr: 'AMI' },
  { name: 'Transit Intelligence Unit', abbr: 'TIU' },
  { name: 'Digital Road Authority', abbr: 'DRA' },
];

function OrgLogo({ name, abbr }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 rounded-xl flex-shrink-0 select-none"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 200 }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }}>
        <span className="text-[8px] font-black text-blue-400 tracking-wider">{abbr}</span>
      </div>
      <span className="text-xs font-semibold text-white/45 whitespace-nowrap">{name}</span>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, badge }) {
  return (
    <div
      className="group p-5 rounded-2xl transition-all duration-200 hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <Icon size={18} className="text-blue-400" />
        </div>
        {badge && (
          <span className="text-[9px] px-2 py-0.5 rounded font-bold tracking-wider"
            style={{ background: 'rgba(37,99,235,0.12)', color: '#60A5FA', border: '1px solid rgba(37,99,235,0.25)' }}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-white/90 mb-2 font-sans">{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</p>
    </div>
  );
}

// ─── Workflow Step ────────────────────────────────────────────────────────────
function WorkflowStep({ number, icon: Icon, title, desc, color, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
          <Icon size={17} className="text-white" />
        </div>
        {!isLast && <div className="w-px flex-1 mt-3" style={{ background: 'rgba(255,255,255,0.08)', minHeight: 32 }} />}
      </div>
      <div className="pb-8">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Stage {number}</span>
        <h3 className="text-sm font-bold text-white/90 mt-0.5 mb-1 font-sans">{title}</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { state } = useViolations();
  const dashboardPath = state.user ? '/admin' : '/login';

  const duplicatedOrgs = [...TRUSTED_ORGS, ...TRUSTED_ORGS];

  const handleNavClick = (label) => {
    if (label === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (label === 'Features') {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    } else if (label === 'Technology') {
      document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth' });
    } else if (label === 'Solutions') {
      document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' });
    } else if (label === 'Documentation') {
      document.getElementById('documentation')?.scrollIntoView({ behavior: 'smooth' });
    } else if (label === 'Analytics') {
      navigate('/analytics');
    }
  };

  const pipelineSteps = [
    { label: 'Traffic Camera Input',    icon: Camera,       color: '#2563EB' },
    { label: 'Image Enhancement',       icon: Layers,       color: '#3B82F6' },
    { label: 'YOLO Object Detection',   icon: Eye,          color: '#6366F1' },
    { label: 'License Plate Detection', icon: ScanLine,     color: '#8B5CF6' },
    { label: 'OCR Character Reading',   icon: FileSearch,   color: '#A78BFA' },
    { label: 'Violation Analysis',      icon: AlertTriangle,color: '#F59E0B' },
    { label: 'Evidence Generation',     icon: FileText,     color: '#22C55E' },
    { label: 'Analytics Dashboard',     icon: BarChart3,    color: '#10B981' },
  ];

  return (
    <div className="overflow-x-hidden" style={{ fontFamily: 'var(--font-body)', background: 'var(--color-bg)' }}>

      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION — Full-screen video
      ═══════════════════════════════════════════════════════════════ */}
      <section id="home" className="relative w-full min-h-screen overflow-hidden"
        style={{ background: 'var(--color-bg)' }}
      >

        {/* Subtle blue center glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
          <div className="w-[900px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.15) 0%, transparent 70%)', filter: 'blur(80px)', opacity: 0.6 }} />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(5,2,9,0.4)', zIndex: 0 }} />

        {/* Navbar */}
        <div style={{ position: 'relative', zIndex: 50 }}>
          <HeroNavbar onNavClick={handleNavClick} />
        </div>

        {/* Hero content */}
        <div className="relative flex items-center min-h-screen" style={{ zIndex: 5 }}>
          <div className="max-w-7xl mx-auto px-8 w-full pt-28 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* ── Left copy ── */}
              <div className="max-w-[600px]">

                {/* Small serif label */}
                <p
                  className="mb-5 text-sm tracking-wide text-white/60"
                  style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}
                >
                  Enterprise Traffic Intelligence
                </p>

                {/* Main headline */}
                <h1
                  className="mb-6 font-sans font-bold tracking-tighter"
                  style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', lineHeight: 1.05 }}
                >
                  <span className="text-white">Monitor Roads.</span>
                  <br />
                  <span className="gradient-text-hero">Protect Lives.</span>
                </h1>

                {/* Subtitle */}
                <p
                  className="mb-9 text-base leading-relaxed"
                  style={{ maxWidth: 520, opacity: 0.80, color: 'hsl(40, 6%, 82%)' }}
                >
                  TrafficVision AI combines advanced computer vision, real-time vehicle detection,
                  automatic license plate recognition, OCR, and explainable AI to detect traffic
                  violations, generate digital evidence, and deliver intelligent traffic analytics
                  for modern transportation systems.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Primary */}
                  <div>
                    <Link
                      to={dashboardPath}
                      className="inline-flex items-center gap-3 font-bold text-[#050209] bg-white rounded-full
                                 transition-all duration-200 hover:brightness-105"
                      style={{ padding: '16px 28px', fontSize: '0.9375rem', minWidth: 210, justifyContent: 'center',
                                boxShadow: '0 8px 32px rgba(255,255,255,0.15)' }}
                    >
                      <RefreshCw size={18} className="text-blue-600" />
                      Launch Platform
                    </Link>
                  </div>
                  {/* Secondary */}
                  <div>
                    <button
                      onClick={() => handleNavClick('Features')}
                      className="inline-flex items-center justify-center gap-2 font-semibold text-white rounded-full
                                 transition-all duration-200 group"
                      style={{ padding: '16px 28px', fontSize: '0.9375rem', background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)' }}
                    >
                      Explore Features
                      <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>

                {/* Floating stat cards */}
                <div className="mt-10 flex flex-wrap gap-3">
                  <FloatingCard icon={Car}        label="Live Vehicles"      value="1,248"    color="#3B82F6" delay={0.5} floatDelay={0} />
                  <FloatingCard icon={Video}       label="Traffic Cameras"    value="126"      color="#6366F1" delay={0.6} floatDelay={1} />
                  <FloatingCard icon={FileSearch}  label="OCR Accuracy"       value="98.2%"    color="#22C55E" delay={0.7} floatDelay={2} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <FloatingCard icon={ShieldCheck} label="Detection Accuracy" value="99.1%"    color="#10B981" delay={0.8} floatDelay={3} />
                  <FloatingCard icon={Zap}         label="Processing Speed"   value="38 FPS"   color="#F59E0B" delay={0.9} floatDelay={4} />
                  <FloatingCard icon={AlertTriangle}label="Violations Today"  value="421"      color="#EF4444" delay={1.0} floatDelay={5} />
                </div>
                <p className="text-[10px] text-white/30 mt-2.5 ml-1">
                  * Stat metrics above represent platform capability references for scale testing scenarios.
                </p>
              </div>

              {/* ── Right: Dashboard mock ── */}
              <div className="hidden lg:block">
                <DashboardMock />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ zIndex: 10, opacity: 0.5 }}
        >
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Scroll</span>
          <ChevronDown size={16} className="text-white/30" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          BELOW FOLD — same dark background
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ background: 'var(--color-bg)' }}>

        {/* ── Stats ── */}
        <section className="py-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'YOLO Target Classes',  value: 9,   suffix: ' types' },
                { label: 'Detection Accuracy',   value: 94,  suffix: '% mAP50' },
                { label: 'Pipeline Latency',     value: 450, suffix: 'ms', prefix: '~' },
                { label: 'Real Data Only',       value: 100, suffix: '%' },
              ].map((s, i) => (
                <div key={i} className="text-center p-6 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-3xl font-extrabold text-white mb-1 font-sans">
                    <AnimatedNumber target={s.value} suffix={s.suffix} prefix={s.prefix || ''} />
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trusted By ── */}
        <section id="solutions" className="py-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-8 mb-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Trusted By Transportation Authorities &amp; Smart City Networks
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2">
              {TRUSTED_ORGS.map((org, i) => (
                <OrgLogo key={i} name={org.name} abbr={org.abbr} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Core Capabilities ── */}
        <section id="features" className="py-20" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-14">
              <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-3">Core Capabilities</div>
              <h2 className="text-3xl font-bold text-white mb-4 font-sans">Built for Enterprise AI Operations</h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                A multi-stage AI pipeline that processes every frame with zero fabricated data.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard icon={Camera}        title="Computer Vision Pipeline"  desc="CLAHE enhancement, Gaussian denoising, and YOLOv11 object detection for vehicles, persons, and traffic signals."  badge="YOLOv11" />
              <FeatureCard icon={Cpu}           title="Real ANPR · EasyOCR"       desc="Perspective correction on plate crops, character-level OCR, and strict non-fabrication policy — raw text only."    badge="EasyOCR" />
              <FeatureCard icon={AlertTriangle} title="Explainable AI Verdicts"   desc="Each violation includes the MVA rule triggered, confidence level, and an auto-generated challan recommendation."    badge="XAI" />
              <FeatureCard icon={FileText}      title="PDF Evidence Exports"      desc="ReportLab-rendered challan documents with annotated bounding boxes, timestamps, and plate registrations."           badge="PDF" />
              <FeatureCard icon={BarChart2}     title="Live Analytics Dashboard"  desc="Zero mock data. Every KPI, pie chart, and trend line aggregates directly from real SQLite transactions."           badge="SQL" />
              <FeatureCard icon={Shield}        title="JWT Secured Access"        desc="Operator-only dashboard behind token-based authentication. Role-aware navigation and session management."           badge="Auth" />
            </div>
          </div>
        </section>

        {/* ── AI Pipeline Section ── */}
        <section id="technology" className="py-20" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

              {/* Pipeline steps */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-3">AI Workflow</div>
                <h2 className="text-3xl font-bold text-white mb-10 font-sans">Sub-Second Detection Pipeline</h2>
                <div>
                  {pipelineSteps.map((step, i) => (
                    <PipelineStep
                      key={i}
                      step={i + 1}
                      total={pipelineSteps.length}
                      label={step.label}
                      icon={step.icon}
                      color={step.color}
                      index={i}
                    />
                  ))}
                </div>
              </div>

              {/* Diagnostic panel */}
              <div id="documentation" className="lg:sticky lg:top-24">
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Pipeline Diagnostic Console</p>
                  </div>
                  <div className="rounded-xl aspect-video flex items-center justify-center mb-5 relative overflow-hidden"
                    style={{ background: '#030106', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>Surveillance Camera · Port 8000</p>
                    {[['top-2 left-2', 'border-l-2 border-t-2'], ['top-2 right-2', 'border-r-2 border-t-2'],
                      ['bottom-2 left-2', 'border-l-2 border-b-2'], ['bottom-2 right-2', 'border-r-2 border-b-2']
                    ].map(([pos, border]) => (
                      <div key={pos} className={`absolute w-5 h-5 ${pos} ${border} border-blue-500/30`} />
                    ))}
                  </div>
                  <div className="space-y-2 mb-5">
                    {[
                      { label: 'CV Models',  value: 'YOLOv11 + EasyOCR' },
                      { label: 'Database',   value: 'SQLite (aiosqlite)' },
                      { label: 'Auth',       value: 'JWT Bearer Token' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                        <span className="text-xs font-bold font-mono text-white/70">{value}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={dashboardPath} className="flex items-center justify-center gap-2 text-white font-bold text-sm py-3 rounded-xl w-full transition-all"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}>
                    {state.user ? 'Enter Command Center' : 'Access Portal'} <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-8 text-center">
            <div className="flex justify-center mb-5">
              <TVLogo size={28} textSize="text-sm" />
            </div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Flipkart Gridlock Hackathon 2.0 · Smart Traffic Enforcement Intelligence System · Bengaluru Traffic Police
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>Operator Command Center Portal</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
