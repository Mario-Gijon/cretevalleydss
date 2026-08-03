import { describe, expect, it } from "vitest";

import {
  buildParamsResolved,
  cleanParamsForSend,
  validateParams,
} from "../../../src/features/finishedIssueDialog/logic/buildFinishedScenarioParameters";

const intervalParameter = {
  key: "agreement",
  label: "Agreement interval",
  parameterStructureKey: "intervalGlobal",
  required: true,
  default: [0.3, 0.8],
  restrictions: { min: 0, max: 1, ordered: "strictIncreasing" },
};

const model = { parameterDefinitions: [intervalParameter] };

describe("finished scenario parameter plugin dispatch", () => {
  it("uses the registered interval scenario capability for defaults and outbound values", () => {
    expect(buildParamsResolved({ model, leafCount: 0 })).toEqual({
      agreement: [0.3, 0.8],
    });
    expect(
      cleanParamsForSend({
        model,
        values: { agreement: ["0.125", "0.987654"] },
        leafCount: 0,
      })
    ).toEqual({ agreement: [0.125, 0.987654] });
  });

  it("uses the registered interval scenario capability for validation", () => {
    expect(
      validateParams({
        model,
        values: { agreement: [0.8, 0.3] },
        leafCount: 0,
      })
    ).toEqual({
      ok: false,
      msg: "Parameter 'agreement' must satisfy left < right.",
    });
  });
});
