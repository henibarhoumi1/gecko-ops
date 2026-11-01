import { setLang, useLang, type Lang } from "@/lib/i18n";

const OPTIONS: [Lang, string, string][] = [
  ["en", "EN", "English"],
  ["fr", "FR", "Français"],
];

/** EN · FR, for clients. The choice is remembered in this browser. */
export function LangSwitch() {
  const lang = useLang();
  return (
    <span className="lang-switch" role="group" aria-label="Language / Langue">
      {OPTIONS.map(([code, short, name]) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={name}
          aria-label={name}
          aria-pressed={lang === code}
          className={lang === code ? "on" : undefined}
          onClick={() => setLang(code)}
        >
          {short}
        </button>
      ))}
    </span>
  );
}
