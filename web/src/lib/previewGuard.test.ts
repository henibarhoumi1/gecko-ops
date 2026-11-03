import { describe, expect, it } from "vitest";
import { allowedWhilePreviewing } from "./previewGuard";

const db = "https://abc.supabase.co";

describe("View as client stays read-only", () => {
  it("lets reads through", () => {
    expect(allowedWhilePreviewing(`${db}/rest/v1/clients?select=*`, "GET")).toBe(true);
    expect(allowedWhilePreviewing(`${db}/rest/v1/rpc/team_preview`, "POST")).toBe(true);
    expect(allowedWhilePreviewing(`${db}/rest/v1/rpc/get_client_onboarding`, "POST")).toBe(true);
    expect(allowedWhilePreviewing(`${db}/storage/v1/object/sign/previews/a.mp4`, "POST")).toBe(
      true,
    );
    expect(allowedWhilePreviewing(`${db}/auth/v1/token?grant_type=refresh_token`, "POST")).toBe(
      true,
    );
  });
  it("stops anything that could write", () => {
    expect(allowedWhilePreviewing(`${db}/rest/v1/rpc/save_client_onboarding`, "POST")).toBe(false);
    expect(allowedWhilePreviewing(`${db}/rest/v1/rpc/save_board_items`, "POST")).toBe(false);
    expect(allowedWhilePreviewing(`${db}/rest/v1/rpc/client_concept_note`, "POST")).toBe(false);
    expect(allowedWhilePreviewing(`${db}/rest/v1/concepts`, "POST")).toBe(false);
    expect(allowedWhilePreviewing(`${db}/rest/v1/client_portals?client_id=eq.x`, "PATCH")).toBe(
      false,
    );
    expect(allowedWhilePreviewing(`${db}/rest/v1/scripts?id=eq.x`, "DELETE")).toBe(false);
    expect(allowedWhilePreviewing(`${db}/storage/v1/object/boards/x.png`, "POST")).toBe(false);
  });
});
