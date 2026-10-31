import svg from "./logo.svg?raw";

/** The Gecko wordmark, the same drawing as on the website. It takes the text colour around it. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`logo ${className}`.trim()}
      role="img"
      aria-label="Gecko"
      dangerouslySetInnerHTML={{
        __html: svg.replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"'),
      }}
    />
  );
}
