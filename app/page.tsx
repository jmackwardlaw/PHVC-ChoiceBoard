import Link from "next/link";
import { getActiveBoard, getAthletes, getTasks } from "@/lib/data";
import AthleteBoard from "./AthleteBoard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const board = await getActiveBoard();

  if (!board) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl font-extrabold">No active board yet</h1>
        <p className="text-muted">
          A coach needs to set up this month&apos;s board.
        </p>
        <Link
          href="/coach"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
        >
          Coach login
        </Link>
      </main>
    );
  }

  const [tasks, athletes] = await Promise.all([
    getTasks(board.id),
    getAthletes(true),
  ]);

  return <AthleteBoard board={board} tasks={tasks} athletes={athletes} />;
}
