import { allowedCoachEmails, requireCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Coach } from "@/lib/types";
import CoachShell from "../CoachShell";
import CoachesEditor from "./CoachesEditor";

export const dynamic = "force-dynamic";

export default async function CoachesPage() {
  const coach = await requireCoach();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("coaches")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <CoachShell email={coach.email} name={coach.user_metadata?.full_name ?? coach.user_metadata?.name}>
      <CoachesEditor
        dbCoaches={(data ?? []) as Coach[]}
        bootstrapEmails={allowedCoachEmails()}
        currentEmail={(coach.email ?? "").toLowerCase()}
      />
    </CoachShell>
  );
}
