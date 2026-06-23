// ============================================================
//  VIOLATION METADATA
//
//  POLICY: This file contains ONLY static violation type definitions
//  (fine amounts, descriptions, icons, severity weights).
//
//  ALL FAKE DATA HAS BEEN REMOVED:
//    ✗ Math.random() — DELETED
//    ✗ generateViolation() — DELETED
//    ✗ generatePlate() — DELETED
//    ✗ randomBetween() / randomInt() / randomPick() — DELETED
//    ✗ SAMPLE_VIOLATIONS (fabricated dataset) — DELETED
//    ✗ Fake confidence values — DELETED
//    ✗ Fake vehicle registration numbers — DELETED
//    ✗ Fake officer IDs / camera IDs — DELETED
//
//  All violation records displayed in the UI must come from the
//  real backend API (/api/v1/violations) which is populated
//  exclusively by the YOLO + EasyOCR + rule-engine pipeline.
// ============================================================

// ── Violation Type Metadata (static config, not fabricated data) ─────────────
export const VIOLATION_TYPES = {
  HELMET: {
    id: 'HELMET',
    label: 'Helmet Violation',
    severity: 0.8,
    fine: 1000,
    description: 'Two-wheeler rider detected without helmet',
    icon: '🪖',
    color: 'orange',
  },
  SEATBELT: {
    id: 'SEATBELT',
    label: 'Seatbelt Violation',
    severity: 0.7,
    fine: 1000,
    description: 'Driver or passenger not wearing seatbelt',
    icon: '🔒',
    color: 'amber',
  },
  TRIPLE_RIDING: {
    id: 'TRIPLE_RIDING',
    label: 'Triple Riding',
    severity: 0.9,
    fine: 2000,
    description: 'More than 2 riders on a two-wheeler',
    icon: '👥',
    color: 'red',
  },
  WRONG_SIDE: {
    id: 'WRONG_SIDE',
    label: 'Wrong Side Driving',
    severity: 0.95,
    fine: 5000,
    description: 'Vehicle driving against traffic flow',
    icon: '⬅️',
    color: 'red',
  },
  STOP_LINE: {
    id: 'STOP_LINE',
    label: 'Stop Line Violation',
    severity: 0.75,
    fine: 500,
    description: 'Vehicle crossed stop line at signal',
    icon: '🛑',
    color: 'orange',
  },
  RED_LIGHT: {
    id: 'RED_LIGHT',
    label: 'Red Light Violation',
    severity: 1.0,
    fine: 5000,
    description: 'Vehicle crossed intersection during red signal',
    icon: '🔴',
    color: 'red',
  },
  ILLEGAL_PARKING: {
    id: 'ILLEGAL_PARKING',
    label: 'Illegal Parking',
    severity: 0.3,
    fine: 500,
    description: 'Vehicle parked in restricted/no-parking zone',
    icon: '🅿️',
    color: 'yellow',
  },
};

/**
 * Get violation type metadata for a backend violation_type string.
 * Maps backend snake_case keys (helmet_missing, seatbelt_missing, etc.)
 * to the VIOLATION_TYPES config above.
 *
 * @param {string} violationType - backend violation_type value
 * @returns {object|null}
 */
export function getViolationMeta(violationType) {
  if (!violationType) return null;

  const keyMap = {
    'helmet_missing':   'HELMET',
    'seatbelt_missing': 'SEATBELT',
    'triple_riding':    'TRIPLE_RIDING',
    'wrong_side':       'WRONG_SIDE',
    'stop_line':        'STOP_LINE',
    'red_light':        'RED_LIGHT',
    'illegal_parking':  'ILLEGAL_PARKING',
  };

  const key = keyMap[violationType.toLowerCase()];
  return key ? VIOLATION_TYPES[key] : null;
}
