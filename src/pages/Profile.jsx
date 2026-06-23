import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Database, Server, AlertCircle, CheckCircle, Loader2, Cpu, Eye } from 'lucide-react';

import { useViolations } from '../context/ViolationContext.jsx';
import { api } from '../services/api.js';
import PageShell from '../components/layout/PageShell.jsx';

function InfoRow({ label, value, valueColor = 'text-slate-300' }) {
  return (
    <div className="flex justify-between items-center py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

function ConfigCard({ icon: Icon, title, value, sub }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
        <Icon size={15} className="text-blue-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{title}</p>
        <p className="text-sm font-bold text-slate-200 mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ModelStatusDot({ loaded, name, label }) {
  return (
    <div className="flex items-center justify-between py-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${loaded ? 'bg-green-400' : 'bg-amber-500'}`} />
        <span className={`text-xs font-semibold font-mono ${loaded ? 'text-green-400' : 'text-amber-400'}`}>
          {name}
        </span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { state } = useViolations();
  const user = state.user || { name: 'Enforcement Officer', username: 'admin' };

  const [modelStatus, setModelStatus] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);

  useEffect(() => {
    api.getModelStatus()
      .then(data => setModelStatus(data))
      .catch(() => setModelStatus(null))
      .finally(() => setModelLoading(false));
  }, []);

  // Derive OCR engine label from model status response
  const ocrEngine = modelStatus?.ocr_engine || 'EasyOCR';
  const vehicleModel = modelStatus?.vehicle;
  const helmetModel  = modelStatus?.helmet;
  const plateModel   = modelStatus?.plate;

  return (
    <PageShell
      label="Operator Center"
      title="Operator Profile & Settings"
      subtitle="View authorized security credentials, server session details and system configuration"
      accent
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Identity card ── */}
        <div className="lg:col-span-1 space-y-5">
          <div className="card p-6 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative"
              style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <User size={34} className="text-blue-400" />
              <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 border-2"
                style={{ borderColor: '#070C1A' }} />
            </div>

            <h2 className="text-lg font-bold text-slate-100">{user.name}</h2>
            <p className="text-xs text-slate-600 font-mono mt-0.5">@{user.username}</p>

            <div className="mt-4 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold text-green-400"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active Session
            </div>

            <div className="w-full mt-6 space-y-0">
              <InfoRow label="Security Clearance" value="Administrator" valueColor="text-slate-200" />
              <InfoRow label="Organization"        value="Bengaluru Traffic Police" valueColor="text-slate-200" />
              <InfoRow label="Command Post"        value="Zone-01 Headquarters"   valueColor="text-slate-200" />
              <InfoRow label="Clearance Level"     value="Level 5 — Full Access"  valueColor="text-blue-400" />
            </div>
          </div>

          {/* Security alert */}
          <div className="p-4 rounded-xl flex gap-3"
            style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-400">Security Warning</p>
              <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">
                All operator actions, database queries, PDF challan generations, and violation status
                modifications are digitally logged under cybersecurity audit provisions.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: System Config ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.12)' }}>
                <Server size={14} className="text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Enforcement System Config</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ConfigCard icon={Shield}   title="Platform Version"  value="TrafficVision AI v1.0.0" />
              <ConfigCard icon={Key}      title="Auth Algorithm"    value="HS256 JWT Token" />
              <ConfigCard icon={Database} title="Data Store"        value="SQLite Database" />
              <ConfigCard icon={Server}   title="AI Model Pipeline" value="YOLOv11 (PyTorch)" />
            </div>
          </div>

          {/* Live Model Status */}
          <div className="card p-6">
            <div className="flex items-center justify-between gap-2.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(37,99,235,0.12)' }}>
                  <Cpu size={14} className="text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Live Model Status</h3>
              </div>
              {modelLoading && <Loader2 size={14} className="animate-spin text-slate-500" />}
              {!modelLoading && modelStatus && (
                <span className="text-[10px] font-bold text-green-400 px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  Live
                </span>
              )}
            </div>
            {modelLoading ? (
              <p className="text-xs text-slate-600">Querying model status...</p>
            ) : modelStatus ? (
              <div className="space-y-0">
                <ModelStatusDot
                  loaded={vehicleModel?.loaded}
                  name={vehicleModel?.name || 'yolo11n.pt'}
                  label="Vehicle Detector"
                />
                <ModelStatusDot
                  loaded={helmetModel?.loaded}
                  name={helmetModel?.name || 'Heuristic fallback'}
                  label="Helmet Detector"
                />
                <ModelStatusDot
                  loaded={plateModel?.loaded}
                  name={plateModel?.name || 'Heuristic fallback'}
                  label="Plate Detector"
                />
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-500">OCR Engine</span>
                  <div className="flex items-center gap-1.5">
                    <Eye size={11} className="text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400">{ocrEngine}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">Could not reach backend. Start the server and refresh.</p>
            )}
          </div>

          {/* Feature checklist */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4">Platform Feature Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Real ANPR — PaddleOCR / EasyOCR',
                'YOLOv11 Object Detection',
                'Explainable AI (XAI)',
                'PDF Challan Generation',
                'JWT Authentication',
                'SQLite Persistence',
                'Live Analytics Dashboard',
                'Zero Fabricated Data Policy',
                'ByteTrack Video Tracking',
                'Illegal Parking Detection',
                'Fog / Rain Preprocessing',
                'Custom Model Training Ready',
              ].map(feat => (
                <div key={feat} className="flex items-center gap-2 text-xs text-slate-400 py-1.5">
                  <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
