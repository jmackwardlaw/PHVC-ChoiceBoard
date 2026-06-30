import { requireCoach } from "@/lib/coach";
import {
  getActiveBoard,
  getAllBoards,
  getAthletes,
  getBoardById,
  getSubmissionsForBoard,
  getTasks,
} from "@/lib/data";
import type { Submission } from "@/lib/types";
import CoachShell from "../CoachShell";
import ReportView from "./ReportView";

export const dynamic = "force-dynamic";

const isDone = (s: Submission | undefined) => !!s && s.status !== "redo";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const coach = await requireCoach();
  const { board: boardParam } = await searchParams;

  const board = boardParam
    ? await getBoardById(boardParam)
    : await getActiveBoard();

  if (!board) {
    return (
      <CoachShell email={coach.email} name={coach.user_metadata?.full_name ?? coach.user_metadata?.name}>
        <p className="text-muted">No board to report on yet.</p>
      </CoachShell>
    );
  }

  const [tasks, allAthletes, submissions, allBoards] = await Promise.all([
    getTasks(board.id),
    getAthletes(false),
    getSubmissionsForBoard(board.id),
    getAllBoards(),
  ]);

  const participated = new Set(submissions.map((s) => s.athlete_id));
  const athletes = allAthletes.filter((a) => a.active || participated.has(a.id));

  const latest = new Map<string, Submission>();
  for (const s of submissions) {
    const key = `${s.athlete_id}:${s.task_id}`;
    if (!latest.has(key)) latest.set(key, s);
  }

  const total = tasks.length;
  const rows = athletes
    .map((a) => {
      const done = tasks.filter((t) => isDone(latest.get(`${a.id}:${t.id}`))).length;
      return { name: a.name, done, total };
    })
    .sort((x, y) => y.done - x.done || x.name.localeCompare(y.name));

  return (
    <CoachShell email={coach.email} name={coach.user_metadata?.full_name ?? coach.user_metadata?.name}>
      <ReportView
        title={board.title}
        subtitle={board.subtitle}
        accent={board.accent_color}
        boardId={board.id}
        isActive={board.is_active}
        boards={allBoards.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          is_active: b.is_active,
        }))}
        rows={rows}
      />
    </CoachShell>
  );
}
