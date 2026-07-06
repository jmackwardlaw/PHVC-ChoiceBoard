"use client";

import { useState } from "react";
import type { Board, Task } from "@/lib/types";
import BoardEditor from "./BoardEditor";

// Two boards live at once: the monthly team board and the weekly flyer board.
// A little tab switches which one the editor operates on.
export default function BoardWorkspace({
  teamBoard,
  teamTasks,
  allBoards,
  flyerBoard,
  flyerTasks,
}: {
  teamBoard: Board | null;
  teamTasks: Task[];
  allBoards: Board[];
  flyerBoard: Board | null;
  flyerTasks: Task[];
}) {
  const [tab, setTab] = useState<"team" | "flyer">("team");

  return (
    <div>
      <div className="mb-5 inline-flex rounded-full border border-line bg-surface p-1">
        <TabButton active={tab === "team"} onClick={() => setTab("team")}>
          Team board
        </TabButton>
        <TabButton active={tab === "flyer"} onClick={() => setTab("flyer")}>
          ✦ Flyer board
        </TabButton>
      </div>

      {tab === "team" ? (
        <BoardEditor
          key={teamBoard?.id ?? "team-empty"}
          board={teamBoard}
          tasks={teamTasks}
          allBoards={allBoards}
        />
      ) : flyerBoard ? (
        <BoardEditor
          key={flyerBoard.id}
          board={flyerBoard}
          tasks={flyerTasks}
          allBoards={allBoards}
          variant="flyer"
        />
      ) : (
        <CreateFlyer />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? "bg-ink text-white" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CreateFlyer() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-flyer" }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Server error (${res.status}).`);
    } catch {
      setError("Network error — check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-10 text-center">
      <h1 className="font-display text-2xl font-extrabold">Set up the flyer board</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">
        A weekly board just for flyers, at{" "}
        <code className="rounded bg-canvas px-1.5 py-0.5 text-sm">/flyer</code>. It
        starts with the four flyer tasks at 5&nbsp;per&nbsp;week — you can edit them
        after.
      </p>
      {error && (
        <p className="mx-auto mt-4 max-w-md rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={create}
        disabled={busy}
        className="mt-5 rounded-full bg-ink px-5 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create flyer board"}
      </button>
    </div>
  );
}
