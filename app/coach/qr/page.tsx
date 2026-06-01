import { requireCoach } from "@/lib/coach";
import { getActiveBoard } from "@/lib/data";
import CoachShell from "../CoachShell";
import QRPoster from "./QRPoster";

export const dynamic = "force-dynamic";

export default async function QRPage() {
  const coach = await requireCoach();
  const board = await getActiveBoard();

  return (
    <CoachShell email={coach.email}>
      <QRPoster
        title={board?.title ?? "Choice Board"}
        subtitle={board?.subtitle ?? ""}
        accent={board?.accent_color ?? "#1aa0b8"}
      />
    </CoachShell>
  );
}
