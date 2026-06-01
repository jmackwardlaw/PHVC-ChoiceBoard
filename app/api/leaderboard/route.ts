import { NextResponse } from "next/server";
import {
  getBoardById,
  getAthletes,
  getSubmissionsForBoard,
  getTasks,
} from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/leaderboard?board=...  → ranked athlete progress.
// Only returns data if the coach turned the leaderboard on for this board.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("board");
  if (!boardId) {
    return NextResponse.json({ error: "Missing board." }, { status: 400 });
  }

  const board = await getBoardById(boardId);
  if (!board || !board.show_leaderboard) {
    return NextResponse.json({ enabled: false, total: 0, rows: [] });
  }

  const [tasks, athletes, submissions] = await Promise.all([
    getTasks(boardId),
    getAthletes(true),
    getSubmissionsForBoard(boardId),
  ]);

  // Latest submission per (athlete, task); a "redo" doesn't count as done.
  const latest = new Map<string, string>();
  for (const s of submissions) {
    const key = `${s.athlete_id}:${s.task_id}`;
    if (!latest.has(key)) latest.set(key, s.status); // newest-first ordering
  }

  const rows = athletes
    .map((a) => {
      const done = tasks.filter((t) => {
        const st = latest.get(`${a.id}:${t.id}`);
        return st && st !== "redo";
      }).length;
      return { name: a.name, done };
    })
    .sort((x, y) => y.done - x.done || x.name.localeCompare(y.name));

  return NextResponse.json({ enabled: true, total: tasks.length, rows });
}
