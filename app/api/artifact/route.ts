import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Returns a short-lived signed URL to view an uploaded artifact.
// Coach-only — athletes never need to read each other's files.
export async function GET(request: Request) {
  const coach = await getCoach();
  if (!coach) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("artifacts")
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error || !data) {
    return NextResponse.json({ error: "Could not sign URL." }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl });
}
