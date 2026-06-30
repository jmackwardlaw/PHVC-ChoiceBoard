import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export function allowedCoachEmails(): string[] {
  return (process.env.ALLOWED_COACH_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// True only for emails on the ALLOWED_COACH_EMAILS env list. These are the
// bootstrap coaches — always allowed, can't be removed from the UI.
export function isBootstrapCoach(email?: string | null): boolean {
  if (!email) return false;
  return allowedCoachEmails().includes(email.toLowerCase());
}

// Allowed if the email is on the env bootstrap list OR has a row in `coaches`.
// Wrapped in React `cache` so repeated checks within one request hit the DB
// once. Bootstrap emails short-circuit before touching the database.
export const isAllowedCoach = cache(
  async (email?: string | null): Promise<boolean> => {
    if (!email) return false;
    if (isBootstrapCoach(email)) return true;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("coaches")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return !!data;
  },
);

// Returns the signed-in coach, or null if not logged in / not on the allowlist.
export const getCoach = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAllowedCoach(user.email))) return null;
  return user;
});

// Use at the top of a protected coach page/route.
export async function requireCoach(): Promise<User> {
  const coach = await getCoach();
  if (!coach) redirect("/coach/login");
  return coach;
}
