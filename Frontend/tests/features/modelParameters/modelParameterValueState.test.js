import { describe, expect, it } from "vitest";

import {
  buildCreateIssueParameterDefaults,
  updateCreateIssueParameterValues,
} from "../../../src/features/modelParameters/logic/modelParameterValueState";

const model = {
  parameters: [
    { key: "customByCriterion", scope: "perCriterion", default: -0.25 },
    { key: "global", scope: "global", default: 0 },
  ],
};

describe("model parameter value state", () => {
  it("uses generic perCriterion scope for defaults without knowing a plugin key", () => {
    expect(
      buildCreateIssueParameterDefaults({
        selectedModel: model,
        leafCriteria: [{ id: "cost" }, { id: "quality" }],
      })
    ).toEqual({ customByCriterion: { cost: -0.25, quality: -0.25 }, global: 0 });
  });

  it("reconciles visible criterion ids while preserving scalar seeds and global values", () => {
    expect(
      updateCreateIssueParameterValues({
        previous: { customByCriterion: { cost: 0, stale: 3 }, global: 0 },
        selectedModel: model,
        leafCriteria: [{ id: "cost" }, { id: "quality" }],
      })
    ).toEqual({ customByCriterion: { cost: 0, quality: -0.25 }, global: 0 });
  });
});
