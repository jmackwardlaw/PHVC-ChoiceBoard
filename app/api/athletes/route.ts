import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Lets an athlete who isn't on the roster add their own name.
export async function POST(request: Request) {
  let body: { name?: string; asFlyer?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 80);
  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Reuse an existing athlete with the same name (case-insensitive) if present.
  const { data: existing } = await supabase
    .from("athletes")
    .select("*")
    .ilike("name", name)
    .maybeSingle();
  if (existing) {
    // Someone adding themselves from the flyer page should be marked a flyer,
    // even if they were already on the roster as a base.
    if (body.asFlyer && existing.position_group !== "flyer") {
      const { data: updated } = await supabase
        .from("athletes")
        .update({ position_group: "flyer" })
        .eq("id", existing.id)
        .select()
        .single();
      return NextResponse.json({ athlete: updated ?? existing });
    }
    return NextResponse.json({ athlete: existing });
  }

  const { data, error } = await supabase
    .from("athletes")
    .insert({ name, position_group: body.asFlyer ? "flyer" : null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not add your name." }, { status: 500 });
  }
  return NextResponse.json({ athlete: data });
}
