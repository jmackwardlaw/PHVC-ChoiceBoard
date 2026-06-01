import CoachNav from "./CoachNav";

function lastNameFrom(name?: string | null): string | null {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length ? parts[parts.length - 1] : null;
}

export default function CoachShell({
  email,
  name,
  children,
}: {
  email?: string | null;
  name?: string | null;
  children: React.ReactNode;
}) {
  const lastName = lastNameFrom(name);
  const greeting = lastName ? `Welcome Coach ${lastName}` : "Coach Dashboard";
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3">
          <span className="flex items-center gap-3">
            <span className="flex shrink-0 items-center rounded-xl bg-ink px-3 py-2.5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/taking-it-back-white.svg"
                alt="Palmetto — Taking It Back"
                className="h-9 w-auto sm:h-11"
              />
            </span>
            <span className="font-race text-xl uppercase leading-none sm:text-2xl">
              {greeting}
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
