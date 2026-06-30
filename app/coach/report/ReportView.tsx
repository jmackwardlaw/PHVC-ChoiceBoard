"use client";

import { useRouter } from "next/navigation";

type Row = { name: string; done: number; total: number };
type BoardOpt = { id: string; title: string; subtitle: string; is_active: boolean };

export default function ReportView({
  title,
  subtitle,
  accent,
  boardId,
  isActive,
  boards,
  rows,
}: {
  title: string;
  subtitle: string;
  accent: string;
  boardId: string;
  isActive: boolean;
  boards: BoardOpt[];
  rows: Row[];
}) {
  const router = useRouter();
  const total = rows[0]?.total ?? 0;
  const finished = rows.filter((r) => r.done === r.total && r.total > 0).length;
  const totalCells = rows.length * total;
  const totalDone = rows.reduce((sum, r) => sum + r.done, 0);
  const avgPct = totalCells > 0 ? Math.round((totalDone / totalCells) * 100) : 0;

  return (
    <div style={{ ["--accent" as string]: accent }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Progress report</h1>
          <p className="text-sm text-muted">
            A printable completion summary. Use the buttons to print or save as PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {boards.length > 1 && (
            <select
              value={boardId}
              onChange={(e) => router.push(`/coach/report?board=${e.target.value}`)}
              className="rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold outline-none"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                  {b.subtitle ? ` — ${b.subtitle}` : ""}
                  {b.is_active ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}
          <a
            href={`/api/coach/export?type=completion&boardId=${boardId}&format=pdf`}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-canvas"
          >
            Download PDF
          </a>
          <a
            href={`/api/coach/export?type=completion&boardId=${boardId}`}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-canvas"
          >
            Download CSV
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
          >
            Print
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="mb-5 border-b border-line pb-4">
          <p className="font-display text-sm font-bold uppercase tracking-widest text-accent">
            {subtitle || (isActive ? "Active board" : "Past board")}
          </p>
          <h2 className="font-display text-3xl font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            {rows.length} athletes · {avgPct}% average completion · {finished} finished all{" "}
            {total} tasks
          </p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 pr-3 font-bold">#</th>
              <th className="py-2 pr-3 font-bold">Athlete</th>
              <th className="py-2 pr-3 text-center font-bold">Done</th>
              <th className="py-2 pr-3 text-center font-bold">Total</th>
              <th className="py-2 text-center font-bold">Percent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
              const done = r.done === r.total && r.total > 0;
              return (
                <tr key={r.name} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="py-2 pr-3 font-semibold">
                    {done && "🏆 "}
                    {r.name}
                  </td>
                  <td className="py-2 pr-3 text-center tabular-nums">{r.done}</td>
                  <td className="py-2 pr-3 text-center tabular-nums text-muted">{r.total}</td>
                  <td className="py-2 text-center font-bold tabular-nums">{pct}%</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted">
                  No athletes to report on.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
