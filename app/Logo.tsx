// Palmetto Athletics horseshoe mark. Use `red` on white/light surfaces and
// `badge` (white horseshoe on a dark-grey coin) on colored accent bands.
export default function Logo({
  variant = "red",
  size = 40,
  className = "",
}: {
  variant?: "red" | "badge";
  size?: number;
  className?: string;
}) {
  const src =
    variant === "badge" ? "/horseshoe-white-on-grey.svg" : "/horseshoe-red.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Palmetto Athletics"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
