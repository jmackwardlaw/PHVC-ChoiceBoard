"use client";

import { useRouter } from "next/navigation";
import { useState, type ClipboardEvent } from "react";
import type { Athlete } from "@/lib/types";
import Modal from "../Modal";

export default function RosterEditor({ athletes }: { athletes: Athlete[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Athlete | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/coach/athletes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    router.refresh();
    return { ok: res.ok, json } as { ok: boolean; json: Record<string, unknown> };
  }

  async function addOne() {
    if (newName.trim().length < 2) return;
    const { ok, json } = await call({ action: "add", name: newName });
    if (ok) setNewName("");
    else setMsg({ text: String(json.error ?? "Could not add."), ok: false });
  }

  async function addBulk(namesText?: string) {
    const names = (namesText ?? bulk).trim();
    if (!names) return;
    const { ok, json } = await call({ action: "add-bulk", names });
    if (ok) {
      const n = Number(json.added ?? 0);
      const skipped = Number(json.skipped ?? 0);
      const skipNote = skipped > 0 ? ` Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.` : "";
      setMsg({
        text: `Added ${n} athlete${n === 1 ? "" : "s"}.${skipNote}`,
        ok: true,
      });
      // Only clear/close the bulk box when the names came from it.
      if (namesText === undefined) {
        setBulk("");
        setShowBulk(false);
      }
      setNewName("");
    } else {
      setMsg({ text: String(json.error ?? "Could not add names."), ok: false });
    }
  }

  // Pasting a multi-name list (e.g. a column copied from a spreadsheet) into the
  // single-name box would flatten onto one line, so intercept it and bulk-add.
  function onNamePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[\n\r\t,;]/.test(text.trim())) {
      e.preventDefault();
      addBulk(text);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          Roster
        </h1>
        <p className="mt-1 text-sm text-muted">
          Add, rename, or deactivate the athletes who appear on the board.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:self-start">
        <h2 className="font-display text-xl font-extrabold">Add athletes</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOne()}
            onPaste={onNamePaste}
            placeholder="Full name (or paste a list)"
            className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2.5 outline-none focus:border-ink"
          />
          <button
            onClick={addOne}
            disabled={busy}
            className="rounded-xl bg-ink px-4 font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <button
          onClick={() => setShowBulk((s) => !s)}
          className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
        >
          {showBulk ? "Hide bulk import" : "Paste a list (bulk import)"}
        </button>
        {showBulk && (
          <div className="mt-2">
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={6}
              placeholder={"Jordan Smith\nAva Lee\nMia Garcia"}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <p className="mt-1.5 text-xs text-muted">
              Paste from a spreadsheet, a list, or anything — names can be on
              separate lines, in a row, or separated by commas.
            </p>
            <button
              onClick={() => addBulk()}
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-ink py-2.5 font-semibold text-white disabled:opacity-50"
            >
              Add all
            </button>
          </div>
        )}

        {msg && (
          <p
            className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
              msg.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {msg.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-xl font-extrabold">
          Roster ({athletes.filter((a) => a.active).length} active)
        </h2>
        <div className="space-y-1.5">
          {athletes.map((a) => (
            <RosterRow
              key={a.id}
              athlete={a}
              onCall={call}
              busy={busy}
              onRequestDelete={() => setToDelete(a)}
            />
          ))}
          {athletes.length === 0 && (
            <p className="py-6 text-center text-muted">No athletes yet.</p>
          )}
        </div>
      </section>

      {toDelete && (
        <Modal title="Remove athlete?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-muted">
            This permanently removes{" "}
            <strong className="text-ink">{toDelete.name}</strong> and all of their
            uploaded submissions. This can&apos;t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setToDelete(null)}
              className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const a = toDelete;
                setToDelete(null);
                await call({ action: "delete", id: a.id });
              }}
              className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}

function RosterRow({
  athlete,
  onCall,
  busy,
  onRequestDelete,
}: {
  athlete: Athlete;
  onCall: (
    body: Record<string, unknown>,
  ) => Promise<{ ok: boolean; json: Record<string, unknown> }>;
  busy: boolean;
  onRequestDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(athlete.name);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-line px-3 py-2 ${
        athlete.active ? "" : "opacity-50"
      }`}
    >
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-line bg-canvas px-2 py-1 outline-none focus:border-ink"
          autoFocus
        />
      ) : (
        <span className="flex-1 font-medium">{athlete.name}</span>
      )}

      {editing ? (
        <button
          onClick={async () => {
            await onCall({ action: "rename", id: athlete.id, name });
            setEditing(false);
          }}
          className="text-sm font-semibold text-accent"
          style={{ ["--accent" as string]: "#16a34a" }}
        >
          Save
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-muted hover:text-ink"
        >
          Rename
        </button>
      )}

      <button
        onClick={() => onCall({ action: "toggle", id: athlete.id, active: !athlete.active })}
        disabled={busy}
        className="rounded-lg border border-line px-2 py-1 text-xs font-semibold hover:bg-canvas"
      >
        {athlete.active ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={onRequestDelete}
        disabled={busy}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
