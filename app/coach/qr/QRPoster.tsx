"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRPoster({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  // The athlete board lives at the site root.
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.origin + "/");
  }, []);

  return (
    <div style={{ ["--accent" as string]: accent }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-extrabold">QR poster</h1>
          <p className="text-sm text-muted">
            Print this and hang it in the locker room. Athletes scan it to open
            the board — no link to type.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white"
        >
          Print poster
        </button>
      </div>

      {/* The printable poster */}
      <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-sm print:border-0 print:shadow-none">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-accent">
          {subtitle || "Scan to start"}
        </p>
        <h2 className="font-display mt-1 text-4xl font-extrabold leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-muted">Scan with your phone camera 📷</p>

        <div className="mx-auto mt-6 w-fit rounded-2xl border-4 p-4" style={{ borderColor: accent }}>
          {url ? (
            <QRCodeSVG value={url} size={232} level="M" marginSize={0} fgColor="#0e1726" />
          ) : (
            <div className="h-[232px] w-[232px]" />
          )}
        </div>

        <ol className="mx-auto mt-6 max-w-xs space-y-1 text-left text-sm text-muted">
          <li>1. Open your camera and point it at the code.</li>
          <li>2. Tap your name (or add it).</li>
          <li>3. Upload a photo or video for each task. 💪</li>
        </ol>

        <p className="mt-6 break-all text-xs text-muted">{url}</p>
      </div>
    </div>
  );
}
