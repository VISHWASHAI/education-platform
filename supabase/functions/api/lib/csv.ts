import { Context } from 'npm:hono@4';
import { parse } from 'npm:csv-parse@5.5.6/sync';
import { stringify } from 'npm:csv-stringify@6.5.0/sync';

export function parseCsv(csvText: string) {
  return parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  return stringify(rows, { header: true, columns });
}

export function sendCsv(c: Context, filename: string, rows: Record<string, unknown>[], columns: string[]) {
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  return c.body(toCsv(rows, columns));
}
