// Tiny CSV helpers. Notes are free text, so values may contain commas, quotes,
// or newlines — wrap and double-quote those. A UTF-8 BOM + CRLF line endings
// make Excel open the file correctly (including accented names).

export type CsvValue = string | number | boolean | null | undefined;

export function csvEscape(value: CsvValue): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const BOM = "﻿";

export function toCsv(rows: CsvValue[][]): string {
  return BOM + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

// Make a filesystem-safe slug for use in a download filename.
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "board"
  );
}
