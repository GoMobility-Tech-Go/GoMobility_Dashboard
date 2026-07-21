import * as XLSX from 'xlsx';

/**
 * Export data to .xlsx file and auto-download in browser.
 * @param {Object[]} rows     - Array of flat objects (one per row)
 * @param {string}   filename - Without extension (e.g. "go-mobility-users-2026-07-22")
 * @param {string}   sheet    - Sheet tab name
 */
export function exportToExcel(rows, filename, sheet = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length), 10),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Format date for display in Excel cells */
export const xlsDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Format rupee for Excel */
export const xlsRupee = (n) => (n != null ? Number(n) : '');
