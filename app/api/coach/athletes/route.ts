import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (name.length < 2) {
      return NextResponse.json({ error: "Enter a name." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("athletes")
      .insert({ name })
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Could not add." }, { status: 500 });
    return NextResponse.json({ athlete: data });
  }

  if (action === "add-bulk") {
    const names = String(body.names ?? "")
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length >= 2)
      .slice(0, 200);
    if (!names.length) {
      return NextResponse.json({ error: "No names found." }, { status: 400 });
    }
    const { error } = await supabase
      .from("athletes")
      .insert(names.map((name) => ({ name })));
    if (error) return NextResponse.json({ error: "Could not add." }, { status: 500 });
    return NextResponse.json({ ok: true, added: names.length });
  }

  if (action === "rename") {
    const id = body.id as string;
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!id || name.length < 2) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    await supabase.from("athletes").update({ name }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle") {
    const id = body.id as string;
    const active = Boolean(body.active);
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await supabase.from("athletes").update({ active }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await supabase.from("athletes").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
