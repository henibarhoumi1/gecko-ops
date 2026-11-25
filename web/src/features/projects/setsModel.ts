/**
 * The set list of a campaign (Heni, 23 Nov 2026): the sets the videos are shot on, like "kitchen counter" or
 * "bathroom mirror". Not locations: a set is a setup, and one place can hold several. Each idea and script picks
 * one or more sets in its shoot plan. Both sides read them; the team keeps the list. Photos sit in the client's
 * folder of the production bucket.
 */
export interface ProjectSet {
  id: string;
  projectId: string | null;
  name: string;
  notes: string;
  photos: string[];
  position: number;
}

export interface SetRow {
  id: string;
  project_id: string | null;
  name: string;
  notes: string;
  photos?: string[] | null;
  position: number;
}

export const toSet = (r: SetRow): ProjectSet => ({
  id: r.id,
  projectId: r.project_id,
  name: r.name,
  notes: r.notes,
  photos: r.photos ?? [],
  position: r.position,
});

/** Sets of one campaign first, in their order. A set saved without a campaign belongs to every campaign. */
export function setsForProject(sets: ProjectSet[], projectId: string | null): ProjectSet[] {
  return sets
    .filter((s) => !projectId || !s.projectId || s.projectId === projectId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}
