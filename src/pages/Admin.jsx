import React, { useState, useEffect } from 'react';
import { Download, Eye, RefreshCw, AlertTriangle, XCircle, Trash2, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';

import { useViolations } from '../context/ViolationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/exportUtils.js';
import PageShell from '../components/layout/PageShell.jsx';

const STATUS_CONFIG = {
  pending:    { label: 'Pending'    },
  reviewed:   { label: 'Reviewed'   },
  paid:       { label: 'Paid'       },
  dismissed:  { label: 'Dismissed'  },
  challenged: { label: 'Challenged' },
};

const SEVERITY_CONFIG = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

// ── Mini KPI card ─────────────────────────────────────────────────────────
function KPICard({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">{label}</p>
      <p className={`text-lg font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

export default function Admin() {
  const { state, actions } = useViolations();
  const { toast } = useToast();
  const [queryPlate,     setQueryPlate]     = useState('');
  const [filterType,     setFilterType]     = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [page,           setPage]           = useState(1);
  const [selectedViol,   setSelectedViol]   = useState(null);

  const loadData = () => {
    actions.fetchViolations({
      page, page_size: 15,
      violation_type: filterType,
      severity: filterSeverity,
      status: filterStatus,
      license_plate: queryPlate.trim(),
    });
  };

  useEffect(() => { loadData(); }, [page, filterType, filterSeverity, filterStatus, queryPlate]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await actions.updateViolationStatus(id, newStatus);
      toast.success(`Violation #${id} updated to ${newStatus}.`);
      if (selectedViol?.id === id) setSelectedViol(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error(`Failed to update: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Permanently delete violation #${id}?`)) return;
    try {
      await actions.deleteViolation(id);
      toast.success(`Record #${id} deleted.`);
      if (selectedViol?.id === id) setSelectedViol(null);
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (!state.violations.length) return;
    const headers = ['ID', 'Plate', 'Type', 'Severity', 'Confidence', 'Status', 'Timestamp', 'Reason'];
    const rows = state.violations.map(v => [
      v.id, v.license_plate || 'UNKNOWN', v.violation_type, v.severity,
      v.confidence, v.status, v.created_at, `"${v.reason.replace(/"/g, '""')}"`,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `trafficvision_export_${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const totalPages = Math.ceil(state.totalViolations / 15);

  const headerRight = (
    <div className="flex gap-2">
      <button onClick={loadData} disabled={state.loading}
        className="btn-secondary text-xs flex items-center gap-1.5">
        <RefreshCw size={13} className={state.loading ? 'animate-spin' : ''} /> Sync DB
      </button>
      <button onClick={handleExportCSV} disabled={!state.violations.length}
        className="btn-primary text-xs flex items-center gap-1.5">
        <Download size={13} /> Export CSV
      </button>
    </div>
  );

  return (
    <PageShell
      label="Command Center"
      title="Enforcement Challan Management"
      subtitle="Real-time supervision desk — review, audit, approve or reject violation challans."
      accent
      headerRight={headerRight}
    >


      {/* KPI summaries */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KPICard label="Matching Records"   value={state.totalViolations}    color="text-slate-100" />
        <KPICard label="System Status"      value="Connected"               color="text-green-400" />
        <KPICard label="Database"           value="SQLite"                  color="text-blue-400" />
        <KPICard label="Review Desk"        value="Ready"                   color="text-slate-400" />
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2">
            <input
              type="text" placeholder="Search by license plate..."
              className="input pl-9 font-mono text-xs"
              value={queryPlate}
              onChange={e => { setQueryPlate(e.target.value); setPage(1); }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
          </div>
          <select className="select text-xs" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select text-xs" value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); setPage(1); }}>
            <option value="all">All Severities</option>
            {Object.keys(SEVERITY_CONFIG).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
          <select className="select text-xs" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="helmet_missing">Helmet Missing</option>
            <option value="seatbelt_missing">Seatbelt Missing</option>
            <option value="triple_riding">Triple Riding</option>
            <option value="wrong_side">Wrong Side</option>
            <option value="red_light">Red Light</option>
            <option value="stop_line">Stop Line</option>
            <option value="illegal_parking">Illegal Parking</option>
          </select>
        </div>
      </div>

      {/* Data table */}
      <div className="card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,12,26,0.5)' }}>
                {['ID', 'License Plate', 'Violation', 'Severity', 'Conf.', 'Status', 'Recorded At', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-2xs font-bold uppercase tracking-wider text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.violations.map(v => (
                <tr key={v.id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">#{v.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold font-mono text-xs text-slate-200">{v.license_plate || 'UNKNOWN'}</div>
                    <div className="text-2xs text-slate-600 max-w-[130px] truncate">{v.location_label || 'Surveillance Camera'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">
                    {v.violation_type.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${SEVERITY_CONFIG[v.severity] || 'badge-medium'} text-[10px] uppercase`}>
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{Math.round(v.confidence * 100)}%</td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs rounded-lg px-2 py-1 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#CBD5E1' }}
                      value={v.status}
                      onChange={e => handleUpdateStatus(v.id, e.target.value)}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                        <option key={k} value={k} style={{ background: '#0F172A' }}>{cfg.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDateTime(v.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelectedViol(selectedViol?.id === v.id ? null : v)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 transition"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleDelete(v.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {state.violations.length === 0 && !state.loading && (
          <div className="py-16 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-slate-700" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No processed data available.</p>
            <p className="text-[10px] text-slate-700 mt-1">Upload images and run the detection pipeline first.</p>
          </div>
        )}
        {state.loading && (
          <div className="py-12 text-center">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs text-slate-500">Querying violations database...</p>
          </div>
        )}

        {state.violations.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,12,26,0.3)' }}>
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages || 1} · {state.totalViolations} total
            </p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white transition disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white transition disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedViol && (
        <div
          className="card p-6 space-y-5"
          style={{ border: '1px solid rgba(37,99,235,0.2)', background: 'rgba(37,99,235,0.04)' }}
        >
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Details: Challan #{selectedViol.id}
            </h3>
            <button onClick={() => setSelectedViol(null)} className="text-slate-500 hover:text-slate-200 transition">
              <XCircle size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 rounded-xl overflow-hidden aspect-video flex items-center justify-center"
              style={{ background: '#070C1A', border: '1px solid rgba(255,255,255,0.06)' }}>
              {selectedViol.evidence_image_path ? (
                <img src={api.getEvidenceUrl(selectedViol.evidence_image_path)}
                  alt="Evidence" className="w-full h-full object-contain" />
              ) : (
                <p className="text-2xs text-slate-700">No image available</p>
              )}
            </div>

            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                ['License Plate',      selectedViol.license_plate || 'UNKNOWN'],
                ['Violation Type',     selectedViol.violation_type.replace('_', ' ').toUpperCase()],
                ['Confidence',         `${Math.round(selectedViol.confidence * 100)}%`],
                ['Severity',          selectedViol.severity.toUpperCase()],
                ['Timestamp',         formatDateTime(selectedViol.created_at)],
                ['Suggested Action',  selectedViol.suggested_action || 'Issue Standard Challan'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[10px] text-slate-600 uppercase font-bold mb-0.5">{k}</p>
                  <p className="text-xs font-semibold text-slate-300 truncate">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <a href={api.getReportUrl(selectedViol.id)} target="_blank" rel="noopener noreferrer"
              className="btn-primary text-xs flex items-center gap-1.5">
              <FileDown size={13} /> Download PDF
            </a>
          </div>
        </div>
      )}
    </PageShell>
  );
}
