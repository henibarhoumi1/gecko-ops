import type { ReactNode } from "react";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";

export function AuthLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
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
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
        {children}
      </section>
    </main>
  );
}
