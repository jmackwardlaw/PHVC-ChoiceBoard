"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Athlete, Board, Submission, Task } from "@/lib/types";

const STORAGE_KEY = "phvc-athlete";

export default function AthleteBoard({
  board,
  tasks,
  athletes: initialAthletes,
}: {
  board: Board;
  tasks: Task[];
  athletes: Athlete[];
}) {
  const [athletes, setAthletes] = useState<Athlete[]>(initialAthletes);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [completed, setCompleted] = useState<Record<string, Submission>>({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Restore the last athlete on this device so they don't reselect every visit.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Athlete;
      if (saved?.id) {
        setAthlete(saved);
        loadSubmissions(saved.id);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSubmissions(athleteId: string) {
    setLoadingSubs(true);
    try {
      const res = await fetch(
        `/api/submissions?board=${board.id}&athlete=${athleteId}`,
      );
      const json = await res.json();
      const map: Record<string, Submission> = {};
      for (const s of (json.submissions ?? []) as Submission[]) {
        if (!map[s.task_id]) map[s.task_id] = s; // newest first → keep latest
      }
      setCompleted(map);
    } finally {
      setLoadingSubs(false);
    }
  }

  function chooseAthlete(a: Athlete) {
    setAthlete(a);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    loadSubmissions(a.id);
  }

  function signOutAthlete() {
    setAthlete(null);
    setCompleted({});
    localStorage.removeItem(STORAGE_KEY);
  }

  const doneCount = useMemo(
    () => tasks.filter((t) => completed[t.id]).length,
    [tasks, completed],
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
          onPick={chooseAthlete}
          onAdded={(a) => {
            setAthletes((prev) =>
              prev.some((x) => x.id === a.id) ? prev : [...prev, a],
            );
            chooseAthlete(a);
          }}
        />
      ) : (
        <>
          <Header
            board={board}
            athlete={athlete}
            doneCount={doneCount}
            total={tasks.length}
            onSwitch={signOutAthlete}
          />

          <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
            {allDone && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
                <p className="text-lg font-bold text-emerald-700">
                  🎉 You finished all {tasks.length} tasks. Way to go!
                </p>
              </div>
            )}

            <div className="board-grid gap-3" style={{ ["--cols" as string]: board.columns }}>
              {tasks.map((task) => {
                const sub = completed[task.id];
                return (
                  <button
                    key={task.id}
                    onClick={() => setActiveTask(task)}
                    className={`group relative flex min-h-[124px] flex-col rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                      sub
                        ? "border-transparent bg-accent text-white shadow-sm"
                        : "border-line bg-surface hover:border-accent hover:shadow-sm"
                    }`}
                  >
                    {task.category && (
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wide ${
                          sub ? "text-white/80" : "text-accent"
                        }`}
                      >
                        {task.category}
                      </span>
                    )}
                    <span className="mt-1 text-base font-bold leading-tight">
                      {task.title}
                    </span>
                    <span className="mt-auto pt-3 text-sm font-medium">
                      {sub ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckIcon /> Submitted
                        </span>
                      ) : loadingSubs ? (
                        <span className="text-muted">…</span>
                      ) : (
                        <span className="text-muted group-hover:text-accent">
                          Tap to upload ↑
                        </span>
                      )}
                    </span>
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
          existing={completed[activeTask.id]}
          onClose={() => setActiveTask(null)}
          onDone={(sub) => {
            setCompleted((prev) => ({ ...prev, [sub.task_id]: sub }));
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Name picker ───────────────────────── */

function NamePicker({
  board,
  athletes,
  onPick,
  onAdded,
}: {
  board: Board;
  athletes: Athlete[];
  onPick: (a: Athlete) => void;
  onAdded: (a: Athlete) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = athletes.filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function addMe() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      onAdded(json.athlete as Athlete);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ["--accent" as string]: board.accent_color }}
    >
      <div className="bg-accent px-6 pb-10 pt-14 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
          {board.subtitle || "Choice Board"}
        </p>
        <h1 className="font-display mt-1 text-4xl font-extrabold sm:text-5xl">
          {board.title}
        </h1>
      </div>

      <div className="mx-auto -mt-6 w-full max-w-md flex-1 px-5">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-bold">Who are you?</h2>
          <p className="mb-3 text-sm text-muted">
            Pick your name to start uploading your evidence.
          </p>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your name…"
            className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-base outline-none focus:border-accent"
          />

          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => onPick(a)}
                className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left font-medium transition hover:border-accent hover:bg-canvas"
              >
                {a.name}
                <span className="text-accent">→</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-1 py-3 text-sm text-muted">
                No matching names.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            {!adding ? (
              <button
                onClick={() => setAdding(true)}
                className="text-sm font-semibold text-accent"
              >
                Not on the list? Add your name
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-base outline-none focus:border-accent"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  onClick={addMe}
                  disabled={busy || newName.trim().length < 2}
                  className="w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Adding…" : "Continue"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Header ───────────────────────── */

function Header({
  board,
  athlete,
  doneCount,
  total,
  onSwitch,
}: {
  board: Board;
  athlete: Athlete;
  doneCount: number;
  total: number;
  onSwitch: () => void;
}) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  return (
    <header className="bg-accent text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-widest text-white/80">
            {board.subtitle || "Choice Board"}
          </p>
          <h1 className="font-display truncate text-2xl font-extrabold sm:text-3xl">
            {board.title}
          </h1>
        </div>
        <Ring pct={pct} label={`${doneCount}/${total}`} />
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <p className="text-sm font-semibold">
            Hi, {athlete.name.split(" ")[0]} 👋
          </p>
          <button
            onClick={onSwitch}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
          >
            Not you? Switch
          </button>
        </div>
      </div>
    </header>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {label}
      </span>
    </div>
  );
}

/* ───────────────────────── Upload sheet ───────────────────────── */

function UploadSheet({
  board,
  athlete,
  task,
  existing,
  onClose,
  onDone,
}: {
  board: Board;
  athlete: Athlete;
  task: Task;
  existing?: Submission;
  onClose: () => void;
  onDone: (s: Submission) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          athleteId: athlete.id,
          taskId: task.id,
          fileName: file.name,
        }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error ?? "Upload failed.");

      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from("artifacts")
        .uploadToSignedUrl(urlJson.path, urlJson.token, file);
      if (upErr) throw new Error("Could not upload the file. Try again.");

      const subRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          athleteId: athlete.id,
          taskId: task.id,
          filePath: urlJson.path,
          fileType: file.type.startsWith("video") ? "video" : "image",
          note,
        }),
      });
      const subJson = await subRes.json();
      if (!subRes.ok) throw new Error(subJson.error ?? "Could not save.");

      onDone(subJson.submission as Submission);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ ["--accent" as string]: board.accent_color }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {task.category && (
              <p className="text-xs font-bold uppercase tracking-wide text-accent">
                {task.category}
              </p>
            )}
            <h3 className="text-xl font-bold">{task.title}</h3>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-muted">
            ×
          </button>
        </div>

        {existing && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            You already submitted this. Uploading again adds a new one.
          </p>
        )}

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-canvas px-4 py-8 text-center transition hover:border-accent">
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="font-semibold text-ink">📎 {file.name}</span>
          ) : (
            <>
              <span className="text-3xl">📸</span>
              <span className="mt-2 font-semibold">Take a photo or video</span>
              <span className="text-sm text-muted">or choose from your library</span>
            </>
          )}
        </label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          rows={2}
          className="mt-3 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          onClick={upload}
          disabled={!file || busy}
          className="mt-4 w-full rounded-xl bg-accent py-3.5 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Submit evidence"}
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
