"use client";

import { useEffect, useMemo, useState } from "react";
import type { Athlete, Board, Submission, Task } from "@/lib/types";
import { softBreak } from "./softBreak";
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
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const week = useMemo(() => currentWeek(), []);

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
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
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

            <div className="board-grid gap-3" style={{ ["--cols" as string]: board.columns }}>
              {tasks.map((task, i) => {
                const goal = target(task);
                const count = Math.min(counts[task.id] ?? 0, goal);
                const done = count >= goal;
                return (
                  <button
                    key={task.id}
                    onClick={() => !done && setActiveTask(task)}
                    disabled={done}
                    style={{ ["--i" as string]: i }}
                    className={`reveal group relative flex min-h-[150px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border p-4 text-center transition active:scale-[0.98] disabled:cursor-default ${
                      done
                        ? "tile-done border-transparent text-white shadow-lift"
                        : "tile border-line shadow-card hover:-translate-y-1 hover:border-accent hover:shadow-lift"
                    }`}
                  >
                    <span
                      className={`font-race text-2xl uppercase leading-none tracking-wide [overflow-wrap:anywhere] ${
                        done ? "text-white" : "text-accent"
                      }`}
                    >
                      {softBreak(task.title)}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        done
                          ? "bg-white/20 text-white"
                          : "border border-accent/40 text-accent transition group-hover:bg-accent group-hover:text-white"
                      }`}
                    >
                      {done ? (
                        <>
                          <CheckIcon /> {goal}/{goal} done
                        </>
                      ) : loading ? (
                        "…"
                      ) : (
                        <>
                          {count}/{goal} — upload ↑
                        </>
                      )}
                    </span>

                    {!done && (
                      <ProgressDots count={count} goal={goal} />
                    )}
                  </button>
                );
              })}
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

function ProgressDots({ count, goal }: { count: number; goal: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {Array.from({ length: goal }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < count ? "bg-accent" : "bg-line"}`}
        />
      ))}
    </div>
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
