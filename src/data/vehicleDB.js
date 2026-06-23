// ============================================================
//  VEHICLE DATABASE UTILITIES
//
//  POLICY: All hardcoded fake vehicle registration numbers,
//  owner names, and repeat-offender lists have been REMOVED.
//
//  REMOVED:
//    ✗ VEHICLE_DB (hardcoded fake plate → owner mapping) — DELETED
//    ✗ REPEAT_OFFENDERS (fabricated list) — DELETED
//
//  Reason: Displaying hardcoded fake plate numbers (KA01AB1234 etc.)
//  alongside real detection results violates the ANPR honesty policy.
//  Vehicle owner lookups must come from a real RTO database integration,
//  not a static frontend table.
//
//  RETAINED:
//    ✓ getVehicleInfo() — returns "Unknown" placeholders until real
//      RTO API integration is available.
// ============================================================

/**
 * Look up vehicle ownership information for a license plate.
 *
 * NOTE: Real owner data requires integration with the Karnataka
 * RTO vehicle registration database (VAHAN). Until that integration
 * is implemented, this function returns "Unknown" to avoid displaying
 * fabricated owner names.
 *
 * @param {string} plate - The license plate number from OCR
 * @returns {{ owner: string, type: string, model: string, color: string, year: string }}
 */
export const getVehicleInfo = (plate) => {
  // Do not fabricate owner names — return honest "Unknown" until RTO integration
  return {
    owner: 'Unknown Owner (RTO lookup required)',
    type: 'Unknown',
    model: 'Unknown Vehicle',
    color: 'Unknown',
    year: '—',
  };
};
