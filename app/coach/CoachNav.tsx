"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/coach", label: "Dashboard" },
  { href: "/coach/board", label: "Edit board" },
  { href: "/coach/roster", label: "Roster" },
  { href: "/coach/qr", label: "QR poster" },
];

export default function CoachNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold leading-none transition ${
              active
                ? "bg-ink text-white"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
