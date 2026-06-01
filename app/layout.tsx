import type { Metadata } from "next";
import { Anton, Manrope, Oswald } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

// Big sporty headers/titles.
const heading = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
});

// Palmetto Athletics brand display face — big sporty wordmarks/titles.
const race = localFont({
  src: "../public/fonts/Racesport.ttf",
  variable: "--font-race",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PHVC Choice Board",
  description: "Varsity Cheer conditioning board — upload your evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${heading.variable} ${race.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
