import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Calendar, AlertTriangle, FileDown, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime } from '../utils/exportUtils.js';
import PageShell from '../components/layout/PageShell.jsx';

const STATUS_CONFIG = {
  pending:    { label: 'Pending'   },
  reviewed:   { label: 'Reviewed'  },
  paid:       { label: 'Paid'      },
  dismissed:  { label: 'Dismissed' },
  challenged: { label: 'Challenged'},
};

const SEVERITY_CONFIG = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

const severityBadge = (s) => SEVERITY_CONFIG[s] || 'badge-medium';

export default function Search() {
  const { toast } = useToast();
  const [query,         setQuery]         = useState('');
  const [violationType, setViolationType] = useState('all');
  const [severity,      setSeverity]      = useState('all');
  const [status,        setStatus]        = useState('all');
  const [licensePlate,  setLicensePlate]  = useState('');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [results,       setResults]       = useState([]);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  const executeSearch = async (searchPage = 1) => {
    setLoading(true); setError(null);
    try {
      const res = await api.search({
        query: query.trim() || null,
        violation_type: violationType,
        severity, status,
        license_plate: licensePlate.trim() || null,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
        date_to:   dateTo   ? new Date(dateTo).toISOString()   : null,
        page: searchPage, page_size: 15,
      });
      setResults(res.items || []); setTotal(res.total || 0); setPage(searchPage);
    } catch (err) {
      setError(err.message || 'Failed to retrieve search results.');
    } finally { setLoading(false); }
  };

  useEffect(() => { executeSearch(1); }, []);

  const handleReset = () => {
    setQuery(''); setViolationType('all'); setSeverity('all'); setStatus('all');
    setLicensePlate(''); setDateFrom(''); setDateTo('');
    setTimeout(() => executeSearch(1), 50);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.updateViolationStatus(id, newStatus);
      setResults(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
      toast.success(`Violation #${id} updated.`);
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete violation #${id}?`)) return;
    try {
      await api.deleteViolation(id);
      setResults(prev => prev.filter(v => v.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      toast.success(`Violation #${id} deleted.`);
    } catch (err) { toast.error(`Delete failed: ${err.message}`); }
  };

  const totalPages = Math.ceil(total / 15);

  const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <PageShell
      label="Enforcement Search"
      title="Relational Database Queries"
      subtitle="Multi-parameter filters on verified traffic violation challans"
      accent
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl text-xs font-semibold text-red-400"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Filters form */}
      <div className="card p-5 mb-6">
        <form onSubmit={(e) => { e.preventDefault(); executeSearch(1); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Search Keywords</label>
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text" placeholder="Reason text, rules, locations, filenames..."
                  className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Plate Number</label>
              <input
                type="text" placeholder="e.g. KA01AB1234"
                className="input font-mono" value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Violation Type</label>
              <select className="select text-xs" value={violationType} onChange={(e) => setViolationType(e.target.value)}>
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
            <div>
              <label className={labelCls}>Severity</label>
              <select className="select text-xs" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className="select text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>From Date</label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="date" className="input pl-9 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>To Date</label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="date" className="input pl-9 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="button" onClick={handleReset} className="btn-secondary text-xs">
              <RefreshCw size={13} /> Reset
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs font-bold">
              {loading ? 'Searching...' : 'Query Database'}
            </button>
          </div>
        </form>
      </div>

      {/* Results table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,12,26,0.5)' }}>
                {['ID', 'Vehicle Plate', 'Type', 'Severity', 'Confidence', 'Challan Status', 'Timestamp', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((viol) => (
                <tr key={viol.id} className="transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">#{viol.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold font-mono text-xs text-slate-100">{viol.license_plate || 'UNKNOWN'}</div>
                    <div className="text-2xs text-slate-600 max-w-[150px] truncate">{viol.location_label || 'surveillance cam'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">
                    {viol.violation_type.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${severityBadge(viol.severity)} text-2xs`}>{viol.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-400">{Math.round(viol.confidence * 100)}%</td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs rounded-lg px-2 py-1 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#CBD5E1' }}
                      value={viol.status}
                      onChange={(e) => handleUpdateStatus(viol.id, e.target.value)}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k} style={{ background: '#0F172A' }}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDateTime(viol.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <a href={api.getReportUrl(viol.id)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 transition"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                        title="Download PDF">
                        <FileDown size={14} />
                      </a>
                      <button onClick={() => handleDelete(viol.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                        title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {results.length === 0 && !loading && (
          <div className="py-20 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-slate-700" />
            <p className="text-sm font-semibold text-slate-500">No violations match your query.</p>
            <p className="text-xs mt-1 text-slate-700">Try resetting filters to view all records.</p>
          </div>
        )}
        {loading && (
          <div className="py-16 text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs text-slate-500">Querying database...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-slate-500">Page {page} of {totalPages || 1} · {total} total</p>
            <div className="flex gap-1.5">
              {[['Prev', () => executeSearch(page - 1), page === 1],
                ['Next', () => executeSearch(page + 1), page >= totalPages]
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
      </div>
    </PageShell>
  );
}
