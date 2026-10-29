import type { ReactNode } from "react";

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
        <p className="logo">gecko.]</p>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
        {children}
      </section>
    </main>
  );
}
