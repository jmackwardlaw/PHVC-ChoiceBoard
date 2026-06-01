import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The athlete board lives at /choiceboard. Send the bare domain there.
export default function Home() {
  redirect("/choiceboard");
}
