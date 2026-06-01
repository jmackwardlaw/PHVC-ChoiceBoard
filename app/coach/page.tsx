import Link from "next/link";
import { requireCoach } from "@/lib/coach";
import {
  getAllBoards,
  getAthletes,
  getSubmissionsForBoard,
  getTasks,
} from "@/lib/data";
import CoachShell from "./CoachShell";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function CoachHome({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const coach = await requireCoach();
  const { board: boardParam } = await searchParams;

  const allBoards = await getAllBoards();
  const active = allBoards.find((b) => b.is_active) ?? null;
  const board =
    (boardParam && allBoards.find((b) => b.id === boardParam)) || active;

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

  const [tasks, allAthletes, submissions] = await Promise.all([
    getTasks(board.id),
    getAthletes(false),
    getSubmissionsForBoard(board.id),
  ]);

  // Show the current roster plus anyone who participated on this board, so
  // history stays complete even after an athlete is deactivated.
  const participated = new Set(submissions.map((s) => s.athlete_id));
  const athletes = allAthletes.filter((a) => a.active || participated.has(a.id));

  return (
    <CoachShell email={coach.email}>
      <Dashboard
        board={board}
        allBoards={allBoards}
        tasks={tasks}
        athletes={athletes}
        submissions={submissions}
      />
    </CoachShell>
  );
}
