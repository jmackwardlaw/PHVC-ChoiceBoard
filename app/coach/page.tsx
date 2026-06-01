import Link from "next/link";
import { requireCoach } from "@/lib/coach";
import {
  getActiveBoard,
  getAthletes,
  getSubmissionsForBoard,
  getTasks,
} from "@/lib/data";
import CoachShell from "./CoachShell";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function CoachHome() {
  const coach = await requireCoach();
  const board = await getActiveBoard();

  if (!board) {
    return (
      <CoachShell email={coach.email}>
        <div className="rounded-3xl border border-line bg-surface p-10 text-center">
          <h1 className="font-display text-2xl font-extrabold">No active board</h1>
          <p className="mt-2 text-muted">Create this month&apos;s board to get started.</p>
          <Link
            href="/coach/board"
            className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 font-semibold text-white"
          >
            Set up a board
          </Link>
        </div>
      </CoachShell>
    );
  }

  const [tasks, athletes, submissions] = await Promise.all([
    getTasks(board.id),
    getAthletes(true),
    getSubmissionsForBoard(board.id),
  ]);

  return (
    <CoachShell email={coach.email}>
      <Dashboard
        board={board}
        tasks={tasks}
        athletes={athletes}
        submissions={submissions}
      />
    </CoachShell>
  );
}
