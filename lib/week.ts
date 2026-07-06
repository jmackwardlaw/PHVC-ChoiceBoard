// Start of the current week — Monday 00:00 — in the given timezone, as epoch ms
// (so the flyer week closes Sunday 11:59pm).
//
// The athlete/coach browser can just use the device clock, but server code
// (exports, the printable report) runs in UTC, so it needs to know the team's
// actual timezone to line the week up with what everyone sees. Defaults to US
// Eastern (the team's zone). Uses Intl so DST is handled; it can be off by up
// to the DST offset only during the single hour of a spring/fall transition.
export function startOfWeekMs(timeZone = "America/New_York"): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const daysSinceMon = (wd + 6) % 7; // Monday = 0 … Sunday = 6
  const hh = Number(get("hour")) % 24; // some locales render midnight as "24"
  const mm = Number(get("minute"));
  const ss = Number(get("second"));
  const elapsed = (((daysSinceMon * 24 + hh) * 60 + mm) * 60 + ss) * 1000 + now.getMilliseconds();
  return now.getTime() - elapsed;
}
