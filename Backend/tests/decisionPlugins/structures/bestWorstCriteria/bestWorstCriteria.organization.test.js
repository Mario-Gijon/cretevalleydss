import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { getBestWorstCriteriaPayload } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.get.js";
import { saveBestWorstCriteriaPayload } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.save.js";
import { bestWorstCriteriaStructure } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/index.js";

const structureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria"
);

it("registers the canonical bestWorstCriteria entry points", () => {
  expect(bestWorstCriteriaStructure).toMatchObject({
    key: "bestWorstCriteria",
    stage: "criteriaWeighting",
    get: getBestWorstCriteriaPayload,
    save: saveBestWorstCriteriaPayload,
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
