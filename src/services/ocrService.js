// ============================================================
//  OCR SERVICE — Frontend utilities
//
//  CRITICAL POLICY:
//  This module does NOT simulate, generate, or fabricate OCR results.
//  All license plate numbers displayed in the UI come exclusively from
//  EasyOCR inference performed on the backend (Python/FastAPI).
//
//  The simulateOCR() function has been permanently removed.
//  All OCR results must be fetched from the real backend API.
// ============================================================

/**
 * Validate whether a plate string matches a standard Indian plate format.
 * FOR DISPLAY/REPORTING ONLY — never modifies or auto-completes the input.
 *
 * @param {string} plate - The raw OCR text to validate
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateIndianPlateFormat(plate) {
  if (!plate || typeof plate !== 'string') {
    return { valid: false, reason: 'Empty or invalid input' };
  }

  const compact = plate.replace(/\s+/g, '').toUpperCase();

  // Standard Indian plate: 2 letters + 2 digits + 1-3 letters + 1-4 digits
  // Examples: MH12AB1234, TS09AB1234, KA01A1234
  const pattern = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/;

  if (pattern.test(compact)) {
    return { valid: true, reason: `Matches Indian plate format: ${compact}` };
  }

  if (compact.length < 4) {
    return { valid: false, reason: `Too short (${compact.length} chars) to be a plate` };
  }

  if (compact.length > 13) {
    return { valid: false, reason: `Too long (${compact.length} chars) for a plate` };
  }

  return {
    valid: false,
    reason: `Does not match Indian plate format — OCR output preserved as-is: "${plate}"`,
  };
}

/**
 * Format a raw OCR plate text for display.
 * Applies case normalization only — never modifies characters.
 *
 * @param {string} rawOcrText - The exact EasyOCR output
 * @returns {string}
 */
export function formatPlateDisplay(rawOcrText) {
  if (!rawOcrText) return null;
  // Only uppercase and strip surrounding whitespace — no character substitution
  return rawOcrText.trim().toUpperCase();
}
