import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";

export interface StudioEvent {
  id: string;
  day: string;
  time: string;
  kind: "meeting" | "event" | "note";
  title: string;
  notes: string;
  link: string;
  clientId: string | null;
}

interface Row {
  id: string;
  day: string;
  at_time: string;
  kind: StudioEvent["kind"];
  title: string;
  notes: string;
  link: string;
  client_id: string | null;
}

const key = (ws: string) => ["studio-events", ws];

export function useStudioEvents() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: key(workspaceId),
    queryFn: async (): Promise<StudioEvent[]> => {
      const { data, error } = await requireSupabase()
        .from("studio_events")
        .select("id,day,at_time,kind,title,notes,link,client_id")
        .eq("workspace_id", workspaceId)
        .order("day")
        .order("at_time");
      if (error) throw error;
      return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        day: r.day,
        time: r.at_time,
        kind: r.kind,
        title: r.title,
        notes: r.notes,
        link: r.link,
        clientId: r.client_id,
      }));
    },
  });
}

export function useEventActions() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: key(workspaceId) });
  return {
    add: useMutation({
      mutationFn: async (e: Omit<StudioEvent, "id">) => {
        const { error } = await requireSupabase().from("studio_events").insert({
          workspace_id: workspaceId,
          day: e.day,
          at_time: e.time,
          kind: e.kind,
          title: e.title,
          notes: e.notes,
          link: e.link,
          client_id: e.clientId,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await requireSupabase().from("studio_events").delete().eq("id", id);
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}

/** A Google Calendar "new event" link filled with this entry. */
export function googleCalendarLink(
  e: Pick<StudioEvent, "day" | "time" | "title" | "notes">,
): string {
  const d = e.day.replace(/-/g, "");
  const dates = e.time
    ? (() => {
        const [h, m] = e.time.split(":").map(Number);
        const end = `${String(((h ?? 0) + 1) % 24).padStart(2, "0")}${String(m ?? 0).padStart(2, "0")}00`;
        return `${d}T${e.time.replace(":", "")}00/${d}T${end}`;
      })()
    : `${d}/${d}`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    details: e.notes,
    dates,
    ctz: "Africa/Tunis",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
