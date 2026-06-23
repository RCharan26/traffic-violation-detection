// ============================================================
//  ANALYTICS ENGINE
//  Aggregation helpers that work on REAL backend API data.
//
//  POLICY:
//    All functions in this module receive real data arrays fetched
//    from the backend API (/api/v1/analytics, /api/v1/violations).
//    No sample data, no Math.random(), no fabricated values.
//
//  REMOVED:
//    ✗ import of SAMPLE_VIOLATIONS (fabricated dataset) — DELETED
//    ✗ Any function that generated or assumed fake violations — DELETED
// ============================================================

import { BENGALURU_ZONES } from '../data/zones.js';
import { VIOLATION_TYPES } from '../data/sampleViolations.js';

// ── KPI Aggregations ─────────────────────────────────────────
// Receives real violations from backend API — no sample data
export function computeKPIs(violations) {
  if (!Array.isArray(violations) || violations.length === 0) {
    return {
      totalViolations: 0,
      todayViolations: 0,
      repeatOffenders: 0,
      criticalViolations: 0,
      highRiskZones: 0,
      totalFinesCollected: 0,
      pendingCount: 0,
      issuedCount: 0,
      recoveryRate: 0,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayViolations = violations.filter(v => new Date(v.timestamp) >= todayStart);

  const repeatOffenders = new Set(
    violations
      .filter(v => v.repeatCount >= 3)
      .map(v => v.vehicleNumber)
  );

  const criticalViolations = violations.filter(v => v.eps?.priority === 'Critical');
  const highRiskZones = BENGALURU_ZONES.filter(z => z.riskScore >= 0.75);
  const totalFines = violations
    .filter(v => v.status === 'Paid')
    .reduce((sum, v) => sum + (v.fine || 0), 0);

  return {
    totalViolations: violations.length,
    todayViolations: todayViolations.length,
    repeatOffenders: repeatOffenders.size,
    criticalViolations: criticalViolations.length,
    highRiskZones: highRiskZones.length,
    totalFinesCollected: totalFines,
    pendingCount: violations.filter(v => v.status === 'Pending').length,
    issuedCount: violations.filter(v => v.status === 'Issued').length,
    recoveryRate: violations.length > 0
      ? Math.round((violations.filter(v => v.status === 'Paid').length / violations.length) * 100)
      : 0,
  };
}

// ── Violations by Type ────────────────────────────────────────
// Works on real violation arrays — no hardcoded counts
export function getViolationsByType(violations) {
  if (!Array.isArray(violations)) return [];

  const counts = {};
  Object.values(VIOLATION_TYPES).forEach(v => { counts[v.label] = 0; });

  violations.forEach(v => {
    const meta = VIOLATION_TYPES[v.violationType];
    if (meta) counts[meta.label] = (counts[meta.label] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Daily Trend (last N days) ─────────────────────────────────
// Aggregates real violation timestamps — no random generation
export function getDailyTrend(violations, days = 30) {
  if (!Array.isArray(violations)) return [];

  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd   = new Date(dayStart.getTime() + 86400000);

    const count = violations.filter(v => {
      const t = new Date(v.timestamp);
      return t >= dayStart && t < dayEnd;
    }).length;

    result.push({
      date: dateStr,
      day: date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      count,
    });
  }

  return result;
}

// ── Weekly Trend ──────────────────────────────────────────────
export function getWeeklyTrend(violations, weeks = 8) {
  if (!Array.isArray(violations)) return [];

  const result = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = violations.filter(v => {
      const t = new Date(v.timestamp);
      return t >= weekStart && t < weekEnd;
    }).length;

    result.push({
      week: `W${weeks - i}`,
      label: `${weekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
      count,
    });
  }

  return result;
}

// ── Vehicle Type Breakdown ────────────────────────────────────
export function getVehicleTypeBreakdown(violations) {
  if (!Array.isArray(violations)) return [];

  const counts = {};
  violations.forEach(v => {
    counts[v.vehicleType] = (counts[v.vehicleType] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

// ── Priority Distribution ─────────────────────────────────────
export function getPriorityDistribution(violations) {
  if (!Array.isArray(violations)) return [];

  const dist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  violations.forEach(v => {
    const p = v.eps?.priority;
    if (p && dist[p] !== undefined) dist[p]++;
  });
  return Object.entries(dist).map(([name, value]) => ({ name, value }));
}

// ── Hourly Pattern ────────────────────────────────────────────
export function getHourlyPattern(violations) {
  if (!Array.isArray(violations)) return [];

  const hours = Array(24).fill(0);
  violations.forEach(v => {
    const h = new Date(v.timestamp).getHours();
    hours[h]++;
  });
  return hours.map((count, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    count,
  }));
}

// ── Repeat Offender Leaderboard ───────────────────────────────
// Works on real violation arrays fetched from backend
export function getRepeatOffenderLeaderboard(violations, topN = 10) {
  if (!Array.isArray(violations) || violations.length === 0) return [];

  const vehicleCounts = {};
  const vehicleViolations = {};

  violations.forEach(v => {
    vehicleCounts[v.vehicleNumber] = (vehicleCounts[v.vehicleNumber] || 0) + 1;
    if (!vehicleViolations[v.vehicleNumber]) vehicleViolations[v.vehicleNumber] = [];
    vehicleViolations[v.vehicleNumber].push(v);
  });

  return Object.entries(vehicleCounts)
    .map(([plate, count]) => {
      const vList = vehicleViolations[plate];
      const maxEps = Math.max(...vList.map(v => v.eps?.score || 0));
      return {
        vehicleNumber: plate,
        violationCount: count,
        maxEps,
        priority: vList[0]?.eps?.priority || 'Low',
        types: [...new Set(vList.map(v => v.violationType))],
        totalFine: vList.reduce((s, v) => s + (v.fine || 0), 0),
      };
    })
    .sort((a, b) => b.violationCount - a.violationCount)
    .slice(0, topN);
}

// ── Predictive Risk Index (PRI) ───────────────────────────────
/**
 * Computes next-week violation prediction for a zone.
 * Operates on REAL violation data fetched from backend.
 * No random values — trend computed from actual timestamps.
 */
export function computePRI(zone, zoneViolations) {
  if (!Array.isArray(zoneViolations)) zoneViolations = [];

  const recentWeek = zoneViolations.filter(v => {
    const t = new Date(v.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return t >= weekAgo;
  }).length;

  const previousWeek = zoneViolations.filter(v => {
    const t = new Date(v.timestamp);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return t >= twoWeeksAgo && t < weekAgo;
  }).length;

  const trend = previousWeek > 0
    ? (recentWeek - previousWeek) / previousWeek
    : 0.0; // No fake 0.1 default — honest zero when no prior week data

  const baselinePrediction = zone.avgDailyViolations * 7;
  const trendFactor = 1 + Math.min(Math.max(trend, -0.3), 0.5);
  const riskFactor = zone.riskScore;

  const predicted = Math.round(baselinePrediction * trendFactor * (0.7 + riskFactor * 0.3));
  const current = zone.avgDailyViolations * 7;

  const priScore = Math.round(riskFactor * 100 * trendFactor);
  const riskLevel = priScore >= 80 ? 'Critical' : priScore >= 60 ? 'High' : priScore >= 40 ? 'Medium' : 'Low';

  return {
    currentWeekActual: recentWeek,
    predictedNextWeek: predicted,
    currentBaseline: current,
    trend: trend > 0.05 ? 'Rising' : trend < -0.05 ? 'Declining' : 'Stable',
    trendPercent: Math.round(trend * 100),
    priScore,
    riskLevel,
    // Confidence based on data volume — not a fabricated default
    confidence: zoneViolations.length > 10
      ? Math.round((0.75 + riskFactor * 0.2) * 100)
      : Math.round((0.40 + riskFactor * 0.1) * 100), // low when little data
  };
}

// ── Zone Analytics ────────────────────────────────────────────
// Works on real violation arrays — no fake data injection
export function getZoneAnalytics(violations) {
  if (!Array.isArray(violations)) violations = [];

  return BENGALURU_ZONES.map(zone => {
    const zoneViolations = violations.filter(v => v.location?.zoneId === zone.id);
    const criticalCount = zoneViolations.filter(v => v.eps?.priority === 'Critical').length;

    return {
      ...zone,
      violationCount: zoneViolations.length,
      criticalCount,
      pri: computePRI(zone, zoneViolations),
    };
  }).sort((a, b) => b.violationCount - a.violationCount);
}
