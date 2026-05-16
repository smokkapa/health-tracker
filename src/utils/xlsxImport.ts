import * as XLSX from 'xlsx';
import { MetricEntry } from '../types';

export interface ParsedEntries {
  entries: Omit<MetricEntry, 'id'>[];
  personsFound: string[];
}

const BP_RE = /^\s*(\d+)\s*\/\s*(\d+)(?:\s*\/\s*(\d+))?(?:\s*@\s*(\d{1,2}):(\d{2}))?/;
const SUGAR_RE = /^\s*(\d+(?:\.\d+)?)\s*mg\/dl(?:\s*@\s*(\d{1,2}):(\d{2}))?/i;

/** Convert a sheet date cell (Date, ISO string, or Excel serial) to a YYYY-MM-DD string anchored at local noon for stability. */
function cellToDate(cell: unknown): Date | null {
  if (cell == null || cell === '') return null;
  if (cell instanceof Date) {
    if (isNaN(cell.getTime())) return null;
    // Use date components in UTC to avoid TZ drift from XLSX's UTC-midnight dates.
    const y = cell.getUTCFullYear();
    const m = cell.getUTCMonth();
    const d = cell.getUTCDate();
    return new Date(y, m, d);
  }
  if (typeof cell === 'number') {
    // Excel serial date: days since 1899-12-30
    const ms = Math.round((cell - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    if (isNaN(dt.getTime())) return null;
    return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  }
  if (typeof cell === 'string') {
    // Try YYYY-MM-DD first
    const m = cell.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      return new Date(y, mo, d);
    }
    const dt = new Date(cell);
    if (!isNaN(dt.getTime())) {
      return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
    }
  }
  return null;
}

function combineDateTime(date: Date, hh: number, mm: number): string {
  const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm, 0, 0);
  return dt.toISOString();
}

function rowsFromSheet(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
}

function asStr(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function discoverPersons(workbook: XLSX.WorkBook): string[] {
  const set = new Set<string>();

  const bpWs = workbook.Sheets['Blood Pressure'];
  if (bpWs) {
    const rows = rowsFromSheet(bpWs);
    const header = rows[0] ?? [];
    for (let c = 1; c < header.length; c++) {
      const name = asStr(header[c]).trim();
      if (name) set.add(name);
    }
  }

  const sugarWs = workbook.Sheets['sugar'];
  if (sugarWs) {
    const rows = rowsFromSheet(sugarWs);
    const header = rows[0] ?? [];
    for (let c = 1; c < header.length; c++) {
      const name = asStr(header[c]).trim();
      if (name) set.add(name);
    }
  }

  return Array.from(set);
}

function parseBloodPressure(
  ws: XLSX.WorkSheet,
  personFilter: string | undefined,
): Omit<MetricEntry, 'id'>[] {
  const rows = rowsFromSheet(ws);
  if (rows.length === 0) return [];

  const header = rows[0] ?? [];
  // Column index → person name (only columns whose header matches filter, or all if no filter)
  const personCols: { col: number; name: string }[] = [];
  for (let c = 1; c < header.length; c++) {
    const name = asStr(header[c]).trim();
    if (!name) continue;
    if (personFilter && name !== personFilter) continue;
    personCols.push({ col: c, name });
  }
  if (personCols.length === 0) return [];

  const out: Omit<MetricEntry, 'id'>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const date = cellToDate(row[0]);
    if (!date) continue;

    for (const { col } of personCols) {
      const cell = row[col];
      if (cell == null || cell === '') continue;
      const m = asStr(cell).match(BP_RE);
      if (!m) continue;
      const systolic = parseInt(m[1], 10);
      const diastolic = parseInt(m[2], 10);
      const pulse = m[3] != null ? parseInt(m[3], 10) : undefined;
      const hh = m[4] != null ? parseInt(m[4], 10) : 0;
      const mm = m[5] != null ? parseInt(m[5], 10) : 0;
      if (!isFinite(systolic) || !isFinite(diastolic)) continue;

      const entry: Omit<MetricEntry, 'id'> = {
        metric_type: 'blood_pressure',
        timestamp: combineDateTime(date, hh, mm),
        source: 'manual',
        systolic,
        diastolic,
        unit: 'mmHg',
      };
      if (pulse != null && isFinite(pulse)) entry.pulse = pulse;
      out.push(entry);
    }
  }
  return out;
}

function parseSugar(
  ws: XLSX.WorkSheet,
  personFilter: string | undefined,
): Omit<MetricEntry, 'id'>[] {
  const rows = rowsFromSheet(ws);
  if (rows.length < 2) return [];

  // Person names are on row 0 above their "reading" column.
  // Sub-headers (reading/fasting or not/notes) are on row 1.
  const personRow = rows[0] ?? [];
  const subRow = rows[1] ?? [];

  // Build person blocks by finding sub-header "reading" positions and grouping with following 2 cols.
  const blocks: { name: string; readingCol: number; fastingCol: number; notesCol: number }[] = [];
  for (let c = 1; c < subRow.length; c++) {
    const sub = asStr(subRow[c]).trim().toLowerCase();
    if (sub !== 'reading') continue;
    // Find the nearest non-empty person label at or to the left of this column on row 0.
    let name = '';
    for (let k = c; k >= 0; k--) {
      const candidate = asStr(personRow[k]).trim();
      if (candidate) {
        name = candidate;
        break;
      }
    }
    if (!name) continue;
    if (personFilter && name !== personFilter) continue;
    blocks.push({ name, readingCol: c, fastingCol: c + 1, notesCol: c + 2 });
  }
  if (blocks.length === 0) return [];

  const out: Omit<MetricEntry, 'id'>[] = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const date = cellToDate(row[0]);
    if (!date) continue;

    for (const blk of blocks) {
      const cell = row[blk.readingCol];
      if (cell == null || cell === '') continue;
      const text = asStr(cell);
      const m = text.match(SUGAR_RE);
      if (!m) continue;
      const value = parseFloat(m[1]);
      if (!isFinite(value)) continue;
      const hh = m[2] != null ? parseInt(m[2], 10) : 0;
      const mm = m[3] != null ? parseInt(m[3], 10) : 0;

      const fastingRaw = asStr(row[blk.fastingCol]).trim().toLowerCase();
      const fasting =
        fastingRaw === 'fasting' ? true : fastingRaw === 'not fasting' ? false : undefined;
      const notesRaw = asStr(row[blk.notesCol]).trim();

      const entry: Omit<MetricEntry, 'id'> = {
        metric_type: 'blood_sugar',
        timestamp: combineDateTime(date, hh, mm),
        source: 'manual',
        value,
        unit: 'mg/dL',
      };
      if (fasting != null) entry.fasting = fasting;
      if (notesRaw) entry.notes = notesRaw;
      out.push(entry);
    }
  }
  return out;
}

export function parseXlsx(bytes: Uint8Array, personFilter?: string): ParsedEntries {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
  const personsFound = discoverPersons(workbook);

  const entries: Omit<MetricEntry, 'id'>[] = [];
  const bpWs = workbook.Sheets['Blood Pressure'];
  if (bpWs) entries.push(...parseBloodPressure(bpWs, personFilter));
  const sugarWs = workbook.Sheets['sugar'];
  if (sugarWs) entries.push(...parseSugar(sugarWs, personFilter));

  return { entries, personsFound };
}
