import { expect, it } from "vitest";

import { getAlternativeCriteriaMatrixPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.get.js";
import { saveAlternativeCriteriaMatrixPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.save.js";
import { alternativeCriteriaMatrixStructure } from "../../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/index.js";

it("registers direct alternativeCriteriaMatrix get and save references", () => {
  expect(alternativeCriteriaMatrixStructure).toEqual({
    key: "alternativeCriteriaMatrix",
    stage: "alternativeEvaluation",
    get: getAlternativeCriteriaMatrixPayload,
    save: saveAlternativeCriteriaMatrixPayload,
  });
});
