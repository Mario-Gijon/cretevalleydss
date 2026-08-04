import { describe, expect, it } from "vitest";

import {
  buildCreateIssueParameterDefaults,
  updateCreateIssueParameterValues,
} from "../../../src/features/modelParameters/logic/modelParameterValueState";

describe("model parameter value state", () => {
  it("handles defensive model definitions without fabricating values", () => {
    expect(buildCreateIssueParameterDefaults({ selectedModel: { parameters: null } })).toEqual({});
    expect(updateCreateIssueParameterValues({ previous: null, selectedModel: null })).toEqual({});
  });

  it("clones raw declared defaults without interpreting their shapes", () => {
    const arrayDefault = [0, -1];
    const objectDefault = { cost: 0.05, nested: { enabled: false } };
    const defaults = buildCreateIssueParameterDefaults({ selectedModel: { parameters: [
      { key: "threshold", parameterStructureKey: "numberCriterion", default: 0.05 },
      { key: "range", parameterStructureKey: "intervalGlobal", default: arrayDefault },
      { key: "settings", parameterStructureKey: "custom", default: objectDefault },
      { key: "zero", parameterStructureKey: "numberGlobal", default: 0 },
      { key: "enabled", parameterStructureKey: "selectGlobal", default: false },
      { key: "negative", parameterStructureKey: "custom", default: -1.25 },
      { key: "missing", parameterStructureKey: "custom" },
    ] } });

    expect(defaults).toEqual({ threshold: 0.05, range: [0, -1], settings: objectDefault, zero: 0, enabled: false, negative: -1.25 });
    expect(defaults.range).not.toBe(arrayDefault);
    expect(defaults.settings).not.toBe(objectDefault);
    expect(defaults.settings.nested).not.toBe(objectDefault.nested);
  });

  it("preserves owned values unchanged and only prunes whole parameter keys", () => {
    const stalePluginMap = { cost: 0, stale: 3 };
    const previous = {
      scalar: -0.5,
      pluginMap: stalePluginMap,
      numericDraft: "-0.125",
      emptyDraft: "",
      staleTopLevel: "remove",
      unknown: { arbitrary: true },
    };
    const next = updateCreateIssueParameterValues({ previous, selectedModel: { parameters: [
      { key: "scalar", parameterStructureKey: "numberGlobal", default: 1 },
      { key: "pluginMap", parameterStructureKey: "numberCriterion", default: { ignored: true } },
      { key: "newValue", parameterStructureKey: "custom", default: [0, 1] },
      { key: "withoutValue", parameterStructureKey: "custom" },
      { key: "numericDraft", parameterStructureKey: "custom" },
      { key: "emptyDraft", parameterStructureKey: "custom" },
      { key: "unknown", parameterStructureKey: "unknownPlugin" },
    ] } });

    expect(next).toEqual({ scalar: -0.5, pluginMap: stalePluginMap, newValue: [0, 1], numericDraft: "-0.125", emptyDraft: "", unknown: { arbitrary: true } });
    expect(next.pluginMap).not.toBe(stalePluginMap);
    expect(next.pluginMap).toHaveProperty("stale", 3);
    expect(next).not.toHaveProperty("withoutValue");
    expect(next).not.toHaveProperty("staleTopLevel");
  });
});
