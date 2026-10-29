import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { acceptInvite, loadAccount, type Account } from "./account";
import { clearPendingInvite, readPendingInvite } from "./inviteCode";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "ready"; session: Session; account: Account }
  | { status: "error"; session: Session; message: string };

interface AuthContextValue {
  state: AuthState;
  /** Re-reads what the signed-in person can open, after accepting an invite or creating the workspace. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = requireSupabase();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const resolve = useCallback(
    async (session: Session | null) => {
      if (!session) return setState({ status: "signed-out" });
      try {
        let account = await loadAccount(db);
        const pending = readPendingInvite();
        if (account.kind === "none" && pending) {
          clearPendingInvite();
          await acceptInvite(db, pending, session.user.user_metadata?.name ?? "");
          account = await loadAccount(db);
        }
        setState({ status: "ready", session, account });
      } catch (error) {
        setState({ status: "error", session, message: friendlyError(error) });
      }
    },
    [db],
  );

  useEffect(() => {
    void db.auth.getSession().then(({ data }) => resolve(data.session));
    const { data } = db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")
        void resolve(session);
    });
    return () => data.subscription.unsubscribe();
  }, [db, resolve]);

  const refresh = useCallback(
    async () => resolve((await db.auth.getSession()).data.session),
    [db, resolve],
  );
  const signOut = useCallback(async () => {
    await db.auth.signOut();
    setState({ status: "signed-out" });
  }, [db]);
  const value = useMemo<AuthContextValue>(
    () => ({ state, refresh, signOut }),
    [state, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
