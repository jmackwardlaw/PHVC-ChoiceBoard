import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ReportRow = { name: string; done: number; total: number };

type ReportInput = {
  title: string;
  subtitle: string;
  accent: string; // hex like "#E20706"
  rows: ReportRow[];
};

// Letter, portrait.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const ROW_H = 22;

// Column x-offsets (from left margin) and the text alignment for each.
const COLS = {
  rank: 0,
  name: 40,
  done: 340,
  total: 410,
  pct: 480,
};

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0.13, 0.09, 0.15);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export async function completionReportPdf(input: ReportInput): Promise<Uint8Array> {
  const { title, subtitle, rows } = input;
  const accent = hexToRgb(input.accent);
  const ink = rgb(0.06, 0.09, 0.15);
  const muted = rgb(0.45, 0.47, 0.52);
  const line = rgb(0.85, 0.86, 0.88);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const total = rows[0]?.total ?? 0;
  const finished = rows.filter((r) => r.done === r.total && r.total > 0).length;
  const cells = rows.length * total;
  const doneSum = rows.reduce((s, r) => s + r.done, 0);
  const avgPct = cells > 0 ? Math.round((doneSum / cells) * 100) : 0;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Header.
  if (subtitle) {
    page.drawText(subtitle.toUpperCase(), { x: MARGIN, y, size: 10, font: bold, color: accent });
    y -= 16;
  }
  page.drawText(title, { x: MARGIN, y: y - 12, size: 22, font: bold, color: ink });
  y -= 34;
  page.drawText(
    `${rows.length} athletes  ·  ${avgPct}% average completion  ·  ${finished} finished all ${total} tasks`,
    { x: MARGIN, y, size: 10, font, color: muted },
  );
  y -= 24;

  const drawHeaderRow = (p: PDFPage) => {
    p.drawText("#", { x: MARGIN + COLS.rank, y, size: 9, font: bold, color: muted });
    p.drawText("ATHLETE", { x: MARGIN + COLS.name, y, size: 9, font: bold, color: muted });
    drawRight(p, bold, "DONE", MARGIN + COLS.done + 30, y, 9, muted);
    drawRight(p, bold, "TOTAL", MARGIN + COLS.total + 30, y, 9, muted);
    drawRight(p, bold, "PERCENT", MARGIN + COLS.pct + 42, y, 9, muted);
    y -= 6;
    p.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: line,
    });
    y -= ROW_H - 6;
  };

  drawHeaderRow(page);

  rows.forEach((r, i) => {
    // New page when we run out of vertical room.
    if (y < MARGIN + ROW_H) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      drawHeaderRow(page);
    }
    const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
    const complete = r.done === r.total && r.total > 0;
    const rowFont = complete ? bold : font;
    const name = truncate(r.name, font, 11, COLS.done - COLS.name - 12);

    page.drawText(String(i + 1), { x: MARGIN + COLS.rank, y, size: 11, font, color: muted });
    page.drawText(complete ? `${name}  *` : name, {
      x: MARGIN + COLS.name,
      y,
      size: 11,
      font: rowFont,
      color: ink,
    });
    drawRight(page, font, String(r.done), MARGIN + COLS.done + 30, y, 11, ink);
    drawRight(page, font, String(r.total), MARGIN + COLS.total + 30, y, 11, muted);
    drawRight(page, bold, `${pct}%`, MARGIN + COLS.pct + 42, y, 11, complete ? accent : ink);

    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: line,
    });
    y -= ROW_H - 4;
  });

  if (rows.length === 0) {
    page.drawText("No athletes to report on.", { x: MARGIN, y, size: 11, font, color: muted });
  }

  return doc.save();
}

function drawRight(
  page: PDFPage,
  font: PDFFont,
  text: string,
  rightX: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font, color });
}

// Trim a string so it fits within maxWidth at the given size, adding an ellipsis.
function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && font.widthOfTextAtSize(s + "…", size) > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "…";
}
