import { redirect } from "next/navigation";
import { getCoach } from "@/lib/coach";
import LoginButton from "./LoginButton";

export const dynamic = "force-dynamic";

export default async function CoachLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const coach = await getCoach();
  if (coach) redirect("/coach");

  const { error } = await searchParams;
  const message =
    error === "not-allowed"
      ? "That Google account isn't on the coach list. Ask the admin to add your email."
      : error === "auth"
        ? "Sign-in didn't complete. Please try again."
        : "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          PHVC Choice Board
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold">Coach login</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          Sign in with your approved Google account.
        </p>

        {message && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {message}
          </p>
        )}

        <LoginButton />

        <a href="/" className="mt-6 inline-block text-sm font-medium text-muted hover:underline">
          ← Back to athlete board
        </a>
      </div>
    </main>
  );
}
