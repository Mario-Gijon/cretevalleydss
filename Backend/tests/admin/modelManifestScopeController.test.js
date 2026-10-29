import { beforeEach, describe, expect, it, vi } from "vitest";

const manifestScopeMocks = vi.hoisted(() => ({
  dryRun: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("../../services/modelApi/modelManifestDryRun.js", () => ({
  runModelManifestDryRun: manifestScopeMocks.dryRun,
}));

vi.mock("../../services/modelApi/modelManifestSync.js", () => ({
  syncModelManifestToIssueModels: manifestScopeMocks.sync,
}));

import {
  getModelManifestDryRunAdmin,
  syncModelManifestAdmin,
} from "../../controllers/admin.controller.js";

const makeResponse = () => ({
  status: vi.fn(function status() {
    return this;
  }),
  json: vi.fn(function json(payload) {
    return payload;
  }),
});

describe("scoped model manifest admin endpoints", () => {
  beforeEach(() => {
    manifestScopeMocks.dryRun.mockReset().mockResolvedValue({ matches: [] });
    manifestScopeMocks.sync.mockReset().mockResolvedValue({ summary: {} });
  });

  it("normalizes a single dry-run query key and preserves repeated keys", async () => {
    const response = makeResponse();

    await getModelManifestDryRunAdmin(
      { query: { apiModelKeys: "ahp_sort_i" } },
      response,
    );
    await getModelManifestDryRunAdmin(
      { query: { apiModelKeys: ["ahp_sort_i", "topsis_sort_2016"] } },
      response,
    );

    expect(manifestScopeMocks.dryRun).toHaveBeenNthCalledWith(1, {
      apiModelKeys: ["ahp_sort_i"],
    });
    expect(manifestScopeMocks.dryRun).toHaveBeenNthCalledWith(2, {
      apiModelKeys: ["ahp_sort_i", "topsis_sort_2016"],
    });
  });

  it("passes the requested scope to sync and still requires explicit confirmation", async () => {
    const response = makeResponse();

    await expect(
      syncModelManifestAdmin(
        { body: { confirm: false, apiModelKeys: ["ahp_sort_i"] } },
        response,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(manifestScopeMocks.sync).not.toHaveBeenCalled();

    await syncModelManifestAdmin(
      { body: { confirm: true, apiModelKeys: ["ahp_sort_i"] } },
      response,
    );

    expect(manifestScopeMocks.sync).toHaveBeenCalledOnce();
    expect(manifestScopeMocks.sync).toHaveBeenCalledWith({
      apiModelKeys: ["ahp_sort_i"],
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
