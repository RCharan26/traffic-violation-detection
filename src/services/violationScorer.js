// ============================================================
//  VIOLATION SCORER
//  Enforcement Priority Score (EPS) calculation
//  EPS = 0.4×Severity + 0.3×RepeatScore + 0.2×ZoneRisk + 0.1×TimeRisk
// ============================================================

export const EPS_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 0,
};

export function calculateEPS({ severity, repeatScore, zoneRisk, timeRisk }) {
  const rawScore =
    0.4 * (severity || 0) +
    0.3 * (repeatScore || 0) +
    0.2 * (zoneRisk || 0) +
    0.1 * (timeRisk || 0);

  return Math.round(rawScore * 100);
}

export function getEPSPriority(score) {
  if (score >= EPS_THRESHOLDS.CRITICAL) return 'Critical';
  if (score >= EPS_THRESHOLDS.HIGH) return 'High';
  if (score >= EPS_THRESHOLDS.MEDIUM) return 'Medium';
  return 'Low';
}

export function getEPSColor(priority) {
  switch (priority) {
    case 'Critical': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    case 'High':     return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
    case 'Medium':   return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    case 'Low':      return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    default:         return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
  }
}

export function getEPSGaugeColor(score) {
  if (score >= 80) return '#DC2626';
  if (score >= 60) return '#EA580C';
  if (score >= 40) return '#D97706';
  return '#16A34A';
}

// Severity lookup by violation type
export const VIOLATION_SEVERITY = {
  HELMET:         0.80,
  SEATBELT:       0.70,
  TRIPLE_RIDING:  0.90,
  WRONG_SIDE:     0.95,
  STOP_LINE:      0.75,
  RED_LIGHT:      1.00,
  ILLEGAL_PARKING: 0.30,
};

// Time risk score based on hour of day
export function getTimeRisk(hour) {
  const rushMorning = hour >= 8 && hour <= 10;
  const rushEvening = hour >= 17 && hour <= 20;
  const lateNight   = hour >= 23 || hour <= 4;
  if (rushMorning || rushEvening) return 1.0;
  if (lateNight) return 0.85;
  return 0.5;
}
