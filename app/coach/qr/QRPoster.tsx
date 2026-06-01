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
          className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white shadow-card hover:opacity-90"
        >
          Print poster
        </button>
      </div>

      {/* The printable poster — always light, so it scans + prints cleanly. */}
      <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center text-[#242424] shadow-lift print:border-0 print:shadow-none">
        <p className="font-race text-base uppercase tracking-widest text-accent">
          {subtitle || "Scan to start"}
        </p>
        <h2 className="font-race mt-1 text-5xl uppercase leading-tight text-[#242424]">
          {title}
        </h2>
        <p className="mt-2 text-gray-500">Scan with your phone camera 📷</p>

        <div className="mx-auto mt-6 w-fit rounded-2xl border-4 p-4" style={{ borderColor: accent }}>
          {url ? (
            <QRCodeSVG value={url} size={232} level="M" marginSize={0} fgColor="#0e1726" />
          ) : (
            <div className="h-[232px] w-[232px]" />
          )}
        </div>

        <ol className="mx-auto mt-6 max-w-xs space-y-1 text-left text-sm text-gray-500">
          <li>1. Open your camera and point it at the code.</li>
          <li>2. Tap your name (or add it).</li>
          <li>3. Upload a photo or video for each task. 💪</li>
        </ol>

        <p className="mt-6 break-all text-xs text-gray-400">{url}</p>
      </div>
    </div>
  );
}
