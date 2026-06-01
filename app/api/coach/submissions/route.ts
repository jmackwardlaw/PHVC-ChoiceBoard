import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["submitted", "approved", "redo"]);

// POST handles three coach actions on submissions:
//   { submissionId, status }                       → approve / needs-redo
//   { action: "mark-complete", boardId, taskId, athleteId } → manual check-off
//   { action: "unmark", submissionId }             → undo a manual check-off
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
      await supabase.storage.from("artifacts").remove([sub.file_path]);
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
