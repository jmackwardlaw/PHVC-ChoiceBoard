import { redirect } from "next/navigation";
import { getCoach } from "@/lib/coach";
import LoginButton from "./LoginButton";
import Logo from "../../Logo";

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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="accent-header flex flex-col items-center px-8 pt-9 pb-7 text-center text-white">
          <Logo variant="badge" size={64} />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
            Palmetto Athletics
          </p>
          <h1 className="font-race mt-1 text-4xl uppercase">
            Coach Login
          </h1>
        </div>

        <div className="px-8 pt-6 pb-8 text-center">
          <p className="mb-6 text-sm text-muted">
            Sign in with your approved Google account.
          </p>

          {message && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {message}
            </p>
          )}

          <LoginButton />

          <a
            href="/"
            className="mt-6 inline-block text-sm font-medium text-muted hover:text-ink hover:underline"
          >
            ← Back to athlete board
          </a>
        </div>
      </div>
    </main>
  );
}
