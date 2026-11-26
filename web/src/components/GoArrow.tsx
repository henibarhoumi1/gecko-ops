// The arrow after "Open", "All clients", "Next" (and before "Back"): drawn, so it matches the line icons, not a
// text glyph.
export function GoArrow({ back = false }: { back?: boolean }) {
  return (
    <svg className={`go-arrow${back ? " is-back" : ""}`} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={back ? "M13 8H3.5M7.5 4l-4 4 4 4" : "M3 8h9.5M8.5 4l4 4-4 4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
