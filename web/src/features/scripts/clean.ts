import type { ProductionOption } from "@/features/production/model";
import { hookName, partLabel, STYLE_LABEL, type Script, type ScriptLine } from "./model";

/** The final script as plain text: the chosen hook (or every option), the parts in order, the shoot plan. */
export function cleanText(script: Script, options: Pick<ProductionOption, "id" | "name">[]): string {
  const name = (id: string | null | undefined) => options.find((o) => o.id === id)?.name ?? "";
  const plan = script.shoot ?? {};
  const out: string[] = [];
  const line = (label: string, l: ScriptLine) => {
    out.push(label.toUpperCase());
    if (l.see) out.push(`We see: ${l.see}`);
    if (l.hear) out.push(`We hear: ${l.hear}`);
    if (l.text) out.push(`On screen: ${l.text}`);
    out.push("");
  };
  out.push(script.title, `${script.seconds} s · ${STYLE_LABEL[script.style]} · version ${script.version}`);
  if (script.goal) out.push(`The viewer should: ${script.goal}`);
  out.push("");
  const talent = (plan.talent ?? []).map(name).filter(Boolean);
  const props = [...(plan.props ?? []).map(name).filter(Boolean), plan.extraProps?.trim() ?? ""].filter(
    Boolean,
  );
  if (talent.length) out.push(`Talent: ${talent.join(", ")}`);
  if (name(plan.set)) out.push(`Set: ${name(plan.set)}`);
  if (props.length) out.push(`Props: ${props.join(", ")}`);
  if (talent.length || name(plan.set) || props.length) out.push("");
  const picked = script.status === "approved" && script.hook != null ? script.hook : null;
  script.hooks.forEach((h, i) => {
    if (picked == null || picked === i) line(picked == null ? hookName(i) : "Hook", h);
  });
  script.beats.forEach((b, i) => line(partLabel(script.beats, i), b));
  if (script.cta) out.push("CTA", script.cta);
  return out.join("\n").trim();
}
