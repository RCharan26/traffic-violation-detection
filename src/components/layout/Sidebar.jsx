import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Radio, FileText, Search, BarChart2, Award, Settings,
  ChevronLeft, ChevronRight, User, LogOut, Zap
} from 'lucide-react';
import { useViolations } from '../../context/ViolationContext.jsx';
import { api } from '../../services/api.js';

export default function Sidebar() {
  const location = useLocation();
  const { state, actions } = useViolations();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('tvai_sidebar_collapsed') === 'true';
  });

  const [modelStatus, setModelStatus] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchStatus = () => {
      api.getModelStatus()
        .then(data => {
          if (active) {
            setModelStatus(data);
            setModelLoading(false);
          }
        })
        .catch(err => {
          console.error("Error fetching model status in sidebar:", err);
          if (active) {
            setModelLoading(false);
          }
        });
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const getDotColor = (model) => {
    if (!model || !model.loaded) return 'bg-red-500';
    if (model.name && model.name.startsWith('trafficvision_')) return 'bg-green-500';
    return 'bg-amber-500';
  };

  const getAggregatedDotColor = (status) => {
    if (!status || !status.vehicle || !status.vehicle.loaded) return 'bg-red-500 animate-pulse';
    if (getDotColor(status.vehicle) === 'bg-green-500' && 
        getDotColor(status.helmet) === 'bg-green-500' && 
        getDotColor(status.plate) === 'bg-green-500') {
      return 'bg-green-500';
    }
    return 'bg-amber-500';
  };

  const toggleSidebar = () => {
    setCollapsed(prev => {
      localStorage.setItem('tvai_sidebar_collapsed', !prev);
      return !prev;
    });
  };

  const navItems = [
    { path: '/detection',   label: 'Upload & Detect', icon: Radio,    color: '#3B82F6' },
    { path: '/evidence',    label: 'Evidence File',   icon: FileText, color: '#8B5CF6' },
    { path: '/search',      label: 'Plate Search',    icon: Search,   color: '#22C55E' },
    { path: '/analytics',   label: 'Analytics Desk',  icon: BarChart2,color: '#F59E0B' },
    { path: '/performance', label: 'Accuracy Bench',  icon: Award,    color: '#EC4899' },
    { path: '/training-status', label: 'Training Status', icon: Zap,    color: '#10B981' },
    { path: '/admin',       label: 'Command Center',  icon: Settings, color: '#60A5FA' },
  ];

  if (!state.user) return null;

  return (
    <aside
      className={`hidden md:flex flex-col border-r h-screen sticky top-0 flex-shrink-0 z-40 select-none transition-all duration-300 ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}
      style={{
        background: 'var(--color-bg)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-3.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link to="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" className="flex-shrink-0">
            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="#2563EB" strokeWidth="1.5" fill="none" opacity="0.5" />
            <path d="M20 8L30 20L20 32L10 20L20 8Z" fill="url(#sidebarLogoGrad)" opacity="0.9" />
            <circle cx="20" cy="20" r="4" fill="white" />
            <circle cx="20" cy="20" r="2" fill="#1D4ED8" />
            <defs>
              <linearGradient id="sidebarLogoGrad" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
            </defs>
          </svg>
          {!collapsed && (
            <div>
              <span className="font-bold text-sm tracking-tight text-white">TrafficVision</span>
              <div className="text-[8px] text-blue-400 font-semibold tracking-widest uppercase leading-none mt-0.5">
                AI Platform
              </div>
            </div>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          className="p-1 rounded-lg transition-all duration-150 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 relative overflow-hidden group"
              style={{
                color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
                background: active ? `${item.color}12` : 'transparent',
                border: active ? `1px solid ${item.color}25` : '1px solid transparent',
              }}
            >
              {/* Hover bg */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)' }} />

              <Icon size={14} className="flex-shrink-0 relative z-10"
                style={{ color: active ? item.color : 'rgba(255,255,255,0.4)' }} />

              {!collapsed && (
                <span className="truncate relative z-10">{item.label}</span>
              )}

              {/* Active indicator bar */}
              {active && (
                <div className="absolute right-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: item.color }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Model Status Section */}
      {!collapsed ? (
        <div className="px-3.5 py-3 mx-2.5 mb-3 rounded-xl border border-white/5 bg-white/[0.015] space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Model Pipeline</span>
            {modelLoading ? (
              <span className="text-[8px] text-slate-600 animate-pulse">updating...</span>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${getAggregatedDotColor(modelStatus)}`} />
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px]">Vehicle YOLO</span>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(modelStatus?.vehicle)}`} />
                <span className="text-[9px] font-mono truncate max-w-[80px] text-slate-500" title={modelStatus?.vehicle?.name || 'offline'}>
                  {modelStatus?.vehicle?.name || 'offline'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px]">Helmet YOLO</span>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(modelStatus?.helmet)}`} />
                <span className="text-[9px] font-mono truncate max-w-[80px] text-slate-500" title={modelStatus?.helmet?.name || 'heuristic'}>
                  {modelStatus?.helmet?.name || 'heuristic'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px]">Plate YOLO</span>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(modelStatus?.plate)}`} />
                <span className="text-[9px] font-mono truncate max-w-[80px] text-slate-500" title={modelStatus?.plate?.name || 'heuristic'}>
                  {modelStatus?.plate?.name || 'heuristic'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center pb-3 pt-1 border-b border-white/5 mb-2">
          <div className="relative group cursor-help">
            <div className={`w-2.5 h-2.5 rounded-full ${getAggregatedDotColor(modelStatus)}`} />
            <div className="absolute left-10 bottom-0 hidden group-hover:block bg-slate-900 border border-white/10 text-white text-[10px] rounded p-2 z-50 whitespace-nowrap shadow-xl">
              <p className="font-bold border-b border-white/10 pb-1 mb-1 text-[9px] uppercase tracking-wider text-slate-400">Model Pipeline</p>
              <p className="flex items-center gap-1.5 mt-1 text-[9px]"><span className={`w-1.5 h-1.5 rounded-full ${getDotColor(modelStatus?.vehicle)}`} /> Vehicle: {modelStatus?.vehicle?.name || 'offline'}</p>
              <p className="flex items-center gap-1.5 mt-1 text-[9px]"><span className={`w-1.5 h-1.5 rounded-full ${getDotColor(modelStatus?.helmet)}`} /> Helmet: {modelStatus?.helmet?.name || 'heuristic'}</p>
              <p className="flex items-center gap-1.5 mt-1 text-[9px]"><span className={`w-1.5 h-1.5 rounded-full ${getDotColor(modelStatus?.plate)}`} /> Plate: {modelStatus?.plate?.name || 'heuristic'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t p-2.5 space-y-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}>
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 group"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          title={collapsed ? state.user?.name : undefined}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)' }}>
            <User size={12} className="text-blue-400" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/80 truncate">{state.user?.name}</p>
              <p className="text-[9px] font-mono text-white/30 truncate uppercase tracking-wider">Operator Portal</p>
            </div>
          )}
        </Link>

        <button
          onClick={() => actions.logout()}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 text-left"
          style={{ color: 'rgba(239,68,68,0.7)' }}
          title={collapsed ? 'Exit Session' : undefined}
        >
          <LogOut size={13} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-bold uppercase tracking-wider">Exit Session</span>}
        </button>
      </div>
    </aside>
  );
}
