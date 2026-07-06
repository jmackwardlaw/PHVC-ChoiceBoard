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
            <div className="mb-4 rounded-2xl border border-line bg-surface px-5 py-3 text-center text-sm font-semibold text-muted">
              📅 This week: {week.label} — {tasks.length} to finish, resets Sunday.
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
                open circle in each activity is tappable, so days fill in order. */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: dayCount }).map((_, d) => (
                <div
                  key={d}
                  className="flex min-w-[150px] flex-1 flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-card"
                >
                  <p className="text-center font-race text-lg uppercase tracking-wide text-accent">
                    Day {d + 1}
                  </p>
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
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition disabled:cursor-default ${
                          filled
                            ? "border-transparent bg-accent/10"
                            : isNext
                              ? "border-accent/50 hover:bg-canvas active:scale-[0.98]"
                              : "border-line opacity-45"
                        }`}
                      >
                        <Circle filled={filled} active={isNext} />
                        <span
                          className={`text-xs font-semibold leading-tight [overflow-wrap:anywhere] ${
                            filled ? "text-accent" : "text-ink"
                          }`}
                        >
                          {task.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Weekly progress tracker */}
              <div className="flex min-w-[180px] flex-col gap-2 rounded-2xl border-2 border-accent/30 bg-accent/5 p-3">
                <p className="text-center font-race text-lg uppercase tracking-wide text-accent">
                  This week
                </p>
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
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <CheckIcon />
      </span>
    );
  }
  return (
    <span
      className={`h-5 w-5 shrink-0 rounded-full border-2 ${
        active ? "border-accent" : "border-line"
      }`}
    />
  );
}

// Current Sunday 00:00 (local) through the following Saturday, for the weekly
// reset window and the header label.
function currentWeek(): { start: number; label: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // getDay() 0 = Sunday
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { start: start.getTime(), label: `${fmt(start)} – ${fmt(end)}` };
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
