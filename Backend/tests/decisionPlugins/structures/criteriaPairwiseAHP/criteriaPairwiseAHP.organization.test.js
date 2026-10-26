import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { criteriaPairwiseAHPStructure } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/index.js";
import { getCriteriaPairwiseAHPPayload } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/criteriaPairwiseAHP.get.js";
import { saveCriteriaPairwiseAHPPayload } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/criteriaPairwiseAHP.save.js";
import { remapCriteriaPairwiseAHPCriterionIds } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/remapCriterionIds.js";

const structureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP"
);

it("registers the canonical criteriaPairwiseAHP entry points", () => {
  expect(criteriaPairwiseAHPStructure).toMatchObject({
    key: "criteriaPairwiseAHP",
    stage: "criteriaWeighting",
    get: getCriteriaPairwiseAHPPayload,
    save: saveCriteriaPairwiseAHPPayload,
    remapCriterionIds: remapCriteriaPairwiseAHPCriterionIds,
  });
});

it("keeps the structure operations isolated in the canonical directory", () => {
  expect(fs.readdirSync(path.join(structureDirectory, "operations")).sort()).toEqual(
    [
      "buildEmptyPayload.js",
      "normalizePayload.js",
      "remapCriterionIds.js",
      "resolveCriteria.js",
      "validatePayloadShape.js",
    ].sort()
  );
});
