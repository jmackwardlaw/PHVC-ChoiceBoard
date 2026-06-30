import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coach";
import { slugify, toCsv, type CsvValue } from "@/lib/csv";
import {
  getActiveBoard,
  getAthletes,
  getBoardById,
  getSubmissionsForBoard,
  getTasks,
} from "@/lib/data";
import type { Submission } from "@/lib/types";

export const dynamic = "force-dynamic";

// A tile counts as "done" unless the coach sent it back for a redo — mirrors
// the dashboard's `counts()` helper.
const isDone = (s: Submission | undefined) => !!s && s.status !== "redo";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  redo: "Needs redo",
};

export async function GET(request: Request) {
  const coach = await getCoach();
  if (!coach) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const boardParam = searchParams.get("boardId");

  // Roster export doesn't depend on a board.
  if (type === "roster") {
    const athletes = await getAthletes(false);
    const rows: CsvValue[][] = [["Name", "Active", "Added"]];
    for (const a of athletes) {
      rows.push([a.name, a.active ? "Yes" : "No", a.created_at.slice(0, 10)]);
    }
    return csvResponse(toCsv(rows), "phvc-roster.csv");
  }

  if (type !== "completion" && type !== "submissions") {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  const board = boardParam
    ? await getBoardById(boardParam)
    : await getActiveBoard();
  if (!board) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  const [tasks, allAthletes, submissions] = await Promise.all([
    getTasks(board.id),
    getAthletes(false),
    getSubmissionsForBoard(board.id),
  ]);

  // Same athlete set the dashboard shows: current roster plus anyone who
  // participated on this board.
  const participated = new Set(submissions.map((s) => s.athlete_id));
  const athletes = allAthletes.filter((a) => a.active || participated.has(a.id));

  const slug = slugify(board.subtitle || board.title);

  if (type === "completion") {
    // Collapse to the latest submission per (athlete, task); submissions arrive
    // newest-first.
    const latest = new Map<string, Submission>();
    for (const s of submissions) {
      const key = `${s.athlete_id}:${s.task_id}`;
      if (!latest.has(key)) latest.set(key, s);
    }
    const total = tasks.length;
    const rows: CsvValue[][] = [
      ["Athlete", "Tasks done", "Total", "Percent", "Finished"],
    ];
    for (const a of athletes) {
      const done = tasks.filter((t) => isDone(latest.get(`${a.id}:${t.id}`))).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      rows.push([a.name, done, total, `${pct}%`, done === total && total > 0 ? "Yes" : "No"]);
    }
    return csvResponse(toCsv(rows), `phvc-completion-${slug}.csv`);
  }

  // type === "submissions": full history, one row per submission.
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const athleteById = new Map(allAthletes.map((a) => [a.id, a]));
  const rows: CsvValue[][] = [
    ["Athlete", "Task", "Category", "Status", "Type", "Date", "Note"],
  ];
  for (const s of submissions) {
    const t = taskById.get(s.task_id);
    rows.push([
      athleteById.get(s.athlete_id)?.name ?? "(removed)",
      t?.title ?? "(removed tile)",
      t?.category ?? "",
      STATUS_LABEL[s.status] ?? s.status,
      s.file_type,
      s.created_at.slice(0, 10),
      s.note,
    ]);
  }
  return csvResponse(toCsv(rows), `phvc-submissions-${slug}.csv`);
}

function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
