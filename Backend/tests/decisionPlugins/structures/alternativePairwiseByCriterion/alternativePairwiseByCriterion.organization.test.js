import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { getAlternativePairwiseByCriterionPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.get.js";
import { saveAlternativePairwiseByCriterionPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.save.js";
import { alternativePairwiseByCriterionStructure } from "../../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/index.js";

const structureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion"
);

it("registers direct alternativePairwiseByCriterion get and save references", () => {
  expect(alternativePairwiseByCriterionStructure).toEqual({
    key: "alternativePairwiseByCriterion",
    stage: "alternativeEvaluation",
    get: getAlternativePairwiseByCriterionPayload,
    save: saveAlternativePairwiseByCriterionPayload,
  });
});

it("keeps only the canonical operation names", () => {
  expect(
    fs.readdirSync(path.join(structureDirectory, "operations")).sort()
  ).toEqual(
    [
      "buildEmptyPayload.js",
      "normalizePayload.js",
      "resolveItems.js",
      "resolveRequireValue.js",
      "validatePayloadShape.js",
    ].sort()
  );
});

it("does not retain the legacy issue-evaluation test location", () => {
  expect(
    fs.existsSync(
      path.resolve(
        structureDirectory,
        "../../../../../tests/issues/evaluations/alternativePairwiseByCriterion.test.js"
      )
    )
  ).toBe(false);
});
