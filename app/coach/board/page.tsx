import { requireCoach } from "@/lib/coach";
import { getActiveBoard, getAllBoards, getFlyerBoard, getTasks } from "@/lib/data";
import CoachShell from "../CoachShell";
import BoardWorkspace from "./BoardWorkspace";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const coach = await requireCoach();
  const [board, flyerBoard, allBoards] = await Promise.all([
    getActiveBoard(),
    getFlyerBoard(),
    getAllBoards(),
  ]);
  const [tasks, flyerTasks] = await Promise.all([
    board ? getTasks(board.id) : Promise.resolve([]),
    flyerBoard ? getTasks(flyerBoard.id) : Promise.resolve([]),
  ]);

  return (
    <CoachShell email={coach.email} name={coach.user_metadata?.full_name ?? coach.user_metadata?.name}>
      <BoardWorkspace
        teamBoard={board}
        teamTasks={tasks}
        allBoards={allBoards}
        flyerBoard={flyerBoard}
        flyerTasks={flyerTasks}
      />
    </CoachShell>
  );
}
