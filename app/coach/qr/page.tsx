import { requireCoach } from "@/lib/coach";
import { getActiveBoard } from "@/lib/data";
import CoachShell from "../CoachShell";
import QRPoster from "./QRPoster";

export const dynamic = "force-dynamic";

export default async function QRPage() {
  const coach = await requireCoach();
  const board = await getActiveBoard();

  return (
    <CoachShell email={coach.email} name={coach.user_metadata?.full_name ?? coach.user_metadata?.name}>
      <QRPoster
        title={board?.title ?? "Choice Board"}
        subtitle={board?.subtitle ?? ""}
        accent={board?.accent_color ?? "#e20706"}
      />
    </CoachShell>
  );
}
