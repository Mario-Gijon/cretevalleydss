import { describe, expect, it } from "vitest";

import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_REGISTRY,
  getEvaluationStructureEntry,
  getEvaluationStructureEntryForStage,
} from "../../../src/features/decisionPlugins/evaluations";

describe("evaluation Decision Plugin public registry", () => {
  it("exposes every discovered structure through the public stage-aware resolver", () => {
    const registeredEntries = Object.entries(EVALUATION_STRUCTURE_REGISTRY);
    const supportedStages = new Set(Object.values(EVALUATION_STAGES));

    expect(Object.isFrozen(EVALUATION_STRUCTURE_REGISTRY)).toBe(true);
    expect(registeredEntries.length).toBeGreaterThan(0);

    registeredEntries.forEach(([key, entry]) => {
      expect(entry.key).toBe(key);
      expect(supportedStages.has(entry.stage)).toBe(true);
      expect(entry.View).toBeTruthy();
      expect(getEvaluationStructureEntry(key)).toBe(entry);
      expect(
        getEvaluationStructureEntryForStage({
          structureKey: key,
          stage: entry.stage,
        })
      ).toBe(entry);
    });
  });

  it("rejects unknown structures and stage mismatches at the registry boundary", () => {
    const entry = Object.values(EVALUATION_STRUCTURE_REGISTRY)[0];
    const otherStage = Object.values(EVALUATION_STAGES).find(
      (stage) => stage !== entry.stage
    );

    expect(getEvaluationStructureEntry("future-unregistered-structure")).toBeNull();
    expect(
      getEvaluationStructureEntryForStage({
        structureKey: "future-unregistered-structure",
        stage: entry.stage,
      })
    ).toBeNull();
    expect(
      getEvaluationStructureEntryForStage({
        structureKey: entry.key,
        stage: otherStage,
      })
    ).toBeNull();
  });
});
