"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Athlete, Board, Submission, Task } from "@/lib/types";

type Cell = { athlete: Athlete; task: Task; sub: Submission };

// A tile counts as "done" unless the coach sent it back for a redo.
const counts = (s: Submission | undefined) => !!s && s.status !== "redo";

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

  const pendingCount = useMemo(
    () => [...byKey.values()].filter((s) => s.status === "submitted").length,
    [byKey],
  );

  const rows = useMemo(() => {
    return athletes
      .map((a) => {
        const done = tasks.filter((t) => counts(byKey.get(`${a.id}:${t.id}`))).length;
        return { athlete: a, done };
      })
      .sort((x, y) => y.done - x.done || x.athlete.name.localeCompare(y.athlete.name));
  }, [athletes, tasks, byKey]);

  const daysLeft = useMemo(() => daysUntil(board.due_date), [board.due_date]);

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
        {board.due_date && <DeadlineChip dueDate={board.due_date} daysLeft={daysLeft} />}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Athletes" value={String(athletes.length)} />
        <Stat label="Tasks per athlete" value={String(total)} />
        <Stat label="Avg completion" value={`${avgPct}%`} accent />
        <Stat label="Finished all" value={String(finishedAll.length)} accent />
        <Stat label="Needs review" value={String(pendingCount)} />
      </div>

      {/* Leaderboard */}
      <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            🏁 Leaderboard
          </h2>
          <span className="text-xs text-muted">
            {board.show_leaderboard ? "Visible to athletes" : "Coaches only"}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No athletes yet.</p>
        ) : (
          <ol className="space-y-2">
            {rows.slice(0, 10).map((r, i) => (
              <li key={r.athlete.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-base">{medal(i)}</span>
                <span className="w-40 truncate font-semibold">{r.athlete.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${total ? (r.done / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-bold tabular-nums">
                  {r.done}/{total}
                </span>
              </li>
            ))}
          </ol>
        )}
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
                          title={`${statusLabel(sub.status)} — view ${athlete.name}'s ${t.title}`}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-white transition hover:opacity-80 ${statusBg(sub.status)}`}
                        >
                          {sub.status === "redo"
                            ? "↻"
                            : sub.file_type === "video"
                              ? "▶"
                              : sub.status === "approved"
                                ? "★"
                                : "✓"}
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Tap a tile to view evidence &amp; approve.</span>
        <Legend className="bg-amber-400" label="Submitted" />
        <Legend className="bg-emerald-500" label="Approved ★" />
        <Legend className="bg-red-500" label="Needs redo ↻" />
      </div>

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
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(cell.sub.status);
  const [saving, setSaving] = useState<"approved" | "redo" | null>(null);

  useEffect(() => {
    fetch(`/api/artifact?path=${encodeURIComponent(cell.sub.file_path)}`)
      .then((r) => r.json())
      .then((j) => (j.url ? setUrl(j.url) : setError(j.error ?? "Could not load.")))
      .catch(() => setError("Could not load."));
  }, [cell]);

  async function setReview(next: "approved" | "redo") {
    setSaving(next);
    const res = await fetch("/api/coach/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: cell.sub.id, status: next }),
    });
    setSaving(null);
    if (res.ok) {
      setStatus(next);
      router.refresh();
    }
  }

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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${statusBg(status)}`}>
            {statusLabel(status)}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setReview("redo")}
              disabled={saving !== null}
              className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {saving === "redo" ? "…" : "Needs redo ↻"}
            </button>
            <button
              onClick={() => setReview("approved")}
              disabled={saving !== null}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving === "approved" ? "…" : "Approve ★"}
            </button>
          </div>
        </div>

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

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}

function DeadlineChip({ dueDate, daysLeft }: { dueDate: string; daysLeft: number }) {
  const closed = daysLeft < 0;
  const due = new Date(dueDate + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${
        closed
          ? "bg-red-100 text-red-700"
          : daysLeft <= 3
            ? "bg-amber-100 text-amber-800"
            : "bg-canvas text-muted"
      }`}
    >
      {closed
        ? `Closed (was due ${due})`
        : daysLeft === 0
          ? `Due today (${due})`
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · due ${due}`}
    </span>
  );
}

function statusBg(status: string): string {
  if (status === "approved") return "bg-emerald-500";
  if (status === "redo") return "bg-red-500";
  return "bg-amber-400";
}

function statusLabel(status: string): string {
  if (status === "approved") return "Approved";
  if (status === "redo") return "Needs redo";
  return "Submitted";
}

function medal(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
}

// Whole days from today until the due date (negative = past).
function daysUntil(dueDate: string | null): number {
  if (!dueDate) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}
