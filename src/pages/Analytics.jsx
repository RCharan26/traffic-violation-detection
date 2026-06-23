import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, AlertTriangle, Zap, BarChart2, Target, RefreshCw,
  Server, Image as ImageIcon, Car, ShieldAlert
} from 'lucide-react';
import { useViolations } from '../context/ViolationContext.jsx';
import PageShell from '../components/layout/PageShell.jsx';

// ── Color System ──────────────────────────────────────────────────────────────
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const SEVERITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
};

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-bold text-slate-300 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color || '#60a5fa' }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colorMap = {
    blue:   'text-blue-400  bg-blue-500/10  border-blue-500/20',
    red:    'text-red-400   bg-red-500/10   border-red-500/20',
    green:  'text-green-400 bg-green-500/10 border-green-500/20',
    amber:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`p-2 rounded-lg border ${cls}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-100 font-mono tabular-nums">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <BarChart2 size={36} className="mx-auto mb-3 text-slate-700" />
      <p className="text-sm font-bold text-slate-400">No Analytics Data Available</p>
      <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
        Upload images and run the detection pipeline to generate real analytics from your database.
      </p>
    </div>
  );
}

// ── Main Analytics Page ───────────────────────────────────────────────────────
export default function Analytics() {
  const { state, actions } = useViolations();
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await actions.fetchAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const summary = analyticsData?.summary;
  const trend   = analyticsData?.trend;
  const violDist = analyticsData?.violation_distribution || [];
  const categories = analyticsData?.vehicle_categories || [];
  const confByType = analyticsData?.avg_confidence_by_type || {};
  const topLocations = analyticsData?.top_locations || [];
  const hasData = analyticsData?.has_data === true;

  // Build chart data from real API response
  const dailyChartData = (trend?.daily || []).map(d => ({
    label: d.label?.slice(5) || d.label, // "MM-DD" from "YYYY-MM-DD"
    count: d.count,
  }));

  const violDistChart = violDist.map((v, i) => ({
    name: v.violation_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: v.count,
    pct: v.percentage,
  }));

  const catChart = categories.map(c => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    count: c.count,
  }));

  const confChart = Object.entries(confByType).map(([type, conf]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    confidence: Math.round(conf * 100),
  }));

  const headerRight = (
    <button onClick={loadAnalytics} disabled={loading}
      className="btn-secondary text-xs flex items-center gap-1.5">
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh DB
    </button>
  );

  return (
    <PageShell
      label="Analytics Dashboard"
      title="Enforcement Intelligence"
      subtitle="All data aggregated from real detection pipeline results — zero hardcoded values."
      accent
      headerRight={headerRight}
    >

      {/* Loading */}
      {loading && (
        <div className="card p-8 text-center mb-6">
          <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-blue-400" />
          <p className="text-xs text-slate-400">Querying database aggregates...</p>
        </div>
      )}

      {/* No data state */}
      {!loading && !hasData && <EmptyState />}

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      {!loading && hasData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Images Processed"
              value={summary?.total_images_processed?.toLocaleString()}
              icon={ImageIcon}
              color="blue"
              sub="Completed pipeline runs"
            />
            <StatCard
              label="Vehicles Detected"
              value={summary?.total_vehicles_detected?.toLocaleString()}
              icon={Car}
              color="purple"
              sub="YOLOv11 detections"
            />
            <StatCard
              label="Total Violations"
              value={summary?.total_violations?.toLocaleString()}
              icon={ShieldAlert}
              color="red"
              sub="Rule-engine violations"
            />
            <StatCard
              label="Avg Confidence"
              value={summary?.avg_detection_confidence
                ? `${Math.round(summary.avg_detection_confidence * 100)}%`
                : '—'}
              icon={Target}
              color="green"
              sub="Violation confidence avg"
            />
          </div>

          {/* ── Violation type breakdown stats ────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Helmet Missing',    value: summary?.helmet_violations,   color: 'red' },
              { label: 'Seatbelt Missing',  value: summary?.seatbelt_violations, color: 'amber' },
              { label: 'Triple Riding',     value: summary?.triple_riding,       color: 'red' },
              { label: 'Wrong Side',        value: summary?.wrong_side,          color: 'red' },
              { label: 'Red Light',         value: summary?.red_light,           color: 'red' },
              { label: 'Stop Line Cross',   value: summary?.stop_line,           color: 'amber' },
              { label: 'Illegal Parking',   value: summary?.illegal_parking,     color: 'amber' },
              { label: 'Avg Pipeline (ms)', value: summary?.avg_processing_time_ms
                ? `${Math.round(summary.avg_processing_time_ms)}ms` : '—', color: 'blue' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
                <p className="text-xl font-bold text-slate-100 font-mono">{value ?? 0}</p>
              </div>
            ))}
          </div>

          {/* ── Charts row 1 ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Daily trend */}
            <div className="card p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Daily Violation Trend (Last 30 Days)
              </p>
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                          fill="url(#blueGrad)" name="Violations" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-600 text-xs">
                  Process images to see daily trend data.
                </div>
              )}
            </div>

            {/* Violation distribution bar chart */}
            <div className="card p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Violation Type Distribution
              </p>
              {violDistChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={violDistChart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                      {violDistChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-600 text-xs">
                  No violation data yet.
                </div>
              )}
            </div>
          </div>

          {/* ── Charts row 2 ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Vehicle category breakdown */}
            <div className="card p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Vehicle Category Breakdown (YOLO)
              </p>
              {catChart.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={catChart} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                           paddingAngle={3} dataKey="count">
                        {catChart.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {catChart.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full"
                             style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-slate-400">{c.name} ({c.count})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-600 text-xs">
                  No vehicle detection data yet.
                </div>
              )}
            </div>

            {/* Avg confidence by violation type */}
            <div className="card p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Avg Confidence by Violation Type
              </p>
              {confChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={confChart} margin={{ top: 0, right: 8, left: -10, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }}
                           tickLine={false} axisLine={false} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }}
                           tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="confidence" radius={[0, 4, 4, 0]} name="Confidence %" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-600 text-xs">
                  No confidence data yet.
                </div>
              )}
            </div>
          </div>

          {/* ── Top Locations ────────────────────────────────────── */}
          {topLocations.length > 0 && (
            <div className="card p-5 mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Top Violation Hotspots (by Camera Location Label)
              </p>
              <div className="space-y-3">
                {topLocations.map((loc, i) => {
                  const maxCount = topLocations[0]?.violation_count || 1;
                  const pct = Math.round((loc.violation_count / maxCount) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate mb-1">
                          {loc.location}
                        </p>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-400 font-mono w-8 text-right">
                        {loc.violation_count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Processing performance ────────────────────────────── */}
          <div className="card p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Pipeline Performance Summary
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-slate-500 mb-1">Avg Processing Time</p>
                <p className="text-xl font-bold font-mono text-blue-400">
                  {summary?.avg_processing_time_ms
                    ? `${Math.round(summary.avg_processing_time_ms)}ms`
                    : '—'}
                </p>
                <p className="text-slate-600 mt-0.5">per image</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-slate-500 mb-1">Avg Violation Conf.</p>
                <p className="text-xl font-bold font-mono text-green-400">
                  {summary?.avg_detection_confidence
                    ? `${Math.round(summary.avg_detection_confidence * 100)}%`
                    : '—'}
                </p>
                <p className="text-slate-600 mt-0.5">rule engine output</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-slate-500 mb-1">Vehicles per Image</p>
                <p className="text-xl font-bold font-mono text-purple-400">
                  {summary?.total_images_processed > 0
                    ? (summary.total_vehicles_detected / summary.total_images_processed).toFixed(1)
                    : '—'}
                </p>
                <p className="text-slate-600 mt-0.5">avg YOLO detections</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-slate-500 mb-1">Violations per Image</p>
                <p className="text-xl font-bold font-mono text-red-400">
                  {summary?.total_images_processed > 0
                    ? (summary.total_violations / summary.total_images_processed).toFixed(2)
                    : '—'}
                </p>
                <p className="text-slate-600 mt-0.5">avg rule triggers</p>
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
