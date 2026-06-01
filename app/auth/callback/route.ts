import { NextResponse } from "next/server";
import { isAllowedCoach } from "@/lib/coach";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${base}/coach/login?error=auth`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${base}/coach/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowedCoach(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${base}/coach/login?error=not-allowed`);
  }

  return NextResponse.redirect(`${base}/coach`);
}
