/**
 * Client-side XLSX export helper.
 * Wraps the `xlsx` package for browser use.
 * Includes email-based deduplication before export.
 */
import * as XLSX from 'xlsx';

/**
 * Export an array of row objects to an .xlsx file and trigger a browser download.
 *
 * @param inputRows  Array of plain objects; keys become column headers
 * @param filename   Desired download filename (without extension, e.g. "contacts")
 * @param sheetName  Optional sheet name (defaults to "Sheet1")
 */
export function exportToXlsx(
  inputRows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1',
): void {
  let rows = [...inputRows];
  if (rows.length === 0) return;

  // Deduplicate by email if the column exists
  if ('email' in rows[0]) {
    const seen = new Set<string>();
    const before = rows.length;
    rows = rows.filter((r) => {
      const email = String(r.email || '').toLowerCase().trim();
      if (!email) return true; // keep rows without email
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
    if (rows.length < before) {
      console.log(`XLSX export: deduplicated ${before - rows.length} duplicate emails`);
    }
  }

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
