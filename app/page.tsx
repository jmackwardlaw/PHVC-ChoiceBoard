import Link from "next/link";

export const dynamic = "force-dynamic";

// Landing page: pick a board, or head to the coach login.
export default function Home() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ["--accent" as string]: "#e20706" }}
    >
      <div className="accent-header flex flex-col items-center px-6 pb-8 pt-10 text-center text-white shadow-sm">
        <div className="w-80 max-w-[85%] sm:w-[26rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/taking-it-back-white.svg"
            alt="Palmetto — Taking It Back"
            className="block h-auto w-full"
          />
        </div>
        <h1 className="font-race mt-3 text-4xl uppercase leading-none sm:text-5xl">
          PHS Cheer
        </h1>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted">
          Choose your board
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <BoardCard
            href="/choiceboard"
            emoji="📋"
            title="Choice Board"
            desc="The monthly team conditioning board — upload your evidence for each tile."
          />
          <BoardCard
            href="/flyer"
            emoji="🤸"
            title="Flyer Board"
            desc="Flyers only. The weekly training board — complete your 4 activities each day."
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/coach"
            className="inline-block rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 active:scale-[0.98]"
          >
            Coach Login
          </Link>
        </div>
      </main>
    </div>
  );
}

function BoardCard({
  href,
  emoji,
  title,
  desc,
}: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:border-accent hover:shadow-lift"
    >
      <span className="text-4xl">{emoji}</span>
      <h2 className="font-race mt-3 text-3xl uppercase leading-none text-accent">
        {title}
      </h2>
      <p className="mt-2 flex-1 text-sm text-muted">{desc}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink">
        Open <span className="transition group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
