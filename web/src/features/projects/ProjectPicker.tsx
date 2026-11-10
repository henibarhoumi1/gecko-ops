import { t } from "@/lib/i18n";
import { useProjectChoice } from "./projectChoice";
import { useProjects, type ProjectTarget } from "./projectsApi";

/** For a client with more than one project: which one to look at. Hidden while there's only one. */
export function ProjectPicker({ target }: { target: ProjectTarget }) {
  const list = useProjects(target);
  const [chosen, choose] = useProjectChoice(target.workspaceId, target.clientId);
  const projects = (list.data?.projects ?? []).filter((p) => p.status !== "archived");
  if (projects.length < 2) return null;
  const picked = projects.some((p) => p.id === chosen) ? chosen : "";
  return (
    <label className="project-picker">
      <span className="small">{t("Project", "Projet")}</span>
      <select value={picked ?? ""} onChange={(e) => choose(e.target.value || null)}>
        <option value="">{t("All projects", "Tous les projets")}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.status === "done" ? t(" (done)", " (terminé)") : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
