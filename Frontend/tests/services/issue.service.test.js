vi.mock("../../src/utils/authFetch.js", async () => {
  const actual = await vi.importActual("../../src/utils/authFetch.js");

  return {
    ...actual,
    authFetch: vi.fn(),
  };
});

import * as issueService from "../../src/services/issue.service.js";
import { authFetch } from "../../src/utils/authFetch.js";

describe("issue.service", () => {
  it("getExpressionsDomain requests the visible domains catalog", async () => {
    authFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { globals: [], userDomains: [] },
        }),
        { status: 200 }
      )
    );

    const response = await issueService.getExpressionsDomain();

    expect(response.success).toBe(true);
    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/issues/expression-domains",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("createIssue wraps issueInfo inside the expected payload", async () => {
    authFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "issue-1" } }), {
        status: 201,
      })
    );

    await issueService.createIssue({ name: "Budget planning" });

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/issues",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueInfo: { name: "Budget planning" } }),
      })
    );
  });

  it("removeIssue accepts object ids and deletes the matching issue", async () => {
    authFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await issueService.removeIssue({ _id: "issue-42" });

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/issues/issue-42",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("createIssueScenario normalizes the issue id before posting", async () => {
    authFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "scenario-1" } }), {
        status: 201,
      })
    );

    await issueService.createIssueScenario({
      issueId: { id: "issue-9" },
      scenarioName: "Baseline",
      targetModelId: "model-1",
      paramOverrides: { weight: 0.4 },
    });

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:4010/issues/issue-9/scenarios",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          scenarioName: "Baseline",
          targetModelId: "model-1",
          paramOverrides: { weight: 0.4 },
        }),
      })
    );
  });
});
