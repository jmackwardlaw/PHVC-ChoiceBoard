import { requireCoach } from "@/lib/coach";
import { getAthletes } from "@/lib/data";
import CoachShell from "../CoachShell";
import RosterEditor from "./RosterEditor";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const coach = await requireCoach();
  const athletes = await getAthletes(false);

  return (
    <CoachShell email={coach.email}>
      <RosterEditor athletes={athletes} />
    </CoachShell>
  );
}
