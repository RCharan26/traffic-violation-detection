// ============================================================
//  EXPORT UTILITIES
// ============================================================

export function exportToCSV(violations, filename = 'steis_violations.csv') {
  const headers = [
    'ID', 'Timestamp', 'Vehicle Number', 'Vehicle Type',
    'Violation Type', 'Location', 'Confidence', 'EPS Score',
    'Priority', 'Fine (₹)', 'Status', 'Camera ID'
  ];

  const rows = violations.map(v => [
    v.id,
    new Date(v.timestamp).toLocaleString('en-IN'),
    v.vehicleNumber,
    v.vehicleType,
    v.violationLabel || v.violationType,
    v.location?.zone,
    `${Math.round((v.confidence || 0) * 100)}%`,
    v.eps?.score || '',
    v.eps?.priority || '',
    v.fine || '',
    v.status,
    v.cameraId || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatConfidence(score) {
  return `${Math.round(score * 100)}%`;
}

export function printEvidence(violation) {
  const printWindow = window.open('', '_blank');
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>STEIS Evidence Report - ${violation.id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: Inter, sans-serif; padding: 32px; color: #0F172A; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1E40AF; }
        .title { font-size: 20px; font-weight: 700; color: #1E40AF; }
        .subtitle { font-size: 12px; color: #64748B; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
        .field { }
        .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin-bottom: 4px; }
        .value { font-size: 15px; font-weight: 600; color: #0F172A; }
        .eps-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .eps-score { font-size: 32px; font-weight: 800; color: #DC2626; }
        .footer { margin-top: 32px; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 16px; }
        .seal { font-size: 11px; font-weight: 600; color: #1E40AF; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">🚦 STEIS — Traffic Violation Evidence</div>
          <div class="subtitle">Bengaluru Traffic Police | Smart Traffic Enforcement Intelligence System</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">${violation.id}</div>
          <div class="subtitle">${new Date(violation.timestamp).toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="grid">
        <div class="field"><div class="label">Vehicle Number</div><div class="value">${violation.vehicleNumber}</div></div>
        <div class="field"><div class="label">Vehicle Type</div><div class="value">${violation.vehicleType}</div></div>
        <div class="field"><div class="label">Violation</div><div class="value">${violation.violationLabel || violation.violations?.[0]?.label}</div></div>
        <div class="field"><div class="label">Location</div><div class="value">${violation.location?.zone}</div></div>
        <div class="field"><div class="label">Confidence</div><div class="value">${Math.round((violation.confidence || violation.ocrConfidence || 0.9) * 100)}%</div></div>
        <div class="field"><div class="label">Fine Amount</div><div class="value">₹${violation.fine || violation.totalFine || 1000}</div></div>
        <div class="field"><div class="label">Status</div><div class="value">${violation.status}</div></div>
        <div class="field"><div class="label">Camera ID</div><div class="value">${violation.cameraId}</div></div>
      </div>
      <div class="eps-box">
        <div class="label">Enforcement Priority Score (EPS)</div>
        <div class="eps-score">${violation.eps?.score || ''}</div>
        <div style="font-weight:600;color:#DC2626">${violation.eps?.priority || ''} Priority</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px">${violation.eps?.recommendation || ''}</div>
      </div>
      <div class="footer">
        <div class="seal">⚖️ This is an official STEIS-generated evidence document. Record ID: ${violation.id}</div>
        <div>Generated: ${new Date().toLocaleString('en-IN')} | System: STEIS v1.0 | Hackathon Prototype</div>
      </div>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}
