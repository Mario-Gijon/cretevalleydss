import { describe, expect, it } from "vitest";

import { SCENARIO_DESCRIPTION_MAX } from "../../../../../src/features/finishedIssueDialog/logic/scenarioDraft.constants.js";
import {
  buildAddModelOptions,
  buildAddModelSubmitState,
} from "../../../../../src/features/finishedIssueDialog/sections/models/logic/addModelDialog.js";
import { updateScenarioParameterValues } from "../../../../../src/features/finishedIssueDialog/logic/updateScenarioParameterValues.js";

describe("Add Model dialog logic", () => {
  it("builds each compatibility option once into a stable view model", () => {
    expect(
      buildAddModelOptions([
        {
          id: "enabled",
          name: "Enabled model",
          compatibility: { compatible: true, reasons: [] },
        },
        {
          id: "disabled",
          name: "Disabled model",
          compatibility: {
            compatible: false,
            reasons: ["Requires fuzzy data", "Missing weights"],
          },
        },
      ])
    ).toEqual([
      {
        id: "enabled",
        name: "Enabled model",
        compatible: true,
        reason: "",
        statusLabel: "Enabled",
        statusColor: "success",
      },
      {
        id: "disabled",
        name: "Disabled model",
        compatible: false,
        reason: "Requires fuzzy data · Missing weights",
        statusLabel: "Disabled",
        statusColor: "error",
      },
    ]);
  });

  it("preserves the exact description boundary and existing submit gate", () => {
    const valid = {
      addLoading: false,
      scenarioName: "Sensitivity",
      selectedModelCompatible: true,
    };

    expect(
      buildAddModelSubmitState({
        ...valid,
        scenarioDescription: "x".repeat(SCENARIO_DESCRIPTION_MAX),
      })
    ).toEqual({
      canSubmit: true,
      descriptionLength: SCENARIO_DESCRIPTION_MAX,
      disabled: false,
    });
    expect(
      buildAddModelSubmitState({
        ...valid,
        scenarioDescription: "x".repeat(SCENARIO_DESCRIPTION_MAX + 1),
      }).disabled
    ).toBe(true);
    expect(
      buildAddModelSubmitState({
        ...valid,
        scenarioName: "   ",
        scenarioDescription: "Valid",
      }).disabled
    ).toBe(true);
    expect(
      buildAddModelSubmitState({
        ...valid,
        addLoading: true,
        scenarioDescription: "Valid",
      }).disabled
    ).toBe(true);
  });

  it("updates one parameter without mutating the previous values", () => {
    const previous = { alpha: 0.2 };
    const next = updateScenarioParameterValues(previous, "beta", 0.8);

    expect(next).toEqual({ alpha: 0.2, beta: 0.8 });
    expect(next).not.toBe(previous);
    expect(previous).toEqual({ alpha: 0.2 });
  });
});
