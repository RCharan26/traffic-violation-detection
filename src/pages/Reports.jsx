import React, { useState, useEffect } from 'react';
import { FileText, FileDown, AlertTriangle, RefreshCw, Printer } from 'lucide-react';

import { api } from '../services/api.js';
import { formatDateTime } from '../utils/exportUtils.js';
import PageShell from '../components/layout/PageShell.jsx';

const severityBadge = {
  critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low',
};

export default function Reports() {
  const [violations, setViolations] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const fetchReportList = async (listPage = 1) => {
    setLoading(true); setError(null);
    try {
      const data = await api.getViolations({ page: listPage, page_size: 12 });
      setViolations(data.items || []); setTotal(data.total || 0); setPage(listPage);
    } catch (err) {
      setError(err.message || 'Failed to fetch records.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReportList(1); }, []);

  const totalPages = Math.ceil(total / 12);

  return (
    <PageShell
      label="Enforcement Registry"
      title="Formal Challan PDF Directory"
      subtitle="Auto-generate and download official legally-compliant PDF traffic violation tickets"
      accent
      headerRight={
        <button onClick={() => fetchReportList(page)} disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl text-xs font-semibold text-red-400"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Violations in Database', value: total,              sub: 'Eligible for PDF generation' },
          { label: 'PDF Engine',             value: 'ReportLab',       sub: 'Auto-generates layouts' },
          { label: 'Document Security',      value: 'Digitally Secure', sub: 'Timestamp & ID encoded' },
        ].map(item => (
          <div key={item.label} className="card p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">{item.label}</p>
            <p className="text-xl font-bold text-slate-100">{item.value}</p>
            <p className="text-2xs text-slate-600 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Challan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {violations.map((v, i) => (
          <div
            key={v.id}
            className="card card-hover flex flex-col justify-between p-5"
            style={{ minHeight: 230 }}
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1.5 text-2xs text-slate-600 font-mono uppercase">
                  <FileText size={12} className="text-blue-500" />
                  Challan #{v.id}
                </div>
                <span className={`badge ${severityBadge[v.severity] || 'badge-medium'} text-[10px] uppercase`}>
                  {v.severity}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-200 truncate mb-4">
                {v.violation_type.replace('_', ' ').toUpperCase()}
              </h3>

              <div className="space-y-2">
                {[
                  ['Plate',     v.license_plate || 'UNKNOWN', 'font-mono font-bold text-slate-200'],
                  ['Timestamp', formatDateTime(v.created_at), 'text-slate-500'],
                  ['MVA Rule',  v.rule_applied,                'text-slate-500 truncate max-w-[130px]'],
                ].map(([key, val, valCls]) => (
                  <div key={key} className="flex justify-between text-2xs text-slate-500">
                    <span>{key}:</span>
                    <span className={valCls} title={val}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <a
                href={api.getReportUrl(v.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-2 text-2xs font-bold uppercase tracking-wider w-full justify-center flex items-center gap-1.5"
              >
                <FileDown size={12} /> Download PDF
              </a>
            </div>
          </div>
        ))}
      </div>

      {violations.length === 0 && !loading && (
        <div className="card py-16 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm font-semibold text-slate-500">No processed data available.</p>
          <p className="text-xs mt-1 text-slate-700">
            Surveillance uploads must be processed before challans generate.
          </p>
        </div>
      )}
      {loading && (
        <div className="py-12 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-xs text-slate-500">Fetching report registry...</p>
        </div>
      )}

      {violations.length > 0 && (
        <div className="card px-4 py-3 mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {totalPages || 1} · {total} total</p>
          <div className="flex gap-1.5">
            {[['Prev', () => fetchReportList(page - 1), page === 1],
              ['Next', () => fetchReportList(page + 1), page >= totalPages]
            ].map(([label, fn, disabled]) => (
              <button key={label} onClick={fn} disabled={disabled}
                className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
