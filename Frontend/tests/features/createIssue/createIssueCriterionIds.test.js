import { describe, expect, it, vi } from "vitest";

import { ensureCriteriaTreeIds } from "../../../src/features/createIssue/logic/createIssueCriterionIds.js";

describe("createIssueCriterionIds", () => {
  it("assigns stable ids to criteria that do not already have them", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("generated-root")
        .mockReturnValueOnce("generated-child"),
    });

    const criteria = ensureCriteriaTreeIds([
      {
        name: "Impact",
        children: [{ name: "Cost", children: [] }],
      },
    ]);

    expect(criteria).toEqual([
      {
        name: "Impact",
        id: "generated-root",
        children: [
          {
            name: "Cost",
            id: "generated-child",
            children: [],
          },
        ],
      },
    ]);
  });

  it("preserves existing ids while filling nested missing ids", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValue("generated-speed"),
    });

    const criteria = ensureCriteriaTreeIds([
      {
        id: "existing-root",
        name: "Impact",
        children: [
          { id: "existing-leaf", name: "Cost", children: [] },
          { name: "Speed", children: [] },
        ],
      },
    ]);

    expect(criteria[0].id).toBe("existing-root");
    expect(criteria[0].children[0].id).toBe("existing-leaf");
    expect(criteria[0].children[1].id).toBe("generated-speed");
  });

  it("returns an empty array for empty or malformed inputs", () => {
    expect(ensureCriteriaTreeIds([])).toEqual([]);
    expect(ensureCriteriaTreeIds(null)).toEqual([]);
  });
});
