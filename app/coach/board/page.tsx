import { requireCoach } from "@/lib/coach";
import { getActiveBoard, getAllBoards, getTasks } from "@/lib/data";
import CoachShell from "../CoachShell";
import BoardEditor from "./BoardEditor";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const coach = await requireCoach();
  const [board, allBoards] = await Promise.all([getActiveBoard(), getAllBoards()]);
  const tasks = board ? await getTasks(board.id) : [];

  return (
    <CoachShell email={coach.email} name={coach.user_metadata?.full_name ?? coach.user_metadata?.name}>
      <BoardEditor board={board} tasks={tasks} allBoards={allBoards} />
    </CoachShell>
  );
}
