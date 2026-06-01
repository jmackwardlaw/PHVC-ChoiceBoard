import CoachNav from "./CoachNav";
import Logo from "../Logo";

export default function CoachShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3">
          <span className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-xl font-extrabold uppercase tracking-tight">
              PHVC<span className="font-semibold text-muted"> Coach</span>
            </span>
          </span>
          <CoachNav />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{email}</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:bg-canvas">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
