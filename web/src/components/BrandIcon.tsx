import { BRANDS, type BrandName } from "./brands";

/** A real brand mark in its own colour (or `color` to override, e.g. white on a dark button). */
export function BrandIcon({
  name,
  size = 16,
  color,
}: {
  name: BrandName;
  size?: number;
  color?: string;
}) {
  const b = BRANDS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color ?? b.color}
      aria-hidden="true"
      focusable="false"
    >
      <path d={b.d} />
    </svg>
  );
}
