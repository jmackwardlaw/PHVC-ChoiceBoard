"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Athlete, Board, Submission, Task } from "@/lib/types";
import { softBreak } from "../softBreak";

type Cell = { athlete: Athlete; task: Task; sub: Submission };
type View = "board" | "athletes" | "leaderboard";

// A tile counts as "done" unless the coach sent it back for a redo.
const counts = (s: Submission | undefined) => !!s && s.status !== "redo";

export default function Dashboard({
  board,
  allBoards,
  tasks,
  athletes,
  submissions,
}: {
  board: Board;
  allBoards: Board[];
  tasks: Task[];
  athletes: Athlete[];
  submissions: Submission[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("board");
  const [viewing, setViewing] = useState<Cell | null>(null);
  const [openAthlete, setOpenAthlete] = useState<Athlete | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);

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

  // Per-tile completion across the whole team.
  const taskDone = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      m.set(t.id, athletes.filter((a) => counts(byKey.get(`${a.id}:${t.id}`))).length);
    }
    return m;
  }, [tasks, athletes, byKey]);

  const daysLeft = useMemo(() => daysUntil(board.due_date), [board.due_date]);

  const [marking, setMarking] = useState<string | null>(null);

  async function markComplete(taskId: string, athleteId: string) {
    setMarking(`${athleteId}:${taskId}`);
    await fetch("/api/coach/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark-complete",
        boardId: board.id,
        taskId,
        athleteId,
      }),
    });
    setMarking(null);
    router.refresh();
  }

  async function unmark(submissionId: string) {
    setMarking(submissionId);
    await fetch("/api/coach/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unmark", submissionId }),
    });
    setMarking(null);
    router.refresh();
  }

  const total = tasks.length;
  const finishedAll = rows.filter((r) => r.done === total && total > 0);
  const totalCells = athletes.length * total;
  const totalDone = rows.reduce((sum, r) => sum + r.done, 0);
  const avgPct = totalCells > 0 ? Math.round((totalDone / totalCells) * 100) : 0;

  return (
    <div style={{ ["--accent" as string]: board.accent_color }}>
      {/* Title + deadline */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {board.subtitle || (board.is_active ? "Active board" : "Past board")}
            </p>
            {!board.is_active && (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                Archived
              </span>
            )}
          </div>
          <h1 className="font-race text-4xl uppercase sm:text-5xl">
            {board.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {board.due_date && <DeadlineChip dueDate={board.due_date} daysLeft={daysLeft} />}
          {allBoards.length > 1 && (
            <BoardSwitcher
              board={board}
              allBoards={allBoards}
              onPick={(id) => router.push(`/coach?board=${id}`)}
            />
          )}
        </div>
      </div>

      {!board.is_active && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-canvas px-4 py-3">
          <p className="text-sm text-muted">
            You&apos;re viewing a past board. This is read-only history — athletes
            see the active board.
          </p>
          <Link
            href="/coach"
            className="shrink-0 text-sm font-semibold text-accent hover:underline"
          >
            Back to active board →
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat i={0} label="Athletes" value={String(athletes.length)} />
        <Stat i={1} label="Avg completion" value={`${avgPct}%`} accent />
        <Stat i={2} label="Finished all" value={String(finishedAll.length)} accent />
        <Stat i={3} label="Needs review" value={String(pendingCount)} highlight={pendingCount > 0} />
      </div>

      {/* View switcher */}
      <div className="mb-5 inline-flex rounded-full border border-line bg-surface p-1">
        {([
          ["board", "Board"],
          ["athletes", `Athletes (${athletes.length})`],
          ["leaderboard", "Leaderboard"],
        ] as [View, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              view === v ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "board" && (
        <BoardView
          board={board}
          tasks={tasks}
          taskDone={taskDone}
          athleteCount={athletes.length}
          onOpenTask={setOpenTask}
        />
      )}

      {view === "athletes" && (
        <AthletesView
          tasks={tasks}
          rows={rows}
          byKey={byKey}
          total={total}
          onOpenAthlete={setOpenAthlete}
          onView={setViewing}
        />
      )}

      {view === "leaderboard" && (
        <LeaderboardView
          board={board}
          rows={rows}
          total={total}
          finishedAll={finishedAll}
          onOpenAthlete={setOpenAthlete}
        />
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          athletes={athletes}
          byKey={byKey}
          marking={marking}
          onMarkComplete={markComplete}
          onClose={() => setOpenTask(null)}
          onView={setViewing}
        />
      )}

      {openAthlete && (
        <AthleteDetailModal
          athlete={openAthlete}
          tasks={tasks}
          byKey={byKey}
          marking={marking}
          onMarkComplete={markComplete}
          onClose={() => setOpenAthlete(null)}
          onView={setViewing}
        />
      )}

      {viewing && (
        <ArtifactModal
          cell={viewing}
          onUnmark={unmark}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Board view ───────────────────────── */

function BoardView({
  board,
  tasks,
  taskDone,
  athleteCount,
  onOpenTask,
}: {
  board: Board;
  tasks: Task[];
  taskDone: Map<string, number>;
  athleteCount: number;
  onOpenTask: (t: Task) => void;
}) {
  if (tasks.length === 0) {
    return <Empty>No tiles on this board yet.</Empty>;
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        How many of your {athleteCount} athletes have finished each tile. Tap a
        tile to see who&apos;s done and who&apos;s missing.
      </p>
      <div className="board-grid gap-3" style={{ ["--cols" as string]: board.columns }}>
        {tasks.map((t, i) => {
          const done = taskDone.get(t.id) ?? 0;
          const pct = athleteCount > 0 ? Math.round((done / athleteCount) * 100) : 0;
          const complete = athleteCount > 0 && done === athleteCount;
          return (
            <button
              key={t.id}
              onClick={() => onOpenTask(t)}
              style={{ ["--i" as string]: i }}
              className={`reveal group relative flex min-h-[140px] flex-col items-center overflow-hidden rounded-2xl border p-4 text-center transition hover:-translate-y-1 hover:shadow-lift ${
                complete
                  ? "tile-done border-transparent text-white shadow-lift"
                  : "tile border-line shadow-card hover:border-accent"
              }`}
            >
              <span
                className={`font-race mt-1 text-2xl uppercase leading-none tracking-wide [overflow-wrap:anywhere] ${
                  complete ? "text-white" : "text-accent"
                }`}
              >
                {t.category || softBreak(t.title)}
              </span>
              <div className="mt-auto w-full pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-extrabold tabular-nums">
                    {done}
                    <span className={complete ? "text-lg text-white/70" : "text-lg text-muted"}>
                      /{athleteCount}
                    </span>
                  </span>
                  <span className={`text-xs font-semibold ${complete ? "text-white/80" : "text-muted"}`}>
                    {pct}%
                  </span>
                </div>
                <div className={`mt-1.5 h-2 overflow-hidden rounded-full ${complete ? "bg-white/25" : "bg-canvas"}`}>
                  <div
                    className={`h-full rounded-full ${complete ? "bg-white" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ───────────────────────── Athletes (matrix) ───────────────────────── */

function AthletesView({
  tasks,
  rows,
  byKey,
  total,
  onOpenAthlete,
  onView,
}: {
  tasks: Task[];
  rows: { athlete: Athlete; done: number }[];
  byKey: Map<string, Submission>;
  total: number;
  onOpenAthlete: (a: Athlete) => void;
  onView: (c: Cell) => void;
}) {
  if (rows.length === 0) {
    return <Empty>No athletes on the roster yet.</Empty>;
  }
  return (
    <>
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
              <tr key={athlete.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 whitespace-nowrap">
                  <button
                    onClick={() => onOpenAthlete(athlete)}
                    className="font-semibold hover:text-accent hover:underline"
                  >
                    {done === total && total > 0 && "🏆 "}
                    {athlete.name}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs font-semibold text-muted tabular-nums">
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
                          onClick={() => onView({ athlete, task: t, sub })}
                          title={`${statusLabel(sub.status)} — view ${athlete.name}'s ${t.title}`}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-white transition hover:opacity-80 ${statusBg(sub.status)}`}
                        >
                          {glyph(sub)}
                        </button>
                      ) : (
                        <span className="mx-auto block h-7 w-7 rounded-md border border-line" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Tap a name for full detail, or a tile to view evidence.</span>
        <Legend className="bg-amber-400" label="Submitted" />
        <Legend className="bg-emerald-500" label="Approved" />
        <Legend className="bg-red-500" label="Needs redo" />
      </div>
    </>
  );
}

/* ───────────────────────── Leaderboard ───────────────────────── */

function LeaderboardView({
  board,
  rows,
  total,
  finishedAll,
  onOpenAthlete,
}: {
  board: Board;
  rows: { athlete: Athlete; done: number }[];
  total: number;
  finishedAll: { athlete: Athlete; done: number }[];
  onOpenAthlete: (a: Athlete) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            🏁 Standings
          </h2>
          <span className="text-xs text-muted">
            {board.show_leaderboard ? "Visible to athletes" : "Coaches only"}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No athletes yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={r.athlete.id}>
                <button
                  onClick={() => onOpenAthlete(r.athlete)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-canvas"
                >
                  <span className="w-7 text-center text-base">{medal(i)}</span>
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
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
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
    </div>
  );
}

/* ───────────────────────── Task detail (who's done) ───────────────────────── */

function TaskDetailModal({
  task,
  athletes,
  byKey,
  marking,
  onMarkComplete,
  onClose,
  onView,
}: {
  task: Task;
  athletes: Athlete[];
  byKey: Map<string, Submission>;
  marking: string | null;
  onMarkComplete: (taskId: string, athleteId: string) => void;
  onClose: () => void;
  onView: (c: Cell) => void;
}) {
  const done: { athlete: Athlete; sub: Submission }[] = [];
  const missing: Athlete[] = [];
  for (const a of athletes) {
    const sub = byKey.get(`${a.id}:${task.id}`);
    if (sub && sub.status !== "redo") done.push({ athlete: a, sub });
    else missing.push(a);
  }

  return (
    <Sheet onClose={onClose} title={task.title} eyebrow={task.category || "Tile"}>
      <p className="mb-4 text-sm font-semibold">
        {done.length}/{athletes.length} done
      </p>
      {done.length > 0 && (
        <ul className="mb-4 space-y-1">
          {done.map(({ athlete, sub }) => (
            <li key={athlete.id}>
              <button
                onClick={() => onView({ athlete, task, sub })}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-canvas"
              >
                <span className="font-medium">{athlete.name}</span>
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-bold text-white ${statusBg(sub.status)}`}>
                    {statusLabel(sub.status)}
                  </span>
                  <span className="text-accent">View →</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            Not done ({missing.length})
          </p>
          <ul className="space-y-1">
            {missing.map((a) => {
              const key = `${a.id}:${task.id}`;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-canvas"
                >
                  <span className="text-sm font-medium text-muted">{a.name}</span>
                  <button
                    onClick={() => onMarkComplete(task.id, a.id)}
                    disabled={marking === key}
                    className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {marking === key ? "…" : "Mark done"}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Sheet>
  );
}

/* ───────────────────────── Athlete detail ───────────────────────── */

function AthleteDetailModal({
  athlete,
  tasks,
  byKey,
  marking,
  onMarkComplete,
  onClose,
  onView,
}: {
  athlete: Athlete;
  tasks: Task[];
  byKey: Map<string, Submission>;
  marking: string | null;
  onMarkComplete: (taskId: string, athleteId: string) => void;
  onClose: () => void;
  onView: (c: Cell) => void;
}) {
  const done = tasks.filter((t) => counts(byKey.get(`${athlete.id}:${t.id}`))).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <Sheet onClose={onClose} title={athlete.name} eyebrow="Athlete">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-bold tabular-nums">
          {done}/{tasks.length} · {pct}%
        </span>
      </div>
      <ul className="space-y-1.5">
        {tasks.map((t) => {
          const sub = byKey.get(`${athlete.id}:${t.id}`);
          return (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
            >
              <div className="min-w-0">
                {t.category && (
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted">
                    {t.category}
                  </p>
                )}
                <p className="text-sm font-semibold [overflow-wrap:anywhere]">
                  {softBreak(t.title)}
                </p>
              </div>
              {sub ? (
                <button
                  onClick={() => onView({ athlete, task: t, sub })}
                  className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold"
                >
                  <span className={`rounded-full px-2 py-0.5 text-white ${statusBg(sub.status)}`}>
                    {statusLabel(sub.status)}
                  </span>
                  <span className="text-accent">View →</span>
                </button>
              ) : (
                <button
                  onClick={() => onMarkComplete(t.id, athlete.id)}
                  disabled={marking === `${athlete.id}:${t.id}`}
                  className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {marking === `${athlete.id}:${t.id}` ? "…" : "Mark done"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* ───────────────────────── Board switcher ───────────────────────── */

function BoardSwitcher({
  board,
  allBoards,
  onPick,
}: {
  board: Board;
  allBoards: Board[];
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const active = allBoards.filter((b) => b.is_active);
  const past = allBoards.filter((b) => !b.is_active);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold shadow-sm hover:border-ink/30"
      >
        <span className="text-muted">Viewing</span>
        <span className="max-w-[10rem] truncate">{board.title}</span>
        <span className={`text-muted transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {active.length > 0 && (
            <BoardGroup label="Active">
              {active.map((b) => (
                <BoardOption
                  key={b.id}
                  b={b}
                  current={b.id === board.id}
                  onPick={() => {
                    setOpen(false);
                    onPick(b.id);
                  }}
                />
              ))}
            </BoardGroup>
          )}
          {past.length > 0 && (
            <BoardGroup label="Past boards">
              {past.map((b) => (
                <BoardOption
                  key={b.id}
                  b={b}
                  current={b.id === board.id}
                  onPick={() => {
                    setOpen(false);
                    onPick(b.id);
                  }}
                />
              ))}
            </BoardGroup>
          )}
        </div>
      )}
    </div>
  );
}

function BoardGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line last:border-0">
      <p className="px-4 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="pb-1.5">{children}</div>
    </div>
  );
}

function BoardOption({
  b,
  current,
  onPick,
}: {
  b: Board;
  current: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className={`flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-canvas ${
        current ? "bg-canvas" : ""
      }`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: b.accent_color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{b.title}</span>
        {b.subtitle && (
          <span className="block truncate text-xs text-muted">{b.subtitle}</span>
        )}
      </span>
      {current && <span className="shrink-0 text-accent">✓</span>}
    </button>
  );
}

/* ───────────────────────── Shared bits ───────────────────────── */

function Stat({
  label,
  value,
  accent,
  highlight,
  i = 0,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
  i?: number;
}) {
  return (
    <div
      style={{ ["--i" as string]: i }}
      className={`reveal rounded-2xl border p-4 shadow-card ${
        accent
          ? "border-transparent bg-accent text-white"
          : highlight
            ? "border-amber-300 bg-amber-50"
            : "border-line bg-surface"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-white/80" : "text-muted"}`}>
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
      {children}
    </div>
  );
}

function Sheet({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{eyebrow}</p>
            <h3 className="font-display text-xl font-extrabold [overflow-wrap:anywhere]">{title}</h3>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ArtifactModal({
  cell,
  onUnmark,
  onClose,
}: {
  cell: Cell;
  onUnmark: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const manual = cell.sub.file_type === "manual";
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(cell.sub.status);
  const [saving, setSaving] = useState<"approved" | "redo" | null>(null);

  useEffect(() => {
    if (manual) return;
    fetch(`/api/artifact?path=${encodeURIComponent(cell.sub.file_path)}`)
      .then((r) => r.json())
      .then((j) => (j.url ? setUrl(j.url) : setError(j.error ?? "Could not load.")))
      .catch(() => setError("Could not load."));
  }, [cell, manual]);

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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-line bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {cell.task.category || "Task"}
            </p>
            <h3 className="text-lg font-bold [overflow-wrap:anywhere]">{cell.task.title}</h3>
            <p className="text-sm text-muted">
              {cell.athlete.name} ·{" "}
              {new Date(cell.sub.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink">
            ×
          </button>
        </div>

        {manual ? (
          <>
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-canvas p-6 text-center">
              <span className="text-3xl">✅</span>
              <p className="font-semibold">Marked complete by coach</p>
              <p className="text-sm text-muted">
                No photo or video — checked off manually.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                Complete
              </span>
              <button
                onClick={() => {
                  onUnmark(cell.sub.id);
                  onClose();
                }}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Undo · mark not done
              </button>
            </div>
          </>
        ) : (
          <>
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
              <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-sm">“{cell.sub.note}”</p>
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
          </>
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

function glyph(sub: Submission): string {
  if (sub.status === "redo") return "↻";
  if (sub.file_type === "manual") return "✓";
  if (sub.file_type === "video") return "▶";
  if (sub.status === "approved") return "★";
  return "✓";
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
