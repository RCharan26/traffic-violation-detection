import React, { useState, useEffect } from 'react';
import { FileText, Printer, Eye, X, MapPin, Clock, Shield, AlertTriangle, FileDown, RefreshCw } from 'lucide-react';

import { useViolations } from '../context/ViolationContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/exportUtils.js';
import PageShell from '../components/layout/PageShell.jsx';

const STATUS_COLORS = {
  pending:    'badge-pending',
  reviewed:   'badge-issued',
  paid:       'badge-paid',
  dismissed:  'badge-dismissed',
  challenged: 'badge-critical',
};

const SEVERITY_COLORS = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

function EvidenceCard({ violation, onView }) {
  return (
    <div className="card overflow-hidden card-hover">
      {/* Visual File Header */}
      <div className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{ background: '#070C1A' }}>
        {violation.evidence_image_path ? (
          <img
            src={api.getEvidenceUrl(violation.evidence_image_path)}
            alt="Surveillance crop"
            className="w-full h-full object-cover opacity-75"
            onError={(e) => { e.target.src = ''; e.target.className = 'hidden'; }}
          />
        ) : (
          <div className="text-center">
            <Shield size={28} className="mx-auto mb-1" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-2xs uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Capture Frame</p>
          </div>
        )}

        {/* Corner frame markers */}
        {[['top-2 left-2', 'border-l border-t'], ['top-2 right-2', 'border-r border-t'],
          ['bottom-2 left-2', 'border-l border-b'], ['bottom-2 right-2', 'border-r border-b']].map(([pos, border]) => (
          <div key={pos} className={`absolute w-4 h-4 ${pos} ${border} border-blue-500/30`} />
        ))}

        <div className="absolute top-2 left-2">
          <span className={`badge ${STATUS_COLORS[violation.status] || 'badge-pending'} text-2xs uppercase`}>
            {violation.status}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={`badge ${SEVERITY_COLORS[violation.severity] || 'badge-medium'} text-2xs uppercase`}>
            {violation.severity}
          </span>
        </div>

        {/* Plate banner */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="px-3 py-1 rounded font-mono text-blue-300 text-xs font-bold tracking-widest"
            style={{ background: 'rgba(7,12,26,0.85)', border: '1px solid rgba(37,99,235,0.25)' }}>
            {violation.license_plate || 'PLATE UNKNOWN'}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Challan #{violation.id}
            </p>
            <h3 className="text-sm font-bold text-slate-200 mt-0.5 truncate max-w-[150px]">
              {violation.violation_type.replace('_', ' ').toUpperCase()}
            </h3>
          </div>
          <span className="text-2xs font-bold text-slate-500">
            Conf: {Math.round(violation.confidence * 100)}%
          </span>
        </div>

        <div className="space-y-1.5 text-slate-500 text-[11px]">
          <div className="flex items-center gap-2">
            <MapPin size={11} className="text-slate-600" />
            <span className="truncate">{violation.location_label || 'Surveillance Camera'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={11} className="text-slate-600" />
            <span>{formatDateTime(violation.created_at)}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => onView(violation)}
            className="btn-secondary text-2xs py-1.5 flex-1 justify-center"
          >
            <Eye size={12} /> View Details
          </button>
          <a
            href={api.getReportUrl(violation.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-2xs p-1.5"
            title="Download PDF Challan"
          >
            <Printer size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

function EvidenceDetailModal({ violation, onClose }) {
  if (!violation) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(10,16,32,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10"
          style={{ background: 'rgba(10,16,32,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-[10px] font-mono text-slate-600">Challan Record #{violation.id}</p>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Violation Evidence File
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={api.getReportUrl(violation.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-2xs uppercase font-bold py-1.5 flex items-center gap-1.5"
            >
              <FileDown size={13} /> Download PDF
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-white transition"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Visual section: annotated frame + plate crop (if available) */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 rounded-xl overflow-hidden aspect-video flex items-center justify-center"
              style={{ background: '#070C1A', border: '1px solid rgba(255,255,255,0.06)' }}>
              {violation.evidence_image_path ? (
                <img
                  src={api.getEvidenceUrl(violation.evidence_image_path)}
                  alt="Evidence visual"
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-600">Evidence image not found on disk.</p>
              )}
            </div>
            
            {violation.plate_crop_path && (
              <div className="md:w-1/3 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">License Plate Crop</p>
                <img
                  src={api.getEvidenceUrl(violation.plate_crop_path)}
                  alt="License plate crop"
                  className="max-h-[70px] object-contain rounded border border-slate-800"
                  onError={(e) => { e.target.src = ''; e.target.className = 'hidden'; }}
                />
                <span className="mt-3 text-xs font-mono font-black text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded tracking-widest">
                  {violation.license_plate || 'UNKNOWN'}
                </span>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              ['Violation Type',       violation.violation_type.replace('_', ' ').toUpperCase()],
              ['Location Point',       violation.location_label || 'CCTV Capture Camera'],
              ['Challan Status',       violation.status.toUpperCase()],
              ['Timestamp',            formatDateTime(violation.created_at)],
              ['Model Confidence',     `${Math.round(violation.confidence * 100)}%`],
              ['Detection Confidence', violation.detection_confidence
                ? `${Math.round(violation.detection_confidence * 100)}%` : '—'],
              ['Tracking ID',          violation.metadata?.track_id != null ? `#${violation.metadata.track_id}` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">{label}</p>
                <p className="text-xs font-semibold text-slate-300 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* XAI Panel */}
          <div className="p-5 rounded-xl space-y-4"
            style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Explainable AI (XAI) Context
            </p>
            <div className="space-y-3.5 text-xs text-slate-400">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Decision Reasoning</p>
                <p className="leading-relaxed text-slate-300">{violation.reason}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Motor Vehicles Act Section</p>
                <p className="font-bold text-blue-400">{violation.rule_applied}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Suggested Action</p>
                <p className="text-slate-400">{violation.suggested_action}</p>
              </div>
            </div>
          </div>

          {/* Legal notice */}
          <div className="px-4 py-3 rounded-xl text-[10px] text-slate-600 leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            ⚖️ Evidence compiled by TrafficVision AI — Automated Photo Identification System.
            All dashboard coordinates and OCR outputs are committed in database tables.
            Decisions are transparent, rule-based, and reviewable by command superintendents.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Evidence() {
  const { state, actions } = useViolations();
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchPlate, setSearchPlate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    actions.fetchViolations({ page, page_size: 12, violation_type: filterType, license_plate: searchPlate.trim() });
  }, [filterType, searchPlate, page]);

  const totalPages = Math.ceil(state.totalViolations / 12);

  return (
    <PageShell
      label="Evidence Center"
      title="Violation Evidence Directory"
      subtitle="Inspect annotated camera frames and generated visual challans"
      accent
    >
      {/* Query filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by license plate..."
          className="input sm:max-w-xs font-mono text-xs"
          value={searchPlate}
          onChange={(e) => { setSearchPlate(e.target.value); setPage(1); }}
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'helmet_missing', 'seatbelt_missing', 'triple_riding', 'red_light', 'stop_line'].map(type => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                filterType === type
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              style={filterType === type
                ? { background: '#2563EB', boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {type === 'all' ? 'All' : type.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-bold text-slate-600 uppercase self-center ml-auto">
          {state.totalViolations} Records
        </div>
      </div>

      {/* Evidence grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {state.violations.map(v => (
          <EvidenceCard key={v.id} violation={v} onView={setSelectedViolation} />
        ))}
      </div>

      {state.violations.length === 0 && !state.loading && (
        <div className="card py-20 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No processed data available.</p>
          <p className="text-[10px] text-slate-700 mt-1">
            Surveillance images must be uploaded and processed in the detection pipeline.
          </p>
        </div>
      )}

      {state.loading && (
        <div className="py-12 text-center text-slate-500">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-xs">Querying evidence database...</p>
        </div>
      )}

      {/* Pagination */}
      {state.violations.length > 0 && (
        <div className="card px-4 py-3 mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages || 1} · {state.totalViolations} total
          </p>
          <div className="flex gap-1.5">
            {[['Prev', () => setPage(p => Math.max(1, p - 1)), page === 1],
              ['Next', () => setPage(p => Math.min(totalPages, p + 1)), page >= totalPages]
            ].map(([label, fn, disabled]) => (
              <button
                key={label} onClick={fn} disabled={disabled}
                className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedViolation && (
        <EvidenceDetailModal violation={selectedViolation} onClose={() => setSelectedViolation(null)} />
      )}
    </PageShell>
  );
}
