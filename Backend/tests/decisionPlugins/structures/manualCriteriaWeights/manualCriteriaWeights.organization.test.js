import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { getManualCriteriaWeightsPayload } from "../../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.get.js";
import { saveManualCriteriaWeightsPayload } from "../../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.save.js";
import { manualCriteriaWeightsStructure } from "../../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/index.js";

const structureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights"
);

it("registers the canonical manualCriteriaWeights entry points", () => {
  expect(manualCriteriaWeightsStructure).toMatchObject({
    key: "manualCriteriaWeights",
    stage: "criteriaWeighting",
    get: getManualCriteriaWeightsPayload,
    save: saveManualCriteriaWeightsPayload,
  });
});

it("keeps only the canonical operation files", () => {
  expect(
    fs.readdirSync(path.join(structureDirectory, "operations")).sort()
  ).toEqual(
    [
      "buildEmptyPayload.js",
      "normalizePayload.js",
      "resolveCriteria.js",
      "validatePayloadShape.js",
    ].sort()
  );
});
