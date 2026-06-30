import { NextResponse } from "next/server";
import { allowedCoachEmails, getCoach, isBootstrapCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST handles coach-list management:
//   { action: "add", email, name? }   → invite another coach
//   { action: "rename", id, name }    → set a display name
//   { action: "remove", id }          → revoke a DB coach (bootstrap coaches stay)
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
  const action = body.action as string;

  if (action === "add") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (isBootstrapCoach(email)) {
      return NextResponse.json(
        { error: "That email is already a built-in coach." },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("coaches")
      .insert({ email, name, added_by_email: coach.email ?? "" })
      .select()
      .single();
    if (error) {
      // 23505 = unique_violation (email already in the table).
      const msg =
        error.code === "23505"
          ? `${email} is already a coach.`
          : "Could not add coach.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ coach: data });
  }

  if (action === "rename") {
    const id = body.id as string;
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await supabase.from("coaches").update({ name }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    // Don't strand the team: refuse to remove the last DB coach when there are
    // no env bootstrap coaches who could re-add one.
    if (allowedCoachEmails().length === 0) {
      const { count } = await supabase
        .from("coaches")
        .select("id", { count: "exact", head: true });
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Add another coach before removing the last one." },
          { status: 400 },
        );
      }
    }

    await supabase.from("coaches").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
