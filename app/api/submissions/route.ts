import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/submissions?board=...&athlete=...  → that athlete's submissions.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("board");
  const athleteId = searchParams.get("athlete");
  if (!boardId || !athleteId) {
    return NextResponse.json({ error: "Missing query params." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("board_id", boardId)
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
  return NextResponse.json({ submissions: data ?? [] });
}

// POST → record a finished upload as a submission.
export async function POST(request: Request) {
  let body: {
    boardId?: string;
    athleteId?: string;
    taskId?: string;
    filePath?: string;
    fileType?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { boardId, athleteId, taskId, filePath } = body;
  if (!boardId || !athleteId || !taskId || !filePath) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const fileType = body.fileType === "video" ? "video" : "image";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      board_id: boardId,
      task_id: taskId,
      athlete_id: athleteId,
      file_path: filePath,
      file_type: fileType,
      note: (body.note ?? "").slice(0, 500),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
  return NextResponse.json({ submission: data });
}
