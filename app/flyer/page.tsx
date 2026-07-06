import Link from "next/link";
import { getFlyerBoard, getFlyers, getTasks } from "@/lib/data";
import FlyerBoard from "../FlyerBoard";

export const dynamic = "force-dynamic";

export default async function FlyerPage() {
  const board = await getFlyerBoard();

  if (!board) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl font-extrabold">No flyer board yet</h1>
        <p className="text-muted">A coach needs to set up the weekly flyer board.</p>
        <Link
          href="/coach/board"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
        >
          Coach login
        </Link>
      </main>
    );
  }

  const [tasks, athletes] = await Promise.all([getTasks(board.id), getFlyers()]);

  return <FlyerBoard board={board} tasks={tasks} athletes={athletes} />;
}
