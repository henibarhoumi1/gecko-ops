import type { ReactNode } from "react";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";

export function AuthLayout({
  title,
  intro,
  children,
}: {
  /** Kept for the callers; no longer shown (no labels above headings). */
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth">
      <section className="auth-card">
        <div className="auth-top">
          <Logo />
          <LangSwitch />
        </div>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
        {children}
      </section>
    </main>
  );
}
