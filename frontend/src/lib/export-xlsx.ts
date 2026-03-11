/**
 * Client-side XLSX export helper.
 * Wraps the `xlsx` package for browser use.
 */
import * as XLSX from 'xlsx';

/**
 * Export an array of row objects to an .xlsx file and trigger a browser download.
 *
 * @param rows     Array of plain objects; keys become column headers
 * @param filename Desired download filename (without extension, e.g. "contacts")
 * @param sheetName Optional sheet name (defaults to "Sheet1")
 */
export function exportToXlsx(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1',
): void {
  if (rows.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Auto-width columns
  const colWidths = Object.keys(rows[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
