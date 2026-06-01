import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { presignUpload } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Athletes call this to get a one-time signed URL, then upload their photo/video
// directly to R2 storage from the browser. This keeps large video uploads off
// our serverless functions (which have a small request-body limit).
export async function POST(request: Request) {
  let body: { boardId?: string; athleteId?: string; taskId?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { boardId, athleteId, taskId, fileName } = body;
  if (!boardId || !athleteId || !taskId) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Make sure these actually belong together before handing out an upload URL.
  const [{ data: task }, { data: athlete }] = await Promise.all([
    supabase.from("tasks").select("id").eq("id", taskId).eq("board_id", boardId).maybeSingle(),
    supabase.from("athletes").select("id").eq("id", athleteId).maybeSingle(),
  ]);
  if (!task || !athlete) {
    return NextResponse.json({ error: "Unknown task or athlete." }, { status: 404 });
  }

  const ext = (fileName?.split(".").pop() ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const path = `${boardId}/${athleteId}/${taskId}-${Date.now()}.${ext}`;

  try {
    const url = await presignUpload(path);
    return NextResponse.json({ path, url });
  } catch {
    return NextResponse.json({ error: "Could not create upload URL." }, { status: 500 });
  }
}
