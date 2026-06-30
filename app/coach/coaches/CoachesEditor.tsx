"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Coach } from "@/lib/types";
import Modal from "../Modal";

export default function CoachesEditor({
  dbCoaches,
  bootstrapEmails,
  currentEmail,
}: {
  dbCoaches: Coach[];
  bootstrapEmails: string[];
  currentEmail: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<Coach | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // The last DB coach can't be removed unless an env bootstrap coach exists.
  const lastWithoutBootstrap =
    bootstrapEmails.length === 0 && dbCoaches.length <= 1;

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/coach/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    router.refresh();
    return { ok: res.ok, json } as { ok: boolean; json: Record<string, unknown> };
  }

  async function addCoach() {
    if (!email.trim()) return;
    const { ok, json } = await call({ action: "add", email, name });
    if (ok) {
      setEmail("");
      setName("");
      setMsg({ text: `Added ${json.coach && (json.coach as Coach).email}.`, ok: true });
    } else {
      setMsg({ text: String(json.error ?? "Could not add coach."), ok: false });
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          Coaches
        </h1>
        <p className="mt-1 text-sm text-muted">
          Anyone here can sign in with Google and manage the board. Add a coach
          by their Google email.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:self-start">
          <h2 className="font-display text-xl font-extrabold">Add a coach</h2>
          <div className="mt-3 space-y-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCoach()}
              type="email"
              placeholder="coach@gmail.com"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 outline-none focus:border-ink"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCoach()}
              placeholder="Name (optional)"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 outline-none focus:border-ink"
            />
            <button
              onClick={addCoach}
              disabled={busy}
              className="w-full rounded-xl bg-ink py-2.5 font-semibold text-white disabled:opacity-50"
            >
              Add coach
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">
            They must sign in with this exact Google account. It has to be a
            Google-enabled email (Gmail or Google Workspace).
          </p>

          {msg && (
            <p
              className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
                msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}
            >
              {msg.text}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-xl font-extrabold">
            Coaches ({bootstrapEmails.length + dbCoaches.length})
          </h2>

          <div className="space-y-1.5">
            {bootstrapEmails.map((e) => (
              <div
                key={e}
                className="flex items-center gap-2 rounded-xl border border-line bg-canvas/50 px-3 py-2.5"
              >
                <span className="flex-1 font-medium [overflow-wrap:anywhere]">
                  {e}
                  {e === currentEmail && (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                      You
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  Always allowed
                </span>
              </div>
            ))}

            {dbCoaches.map((c) => (
              <CoachRow
                key={c.id}
                coach={c}
                isSelf={c.email.toLowerCase() === currentEmail}
                canRemove={!lastWithoutBootstrap}
                onCall={call}
                busy={busy}
                onRequestRemove={() => setToRemove(c)}
              />
            ))}

            {bootstrapEmails.length + dbCoaches.length === 0 && (
              <p className="py-6 text-center text-muted">No coaches yet.</p>
            )}
          </div>
        </section>

        {toRemove && (
          <Modal title="Remove coach?" onClose={() => setToRemove(null)}>
            {toRemove.email.toLowerCase() === currentEmail ? (
              <p className="text-sm text-muted">
                You&apos;re removing{" "}
                <strong className="text-ink">your own access</strong>. You&apos;ll
                be signed out the next time you do anything. Continue?
              </p>
            ) : (
              <p className="text-sm text-muted">
                <strong className="text-ink">
                  {toRemove.name || toRemove.email}
                </strong>{" "}
                will no longer be able to sign in. Their past activity stays. This
                can be undone by adding them again.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setToRemove(null)}
                className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const c = toRemove;
                  setToRemove(null);
                  const { ok, json } = await call({ action: "remove", id: c.id });
                  if (!ok)
                    setMsg({ text: String(json.error ?? "Could not remove."), ok: false });
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

function CoachRow({
  coach,
  isSelf,
  canRemove,
  onCall,
  busy,
  onRequestRemove,
}: {
  coach: Coach;
  isSelf: boolean;
  canRemove: boolean;
  onCall: (
    body: Record<string, unknown>,
  ) => Promise<{ ok: boolean; json: Record<string, unknown> }>;
  busy: boolean;
  onRequestRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(coach.name);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas px-2 py-1 outline-none focus:border-ink"
            placeholder="Name"
            autoFocus
          />
        ) : (
          <>
            <span className="block font-medium [overflow-wrap:anywhere]">
              {coach.name || coach.email}
              {isSelf && (
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                  You
                </span>
              )}
            </span>
            {coach.name && (
              <span className="block truncate text-xs text-muted">{coach.email}</span>
            )}
          </>
        )}
      </div>

      {editing ? (
        <button
          onClick={async () => {
            await onCall({ action: "rename", id: coach.id, name });
            setEditing(false);
          }}
          className="shrink-0 text-sm font-semibold text-emerald-600"
        >
          Save
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 text-sm font-semibold text-muted hover:text-ink"
        >
          Rename
        </button>
      )}

      <button
        onClick={onRequestRemove}
        disabled={busy || !canRemove}
        title={canRemove ? undefined : "Add another coach before removing the last one."}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Remove
      </button>
    </div>
  );
}
