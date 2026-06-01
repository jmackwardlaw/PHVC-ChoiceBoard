import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export function allowedCoachEmails(): string[] {
  return (process.env.ALLOWED_COACH_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedCoach(email?: string | null): boolean {
  if (!email) return false;
  return allowedCoachEmails().includes(email.toLowerCase());
}

// Returns the signed-in coach, or null if not logged in / not on the allowlist.
export async function getCoach(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedCoach(user.email)) return null;
  return user;
}

// Use at the top of a protected coach page/route.
export async function requireCoach(): Promise<User> {
  const coach = await getCoach();
  if (!coach) redirect("/coach/login");
  return coach;
}
