"use client";

import { useEffect, useMemo, useState } from "react";
import type { Athlete, Board, Submission, Task } from "@/lib/types";
import { Header, NamePicker, UploadSheet } from "./AthleteBoard";

// Shares the athlete localStorage key with the team board, so a flyer who
// already picked their name over there is remembered here too.
const STORAGE_KEY = "phvc-athlete";

// The flyer board is a weekly habit tracker: each tile needs `target`
// submissions during the current Sunday–Saturday week to turn green, then it
// resets on Sunday. Completion is counted from submission timestamps, so
// nothing is stored per-week — last week's uploads simply fall outside the
// window.
export default function FlyerBoard({
  board,
  tasks,
  athletes,
}: {
  board: Board;
  tasks: Task[];
  athletes: Athlete[];
}) {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const week = useMemo(() => currentWeek(), []);
  // One day column per weekly rep (all tasks use the same target of 5, but be
  // safe if a coach sets different targets — take the largest).
  const dayCount = useMemo(
    () => (tasks.length ? Math.max(...tasks.map(target)) : 5),
    [tasks],
  );

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Athlete;
      if (saved?.id) {
        setAthlete(saved);
        loadCounts(saved.id);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCounts(athleteId: string) {
    const res = await fetch(
      `/api/submissions?board=${board.id}&athlete=${athleteId}`,
    );
    const json = await res.json();
    const map: Record<string, number> = {};
    for (const s of (json.submissions ?? []) as Submission[]) {
      // Only this week's uploads count; a redo doesn't.
      if (s.status === "redo") continue;
      if (new Date(s.created_at).getTime() < week.start) continue;
      map[s.task_id] = (map[s.task_id] ?? 0) + 1;
    }
    setCounts(map);
  }

  function chooseAthlete(a: Athlete) {
    setAthlete(a);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    loadCounts(a.id);
  }

  function signOut() {
    setAthlete(null);
    setCounts({});
    localStorage.removeItem(STORAGE_KEY);
  }

  const doneCount = useMemo(
    () => tasks.filter((t) => (counts[t.id] ?? 0) >= target(t)).length,
    [tasks, counts],
  );
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  return (
    <div
      className="min-h-screen"
      style={{ ["--accent" as string]: board.accent_color }}
    >
      {!athlete ? (
        <NamePicker
          board={board}
          athletes={athletes}
          asFlyer
          onPick={chooseAthlete}
          onAdded={chooseAthlete}
        />
      ) : (
        <>
          <Header
            board={board}
            athlete={athlete}
            doneCount={doneCount}
            total={tasks.length}
            onSwitch={signOut}
            altBoard={{ href: "/choiceboard", label: "← Team board" }}
          />

          <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
            <div className="mb-5 flex items-center justify-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-white">
                <CalendarIcon />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted">
                  Week of
                </p>
                <p className="font-race text-2xl uppercase leading-none text-ink">
                  {week.range}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  This week&apos;s board closes Saturday night at 11:59pm.
                </p>
              </div>
            </div>

            {allDone && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
                <p className="text-lg font-bold text-emerald-700">
                  🎉 All done for this week. Great work!
                </p>
              </div>
            )}

            {/* Day columns (one per weekly rep) + a weekly-progress column.
                A circle fills left-to-right as uploads come in; only the next
                open circle in each activity is tappable, so days fill in order.
                Responsive: 1-up on phones, wrapping up to a single 6-wide strip
                on large screens — never a horizontal scroll that cuts off. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: dayCount }).map((_, d) => {
                const dayComplete = tasks.length > 0 && tasks.every((t) => (counts[t.id] ?? 0) > d);
                return (
                  <div
                    key={d}
                    className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
                  >
                    <div
                      className={`flex items-center justify-center gap-1.5 border-b px-3 py-2 ${
                        dayComplete
                          ? "border-transparent bg-accent text-white"
                          : "border-line bg-canvas text-ink"
                      }`}
                    >
                      <span className="font-race text-lg uppercase tracking-wide">Day {d + 1}</span>
                      {dayComplete && <CheckIcon />}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-2.5">
                      {tasks.map((task) => {
                        const goal = target(task);
                        const c = counts[task.id] ?? 0;
                        const filled = c > d;
                        const isNext = c === d && d < goal;
                        return (
                          <button
                            key={task.id}
                            onClick={() => isNext && setActiveTask(task)}
                            disabled={!isNext}
                            className={`group/act flex flex-1 items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-200 disabled:cursor-default ${
                              filled
                                ? "border-accent/20 bg-gradient-to-br from-accent/15 to-accent/5 shadow-sm"
                                : isNext
                                  ? "border-accent/60 bg-surface shadow-card ring-1 ring-accent/10 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift active:translate-y-0 active:scale-[0.98]"
                                  : "border-dashed border-line bg-canvas/40 opacity-60"
                            }`}
                          >
                            <Circle filled={filled} active={isNext} />
                            <span
                              className={`flex-1 text-xs font-semibold leading-tight [overflow-wrap:anywhere] transition-colors ${
                                filled ? "text-accent" : isNext ? "text-ink" : "text-muted"
                              }`}
                            >
                              {task.title}
                            </span>
                            {isNext && (
                              <span className="shrink-0 text-accent opacity-0 transition-opacity group-hover/act:opacity-100">
                                ↑
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Weekly progress tracker */}
              <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-accent/40 bg-accent/5 shadow-card">
                <div className="border-b border-accent/20 bg-accent px-3 py-2 text-center">
                  <span className="font-race text-lg uppercase tracking-wide text-white">
                    This week
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2.5">
                {tasks.map((task) => {
                  const goal = target(task);
                  const c = Math.min(counts[task.id] ?? 0, goal);
                  const done = c >= goal;
                  return (
                    <div key={task.id} className="rounded-xl bg-surface p-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold leading-tight [overflow-wrap:anywhere]">
                          {task.title}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums text-accent">
                          {done && <CheckIcon />}
                          {c}/{goal}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${goal ? (c / goal) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {activeTask && athlete && (
        <UploadSheet
          board={board}
          athlete={athlete}
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onDone={(sub) => {
            setCounts((prev) => ({
              ...prev,
              [sub.task_id]: (prev[sub.task_id] ?? 0) + 1,
            }));
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
}

function target(t: Task): number {
  return t.target && t.target > 0 ? t.target : 1;
}

function Circle({ filled, active }: { filled: boolean; active: boolean }) {
  if (filled) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
        <CheckIcon />
      </span>
    );
  }
  return (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/25" />
      )}
      <span
        className={`h-5 w-5 rounded-full border-2 ${
          active ? "border-accent" : "border-line"
        }`}
      />
    </span>
  );
}

// Current Sunday 00:00 (local) through the following Saturday 23:59. Progress
// is counted only for this window, so it resets on its own every Sunday at
// midnight — no new board needed.
function currentWeek(): { start: number; range: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // getDay() 0 = Sunday
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric" });
  const mon = (d: Date) => d.toLocaleDateString(undefined, { month: "long" });
  // "June 29 – July 5" or "July 6 – 12" when the month doesn't change.
  const range =
    mon(start) === mon(end)
      ? `${mon(start)} ${day(start)} – ${day(end)}`
      : `${mon(start)} ${day(start)} – ${mon(end)} ${day(end)}`;
  return { start: start.getTime(), range };
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" strokeLinecap="round" />
    </svg>
  );
}
