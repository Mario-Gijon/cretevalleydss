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
});
