import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/authFetch.js", async () => {
  const actual = await vi.importActual("../../src/utils/authFetch.js");

  return {
    ...actual,
    authFetch: vi.fn(),
  };
});

import * as adminService from "../../src/services/admin.service.js";
import { authFetch } from "../../src/utils/authFetch.js";

describe("admin.service", () => {
  it("preserves raw admin error payloads instead of normalizing by status", async () => {
    const payload = {
      success: false,
      message: "Administrator access required.",
      error: { code: "FORBIDDEN" },
    };
    authFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 403 })
    );

    await expect(adminService.checkAdminAccess()).resolves.toEqual(payload);
  });

  it("preserves the legacy false fallback when an admin request rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authFetch.mockRejectedValueOnce(new Error("offline"));

    await expect(adminService.getAllUsers()).resolves.toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching experts:",
      expect.any(Error)
    );
  });

  it("getAdminModelCatalog requests the admin model catalog endpoint", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { models: [] } }), {
        status: 200,
      })
    );

    await adminService.getAdminModelCatalog();

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/admin/models/catalog",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("getModelManifestDryRun requests the manifest dry-run endpoint", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
      })
    );

    await adminService.getModelManifestDryRun();

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/admin/models/manifest/dry-run",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("syncModelManifest posts explicit confirmation to the sync endpoint", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
      })
    );

    await adminService.syncModelManifest();

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/admin/models/manifest/sync",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      })
    );
  });

  it("updateModelCatalogVisibility sends the payload unchanged to the correct endpoint", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
      })
    );

    await adminService.updateModelCatalogVisibility("mongo-1", {
      visibleInCriteriaWeighting: false,
    });

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/admin/models/mongo-1/catalog-visibility",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleInCriteriaWeighting: false }),
      })
    );
  });

  it("editIssueExpertsAdminAction includes weights only when provided", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await adminService.editIssueExpertsAdminAction({
      issueId: "issue-1",
      expertsToAdd: ["new@example.com"],
      expertsToRemove: ["old@example.com"],
      expertWeightsByEmail: {
        "new@example.com": 0.4,
        "old@example.com": 0.6,
      },
    });

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/admin/issues/issue-1/experts",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          expertsToAdd: ["new@example.com"],
          expertsToRemove: ["old@example.com"],
          expertWeightsByEmail: {
            "new@example.com": 0.4,
            "old@example.com": 0.6,
          },
        }),
      })
    );
  });
});
