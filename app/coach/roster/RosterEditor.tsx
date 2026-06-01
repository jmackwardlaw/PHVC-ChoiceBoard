"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Athlete } from "@/lib/types";

export default function RosterEditor({ athletes }: { athletes: Athlete[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    await fetch("/api/coach/athletes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  async function addOne() {
    if (newName.trim().length < 2) return;
    await call({ action: "add", name: newName });
    setNewName("");
  }

  async function addBulk() {
    if (!bulk.trim()) return;
    await call({ action: "add-bulk", names: bulk });
    setBulk("");
    setShowBulk(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:self-start">
        <h2 className="font-display text-xl font-extrabold">Add athletes</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOne()}
            placeholder="Full name"
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
          className="mt-3 text-sm font-semibold text-muted hover:text-ink"
        >
          {showBulk ? "Hide" : "Paste a list (one name per line)"}
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
            <button
              onClick={addBulk}
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-ink py-2.5 font-semibold text-white disabled:opacity-50"
            >
              Add all
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-xl font-extrabold">
          Roster ({athletes.filter((a) => a.active).length} active)
        </h2>
        <div className="space-y-1.5">
          {athletes.map((a) => (
            <RosterRow key={a.id} athlete={a} onCall={call} busy={busy} />
          ))}
          {athletes.length === 0 && (
            <p className="py-6 text-center text-muted">No athletes yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RosterRow({
  athlete,
  onCall,
  busy,
}: {
  athlete: Athlete;
  onCall: (body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
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
        onClick={() => {
          if (confirm(`Remove ${athlete.name}? This deletes their submissions too.`))
            onCall({ action: "delete", id: athlete.id });
        }}
        disabled={busy}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
