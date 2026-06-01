"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board, Task } from "@/lib/types";
import Modal from "../Modal";
import { softBreak } from "../../softBreak";

type Tile = { id?: string; title: string; category: string };

const PRESETS = ["#e20706", "#242424", "#2563eb", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#16a34a"];

export default function BoardEditor({
  board,
  tasks,
  allBoards,
}: {
  board: Board | null;
  tasks: Task[];
  allBoards: Board[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState(board?.title ?? "Conditioning Board");
  const [subtitle, setSubtitle] = useState(board?.subtitle ?? "");
  const [accent, setAccent] = useState(board?.accent_color ?? "#e20706");
  const [columns, setColumns] = useState(board?.columns ?? 4);
  const [dueDate, setDueDate] = useState(board?.due_date ?? "");
  const [showLeaderboard, setShowLeaderboard] = useState(board?.show_leaderboard ?? false);
  const [requireApproval, setRequireApproval] = useState(board?.require_approval ?? true);
  const [tiles, setTiles] = useState<Tile[]>(
    tasks.map((t) => ({ id: t.id, title: t.title, category: t.category })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New-board pop-up card
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSub, setNewSub] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Activate-confirm pop-up card
  const [toActivate, setToActivate] = useState<Board | null>(null);
  const [activating, setActivating] = useState(false);

  // Delete-confirm pop-up card
  const [toDelete, setToDelete] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const archived = allBoards.filter((b) => !b.is_active);

  function updateTile(i: number, patch: Partial<Tile>) {
    setTiles((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function addTile() {
    setTiles((prev) => [...prev, { title: "New task", category: "" }]);
  }
  function removeTile(i: number) {
    setTiles((prev) => prev.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setTiles((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    if (!board) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/coach/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        boardId: board.id,
        title,
        subtitle,
        accent_color: accent,
        columns,
        due_date: dueDate || null,
        show_leaderboard: showLeaderboard,
        require_approval: requireApproval,
        tiles,
      }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  function openNewBoard() {
    setNewTitle(board ? title : "Conditioning Board");
    setNewSub("");
    setCreateError("");
    setShowNew(true);
  }

  async function createBoard() {
    if (newTitle.trim().length < 2) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/coach/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone-new",
          fromBoardId: board?.id,
          title: newTitle.trim(),
          subtitle: newSub.trim(),
        }),
      });
      if (res.ok) {
        // Full reload so the editor re-reads the brand-new active board.
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setCreateError(data.error ?? `Server error (${res.status}).`);
    } catch {
      setCreateError("Network error — check your connection and try again.");
    }
    setCreating(false);
  }

  async function confirmActivate() {
    if (!toActivate) return;
    setActivating(true);
    const res = await fetch("/api/coach/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", boardId: toActivate.id }),
    });
    setActivating(false);
    if (res.ok) window.location.reload();
  }

  function openDelete(b: Board) {
    setDeleteError("");
    setToDelete(b);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/coach/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", boardId: toDelete.id }),
      });
      if (res.ok) {
        setToDelete(null);
        setDeleting(false);
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? `Server error (${res.status}).`);
    } catch {
      setDeleteError("Network error — check your connection and try again.");
    }
    setDeleting(false);
  }

  if (!board) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <h1 className="font-display text-2xl font-extrabold">No board yet</h1>
        <p className="mt-2 text-muted">Create your first board to get started.</p>
        <button
          onClick={openNewBoard}
          className="mt-5 rounded-full bg-ink px-5 py-2.5 font-semibold text-white"
        >
          Create a board
        </button>
        {showNew && (
          <NewBoardModal
            title={newTitle}
            subtitle={newSub}
            creating={creating}
            error={createError}
            onTitle={setNewTitle}
            onSubtitle={setNewSub}
            onCreate={createBoard}
            onClose={() => setShowNew(false)}
            cloning={false}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ ["--accent" as string]: accent }} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Editor column */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-xl font-extrabold">Board details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Month / subtitle">
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="June 2026"
                className="input"
              />
            </Field>
            <Field label="Columns">
              <input
                type="number"
                min={1}
                max={6}
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Accent color">
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccent(c)}
                    className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ${
                      accent.toLowerCase() === c ? "ring-ink" : "ring-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border border-line"
                />
              </div>
            </Field>
            <Field label="Due date (optional)">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
              <p className="mt-1 text-xs text-muted">
                Athletes see a countdown; uploads close the day after this date.
              </p>
            </Field>
            <Field label="Team leaderboard">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-canvas px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={showLeaderboard}
                  onChange={(e) => setShowLeaderboard(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  Show the leaderboard to athletes
                </span>
              </label>
            </Field>
            <Field label="Submission approval">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-canvas px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  I review and approve each upload
                </span>
              </label>
              <p className="mt-1 text-xs text-muted">
                {requireApproval
                  ? "Uploads wait for your approval (or a redo). They show in “Needs review.”"
                  : "Uploads are auto-accepted the moment an athlete submits — no review needed."}
              </p>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">
              Tiles ({tiles.length})
            </h2>
            <button
              onClick={addTile}
              className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              + Add tile
            </button>
          </div>

          <div className="space-y-2">
            {tiles.map((tile, i) => (
              <div
                key={tile.id ?? `new-${i}`}
                className="flex items-center gap-2 rounded-xl border border-line p-2"
              >
                <span className="w-6 text-center text-xs font-bold text-muted">{i + 1}</span>
                <input
                  value={tile.title}
                  onChange={(e) => updateTile(i, { title: e.target.value })}
                  placeholder="Task title"
                  className="input flex-1"
                />
                <input
                  value={tile.category}
                  onChange={(e) => updateTile(i, { category: e.target.value })}
                  placeholder="Category"
                  className="input w-32"
                />
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="px-1 text-muted hover:text-ink">▲</button>
                  <button onClick={() => move(i, 1)} className="px-1 text-muted hover:text-ink">▼</button>
                </div>
                <button
                  onClick={() => removeTile(i)}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-600">Saved ✓</span>}
        </div>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-xl font-extrabold">Start a new month</h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Copies these tiles into a brand-new board and archives the current one.
            Past submissions stay saved with the old board.
          </p>
          <button
            onClick={openNewBoard}
            className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-canvas"
          >
            Start new month →
          </button>
        </section>

        {archived.length > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-extrabold">Past boards</h2>
            <p className="mt-1 mb-3 text-sm text-muted">
              Re-activate an old board, or delete one for good.
            </p>
            <div className="space-y-2">
              {archived.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-xs text-muted">{b.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setToActivate(b)}
                      className="rounded-full border border-line px-3 py-1 text-sm font-semibold hover:bg-canvas"
                    >
                      Make active
                    </button>
                    <button
                      onClick={() => openDelete(b)}
                      className="rounded-full px-3 py-1 text-sm font-semibold text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Live preview
        </p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="accent-header px-4 py-5 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {subtitle || "Choice Board"}
            </p>
            <h3 className="font-race text-3xl uppercase">{title}</h3>
          </div>
          <div
            className="board-grid gap-2 bg-canvas p-3"
            style={{ ["--cols" as string]: columns }}
          >
            {tiles.map((t, i) => (
              <div
                key={i}
                className="tile overflow-hidden rounded-xl border border-line p-2.5 shadow-card"
              >
                {t.category && (
                  <p className="font-display text-xs font-extrabold uppercase leading-none tracking-wide text-accent [overflow-wrap:anywhere]">
                    {t.category}
                  </p>
                )}
                <p className="mt-1 text-xs font-bold leading-tight text-ink/75 [overflow-wrap:anywhere]">
                  {softBreak(t.title)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNew && (
        <NewBoardModal
          title={newTitle}
          subtitle={newSub}
          creating={creating}
          error={createError}
          onTitle={setNewTitle}
          onSubtitle={setNewSub}
          onCreate={createBoard}
          onClose={() => setShowNew(false)}
          cloning={!!board}
        />
      )}

      {toActivate && (
        <Modal title="Make this board active?" onClose={() => setToActivate(null)}>
          <p className="text-sm text-muted">
            Athletes will see <strong className="text-ink">{toActivate.title}</strong>{" "}
            {toActivate.subtitle && `(${toActivate.subtitle})`}. The current board
            becomes a past board.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setToActivate(null)}
              className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={confirmActivate}
              disabled={activating}
              className="rounded-full bg-ink px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {activating ? "Switching…" : "Make active"}
            </button>
          </div>
        </Modal>
      )}

      {toDelete && (
        <Modal title="Delete this board?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-muted">
            This permanently deletes{" "}
            <strong className="text-ink">{toDelete.title}</strong>
            {toDelete.subtitle && ` (${toDelete.subtitle})`}, including all of its
            tiles and every athlete upload on it. This can&apos;t be undone.
          </p>
          {deleteError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {deleteError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setToDelete(null)}
              className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete board"}
            </button>
          </div>
        </Modal>
      )}

      <style>{`.input{width:100%;border-radius:0.6rem;border:1px solid var(--color-line);background:var(--color-canvas);padding:0.55rem 0.75rem;font-size:0.9rem;outline:none}.input:focus{border-color:var(--accent)}`}</style>
    </div>
  );
}

function NewBoardModal({
  title,
  subtitle,
  creating,
  cloning,
  error,
  onTitle,
  onSubtitle,
  onCreate,
  onClose,
}: {
  title: string;
  subtitle: string;
  creating: boolean;
  cloning: boolean;
  error?: string;
  onTitle: (v: string) => void;
  onSubtitle: (v: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={cloning ? "Start a new month" : "Create a board"} onClose={onClose}>
      {cloning && (
        <p className="mb-4 text-sm text-muted">
          This copies your current tiles into a fresh board and archives the old
          one. Past submissions stay saved.
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">Title</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Conditioning Board"
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 outline-none focus:border-ink"
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-muted">
          Month / subtitle
        </span>
        <input
          value={subtitle}
          onChange={(e) => onSubtitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
          placeholder="July 2026"
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 outline-none focus:border-ink"
        />
      </label>
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          onClick={onCreate}
          disabled={creating || title.trim().length < 2}
          className="rounded-full bg-ink px-5 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create board"}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}
