// ============================================================
//  DATA STORE — DEPRECATED
//
//  This localStorage-backed store is no longer used.
//  All violation data now comes from the real backend API
//  via ViolationContext → api.js → FastAPI.
//
//  REMOVED:
//    ✗ import of SAMPLE_VIOLATIONS (no longer exported) — DELETED
//    ✗ initStore() pre-seeding with fake data — DELETED
//    ✗ resetToSample() — DELETED
//
//  The functions below are kept as stubs only; no component
//  imports this file in the active application.
// ============================================================

const STORAGE_KEY = 'steis_violations';

export function getAllViolations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function addViolation(violation) {
  const violations = getAllViolations();
  violations.unshift(violation);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(violations));
  return violation;
}

export function updateViolationStatus(id, status) {
  const violations = getAllViolations();
  const idx = violations.findIndex(v => v.id === id);
  if (idx !== -1) {
    violations[idx].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(violations));
    return violations[idx];
  }
  return null;
}

export function deleteViolation(id) {
  const violations = getAllViolations().filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(violations));
}

export function searchViolations(query, filters = {}) {
  let violations = getAllViolations();

  if (query) {
    const q = query.toLowerCase();
    violations = violations.filter(v =>
      v.vehicleNumber?.toLowerCase().includes(q) ||
      v.violationLabel?.toLowerCase().includes(q) ||
      v.location?.zone?.toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== 'all') {
    violations = violations.filter(v => v.status === filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    violations = violations.filter(v => v.eps?.priority === filters.priority);
  }

  if (filters.zone && filters.zone !== 'all') {
    violations = violations.filter(v => v.location?.zoneId === filters.zone);
  }

  if (filters.violationType && filters.violationType !== 'all') {
    violations = violations.filter(v => v.violationType === filters.violationType);
  }

  if (filters.dateFrom) {
    violations = violations.filter(v => new Date(v.timestamp) >= new Date(filters.dateFrom));
  }

  if (filters.dateTo) {
    violations = violations.filter(v => new Date(v.timestamp) <= new Date(filters.dateTo));
  }

  return violations;
}
