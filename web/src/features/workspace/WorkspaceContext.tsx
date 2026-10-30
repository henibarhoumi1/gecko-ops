import { createContext, useContext, type ReactNode } from "react";
import type { Workspace } from "@/features/auth/account";

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

/** The agency workspace of the signed-in team member. Only usable inside the agency app. */
export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside the agency app.");
  return workspace;
}
