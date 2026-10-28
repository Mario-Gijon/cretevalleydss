import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { ahpSortAlternativeProfilesStructure } from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/index.js";
import { getAHPSortAlternativeProfilesPayload } from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/ahpSortAlternativeProfiles.get.js";
import { saveAHPSortAlternativeProfilesPayload } from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/ahpSortAlternativeProfiles.save.js";
import { remapAHPSortAlternativeProfilesCriterionIds } from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/operations/remapCriterionIds.js";

const structureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles"
);

it("registers canonical AHPSort I get, save and remapping entry points", () => {
  expect(ahpSortAlternativeProfilesStructure).toEqual({
    key: "ahpSortAlternativeProfiles",
    stage: "alternativeEvaluation",
    get: getAHPSortAlternativeProfilesPayload,
    save: saveAHPSortAlternativeProfilesPayload,
    remapCriterionIds: remapAHPSortAlternativeProfilesCriterionIds,
  });
});

it("keeps the evaluation operations isolated in the canonical structure directory", () => {
  expect(fs.readdirSync(path.join(structureDirectory, "operations")).sort()).toEqual(
    [
      "buildEmptyPayload.js",
      "normalizePayload.js",
      "remapCriterionIds.js",
      "resolveContext.js",
      "validatePayloadShape.js",
    ].sort()
  );
});
