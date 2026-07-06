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
import { startOfWeekMs } from "@/lib/week";
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

  const roster = board.is_flyer
    ? allAthletes.filter((a) => a.position_group === "flyer")
    : allAthletes;
  const participated = new Set(submissions.map((s) => s.athlete_id));
  const athletes = roster.filter((a) => a.active || participated.has(a.id));

  const total = tasks.length;

  // Flyer board: count this week's uploads per (athlete, tile); done at target.
  // Team board: latest non-redo upload per (athlete, tile) is done.
  let doneCount: (athleteId: string) => number;
  if (board.is_flyer) {
    const weekStart = startOfWeekMs();
    const goalOf = (t: (typeof tasks)[number]) => (t.target && t.target > 0 ? t.target : 1);
    const prog = new Map<string, number>();
    for (const s of submissions) {
      if (s.status === "redo") continue;
      if (new Date(s.created_at).getTime() < weekStart) continue;
      const key = `${s.athlete_id}:${s.task_id}`;
      prog.set(key, (prog.get(key) ?? 0) + 1);
    }
    doneCount = (aid) => tasks.filter((t) => (prog.get(`${aid}:${t.id}`) ?? 0) >= goalOf(t)).length;
  } else {
    const latest = new Map<string, Submission>();
    for (const s of submissions) {
      const key = `${s.athlete_id}:${s.task_id}`;
      if (!latest.has(key)) latest.set(key, s);
    }
    doneCount = (aid) => tasks.filter((t) => isDone(latest.get(`${aid}:${t.id}`))).length;
  }

  const rows = athletes
    .map((a) => ({ name: a.name, done: doneCount(a.id), total }))
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
