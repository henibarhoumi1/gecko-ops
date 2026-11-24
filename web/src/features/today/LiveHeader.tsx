// The top of Home, alive (Heni, 24 Nov 2026): a ticking clock, the weather in Tunis, a one-line brief, and the
// buttons people reach for many times a day (a Meet, a calendar event, WhatsApp, Drive).
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { openPalette } from "@/features/shell/CommandPalette";

const WEATHER: [number[], string, IconName][] = [
  [[0], "Clear", "sun"],
  [[1, 2], "Partly cloudy", "cloudSun"],
  [[3], "Cloudy", "cloud"],
  [[45, 48], "Fog", "fog"],
  [[51, 53, 55, 56, 57], "Drizzle", "rain"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "rain"],
  [[71, 73, 75, 77, 85, 86], "Snow", "snow"],
  [[95, 96, 99], "Storm", "storm"],
];

export function weatherLabel(code: number): [string, IconName] {
  const hit = WEATHER.find(([codes]) => codes.includes(code));
  return hit ? [hit[1], hit[2]] : ["", "cloud"];
}

interface Weather {
  temp: number;
  code: number;
  wind: number;
  max: number;
  min: number;
}

function useTunisWeather() {
  return useQuery({
    queryKey: ["weather-tunis"],
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: false,
    // Automated checks (phone screenshots) wait for a quiet network: no weather there.
    enabled: !navigator.webdriver,
    queryFn: async ({ signal }): Promise<Weather> => {
      const ctl = new AbortController();
      const stop = () => ctl.abort();
      signal.addEventListener("abort", stop);
      const timer = window.setTimeout(stop, 5000);
      const r = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=36.81&longitude=10.18&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Africa%2FTunis&forecast_days=1",
        { signal: ctl.signal },
      ).finally(() => {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", stop);
      });
      if (!r.ok) throw new Error("weather");
      const d = (await r.json()) as {
        current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
        daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
      };
      return {
        temp: Math.round(d.current.temperature_2m),
        code: d.current.weather_code,
        wind: Math.round(d.current.wind_speed_10m),
        max: Math.round(d.daily.temperature_2m_max[0] ?? d.current.temperature_2m),
        min: Math.round(d.daily.temperature_2m_min[0] ?? d.current.temperature_2m),
      };
    },
  });
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const tunis = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  d.toLocaleString("en-GB", { timeZone: "Africa/Tunis", ...opts });

export function LiveHeader({ greeting, brief }: { greeting: string; brief: ReactNode }) {
  const now = useNow();
  const weather = useTunisWeather();
  const w = weather.data;
  const [label, icon] = w ? weatherLabel(w.code) : (["", "cloud"] as const);
  return (
    <header className="live-head">
      <div className="live-hello">
        <h1>{greeting}</h1>
        <p className="live-brief">{brief}</p>
      </div>
      <div className="live-side">
        <div className="live-clock" aria-label="Time in Tunis">
          <strong>{tunis(now, { hour: "2-digit", minute: "2-digit", hour12: false })}</strong>
          <span className="live-sec">{tunis(now, { second: "2-digit" }).padStart(2, "0")}</span>
        </div>
        <span className="live-date">
          {tunis(now, { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <div className="live-weather">
          {w ? (
            <>
              <Icon name={icon} size={20} className="live-weather-icon" />
              <span>
                <strong>{w.temp}°</strong> {label} in Tunis
                <span className="small">
                  {" "}
                  · {w.min}°–{w.max}° · wind {w.wind} km/h
                </span>
              </span>
            </>
          ) : (
            <span className="small">Tunis</span>
          )}
        </div>
      </div>
    </header>
  );
}

const QUICK: { label: string; href?: string; run?: () => void; icon: IconName; hint: string }[] = [
  {
    label: "New Meet",
    href: "https://meet.google.com/new",
    icon: "video",
    hint: "Opens a fresh Google Meet",
  },
  {
    label: "Calendar event",
    href: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Gecko%20%C2%B7%20",
    icon: "calendar",
    hint: "New Google Calendar event",
  },
  { label: "WhatsApp", href: "https://web.whatsapp.com/", icon: "chat", hint: "WhatsApp Web" },
  {
    label: "Drive",
    href: "https://drive.google.com/drive/my-drive",
    icon: "folder",
    hint: "Google Drive",
  },
  { label: "Mail", href: "https://mail.zoho.com/", icon: "mail", hint: "Your Gecko inbox" },
  { label: "Do anything", run: openPalette, icon: "command", hint: "⌘K: new idea, script, lead…" },
];

export function QuickActions() {
  return (
    <nav className="quick-actions" aria-label="Quick actions">
      {QUICK.map((q) =>
        q.href ? (
          <a key={q.label} href={q.href} target="_blank" rel="noreferrer noopener" title={q.hint}>
            <span className="qa-icon" aria-hidden="true">
              <Icon name={q.icon} size={15} />
            </span>
            {q.label}
          </a>
        ) : (
          <button key={q.label} type="button" onClick={q.run} title={q.hint}>
            <span className="qa-icon" aria-hidden="true">
              <Icon name={q.icon} size={15} />
            </span>
            {q.label}
          </button>
        ),
      )}
    </nav>
  );
}
