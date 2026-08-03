import { describe, expect, it } from "vitest";

import {
  buildParamsResolved,
  cleanParamsForSend,
} from "../../../src/features/finishedIssueDialog/logic/buildFinishedScenarioParameters";

const model = {
  parameterDefinitions: [
    { key: "zero", default: 0 },
    { key: "enabled", default: false },
    { key: "agreement", default: [0.3, 0.8] },
    { key: "metadata", default: { nested: ["value"] } },
    { key: "iterations" },
    {
      key: "requiredInterval",
      parameterStructureKey: "intervalGlobal",
      required: true,
      restrictions: { min: 0, max: 1, ordered: "strictIncreasing" },
    },
  ],
};

describe("finished scenario parameter drafts", () => {
  it("copies only declared defaults without fabricating values from restrictions", () => {
    const resolved = buildParamsResolved({ model, leafCount: 0 });

    expect(resolved).toEqual({
      zero: 0,
      enabled: false,
      agreement: [0.3, 0.8],
      metadata: { nested: ["value"] },
    });
    expect(resolved).not.toHaveProperty("requiredInterval");
    expect(resolved.agreement).not.toBe(model.parameterDefinitions[2].default);
    expect(resolved.metadata).not.toBe(model.parameterDefinitions[3].default);
  });

  it("forwards owned raw overrides unchanged", () => {
    const values = {
      zero: 0,
      enabled: false,
      agreement: ["0.125", "0.987654"],
      requiredInterval: [0.8, 0.3],
      metadata: { criterionA: -0.123456789, criterionB: "draft" },
      iterations: "100",
    };

    expect(cleanParamsForSend({ model, values, leafCount: 0 })).toEqual(values);
  });
});
