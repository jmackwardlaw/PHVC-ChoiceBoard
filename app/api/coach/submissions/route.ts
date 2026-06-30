import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObjects } from "@/lib/r2";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["submitted", "approved", "redo"]);

// POST handles coach actions on submissions:
//   { submissionId, status }                       → approve / needs-redo one
//   { action: "mark-complete", boardId, taskId, athleteId } → manual check-off
//   { action: "unmark", submissionId }             → undo a manual check-off
//   { action: "delete-submission", submissionId }  → delete upload + stored file
//   { action: "bulk-approve" | "bulk-redo", boardId?, taskId?, athleteId? }
//                                                  → review all pending at once
export async function POST(request: Request) {
  const coach = await getCoach();
  if (!coach) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const action = body.action as string | undefined;

  // Manually mark a tile complete for an athlete who couldn't upload (no
  // internet, etc). Stored as an approved "manual" submission with no file.
  if (action === "mark-complete") {
    const boardId = body.boardId as string;
    const taskId = body.taskId as string;
    const athleteId = body.athleteId as string;
    if (!boardId || !taskId || !athleteId) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        board_id: boardId,
        task_id: taskId,
        athlete_id: athleteId,
        file_path: "",
        file_type: "manual",
        status: "approved",
        note: "Marked complete by coach",
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, submission: data });
  }

  // Undo a manual check-off (only removes manual entries, never real uploads).
  if (action === "unmark") {
    const submissionId = body.submissionId as string;
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId." }, { status: 400 });
    }
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId)
      .eq("file_type", "manual");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Permanently delete a submission (and its stored file), resetting that
  // athlete on that tile so they can upload again.
  if (action === "delete-submission") {
    const submissionId = body.submissionId as string;
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId." }, { status: 400 });
    }
    const { data: sub } = await supabase
      .from("submissions")
      .select("file_path, file_type")
      .eq("id", submissionId)
      .maybeSingle();

    if (sub?.file_path && sub.file_type !== "manual") {
      await deleteObjects([sub.file_path]);
    }

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Bulk approve/redo every still-pending ("submitted") upload, optionally
  // scoped to a board, task, or athlete. Only touches "submitted" rows, so
  // already-approved, redo, and manual entries are left alone.
  if (action === "bulk-approve" || action === "bulk-redo") {
    const next = action === "bulk-approve" ? "approved" : "redo";
    const boardId = body.boardId as string | undefined;
    const taskId = body.taskId as string | undefined;
    const athleteId = body.athleteId as string | undefined;
    // Redo can send work back to athletes, so require a board scope to avoid an
    // accidental everything-everywhere reset.
    if (action === "bulk-redo" && !boardId) {
      return NextResponse.json({ error: "Missing boardId." }, { status: 400 });
    }
    let query = supabase
      .from("submissions")
      .update({ status: next })
      .eq("status", "submitted");
    if (boardId) query = query.eq("board_id", boardId);
    if (taskId) query = query.eq("task_id", taskId);
    if (athleteId) query = query.eq("athlete_id", athleteId);
    const { data, error } = await query.select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: data?.length ?? 0 });
  }

  // Default: approve / needs-redo an existing submission.
  const submissionId = body.submissionId as string;
  const status = body.status as string;
  if (!submissionId || !status || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const { error } = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", submissionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
