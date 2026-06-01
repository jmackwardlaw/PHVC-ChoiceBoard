"use client";

import { useEffect, useMemo, useState } from "react";
import type { Athlete, Board, Submission, Task } from "@/lib/types";

type Cell = { athlete: Athlete; task: Task; sub: Submission };

export default function Dashboard({
  board,
  tasks,
  athletes,
  submissions,
}: {
  board: Board;
  tasks: Task[];
  athletes: Athlete[];
  submissions: Submission[];
}) {
  const [viewing, setViewing] = useState<Cell | null>(null);

  // Lookup: "athleteId:taskId" → latest submission.
  const byKey = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const s of submissions) {
      const key = `${s.athlete_id}:${s.task_id}`;
      if (!map.has(key)) map.set(key, s); // submissions arrive newest-first
    }
    return map;
  }, [submissions]);

  const rows = useMemo(() => {
    return athletes
      .map((a) => {
        const done = tasks.filter((t) => byKey.has(`${a.id}:${t.id}`)).length;
        return { athlete: a, done };
      })
      .sort((x, y) => y.done - x.done || x.athlete.name.localeCompare(y.athlete.name));
  }, [athletes, tasks, byKey]);

  const total = tasks.length;
  const finishedAll = rows.filter((r) => r.done === total && total > 0);
  const totalCells = athletes.length * total;
  const totalDone = rows.reduce((sum, r) => sum + r.done, 0);
  const avgPct = totalCells > 0 ? Math.round((totalDone / totalCells) * 100) : 0;

  return (
    <div style={{ ["--accent" as string]: board.accent_color }}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">
            {board.subtitle || "Active board"}
          </p>
          <h1 className="font-display text-3xl font-extrabold">{board.title}</h1>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Athletes" value={String(athletes.length)} />
        <Stat label="Tasks per athlete" value={String(total)} />
        <Stat label="Avg completion" value={`${avgPct}%`} accent />
        <Stat label="Finished all" value={String(finishedAll.length)} accent />
      </div>

      {/* Finished-all spotlight */}
      <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          🏆 Completed all {total} tasks
        </h2>
        {finishedAll.length === 0 ? (
          <p className="text-sm text-muted">No one has finished everything yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {finishedAll.map((r) => (
              <span
                key={r.athlete.id}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white"
              >
                {r.athlete.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Completion matrix */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left font-bold">
                Athlete
              </th>
              <th className="px-3 py-3 text-left font-bold">Progress</th>
              {tasks.map((t, i) => (
                <th
                  key={t.id}
                  title={`${t.title}${t.category ? ` (${t.category})` : ""}`}
                  className="px-2 py-3 text-center text-xs font-semibold text-muted"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ athlete, done }) => (
              <tr key={athlete.id} className="border-b border-line last:border-0">
                <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-semibold whitespace-nowrap">
                  {done === total && total > 0 && "🏆 "}
                  {athlete.name}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs font-semibold text-muted">
                      {done}/{total}
                    </span>
                  </div>
                </td>
                {tasks.map((t) => {
                  const sub = byKey.get(`${athlete.id}:${t.id}`);
                  return (
                    <td key={t.id} className="px-2 py-2.5 text-center">
                      {sub ? (
                        <button
                          onClick={() => setViewing({ athlete, task: t, sub })}
                          title={`View ${athlete.name}'s ${t.title}`}
                          className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white transition hover:opacity-80"
                        >
                          {sub.file_type === "video" ? "▶" : "✓"}
                        </button>
                      ) : (
                        <span className="mx-auto block h-7 w-7 rounded-md border border-line" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={tasks.length + 2} className="px-4 py-8 text-center text-muted">
                  No athletes on the roster yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Tap a ✓ or ▶ to view that athlete&apos;s uploaded evidence.
      </p>

      {viewing && <ArtifactModal cell={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? "border-transparent bg-accent text-white" : "border-line bg-surface"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-white/80" : "text-muted"}`}>
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function ArtifactModal({ cell, onClose }: { cell: Cell; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/artifact?path=${encodeURIComponent(cell.sub.file_path)}`)
      .then((r) => r.json())
      .then((j) => (j.url ? setUrl(j.url) : setError(j.error ?? "Could not load.")))
      .catch(() => setError("Could not load."));
  }, [cell]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {cell.task.category || "Task"}
            </p>
            <h3 className="text-lg font-bold">{cell.task.title}</h3>
            <p className="text-sm text-muted">
              {cell.athlete.name} ·{" "}
              {new Date(cell.sub.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-muted">
            ×
          </button>
        </div>

        <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl bg-black/5">
          {error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : !url ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : cell.sub.file_type === "video" ? (
            <video src={url} controls className="max-h-[60vh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={cell.task.title} className="max-h-[60vh] w-full object-contain" />
          )}
        </div>

        {cell.sub.note && (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-sm">
            “{cell.sub.note}”
          </p>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-accent"
          >
            Open full size ↗
          </a>
        )}
      </div>
    </div>
  );
}
